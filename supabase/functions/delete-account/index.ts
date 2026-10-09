import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: { confirmation?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (body.confirmation !== 'DELETE_MY_ACCOUNT') {
    return json({ error: 'Confirmation required' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Missing Supabase env' }, 500);
  }

  const sessionClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: userError } = await sessionClient.auth.getUser();
  if (userError || !user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error: beginError } = await admin.rpc('begin_account_deletion', {
    p_user_id: user.id,
  });
  if (beginError) {
    console.error('Account deletion preparation failed:', beginError.message);
    return json({ error: 'Не удалось подготовить удаление аккаунта' }, 500);
  }

  const photoPaths = Array.isArray(data) ? data.filter((path): path is string => typeof path === 'string') : [];
  for (let offset = 0; offset < photoPaths.length; offset += 100) {
    const { error: storageError } = await admin.storage
      .from('wish-photos')
      .remove(photoPaths.slice(offset, offset + 100));
    if (storageError) {
      console.error('Account photo cleanup failed:', storageError.message);
      return json({ error: 'Не удалось удалить фотографии аккаунта' }, 500);
    }
  }

  const { error: finalizeError } = await admin.rpc('finalize_account_deletion', {
    p_user_id: user.id,
  });
  if (finalizeError) {
    console.error('Account data cleanup failed:', finalizeError.message);
    return json({ error: 'Не удалось удалить данные аккаунта' }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);
  if (deleteError) {
    console.error('Auth account deletion failed:', deleteError.message);
    return json({ error: 'Не удалось удалить аккаунт' }, 500);
  }

  return json({ deleted: true });
});
