import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const usage = `
Удаление аккаунта Duet по подтверждённому обращению в поддержку.

Проверка без удаления:
  pnpm admin:delete-account -- --email user@example.com

Окончательное удаление:
  pnpm admin:delete-account -- --email user@example.com --execute --confirm user@example.com

Перед запуском задайте SUPABASE_SECRET_KEY только для текущего окна терминала.
Для старых проектов также поддерживается SUPABASE_SERVICE_ROLE_KEY.
Не сохраняйте секретный ключ в .env, приложении или репозитории.
`.trim();

function readProjectUrl() {
  const line = readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith('EXPO_PUBLIC_SUPABASE_URL='));
  const value = line?.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
  if (!value) throw new Error('В .env не найден EXPO_PUBLIC_SUPABASE_URL');
  return value;
}

function readArguments() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return { help: true };

  const valueAfter = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1]?.trim() : undefined;
  };
  const email = valueAfter('--email')?.toLowerCase();
  if (!email || !email.includes('@')) throw new Error('Укажите корректный email через --email');
  return {
    help: false,
    email,
    execute: args.includes('--execute'),
    confirmation: valueAfter('--confirm')?.toLowerCase(),
  };
}

async function findUserByEmail(admin, email) {
  const pageSize = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: pageSize });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < pageSize) return null;
  }
}

async function deleteUserData(admin, userId) {
  const { data, error: beginError } = await admin.rpc('begin_account_deletion', {
    p_user_id: userId,
  });
  if (beginError) throw new Error(`Не удалось подготовить удаление: ${beginError.message}`);

  const photoPaths = Array.isArray(data) ? data.filter((path) => typeof path === 'string') : [];
  for (let offset = 0; offset < photoPaths.length; offset += 100) {
    const { error } = await admin.storage.from('wish-photos').remove(photoPaths.slice(offset, offset + 100));
    if (error) throw new Error(`Не удалось удалить фотографии: ${error.message}`);
  }

  const { error: finalizeError } = await admin.rpc('finalize_account_deletion', {
    p_user_id: userId,
  });
  if (finalizeError) throw new Error(`Не удалось удалить данные: ${finalizeError.message}`);

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) throw new Error(`Не удалось удалить аккаунт авторизации: ${authError.message}`);

  return photoPaths.length;
}

async function main() {
  const options = readArguments();
  if (options.help) {
    console.log(usage);
    return;
  }

  const adminKey = process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!adminKey) {
    throw new Error('Не задана переменная SUPABASE_SECRET_KEY');
  }

  const admin = createClient(readProjectUrl(), adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const user = await findUserByEmail(admin, options.email);
  if (!user) throw new Error(`Аккаунт ${options.email} не найден`);

  console.log(`Найден аккаунт: ${user.email}`);
  console.log(`ID: ${user.id}`);
  console.log(`Создан: ${user.created_at}`);

  if (!options.execute) {
    console.log('\nПроверка завершена. Данные не изменялись.');
    console.log('Для удаления повторите команду с --execute и --confirm, как показано в --help.');
    return;
  }
  if (options.confirmation !== options.email) {
    throw new Error('Для окончательного удаления значение --confirm должно точно совпадать с email');
  }

  const deletedPhotos = await deleteUserData(admin, user.id);
  console.log(`\nАккаунт ${options.email} и связанные данные удалены.`);
  console.log(`Удалено файлов из закрытого хранилища: ${deletedPhotos}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
