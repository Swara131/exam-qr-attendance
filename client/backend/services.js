import crypto from 'crypto';
import { httpError } from './errors.js';
import { getStore } from './store.js';
import { verifyPassword, signSession, newQrToken, signQrToken, readQrToken } from './security.js';
import {
  attendanceWindow,
  formatRange,
  parseStart,
  toPublicAttendance,
  toPublicExam,
  windowStatus,
} from './examTime.js';

function cleanText(value, min, max, message) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (text.length < min || text.length > max) throw httpError(400, message);
  return text;
}

function normalizeDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month || parsed.getDate() !== day) return null;
  return value;
}

function normalizeTime(value) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value || ''));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${match[1]}:${match[2]}`;
}

function isToday(iso) {
  const value = new Date(iso);
  const now = new Date();
  return (
    value.getFullYear() === now.getFullYear()
    && value.getMonth() === now.getMonth()
    && value.getDate() === now.getDate()
  );
}

function sortBySchedule(exams) {
  return [...exams].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export async function login(body) {
  const role = body.role;
  const identifier = String(body.identifier || '').trim().toUpperCase();
  const password = String(body.password || '');
  if (!identifier || !password) throw httpError(400, 'Enter your ID and password.');

  const store = getStore();
  if (role === 'teacher') {
    const teacher = await store.findTeacher(identifier);
    if (!teacher || !verifyPassword(password, teacher.passwordHash)) {
      throw httpError(401, 'Those sign-in details do not match our records.');
    }
    const user = { role: 'teacher', name: teacher.name, staffId: teacher.staffId };
    return { token: signSession(user), user };
  }

  if (role === 'student') {
    const student = await store.findStudent(identifier);
    if (!student || !verifyPassword(password, student.passwordHash)) {
      throw httpError(401, 'Those sign-in details do not match our records.');
    }
    const user = { role: 'student', name: student.name, studentId: student.studentId };
    return { token: signSession(user), user };
  }

  throw httpError(400, 'Choose a teacher or student account.');
}

export async function dashboard() {
  const store = getStore();
  const [studentCount, exams, attendance] = await Promise.all([
    store.countStudents(),
    store.listExams(),
    store.listAttendance(),
  ]);
  const now = new Date();
  const upcomingExams = sortBySchedule(exams)
    .map(toPublicExam)
    .filter((exam) => new Date(exam.closesAt) >= now)
    .slice(0, 5);

  return {
    studentCount,
    examCount: exams.length,
    todayAttendance: attendance.filter((record) => isToday(record.markedAt)).length,
    upcomingExams,
  };
}

export async function listExams() {
  const exams = await getStore().listExams();
  return sortBySchedule(exams).map(toPublicExam);
}

export async function createExam(input, staffId) {
  const name = cleanText(input.name, 3, 80, 'Enter an exam name (at least 3 characters).');
  const subject = cleanText(input.subject, 2, 80, 'Enter the subject.');
  const classroom = cleanText(input.classroom, 2, 40, 'Enter the classroom.');
  const date = normalizeDate(input.date);
  const time = normalizeTime(input.time);
  if (!date) throw httpError(400, 'Enter a valid exam date.');
  if (!time) throw httpError(400, 'Enter a valid exam time.');

  const exam = {
    id: crypto.randomUUID(),
    name,
    subject,
    date,
    time,
    classroom,
    qrToken: null,
    isSample: false,
    createdBy: staffId,
    createdAt: new Date().toISOString(),
  };

  if (Number.isNaN(parseStart(exam).getTime())) {
    throw httpError(400, 'Enter a valid exam date and time.');
  }

  await getStore().insertExam(exam);
  return toPublicExam(exam);
}

export async function openQr(examId) {
  const store = getStore();
  const existing = await store.findExamById(examId);
  if (!existing) throw httpError(404, 'That exam could not be found.');

  const result = await store.ensureQrToken(examId, newQrToken());
  if (!result) throw httpError(404, 'That exam could not be found.');

  return {
    created: result.created,
    message: result.created
      ? 'QR code generated. Display it for students to scan.'
      : 'This exam already has a QR code.',
    payload: signQrToken(result.exam.qrToken),
    exam: toPublicExam(result.exam),
  };
}

export async function payloadForExam(examId) {
  if (typeof examId !== 'string' || examId.length < 1 || examId.length > 80) {
    throw httpError(400, 'Choose an exam for a demo scan.');
  }
  const exam = await getStore().findExamById(examId);
  if (!exam) throw httpError(404, 'That exam could not be found.');
  if (!exam.qrToken) {
    throw httpError(400, 'This exam does not have a QR code yet. Ask a teacher to generate one.');
  }
  return signQrToken(exam.qrToken);
}

export async function markPresent({ studentId, qrPayload }) {
  const payload = String(qrPayload || '');
  if (!payload.trim()) throw httpError(400, 'Scan a QR code or choose an exam for a demo scan.');

  const token = readQrToken(payload);
  if (!token) {
    throw httpError(400, 'This QR code could not be verified. Use the code displayed by your teacher.');
  }

  const exam = await getStore().findExamByToken(token);
  if (!exam) throw httpError(404, 'No exam matches this QR code.');

  const status = windowStatus(exam);
  const { opens, closes } = attendanceWindow(exam);
  if (status === 'upcoming') {
    throw httpError(400, `Attendance is not open yet. Students can scan from ${formatRange(opens, closes)}.`);
  }
  if (status === 'closed') {
    throw httpError(400, `The attendance window has closed. It was open from ${formatRange(opens, closes)}.`);
  }

  const student = await getStore().findStudent(studentId);
  if (!student) throw httpError(404, 'That student ID was not found.');

  const alreadyMarked = await getStore().findAttendance(student.studentId, exam.id);
  if (alreadyMarked) {
    throw httpError(409, 'Attendance is already recorded for this student and exam.');
  }

  const record = {
    id: crypto.randomUUID(),
    studentId: student.studentId,
    studentName: student.name,
    examId: exam.id,
    examName: exam.name,
    status: 'Present',
    markedAt: new Date().toISOString(),
    isSample: false,
  };

  await getStore().insertAttendance(record);
  return toPublicAttendance(record);
}

export async function listAttendance({ role, studentId, examId }) {
  let records = await getStore().listAttendance();
  if (role === 'student') records = records.filter((record) => record.studentId === studentId);
  if (examId) records = records.filter((record) => record.examId === examId);
  records.sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));
  return records.map(toPublicAttendance);
}
