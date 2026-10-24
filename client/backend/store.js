import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { httpError } from './errors.js';
import { buildSample, sampleSchedule } from './sample.js';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../server/data');
const dbPath = path.join(dataDir, 'db.json');

const teacherSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    staffId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
  },
  { versionKey: false },
);

const studentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    studentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
  },
  { versionKey: false },
);

const examSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    classroom: { type: String, required: true },
    qrToken: { type: String, unique: true, sparse: true },
    isSample: { type: Boolean, default: false },
    createdBy: String,
    createdAt: String,
  },
  { versionKey: false },
);

const attendanceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    examId: { type: String, required: true },
    examName: { type: String, required: true },
    status: { type: String, required: true },
    markedAt: { type: String, required: true },
    isSample: { type: Boolean, default: false },
  },
  { versionKey: false },
);

attendanceSchema.index({ studentId: 1, examId: 1 }, { unique: true });

const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
const Exam = mongoose.models.Exam || mongoose.model('Exam', examSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

let backend = null;
let mode = 'file';

function plain(doc) {
  if (!doc) return null;
  const value = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete value._id;
  return value;
}

function withoutEmptyToken(exam) {
  const copy = { ...exam };
  if (!copy.qrToken) delete copy.qrToken;
  return copy;
}

class FileStore {
  constructor(data, options = {}) {
    this.data = data;
    this.queue = Promise.resolve();
    this.persist = options.persist !== false;
  }

  static memory() {
    return new FileStore(
      { teachers: [], students: [], exams: [], attendance: [] },
      { persist: false },
    );
  }

  static async open() {
    await fs.mkdir(dataDir, { recursive: true });
    try {
      const parsed = JSON.parse(await fs.readFile(dbPath, 'utf8'));
      const data = {
        teachers: Array.isArray(parsed.teachers) ? parsed.teachers : [],
        students: Array.isArray(parsed.students) ? parsed.students : [],
        exams: Array.isArray(parsed.exams) ? parsed.exams : [],
        attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
      };
      return new FileStore(data);
    } catch {
      return new FileStore({ teachers: [], students: [], exams: [], attendance: [] });
    }
  }

  async save() {
    if (!this.persist) return;
    const snapshot = JSON.stringify(this.data, null, 2);
    this.queue = this.queue
      .then(() => fs.writeFile(dbPath, snapshot, 'utf8'))
      .catch((error) => {
        console.error('Could not save the local database.', error);
      });
    return this.queue;
  }

  async countStudents() {
    return this.data.students.length;
  }

  async findTeacher(staffId) {
    return this.data.teachers.find((teacher) => teacher.staffId === staffId) || null;
  }

  async findStudent(studentId) {
    return this.data.students.find((student) => student.studentId === studentId) || null;
  }

  async ensureStudent({ studentId, name }) {
    const existing = await this.findStudent(studentId);
    if (existing) return existing;
    const student = {
      id: crypto.randomUUID(),
      studentId,
      name: name || `Student ${studentId}`,
      passwordHash: 'open',
    };
    this.data.students.push(student);
    await this.save();
    return { ...student };
  }

  async listExams() {
    return this.data.exams.map((exam) => ({ ...exam }));
  }

  async findExamById(id) {
    const exam = this.data.exams.find((item) => item.id === id);
    return exam ? { ...exam } : null;
  }

  async findExamByToken(qrToken) {
    const exam = this.data.exams.find((item) => item.qrToken && item.qrToken === qrToken);
    return exam ? { ...exam } : null;
  }

  async insertExam(exam) {
    this.data.exams.push(exam);
    await this.save();
    return exam;
  }

  async ensureQrToken(id, token) {
    const exam = this.data.exams.find((item) => item.id === id);
    if (!exam) return null;
    const created = !exam.qrToken;
    if (created) exam.qrToken = token;
    await this.save();
    return { exam: { ...exam }, created };
  }

  async listAttendance() {
    return this.data.attendance.map((record) => ({ ...record }));
  }

  async findAttendance(studentId, examId) {
    return this.data.attendance.find((record) => record.studentId === studentId && record.examId === examId) || null;
  }

  async insertAttendance(record) {
    const exists = this.data.attendance.some(
      (item) => item.studentId === record.studentId && item.examId === record.examId,
    );
    if (exists) throw httpError(409, 'Attendance is already recorded for this student and exam.');
    this.data.attendance.push(record);
    await this.save();
    return record;
  }

  async replaceAll(data) {
    this.data = data;
    await this.save();
  }

  async refreshDemoSchedule() {
    const now = new Date().toISOString();
    for (const row of sampleSchedule()) {
      const exam = this.data.exams.find((item) => item.id === row.id);
      if (!exam) continue;
      exam.date = row.date;
      exam.time = row.time;
    }
    for (const record of this.data.attendance) {
      if (record.isSample) record.markedAt = now;
    }
    await this.save();
  }
}

class MongoStore {
  async countStudents() {
    return Student.countDocuments();
  }

  async findTeacher(staffId) {
    return plain(await Teacher.findOne({ staffId }).lean());
  }

  async findStudent(studentId) {
    return plain(await Student.findOne({ studentId }).lean());
  }

  async ensureStudent({ studentId, name }) {
    const existing = await this.findStudent(studentId);
    if (existing) return existing;
    const student = {
      id: crypto.randomUUID(),
      studentId,
      name: name || `Student ${studentId}`,
      passwordHash: 'open',
    };
    await Student.create(student);
    return student;
  }

  async listExams() {
    return (await Exam.find().lean()).map(plain);
  }

  async findExamById(id) {
    return plain(await Exam.findOne({ id }).lean());
  }

  async findExamByToken(qrToken) {
    return plain(await Exam.findOne({ qrToken }).lean());
  }

  async insertExam(exam) {
    await Exam.create(withoutEmptyToken(exam));
    return exam;
  }

  async ensureQrToken(id, token) {
    const exam = await Exam.findOne({ id });
    if (!exam) return null;
    const created = !exam.qrToken;
    if (created) {
      exam.qrToken = token;
      await exam.save();
    }
    return { exam: plain(exam), created };
  }

  async listAttendance() {
    return (await Attendance.find().lean()).map(plain);
  }

  async findAttendance(studentId, examId) {
    return plain(await Attendance.findOne({ studentId, examId }).lean());
  }

  async insertAttendance(record) {
    try {
      await Attendance.create(record);
    } catch (error) {
      if (error?.code === 11000) {
        throw httpError(409, 'Attendance is already recorded for this student and exam.');
      }
      throw error;
    }
    return record;
  }

  async replaceAll(data) {
    await Promise.all([
      Teacher.deleteMany({}),
      Student.deleteMany({}),
      Exam.deleteMany({}),
      Attendance.deleteMany({}),
    ]);
    await Teacher.insertMany(data.teachers);
    await Student.insertMany(data.students);
    await Exam.insertMany(data.exams.map(withoutEmptyToken));
    await Attendance.insertMany(data.attendance);
  }

  async refreshDemoSchedule() {
    const now = new Date().toISOString();
    for (const row of sampleSchedule()) {
      await Exam.updateOne({ id: row.id }, { $set: { date: row.date, time: row.time } });
    }
    await Attendance.updateMany({ isSample: true }, { $set: { markedAt: now } });
  }
}

export function storageMode() {
  return mode;
}

export function getStore() {
  if (!backend) throw httpError(500, 'The server is still starting.');
  return backend;
}

async function useLocalStore() {
  if (process.env.VERCEL) {
    backend = FileStore.memory();
    mode = 'memory';
    console.log('Vercel is using demo data in memory.');
    return;
  }
  backend = await FileStore.open();
  mode = 'file';
  console.log('Saving demo data in server/data/db.json.');
}

export async function initStore() {
  const uri = process.env.MONGODB_URI;
  if (uri && !process.env.VERCEL) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
        family: 4,
      });
      backend = new MongoStore();
      mode = 'mongodb';
      console.log('Connected to MongoDB.');
    } catch (error) {
      console.warn(`MongoDB is not available (${error.message}).`);
      await useLocalStore();
    }
  } else if (uri && process.env.VERCEL) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        family: 4,
      });
      backend = new MongoStore();
      mode = 'mongodb';
      console.log('Connected to MongoDB.');
    } catch (error) {
      console.warn(`MongoDB is not available (${error.message}).`);
      await useLocalStore();
    }
  } else {
    await useLocalStore();
  }

  const studentCount = await backend.countStudents();
  if (studentCount === 0) {
    await backend.replaceAll(buildSample());
    console.log('Loaded sample students, exams, and attendance.');
  } else {
    await backend.refreshDemoSchedule();
  }
}
