// Confirmation is performed by Supabase before redirect. Never accept bearer
// credentials from a deep link: an unsolicited link must not change accounts.
export function isAuthConfirmationLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'duet:' && url.hostname === 'auth'
      && (url.pathname === '' || url.pathname === '/') && !url.username && !url.password && !url.port;
  } catch { return false; }
}
