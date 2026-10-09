type AuthErrorLike = {
  code?: unknown;
  message?: unknown;
};

const authErrorMessages: Record<string, string> = {
  email_not_confirmed: 'Почта не подтверждена. Запросите новое письмо и откройте самую свежую ссылку.',
  email_exists: 'Аккаунт с этой почтой уже существует.',
  user_already_exists: 'Аккаунт с этой почтой уже существует.',
  invalid_credentials: 'Неверный email или пароль.',
  over_email_send_rate_limit: 'Письма запрашивались слишком часто. Подождите несколько минут и попробуйте ещё раз.',
  over_request_rate_limit: 'Слишком много попыток. Подождите несколько минут и попробуйте ещё раз.',
  signup_disabled: 'Регистрация временно недоступна.',
  email_provider_disabled: 'Регистрация по email временно недоступна.',
  weak_password: 'Пароль слишком простой. Используйте более надёжный пароль.',
  otp_expired: 'Ссылка подтверждения устарела или уже была использована. Запросите новое письмо.',
};

function getAuthErrorDetails(error: unknown): { code?: string; message?: string } {
  if (!error || typeof error !== 'object') return {};
  const authError = error as AuthErrorLike;
  return {
    code: typeof authError.code === 'string' ? authError.code : undefined,
    message: typeof authError.message === 'string' ? authError.message : undefined,
  };
}

export function localizeAuthError(error: unknown): Error & { code?: string } {
  const { code, message } = getAuthErrorDetails(error);
  const normalizedMessage = message?.toLocaleLowerCase('en-US');
  const localizedMessage = (code && authErrorMessages[code])
    || (normalizedMessage?.includes('email not confirmed') ? authErrorMessages.email_not_confirmed : undefined)
    || (message && /[А-Яа-яЁё]/.test(message) ? message : undefined)
    || 'Не удалось выполнить запрос. Проверьте данные и попробуйте ещё раз.';
  return Object.assign(new Error(localizedMessage), { code });
}

export function isEmailNotConfirmedError(error: unknown): boolean {
  const { code, message } = getAuthErrorDetails(error);
  return code === 'email_not_confirmed'
    || message?.toLocaleLowerCase('en-US').includes('email not confirmed') === true
    || message === authErrorMessages.email_not_confirmed;
}
