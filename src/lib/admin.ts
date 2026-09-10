export const ADMIN_EMAIL = 'bnovichkoff@yandex.ru';

export function isAdminEmail(email?: string | null): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}
