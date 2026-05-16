import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { verifyPassword } from './password';

const HASH = bcrypt.hashSync('correct-horse-battery-staple', 12);

describe('verifyPassword', () => {
  it('returns true for the correct password', async () => {
    expect(await verifyPassword('correct-horse-battery-staple', HASH)).toBe(true);
  });

  it('returns false for a wrong password', async () => {
    expect(await verifyPassword('wrong', HASH)).toBe(false);
  });

  it('returns false for empty password', async () => {
    expect(await verifyPassword('', HASH)).toBe(false);
  });

  it('returns false for empty hash', async () => {
    expect(await verifyPassword('correct-horse-battery-staple', '')).toBe(false);
  });

  it('returns false for a malformed hash without throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-bcrypt-hash')).toBe(false);
  });
});
