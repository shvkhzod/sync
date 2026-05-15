import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const ORIGINAL_SECRET = process.env.SESSION_SECRET;

beforeEach(() => {
  process.env.SESSION_SECRET = 'a'.repeat(64);
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = ORIGINAL_SECRET;
});

describe('session', () => {
  it('round-trips: a created session verifies', async () => {
    const { createSession, verifySession } = await import('./session');
    const cookie = createSession();
    expect(verifySession(cookie)).toBe(true);
  });

  it('rejects undefined and empty input', async () => {
    const { verifySession } = await import('./session');
    expect(verifySession(undefined)).toBe(false);
    expect(verifySession('')).toBe(false);
  });

  it('rejects a malformed cookie (no dot)', async () => {
    const { verifySession } = await import('./session');
    expect(verifySession('not-a-cookie')).toBe(false);
  });

  it('rejects a tampered payload', async () => {
    const { createSession, verifySession } = await import('./session');
    const cookie = createSession();
    const [, hmac] = cookie.split('.');
    const tampered = Buffer.from(JSON.stringify({ exp: 9999999999 })).toString('base64url') + '.' + hmac;
    expect(verifySession(tampered)).toBe(false);
  });

  it('rejects a tampered HMAC', async () => {
    const { createSession, verifySession } = await import('./session');
    const cookie = createSession();
    const [payload] = cookie.split('.');
    const tampered = payload + '.' + Buffer.alloc(32, 0).toString('base64url');
    expect(verifySession(tampered)).toBe(false);
  });

  it('rejects an expired session', async () => {
    const crypto = await import('node:crypto');
    process.env.SESSION_SECRET = 'a'.repeat(64);
    const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 1 })).toString('base64url');
    const hmac = crypto.createHmac('sha256', process.env.SESSION_SECRET!).update(payload).digest().toString('base64url');
    const { verifySession } = await import('./session');
    expect(verifySession(`${payload}.${hmac}`)).toBe(false);
  });

  it('rejects a cookie signed with a different secret', async () => {
    const { createSession, verifySession } = await import('./session');
    const cookie = createSession();
    process.env.SESSION_SECRET = 'b'.repeat(64);
    expect(verifySession(cookie)).toBe(false);
  });
});
