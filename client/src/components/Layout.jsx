import { CalendarDays, ClipboardCheck, LayoutDashboard, LogOut, QrCode } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/exams', label: 'Manage Exams', icon: CalendarDays },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
];

function navClass(isActive) {
  return `inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
  }`;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <NavLink to="/" className="flex items-center gap-2.5 font-semibold text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                <QrCode size={18} />
              </span>
              ExamQR
            </NavLink>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="max-w-40 truncate text-sm font-semibold text-slate-900 sm:max-w-none">{user?.name}</p>
                <p className="text-xs capitalize text-slate-500">{user?.role}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => navClass(isActive)}>
                  <Icon size={16} />
                  {link.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
