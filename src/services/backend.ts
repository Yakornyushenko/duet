import { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { AppUser, Couple, DateEvent, DateEventInput, DateCategoryOption } from '@/types/domain';

const emailRedirectTo = 'duet://auth';

type RemoteWorkspace = {
  user: AppUser;
  couple: Couple | null;
  events: DateEvent[];
  categories: DateCategoryOption[];
};

type CoupleRow = {
  created_by: string;
  id: string;
  relationship_started_at: string;
  invite_code: string | null;
  invite_expires_at: string | null;
};

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  recurrence: DateEvent['recurrence'];
  category: DateEvent['category'];
  icon: DateEvent['icon'];
};

function getClient() {
  if (!supabase) {
    throw new Error('Supabase не настроен');
  }
  return supabase;
}

function mapEvent(row: EventRow): DateEvent {
  return {
    id: row.id,
    title: row.title,
    eventDate: row.event_date,
    recurrence: row.recurrence,
    category: row.category,
    icon: row.icon,
  };
}

function getAuthTokens(url: string) {
  const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
  const fragment = url.includes('#') ? url.split('#')[1] : '';
  const params = new URLSearchParams(fragment || query);
  const errorDescription = params.get('error_description');

  if (errorDescription) {
    throw new Error(errorDescription);
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export async function signInRemote(email: string, password: string): Promise<void> {
  const { error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

export async function signUpRemote(displayName: string, email: string, password: string): Promise<boolean> {
  const { data, error } = await getClient().auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo,
    },
  });
  if (error) {
    throw error;
  }
  return Boolean(data.session);
}

export async function resendSignUpConfirmationRemote(email: string): Promise<void> {
  const { error } = await getClient().auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo },
  });
  if (error) {
    throw error;
  }
}

export async function createSessionFromAuthUrl(url: string): Promise<void> {
  const tokens = getAuthTokens(url);
  if (!tokens) {
    return;
  }

  const { error } = await getClient().auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  if (error) {
    throw error;
  }
}

export async function loadRemoteWorkspace(session: Session): Promise<RemoteWorkspace> {
  const client = getClient();
  const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] = await Promise.all([client
    .from('profiles')
    .select('display_name')
    .eq('id', session.user.id)
    .maybeSingle(),
    client.from('couple_members')
      .select('couple_id, couples(id, created_by, relationship_started_at, invite_code, invite_expires_at)')
      .eq('user_id', session.user.id)
      .maybeSingle(),
  ]);
  if (profileError) {
    throw profileError;
  }

  const user: AppUser = {
    id: session.user.id,
    email: session.user.email ?? '',
    displayName:
      profile?.display_name ??
      (typeof session.user.user_metadata.display_name === 'string'
        ? session.user.user_metadata.display_name
        : session.user.email?.split('@')[0] ?? 'Вы'),
  };

  if (membershipError) {
    throw membershipError;
  }
  if (!membership) {
    return { user, couple: null, events: [], categories: [] };
  }

  const rawCouple = membership.couples as unknown as CoupleRow | CoupleRow[] | null;
  const coupleRow = Array.isArray(rawCouple) ? rawCouple[0] : rawCouple;
  if (!coupleRow) {
    return { user, couple: null, events: [], categories: [] };
  }

  const [{ data: partnerMembership, error: partnerError }, { data: eventRows, error: eventError }, { data: categoryRows, error: categoryError }] =
    await Promise.all([
      client
        .from('couple_members')
        .select('profiles(display_name)')
        .eq('couple_id', coupleRow.id)
        .neq('user_id', session.user.id)
        .maybeSingle(),
      client
        .from('date_events')
        .select('id, title, event_date, recurrence, icon, category')
        .eq('couple_id', coupleRow.id)
        .order('id'),
      client.from('date_categories').select('value, label, custom_slot')
        .eq('couple_id', coupleRow.id).order('position'),
    ]);
  if (partnerError) {
    throw partnerError;
  }
  if (eventError) {
    throw eventError;
  }
  if (categoryError) throw categoryError;

  const rawProfile = partnerMembership?.profiles as unknown as { display_name: string } | { display_name: string }[] | null;
  const partnerProfile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

  return {
    user,
    couple: {
      createdBy: coupleRow.created_by,
      id: coupleRow.id,
      relationshipStartedAt: coupleRow.relationship_started_at,
      inviteCode: coupleRow.invite_code,
      inviteExpiresAt: coupleRow.invite_expires_at,
      partnerName: partnerProfile?.display_name ?? null,
    },
    events: ((eventRows ?? []) as EventRow[]).map(mapEvent),
    categories: (categoryRows ?? []).map((row) => ({ value: row.value, label: row.label, customSlot: row.custom_slot })),
  };
}

export async function createCoupleRemote(relationshipStartedAt: string): Promise<void> {
  const { error } = await getClient().rpc('create_couple', {
    p_relationship_started_at: relationshipStartedAt,
  });
  if (error) {
    throw error;
  }
}

export async function updateRelationshipDateRemote(relationshipStartedAt: string): Promise<void> {
  const { error } = await getClient().rpc('update_relationship_started_at', {
    p_relationship_started_at: relationshipStartedAt,
  });
  if (error) {
    throw error;
  }
}

export async function updateDisplayNameRemote(userId: string, displayName: string): Promise<string> {
  const { data, error } = await getClient()
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId)
    .select('display_name')
    .single();
  if (error) {
    throw error;
  }
  return data.display_name;
}

export async function joinCoupleRemote(inviteCode: string): Promise<void> {
  const { error } = await getClient().rpc('join_couple', {
    p_invite_code: inviteCode.toUpperCase(),
  });
  if (error) {
    throw error;
  }
}

export async function addEventRemote(coupleId: string, input: DateEventInput): Promise<DateEvent> {
  const { data, error } = await getClient()
    .from('date_events')
    .insert({
      couple_id: coupleId,
      title: input.title,
      event_date: input.eventDate,
      recurrence: input.recurrence,
      category: input.category,
      icon: input.icon,
    })
    .select('id, title, event_date, recurrence, icon, category')
    .single();
  if (error) {
    throw error;
  }
  return mapEvent(data as EventRow);
}

export async function updateEventRemote(id: string, input: DateEventInput): Promise<DateEvent> {
  const { data, error } = await getClient()
    .from('date_events')
    .update({
      title: input.title,
      event_date: input.eventDate,
      recurrence: input.recurrence,
      category: input.category,
      icon: input.icon,
    })
    .eq('id', id)
    .select('id, title, event_date, recurrence, icon, category')
    .single();
  if (error) {
    throw error;
  }
  return mapEvent(data as EventRow);
}

export async function deleteEventRemote(id: string): Promise<void> {
  const { error } = await getClient().from('date_events').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
