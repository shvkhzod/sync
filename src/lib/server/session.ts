import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'session';
const TTL_SECONDS = 60 * 60 * 24 * 90;

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET not set');
  return s;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

export function createSession(): string {
  const payload = JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS
  });
  const payloadEnc = b64url(payload);
  const hmac = createHmac('sha256', getSecret()).update(payloadEnc).digest();
  return `${payloadEnc}.${b64url(hmac)}`;
}

export function verifySession(value: string | undefined): boolean {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 2) return false;
  const [payloadEnc, hmacEnc] = parts;

  let expected: Buffer;
  try {
    expected = createHmac('sha256', getSecret()).update(payloadEnc).digest();
  } catch {
    return false;
  }
  const got = fromB64url(hmacEnc);
  if (got.length !== expected.length) return false;
  if (!timingSafeEqual(got, expected)) return false;

  try {
    const payload = JSON.parse(fromB64url(payloadEnc).toString('utf8'));
    if (typeof payload.exp !== 'number') return false;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: TTL_SECONDS
};
