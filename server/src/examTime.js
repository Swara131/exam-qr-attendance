const OPEN_BEFORE_MS = 30 * 60 * 1000;
const CLOSE_AFTER_MS = 2 * 60 * 60 * 1000;

export function parseStart(exam) {
  return new Date(`${exam.date}T${exam.time}:00`);
}

export function attendanceWindow(exam) {
  const start = parseStart(exam);
  return {
    start,
    opens: new Date(start.getTime() - OPEN_BEFORE_MS),
    closes: new Date(start.getTime() + CLOSE_AFTER_MS),
  };
}

export function windowStatus(exam, now = new Date()) {
  const { start, opens, closes } = attendanceWindow(exam);
  if (Number.isNaN(start.getTime())) return 'closed';
  if (now < opens) return 'upcoming';
  if (now > closes) return 'closed';
  return 'open';
}

export function formatRange(opens, closes) {
  const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  return `${opens.toLocaleString(undefined, options)} to ${closes.toLocaleString(undefined, options)}`;
}

export function toPublicExam(exam) {
  const { opens, closes } = attendanceWindow(exam);
  return {
    id: exam.id,
    name: exam.name,
    subject: exam.subject,
    date: exam.date,
    time: exam.time,
    classroom: exam.classroom,
    hasQr: Boolean(exam.qrToken),
    windowStatus: windowStatus(exam),
    opensAt: opens.toISOString(),
    closesAt: closes.toISOString(),
  };
}

export function toPublicAttendance(record) {
  return {
    id: record.id,
    studentId: record.studentId,
    studentName: record.studentName,
    examId: record.examId,
    examName: record.examName,
    status: record.status,
    markedAt: record.markedAt,
  };
}
