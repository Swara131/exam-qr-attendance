import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { useAuth } from '../auth';
import { Banner, PrimaryButton } from '../components/ui';

const accounts = {
  teacher: {
    identifier: 'TCH001',
    password: 'teacher123',
    label: 'Staff ID',
    hint: 'Demo teacher: TCH001 · password teacher123',
  },
  student: {
    identifier: 'STU003',
    password: 'student123',
    label: 'Student ID',
    hint: 'Any student ID and any password can sign in.',
  },
};

const steps = [
  ['Create an exam', 'Add the subject, time, and classroom.'],
  ['Generate a QR code', 'Each exam gets its own signed code.'],
  ['Scan to mark attendance', 'Students scan once, inside the time window.'],
];

export default function Login() {
  const { login } = useAuth();
  const [role, setRole] = useState('teacher');
  const [identifier, setIdentifier] = useState(accounts.teacher.identifier);
  const [password, setPassword] = useState(accounts.teacher.password);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const account = accounts[role];

  function chooseRole(next) {
    setRole(next);
    setIdentifier(accounts[next].identifier);
    setPassword(accounts[next].password);
    setError('');
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    if (role === 'student') {
      if (!identifier.trim()) {
        setError('Enter a student ID. Any password is accepted.');
        return;
      }
    } else if (!identifier.trim() || !password) {
      setError('Enter your ID and password.');
      return;
    }
    setBusy(true);
    try {
      await login({ role, identifier: identifier.trim(), password });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-blue-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5 text-lg font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <QrCode size={20} />
          </span>
          ExamQR
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">
            Conduct exams and mark attendance with a QR code.
          </h1>
          <ul className="mt-8 space-y-5">
            {steps.map(([title, text], index) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
                  {index + 1}
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="mt-0.5 block text-sm text-blue-100">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-blue-200">College project demo</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                <QrCode size={18} />
              </span>
              ExamQR
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">
            QR-Based Exam Conduction and Attendance System
          </p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {['teacher', 'student'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => chooseRole(item)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${
                  role === item ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">{account.label}</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoCapitalize="characters"
                autoComplete="username"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
              {account.hint}
            </div>

            {error && <Banner tone="error">{error}</Banner>}

            <PrimaryButton type="submit" disabled={busy} className="w-full">
              {busy ? 'Signing in…' : `Continue as ${role}`}
            </PrimaryButton>
          </form>
        </div>
      </section>
    </div>
  );
}
