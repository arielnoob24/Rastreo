// Códigos de invitación: aleatorios, de un solo uso. En el servidor solo vive su hash SHA-256.

// 32 símbolos sin 0/1/I/O: 12 caracteres = 60 bits. 256 es múltiplo de 32, así que no hay sesgo.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 12;

export function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Quita guiones y espacios y pasa a mayúsculas, para tolerar "abcd-efgh-jklm". */
export function normalizeCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export async function hashCode(input: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeCode(input));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function formatCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, '$1-');
}
