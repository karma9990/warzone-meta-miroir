// Generates an ADMIN_TOTP_SECRET (base32) and the otpauth:// URL to enroll it
// in an authenticator app (Google Authenticator, Aegis, 1Password, ...).
//
//   node scripts/gen-admin-totp.mjs
//
// Then set the printed ADMIN_TOTP_SECRET in your environment (Vercel / .env)
// and scan the otpauth URL. Once set, the admin login requires the 6-digit code
// in addition to the password. Unset the env var to disable 2FA.

import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(value >>> bits) & 31];
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

const secret = base32Encode(randomBytes(20));
const issuer = 'WZPRO Meta';
const account = 'admin';
const url = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

console.log('\nADMIN_TOTP_SECRET=' + secret);
console.log('\notpauth URL (scan this in your authenticator app):');
console.log(url);
console.log('\nQR: paste the otpauth URL into https://www.qr-code-generator.com/ or any QR tool.\n');
