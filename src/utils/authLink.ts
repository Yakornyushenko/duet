// Confirmation is performed by Supabase before redirect. Never accept bearer
// credentials from a deep link: an unsolicited link must not change accounts.
export function isAuthConfirmationLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'duet:' && url.hostname === 'auth'
      && (url.pathname === '' || url.pathname === '/') && !url.username && !url.password && !url.port;
  } catch { return false; }
}

export function getEmailConfirmationError(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
    const errorCode = fragment.get('error_code') ?? url.searchParams.get('error_code');
    const error = fragment.get('error') ?? url.searchParams.get('error');
    if (!errorCode && !error) return null;

    if (errorCode === 'otp_expired') {
      return 'Ссылка устарела, уже была использована или относится к удалённому аккаунту. Запросите новое письмо в Duet и откройте самую свежую ссылку.';
    }
    return 'Подтверждение не завершено. Вернитесь в Duet, запросите новое письмо и попробуйте ещё раз.';
  } catch {
    return null;
  }
}
