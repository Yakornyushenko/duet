import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type WishJob = {
  id: string;
  couple_id: string;
  recipient_id: string | null;
  wish_id: string | null;
  message: string | null;
  remove_photos: string[] | null;
};

type ExpoTicket = {
  status: 'ok' | 'error';
  details?: { error?: string };
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const workerSecret = Deno.env.get('WISH_WORKER_SECRET');
  if (!workerSecret || request.headers.get('x-wish-worker-secret') !== workerSecret) {
    return new Response('Unauthorized', { status: 401 });
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Missing Supabase env' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: jobs, error } = await supabase.rpc('claim_wish_jobs');
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const claimed = (jobs ?? []) as WishJob[];
  for (const job of claimed) {
    try {
      const photos = job.remove_photos?.filter(Boolean) ?? [];
      if (photos.length) {
        const { data: references, error: referenceError } = await supabase
          .from('wishes').select('photos').overlaps('photos', photos);
        if (referenceError) throw referenceError;
        const referenced = new Set((references ?? []).flatMap((wish) => wish.photos));
        const unused = photos.filter((path) => !referenced.has(path));
        const { error: storageError } = unused.length
          ? await supabase.storage.from('wish-photos').remove(unused)
          : { error: null };
        if (storageError) {
          throw storageError;
        }
      }

      if (job.recipient_id && job.message) {
        await sendWishPush(supabase, job);
      }

      const { error: completeError } = await supabase
        .from('wish_jobs')
        .update({ completed_at: new Date().toISOString(), last_error: null })
        .eq('id', job.id);
      if (completeError) {
        throw completeError;
      }
    } catch (jobError) {
      const message = jobError instanceof Error ? jobError.message : 'Unknown job error';
      await supabase
        .from('wish_jobs')
        .update({ claimed_at: null, last_error: message.slice(0, 500) })
        .eq('id', job.id);
    }
  }

  return Response.json({ processed: claimed.length });
});

async function sendWishPush(
  supabase: ReturnType<typeof createClient>,
  job: WishJob,
): Promise<void> {
  // Do not disclose a former couple's activity after a separation.
  const { data: member, error: memberError } = await supabase.from('couple_members')
    .select('user_id').eq('couple_id', job.couple_id).eq('user_id', job.recipient_id).maybeSingle();
  if (memberError) throw memberError;
  if (!member) return;
  const { data: devices, error: deviceError } = await supabase
    .from('wish_devices')
    .select('token')
    .eq('user_id', job.recipient_id);
  if (deviceError) {
    throw deviceError;
  }

  const tokens = (devices ?? [])
    .map((device: { token: string }) => device.token)
    .filter(Boolean);
  if (!tokens.length) {
    return;
  }

  const messages = tokens.map((token: string) => ({
    to: token,
    title: 'Duet',
    body: job.message,
    sound: 'default',
    // Android needs a channel so the notification is grouped and vibrates.
    channelId: 'wish-updates',
    data: job.wish_id ? { wishId: job.wish_id } : {},
  }));

  const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  if (!pushResponse.ok) {
    throw new Error(`Expo push failed: ${pushResponse.status}`);
  }

  await removeInvalidTokens(supabase, tokens, await pushResponse.json());
}

async function removeInvalidTokens(
  supabase: ReturnType<typeof createClient>,
  tokens: string[],
  payload: unknown,
): Promise<void> {
  const tickets = Array.isArray(payload) ? payload : (payload as { data?: unknown } | null)?.data;
  if (!Array.isArray(tickets)) {
    throw new Error('Invalid Expo push response');
  }
  if (tickets.length !== tokens.length) throw new Error('Missing Expo push tickets');

  const deviceNotRegistered = new Set<string>();
  tickets.forEach((ticket, index) => {
    const candidate = ticket as ExpoTicket | null;
    if (candidate?.status === 'error' && candidate.details?.error === 'DeviceNotRegistered') {
      deviceNotRegistered.add(tokens[index]);
    }
  });

  if (!deviceNotRegistered.size) {
    if (tickets.some((ticket) => ticket.status !== 'ok')) {
      throw new Error('Expo rejected push: ' + JSON.stringify(tickets).slice(0, 350));
    }
    return;
  }

  const { error } = await supabase.from('wish_devices').delete().in('token', [...deviceNotRegistered]);
  if (error) throw error;
  if (tickets.some((ticket) => ticket.status !== 'ok' && ticket.details?.error !== 'DeviceNotRegistered')) {
    throw new Error('Expo rejected some notifications');
  }
}
