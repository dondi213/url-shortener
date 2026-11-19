const crypto = require('node:crypto');

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Random base62 code. 7 chars = 62^7 ≈ 3.5 trillion combinations. */
function generateCode(length = 7) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }
  return code;
}

module.exports = { generateCode };
