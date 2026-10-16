import crypto from 'crypto';
import { hashPassword } from './security.js';

function demoToken(id) {
  return crypto.createHash('sha256').update(`examqr-demo-${id}`).digest('hex').slice(0, 48);
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function dateOnly(value) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function timeOnly(value) {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function shift(minutes, dayOffset = 0) {
  const value = new Date();
  value.setDate(value.getDate() + dayOffset);
  value.setMinutes(value.getMinutes() + minutes);
  return value;
}

export function sampleSchedule() {
  const midterm = shift(-15);
  const quiz = shift(180);
  const finalExam = shift(0, 1);
  finalExam.setHours(10, 0, 0, 0);

  return [
    { id: 'exam-ds-midterm', date: dateOnly(midterm), time: timeOnly(midterm) },
    { id: 'exam-db-quiz', date: dateOnly(quiz), time: timeOnly(quiz) },
    { id: 'exam-os-final', date: dateOnly(finalExam), time: '10:00' },
  ];
}

export function buildSample() {
  const schedule = Object.fromEntries(sampleSchedule().map((row) => [row.id, row]));
  const createdAt = new Date().toISOString();

  const students = [
    ['stu-aisha', 'STU001', 'Aisha Khan'],
    ['stu-rohan', 'STU002', 'Rohan Mehta'],
    ['stu-priya', 'STU003', 'Priya Sharma'],
    ['stu-arjun', 'STU004', 'Arjun Patel'],
    ['stu-sneha', 'STU005', 'Sneha Iyer'],
  ].map(([id, studentId, name]) => ({
    id,
    studentId,
    name,
    passwordHash: hashPassword('student123'),
  }));

  return {
    teachers: [
      {
        id: 'tch-ananya',
        staffId: 'TCH001',
        name: 'Dr. Ananya Rao',
        passwordHash: hashPassword('teacher123'),
      },
    ],
    students,
    exams: [
      {
        id: 'exam-ds-midterm',
        name: 'Midterm Examination',
        subject: 'Data Structures',
        date: schedule['exam-ds-midterm'].date,
        time: schedule['exam-ds-midterm'].time,
        classroom: 'Room 204',
        qrToken: demoToken('exam-ds-midterm'),
        isSample: true,
        createdBy: 'TCH001',
        createdAt,
      },
      {
        id: 'exam-db-quiz',
        name: 'Lab Quiz',
        subject: 'Database Systems',
        date: schedule['exam-db-quiz'].date,
        time: schedule['exam-db-quiz'].time,
        classroom: 'Lab 110',
        qrToken: null,
        isSample: true,
        createdBy: 'TCH001',
        createdAt,
      },
      {
        id: 'exam-os-final',
        name: 'Final Examination',
        subject: 'Operating Systems',
        date: schedule['exam-os-final'].date,
        time: schedule['exam-os-final'].time,
        classroom: 'Hall B',
        qrToken: null,
        isSample: true,
        createdBy: 'TCH001',
        createdAt,
      },
    ],
    attendance: [
      {
        id: 'att-aisha-ds',
        studentId: 'STU001',
        studentName: 'Aisha Khan',
        examId: 'exam-ds-midterm',
        examName: 'Midterm Examination',
        status: 'Present',
        markedAt: createdAt,
        isSample: true,
      },
      {
        id: 'att-rohan-ds',
        studentId: 'STU002',
        studentName: 'Rohan Mehta',
        examId: 'exam-ds-midterm',
        examName: 'Midterm Examination',
        status: 'Present',
        markedAt: createdAt,
        isSample: true,
      },
    ],
  };
}
