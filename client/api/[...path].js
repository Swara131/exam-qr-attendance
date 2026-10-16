import app, { ready } from '../backend/index.js';

function requestPath(req) {
  if (typeof req.url === 'string' && req.url.startsWith('/api/')) return req.url;
  const raw = req.query?.path;
  const parts = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  if (parts.length === 0) return req.url || '/api';
  const search = typeof req.url === 'string' && req.url.includes('?')
    ? req.url.slice(req.url.indexOf('?'))
    : '';
  return `/api/${parts.join('/')}${search}`;
}

export default async function handler(req, res) {
  try {
    await ready;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'The server could not start. Please try again.' });
    return;
  }

  req.url = requestPath(req);
  return app(req, res);
}
