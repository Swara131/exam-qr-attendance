export function formatExamWhen(date, time) {
  const value = new Date(`${date}T${time}`);
  if (Number.isNaN(value.getTime())) return `${date} ${time}`;
  return value.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatMarked(iso) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return iso;
  return value.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatWindow(opensAt, closesAt) {
  const opens = new Date(opensAt);
  const closes = new Date(closesAt);
  const time = { hour: 'numeric', minute: '2-digit' };
  if (Number.isNaN(opens.getTime()) || Number.isNaN(closes.getTime())) return '';
  if (opens.toDateString() === closes.toDateString()) {
    return `${opens.toLocaleTimeString(undefined, time)} to ${closes.toLocaleTimeString(undefined, time)}`;
  }
  const both = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  return `${opens.toLocaleString(undefined, both)} to ${closes.toLocaleString(undefined, both)}`;
}

export function previewWindow(date, time) {
  if (!date || !time) return '';
  const start = new Date(`${date}T${time}`);
  if (Number.isNaN(start.getTime())) return '';
  const opens = new Date(start.getTime() - 30 * 60 * 1000);
  const closes = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return formatWindow(opens.toISOString(), closes.toISOString());
}

export function defaultExamSchedule() {
  const value = new Date();
  value.setMinutes(value.getMinutes() - 10);
  const pad = (part) => String(part).padStart(2, '0');
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  };
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
