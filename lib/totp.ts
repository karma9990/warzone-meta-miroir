import { createHmac, timingSafeEqual } from 'crypto';

// Minimal RFC 6238 TOTP verifier (SHA-1, 6 digits, 30s step) with no external
// dependency. Used to add an optional second factor to the admin login: when
// ADMIN_TOTP_SECRET is set, a valid code is required in addition to the password.

function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.replace(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }

  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  // JS bitwise ops are 32-bit; write the counter as two 32-bit halves.
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac('sha1', secret).update(buf).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (binary % 1_000_000).toString().padStart(6, '0');
}

// Verifies a 6-digit code against the base32 secret, allowing +/- 1 time step
// (90s total window) to tolerate clock drift.
export function verifyTotp(code: string, secret: string, window = 1): boolean {
  const normalized = (code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized) || !secret) return false;

  const key = base32Decode(secret);
  if (key.length === 0) return false;

  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = hotp(key, counter + offset);
    const a = Buffer.from(expected);
    const b = Buffer.from(normalized);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }

  return false;
}

export function isTotpEnabled(): boolean {
  return Boolean(process.env.ADMIN_TOTP_SECRET);
}
