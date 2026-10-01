export const ACCOUNT_REGEX = /^HN\d{6}$/;


export function isValidGender(value: string | undefined): value is 'MALE' | 'FEMALE' | 'OTHER' {
    return value === 'MALE' || value === 'FEMALE' || value === 'OTHER';
}
