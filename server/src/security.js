import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'college-demo-secret-please-change';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const actual = Buffer.from(hash, 'hex');
  const expected = crypto.scryptSync(password, salt, 32);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function signSession(user) {
  return jwt.sign(user, SECRET, { expiresIn: '12h', algorithm: 'HS256' });
}

export function readSession(token) {
  return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
}

export function newQrToken() {
  return crypto.randomBytes(24).toString('hex');
}

// QR text format: CEP1.<random exam token>.<signature>
// The code identifies an exam. It does not contain an attendance status.
export function signQrToken(token) {
  const signature = crypto.createHmac('sha256', SECRET).update(token).digest('hex').slice(0, 32);
  return `CEP1.${token}.${signature}`;
}

export function readQrToken(payload) {
  if (typeof payload !== 'string' || payload.length > 500) return null;
  const parts = payload.trim().replace(/\s+/g, '').split('.');
  if (parts.length !== 3 || parts[0] !== 'CEP1') return null;

  const [, token, signature] = parts;
  if (!/^[a-f0-9]{48}$/.test(token) || !/^[a-f0-9]{32}$/.test(signature)) return null;

  const expected = crypto.createHmac('sha256', SECRET).update(token).digest('hex').slice(0, 32);
  const actualBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return token;
}
