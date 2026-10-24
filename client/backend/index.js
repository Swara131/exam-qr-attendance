import './load-env.js';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { httpError } from './errors.js';
import { readSession } from './security.js';
import { initStore, storageMode } from './store.js';
import {
  createExam,
  dashboard,
  listAttendance,
  listExams,
  login,
  markPresent,
  openQr,
  payloadForExam,
} from './services.js';

const app = express();
const port = Number(process.env.PORT) || 5000;
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return next(httpError(401, 'Please sign in to continue.'));
  try {
    req.user = readSession(token);
    return next();
  } catch {
    return next(httpError(401, 'Your session has expired. Please sign in again.'));
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return next(httpError(403, 'You do not have permission to do that.'));
    }
    return next();
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, storage: storageMode() });
});

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  res.json(await login(req.body || {}));
}));

app.get('/api/auth/me', requireAuth, (req, res) => {
  const { role, name, staffId, studentId } = req.user;
  res.json({ user: { role, name, staffId, studentId } });
});

app.get('/api/dashboard', requireAuth, asyncRoute(async (req, res) => {
  const summary = await dashboard();
  res.json({ ...summary, storage: storageMode() });
}));

app.get('/api/exams', requireAuth, asyncRoute(async (req, res) => {
  res.json({ exams: await listExams() });
}));

app.post('/api/exams', requireAuth, requireRole('teacher'), asyncRoute(async (req, res) => {
  const exam = await createExam(req.body || {}, req.user.staffId);
  res.status(201).json({
    message: 'Exam saved. Generate a QR code when you are ready to take attendance.',
    exam,
  });
}));

app.post('/api/exams/:id/qr', requireAuth, requireRole('teacher'), asyncRoute(async (req, res) => {
  res.json(await openQr(req.params.id));
}));

app.get('/api/attendance', requireAuth, asyncRoute(async (req, res) => {
  const examId = typeof req.query.examId === 'string' ? req.query.examId : '';
  const attendance = await listAttendance({
    role: req.user.role,
    studentId: req.user.studentId,
    examId,
  });
  res.json({ attendance });
}));

app.post('/api/attendance/mark', requireAuth, requireRole('student'), asyncRoute(async (req, res) => {
  const body = req.body || {};
  const entered = String(body.studentId || '').trim().toUpperCase();
  if (!entered || entered !== req.user.studentId) {
    throw httpError(403, 'Enter the student ID for the account you signed in with.');
  }

  const qrPayload = body.demo ? await payloadForExam(body.examId) : body.qrPayload;
  const attendance = await markPresent({
    studentId: req.user.studentId,
    qrPayload,
    examId: typeof body.examId === 'string' ? body.examId : '',
    live: Boolean(body.live),
  });
  res.status(201).json({
    message: `Attendance marked for ${attendance.examName}.`,
    attendance,
  });
}));

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) next();
    });
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'That page was not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  const message = status >= 500 ? 'Something went wrong. Please try again.' : error.message;
  res.status(status).json({ error: message });
});

const ready = initStore();
const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

export { ready };
export default app;

if (!process.env.VERCEL && isDirectRun) {
  ready
    .then(() => {
      app.listen(port, () => {
        const labels = {
          mongodb: 'MongoDB',
          memory: 'memory',
          file: 'local file (server/data/db.json)',
        };
        console.log(`ExamQR server is running at http://localhost:${port}`);
        console.log(`Storage: ${labels[storageMode()] || storageMode()}`);
        console.log('Teacher login: TCH001 / teacher123');
        console.log('Student login: STU003 / student123');
      });
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
