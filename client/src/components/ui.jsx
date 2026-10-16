import { Link } from 'react-router-dom';

export function Banner({ tone = 'info', children }) {
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm ${tones[tone] || tones.info}`}
    >
      {children}
    </div>
  );
}

export function Card({ className = '', children }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

export function TextField({ label, hint, ...props }) {
  const id = props.id || props.name;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label className="block" htmlFor={id}>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
        <input id={id} aria-describedby={hintId} className={fieldClass} {...props} />
      </label>
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SelectField({ label, hint, children, ...props }) {
  const id = props.id || props.name;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label className="block" htmlFor={id}>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
        <select id={id} aria-describedby={hintId} className={fieldClass} {...props}>
          {children}
        </select>
      </label>
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

export function PrimaryButton({ className = '', children, ...props }) {
  return (
    <button className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700 ${className}`} {...props}>
      {children}
    </button>
  );
}

const secondaryClass = `${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;

export function SecondaryButton({ className = '', children, ...props }) {
  return (
    <button className={`${secondaryClass} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function SecondaryLink({ to, className = '', children }) {
  return (
    <Link to={to} className={`${secondaryClass} ${className}`}>
      {children}
    </Link>
  );
}

export function WindowBadge({ status }) {
  const styles = {
    open: 'bg-emerald-50 text-emerald-700',
    upcoming: 'bg-amber-50 text-amber-800',
    closed: 'bg-slate-100 text-slate-500',
  };
  const labels = {
    open: 'Attendance open',
    upcoming: 'Scheduled',
    closed: 'Window closed',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.closed}`}>
      {labels[status] || labels.closed}
    </span>
  );
}

export function PresentBadge() {
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      Present
    </span>
  );
}
