const bcrypt = require('bcryptjs');

const ROUNDS = 10;
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/;

function looksLikeHash(value) {
  return typeof value === 'string' && BCRYPT_RE.test(value);
}

function hashPasswordSync(plain) {
  return bcrypt.hashSync(String(plain), ROUNDS);
}

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), ROUNDS);
}

async function verifyPassword(plain, stored) {
  if (!stored) {
    return false;
  }

  if (looksLikeHash(stored)) {
    return bcrypt.compare(String(plain), stored);
  }

  return String(plain) === String(stored);
}

module.exports = {
  looksLikeHash,
  hashPassword,
  hashPasswordSync,
  verifyPassword
};
