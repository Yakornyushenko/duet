import { Session } from '@supabase/supabase-js';

import { enableSession, supabase } from '@/lib/supabase';
import { dataCacheKey, loadWithCache, readCachedData } from '@/lib/dataCache';
import { AppUser, Couple, DateEvent, DateEventInput, DateCategoryOption } from '@/types/domain';
import { localizeAuthError } from '@/utils/authErrors';
import { getProfilePhotoUrls } from '@/services/profilePhotos';

const emailRedirectTo = 'https://duet.by/email-confirmed';

export type RemoteWorkspace = {
  user: AppUser;
  couple: Couple | null;
  events: DateEvent[];
  categories: DateCategoryOption[];
};

type CoupleRow = {
  created_by: string;
  id: string;
  relationship_started_at: string | null;
  invite_code: string | null;
  invite_expires_at: string | null;
};

type EventRow = {
  id: string;
  title: string;
  description?: string | null;
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
    description: row.description ?? '',
    eventDate: row.event_date,
    recurrence: row.recurrence,
    category: row.category,
    icon: row.icon,
  };
}

export async function signInRemote(email: string, password: string): Promise<void> {
  enableSession();
  const { error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) {
    throw localizeAuthError(error);
  }
  await getClient().auth.startAutoRefresh();
}

export async function signUpRemote(displayName: string, email: string, password: string): Promise<boolean> {
  enableSession();
  const { data, error } = await getClient().auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo,
    },
  });
  if (error) {
    throw localizeAuthError(error);
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
    throw localizeAuthError(error);
  }
}

export async function deleteAccountRemote(): Promise<void> {
  const { error } = await getClient().functions.invoke('delete-account', {
    body: { confirmation: 'DELETE_MY_ACCOUNT' },
  });
  if (error) {
    throw new Error('Не удалось удалить аккаунт. Проверьте подключение и попробуйте ещё раз.');
  }
}

async function fetchRemoteWorkspace(session: Session): Promise<RemoteWorkspace> {
  const client = getClient();
  const { error: workspaceError } = await client.rpc('ensure_personal_workspace');
  if (workspaceError) throw new Error('Не удалось открыть пространство. Проверьте подключение и применение миграции личного режима.');
  const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] = await Promise.all([client
    .from('profiles')
    .select('display_name, avatar_path')
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
    avatarPath: profile?.avatar_path ?? null,
    avatarUrl: null,
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
        .select('profiles(display_name, avatar_path)')
        .eq('couple_id', coupleRow.id)
        .neq('user_id', session.user.id)
        .maybeSingle(),
      client
        .from('date_events')
        // Selecting the row keeps workspace loading compatible while the
        // description migration is rolling out. mapEvent supplies an empty
        // description for databases that do not expose the new column yet.
        .select('*')
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

  const rawProfile = partnerMembership?.profiles as unknown as
    { display_name: string; avatar_path: string | null } |
    { display_name: string; avatar_path: string | null }[] | null;
  const partnerProfile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
  const photoUrls = await getProfilePhotoUrls([
    ...(user.avatarPath ? [user.avatarPath] : []),
    ...(partnerProfile?.avatar_path ? [partnerProfile.avatar_path] : []),
  ]);
  user.avatarUrl = user.avatarPath ? photoUrls[user.avatarPath] ?? null : null;

  return {
    user,
    couple: {
      createdBy: coupleRow.created_by,
      id: coupleRow.id,
      relationshipStartedAt: coupleRow.relationship_started_at,
      inviteCode: coupleRow.invite_code,
      inviteExpiresAt: coupleRow.invite_expires_at,
      partnerName: partnerProfile?.display_name ?? null,
      partnerAvatarPath: partnerProfile?.avatar_path ?? null,
      partnerAvatarUrl: partnerProfile?.avatar_path ? photoUrls[partnerProfile.avatar_path] ?? null : null,
    },
    events: ((eventRows ?? []) as EventRow[]).map(mapEvent),
    categories: (categoryRows ?? []).map((row) => ({ value: row.value, label: row.label, customSlot: row.custom_slot })),
  };
}

export function workspaceCacheKey(userId: string): string {
  return dataCacheKey('workspace', userId);
}

export function loadCachedRemoteWorkspace(userId: string): Promise<RemoteWorkspace | undefined> {
  return readCachedData<RemoteWorkspace>(workspaceCacheKey(userId));
}

export function loadRemoteWorkspace(session: Session): Promise<RemoteWorkspace> {
  return loadWithCache(workspaceCacheKey(session.user.id), () => fetchRemoteWorkspace(session));
}

export async function createCoupleRemote(): Promise<void> {
  const { error } = await getClient().rpc('create_personal_invite');
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

export async function updateProfilePhotoRemote(userId: string, avatarPath: string | null): Promise<string | null> {
  const { data, error } = await getClient()
    .from('profiles')
    .update({ avatar_path: avatarPath })
    .eq('id', userId)
    .select('avatar_path')
    .single();
  if (error) throw error;
  if (!data.avatar_path) return null;
  const urls = await getProfilePhotoUrls([data.avatar_path]);
  return urls[data.avatar_path] ?? null;
}

export type JoinCategory = { key: string; label: string; mine: boolean };
export type JoinPreview = { token: string; categories: JoinCategory[]; sourceEmpty: boolean };

export async function prepareJoinRemote(inviteCode: string): Promise<JoinPreview> {
  const { data, error } = await getClient().rpc('prepare_personal_join', { p_invite_code: inviteCode.toUpperCase() });
  if (error) throw error;
  if (!data) throw new Error('Код недоступен или срок действия истёк. После 5 попыток подождите 15 минут.');
  return data as JoinPreview;
}

export async function joinEmptyCoupleRemote(token: string): Promise<void> {
  const { data, error } = await getClient().rpc('join_empty_personal_workspace', { p_token: token });
  if (error) throw error;
  if (!data?.length) throw new Error('Приглашение изменилось или срок его действия истёк.');
}

export async function joinCoupleRemote(token: string, categories: JoinCategory[]): Promise<void> {
  const { data, error } = await getClient().rpc('join_personal_workspace', {
    p_token: token,
    p_categories: categories.map(({ key, label }) => ({ key, label: label.trim() })),
    p_confirm_sharing: true,
  });
  if (error) {
    throw error;
  }
  if (!data?.length) {
    throw new Error('Код не найден или срок действия истёк. После 5 попыток подождите 15 минут.');
  }
}

export async function addEventRemote(coupleId: string, input: DateEventInput): Promise<DateEvent> {
  const { data, error } = await getClient()
    .from('date_events')
    .insert({
      couple_id: coupleId,
      title: input.title,
      description: input.description,
      event_date: input.eventDate,
      recurrence: input.recurrence,
      category: input.category,
      icon: input.icon,
    })
    .select('id, title, description, event_date, recurrence, icon, category')
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
      description: input.description,
      event_date: input.eventDate,
      recurrence: input.recurrence,
      category: input.category,
      icon: input.icon,
    })
    .eq('id', id)
    .select('id, title, description, event_date, recurrence, icon, category')
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
