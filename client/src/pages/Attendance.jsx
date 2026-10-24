import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import Scanner from '../components/Scanner';
import { Banner, Card, PageHeader, PresentBadge, PrimaryButton, SelectField, TextField } from '../components/ui';
import { formatMarked } from '../utils';

export default function Attendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [studentId, setStudentId] = useState(user.studentId || '');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [paste, setPaste] = useState('');
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const isStudent = user.role === 'student';

  const load = useCallback(async () => {
    try {
      const [attendanceData, examData] = await Promise.all([
        api('/api/attendance'),
        api('/api/exams'),
      ]);
      setRecords(attendanceData.attendance);
      setExams(examData.exams);
      setSelectedExamId((current) => {
        if (current) return current;
        const preferred = examData.exams.find((exam) => exam.hasQr && exam.windowStatus === 'open');
        return preferred?.id || examData.exams[0]?.id || '';
      });
    } catch (error) {
      setBanner({ tone: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Attendance · ExamQR';
    load();
  }, [load]);

  const visible = examId ? records.filter((record) => record.examId === examId) : records;
  const selectedExam = exams.find((exam) => exam.id === selectedExamId);

  async function mark({ qrPayload, demo }) {
    if (!isStudent || busyRef.current) return;
    const entered = studentId.trim().toUpperCase();
    if (entered !== user.studentId) {
      setBanner({ tone: 'error', text: 'Enter the student ID for the account you signed in with.' });
      return;
    }
    if (!demo && !String(qrPayload || '').trim()) {
      setBanner({ tone: 'error', text: 'Scan a QR code or paste the code text.' });
      return;
    }
    if (demo && !selectedExamId) {
      setBanner({ tone: 'error', text: 'Choose an exam to simulate a scan.' });
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setBanner(null);
    try {
      const data = await api('/api/attendance/mark', {
        method: 'POST',
        body: {
          studentId: entered,
          ...(demo ? { examId: selectedExamId, demo: true } : { qrPayload, examId: selectedExamId, live: true }),
        },
      });
      setPaste('');
      setBanner({ tone: 'success', text: data.message });
      await load();
    } catch (error) {
      setBanner({ tone: 'error', text: error.message });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const markRef = useRef(mark);
  markRef.current = mark;

  const onScan = useCallback((text) => {
    markRef.current({ qrPayload: text, live: true });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle={
          isStudent
            ? 'The camera starts immediately. Point it at any QR code and attendance is marked in real time.'
            : 'Review who has scanned in. Students mark attendance from their own accounts.'
        }
      />

      <div aria-live="polite">{banner && <Banner tone={banner.tone}>{banner.text}</Banner>}</div>

      {isStudent && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Mark your attendance</h2>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as {user.name}. Any QR code marks the open exam. The same student is recorded once.
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <TextField
                label="Student ID"
                name="studentId"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                autoCapitalize="characters"
                spellCheck={false}
              />
              <Scanner onScan={onScan} disabled={busy} />
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <h3 className="text-sm font-semibold text-blue-900">No camera? Use a demo scan</h3>
                <p className="mt-1 text-sm text-blue-800">
                  This uses the exam's real QR code and runs the same window, signature, and duplicate checks.
                </p>
                <div className="mt-3 space-y-3">
                  <SelectField
                    label="Exam"
                    name="demoExam"
                    value={selectedExamId}
                    onChange={(event) => setSelectedExamId(event.target.value)}
                  >
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name} — {exam.subject}
                      </option>
                    ))}
                  </SelectField>
                  {selectedExam && (
                    <p className="text-sm text-blue-800">
                      {selectedExam.hasQr
                        ? selectedExam.windowStatus === 'open'
                          ? 'This exam is open for attendance.'
                          : 'This exam is outside the attendance window, so the server will reject the scan.'
                        : 'This exam has no QR code yet. Generate one from Manage Exams first.'}
                    </p>
                  )}
                  <PrimaryButton type="button" onClick={() => mark({ demo: true })} disabled={busy}>
                    {busy ? 'Checking…' : 'Simulate scan'}
                  </PrimaryButton>
                </div>
              </div>
              <details className="rounded-2xl border border-slate-200 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">Paste QR text instead</summary>
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">QR code text</span>
                    <textarea
                      value={paste}
                      onChange={(event) => setPaste(event.target.value)}
                      rows={3}
                      placeholder="CEP1..."
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                  <PrimaryButton type="button" onClick={() => mark({ qrPayload: paste })} disabled={busy}>
                    Submit pasted code
                  </PrimaryButton>
                </div>
              </details>
            </div>
          </div>
        </Card>
      )}

      {!isStudent && (
        <Banner tone="info">
          Sample students use IDs STU001 to STU005 and password student123. STU001 and STU002 are already marked present for the midterm.
        </Banner>
      )}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isStudent ? 'Your records' : 'Attendance records'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? 'Loading records…' : `${visible.length} record${visible.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="w-full sm:w-64">
            <SelectField label="Filter by exam" name="examFilter" value={examId} onChange={(event) => setExamId(event.target.value)}>
              <option value="">All exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </SelectField>
          </div>
        </div>

        {!loading && visible.length === 0 && (
          <p className="mt-6 text-sm text-slate-500">
            {isStudent
              ? 'You have not marked attendance yet.'
              : 'No attendance yet. Records appear here after a student scans an open exam.'}
          </p>
        )}

        {visible.length > 0 && (
          <>
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">Student ID</th>
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Exam</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Marked at</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((record) => (
                    <tr key={record.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4 font-medium text-slate-900">{record.studentId}</td>
                      <td className="py-3 pr-4 text-slate-700">{record.studentName}</td>
                      <td className="py-3 pr-4 text-slate-700">{record.examName}</td>
                      <td className="py-3 pr-4"><PresentBadge /></td>
                      <td className="py-3 text-slate-500">{formatMarked(record.markedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-3 md:hidden">
              {visible.map((record) => (
                <article key={record.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{record.studentName}</p>
                      <p className="text-sm text-slate-500">{record.studentId}</p>
                    </div>
                    <PresentBadge />
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{record.examName}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatMarked(record.markedAt)}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
