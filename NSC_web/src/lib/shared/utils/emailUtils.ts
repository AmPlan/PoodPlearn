export const emailDomain = "@local.internal";

export function getEmail(account: string): string {
    return account + emailDomain;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
