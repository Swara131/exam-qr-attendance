import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardCheck, Users } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Banner, Card, PageHeader, SecondaryLink, WindowBadge } from '../components/ui';
import { formatExamWhen, formatWindow, greeting } from '../utils';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Dashboard · ExamQR';
    api('/api/dashboard')
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  const cards = [
    { label: 'Total students', value: stats?.studentCount, icon: Users, hint: 'Registered for this demo' },
    { label: 'Exams scheduled', value: stats?.examCount, icon: CalendarDays, hint: 'Created by teachers' },
    { label: "Today's attendance", value: stats?.todayAttendance, icon: ClipboardCheck, hint: 'Marked today' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${user.name}`}
        subtitle={
          user.role === 'teacher'
            ? 'Create exams, display a QR code, and review who attended.'
            : 'Scan the QR code your teacher displays to mark your attendance.'
        }
        action={
          <div className="flex flex-wrap gap-2">
            <SecondaryLink to="/exams">Manage exams</SecondaryLink>
            <SecondaryLink to="/attendance">
              {user.role === 'teacher' ? 'View attendance' : 'Mark attendance'}
            </SecondaryLink>
          </div>
        }
      />

      {error && <Banner tone="error">{error}</Banner>}

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                    {stats ? card.value : '…'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
                </div>
                <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  <Icon size={18} />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Upcoming exams</h2>
        <p className="mt-1 text-sm text-slate-500">Exams that are open now or still scheduled.</p>
        <div className="mt-4 divide-y divide-slate-100">
          {stats && stats.upcomingExams.length === 0 && (
            <p className="py-6 text-sm text-slate-500">No upcoming exams. Create one from Manage Exams.</p>
          )}
          {stats?.upcomingExams.map((exam) => (
            <div key={exam.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-900">{exam.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {exam.subject} · {exam.classroom}
                </p>
                <p className="mt-1 text-sm text-slate-500">{formatExamWhen(exam.date, exam.time)}</p>
                <p className="mt-1 text-xs text-slate-400">Scan window: {formatWindow(exam.opensAt, exam.closesAt)}</p>
              </div>
              <WindowBadge status={exam.windowStatus} />
            </div>
          ))}
          {!stats && !error && <p className="py-6 text-sm text-slate-500">Loading exams…</p>}
        </div>
      </Card>

      {stats && (
        <p className="text-xs text-slate-400">
          {stats.storage === 'mongodb'
            ? 'Records are stored in MongoDB.'
            : stats.storage === 'memory'
              ? 'This online demo keeps the sample class in memory so sign-in works. Add MONGODB_URI in Vercel if new exams should be saved permanently.'
              : 'MongoDB is not running, so this demo is saved in a local file. Set MONGODB_URI when you want to use MongoDB.'}
        </p>
      )}
    </div>
  );
}
