import { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import QrModal from '../components/QrModal';
import { Banner, Card, PageHeader, PrimaryButton, TextField, WindowBadge } from '../components/ui';
import { defaultExamSchedule, formatExamWhen, formatWindow, previewWindow } from '../utils';

function emptyExam() {
  return { name: '', subject: '', classroom: '', ...defaultExamSchedule() };
}

function validate(form) {
  if (form.name.trim().length < 3) return 'Enter an exam name (at least 3 characters).';
  if (form.subject.trim().length < 2) return 'Enter the subject.';
  if (!form.date) return 'Enter the exam date.';
  if (!form.time) return 'Enter the exam time.';
  if (form.classroom.trim().length < 2) return 'Enter the classroom.';
  return '';
}

export default function Exams() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [form, setForm] = useState(emptyExam);
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrBusy, setQrBusy] = useState('');
  const [qr, setQr] = useState(null);
  const isTeacher = user.role === 'teacher';

  useEffect(() => {
    document.title = 'Manage Exams · ExamQR';
    load();
  }, []);

  async function load() {
    try {
      const data = await api('/api/exams');
      setExams(data.exams);
    } catch (error) {
      setBanner({ tone: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    const problem = validate(form);
    if (problem) {
      setBanner({ tone: 'error', text: problem });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      const data = await api('/api/exams', { method: 'POST', body: form });
      setBanner({ tone: 'success', text: data.message });
      setForm(emptyExam());
      await load();
    } catch (error) {
      setBanner({ tone: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function openQr(exam) {
    setQrBusy(exam.id);
    setBanner(null);
    try {
      const data = await api(`/api/exams/${exam.id}/qr`, { method: 'POST' });
      setQr({ exam: data.exam, payload: data.payload });
      if (data.created) setBanner({ tone: 'success', text: data.message });
      await load();
    } catch (error) {
      setBanner({ tone: 'error', text: error.message });
    } finally {
      setQrBusy('');
    }
  }

  const windowPreview = previewWindow(form.date, form.time);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage exams"
        subtitle={
          isTeacher
            ? 'Create an exam, then generate a QR code to display in the classroom.'
            : 'These are the exams your teacher has scheduled. Only teachers can create exams and QR codes.'
        }
      />

      {banner && <Banner tone={banner.tone}>{banner.text}</Banner>}
      {!isTeacher && (
        <Banner tone="info">Ask your teacher to display the QR code, then open Attendance to scan it.</Banner>
      )}

      <div className={`grid gap-6 ${isTeacher ? 'lg:grid-cols-5' : ''}`}>
        {isTeacher && (
          <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Create an exam</h2>
            <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
              <TextField label="Exam name" name="name" value={form.name} onChange={update} maxLength={80} placeholder="Midterm Examination" />
              <TextField label="Subject" name="subject" value={form.subject} onChange={update} maxLength={80} placeholder="Data Structures" />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Date" name="date" type="date" value={form.date} onChange={update} />
                <TextField label="Time" name="time" type="time" value={form.time} onChange={update} />
              </div>
              <TextField
                label="Classroom"
                name="classroom"
                value={form.classroom}
                onChange={update}
                maxLength={40}
                placeholder="Room 204"
                hint={
                  windowPreview
                    ? `Students can scan from ${windowPreview}. Leave the time a few minutes in the past if you want the window open for a live demo.`
                    : 'Students can scan from 30 minutes before the start until 2 hours after.'
                }
              />
              <PrimaryButton type="submit" disabled={saving} className="w-full">
                {saving ? 'Saving…' : 'Save exam'}
              </PrimaryButton>
            </form>
          </Card>
        )}

        <Card className={isTeacher ? 'lg:col-span-3' : ''}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Scheduled exams</h2>
            <span className="text-sm text-slate-500">{loading ? '…' : `${exams.length} exams`}</span>
          </div>
          <div className="mt-4 space-y-3">
            {loading && <p className="text-sm text-slate-500">Loading exams…</p>}
            {!loading && exams.length === 0 && (
              <p className="text-sm text-slate-500">No exams yet. Use the form to create the first one.</p>
            )}
            {exams.map((exam) => (
              <article key={exam.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{exam.name}</h3>
                      <WindowBadge status={exam.windowStatus} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-blue-700">{exam.subject}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatExamWhen(exam.date, exam.time)} · {exam.classroom}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {exam.hasQr ? 'QR code ready' : 'QR code not generated yet'} · Scan window {formatWindow(exam.opensAt, exam.closesAt)}
                    </p>
                  </div>
                  {isTeacher && (
                    <PrimaryButton type="button" onClick={() => openQr(exam)} disabled={qrBusy === exam.id}>
                      <QrCode size={16} />
                      {qrBusy === exam.id ? 'Please wait…' : exam.hasQr ? 'View QR code' : 'Generate QR code'}
                    </PrimaryButton>
                  )}
                </div>
              </article>
            ))}
          </div>
        </Card>
      </div>

      {qr && <QrModal exam={qr.exam} payload={qr.payload} onClose={() => setQr(null)} />}
    </div>
  );
}
