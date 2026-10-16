import { useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { SecondaryButton } from './ui';
import { formatExamWhen, formatWindow } from '../utils';

export default function QrModal({ exam, payload, onClose }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function download() {
    const canvas = document.getElementById('exam-qr-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${exam.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    link.click();
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-blue-700">{exam.subject}</p>
            <h2 id="qr-title" className="mt-1 text-xl font-semibold text-slate-900">
              {exam.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          {formatExamWhen(exam.date, exam.time)} · {exam.classroom}
        </p>

        <div className="mt-5 flex justify-center rounded-2xl bg-slate-50 p-4">
          <QRCodeCanvas
            id="exam-qr-canvas"
            value={payload}
            size={220}
            level="H"
            includeMargin
            bgColor="#ffffff"
            fgColor="#0f172a"
          />
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Display this code in the classroom. Students can scan it from {formatWindow(exam.opensAt, exam.closesAt)}.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          The code contains a signed exam identifier. It does not mark anyone present until the server checks the exam and the attendance window.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <SecondaryButton type="button" onClick={download} className="flex-1">
            <Download size={16} />
            Download PNG
          </SecondaryButton>
          <SecondaryButton type="button" onClick={onClose} className="flex-1">
            Close
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
