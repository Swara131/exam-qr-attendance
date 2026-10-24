import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { Banner, PrimaryButton, SecondaryButton } from './ui';

export default function Scanner({ onScan, disabled }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const lastRef = useRef({ text: '', at: 0 });

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    start();
    return () => {
      stopScanner();
    };
  }, []);

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // The camera may already be stopped.
    }
    try {
      scanner.clear();
    } catch {
      // The preview element may already be empty.
    }
  }

  async function start() {
    setError('');
    await stopScanner();

    const { Html5Qrcode } = await import('html5-qrcode');
    const cameras = [{ facingMode: 'environment' }, { facingMode: 'user' }];

    for (const camera of cameras) {
      const scanner = new Html5Qrcode('exam-qr-reader', false);
      scannerRef.current = scanner;
      try {
        await scanner.start(
          camera,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            const value = String(text || '').trim();
            if (!value) return;
            const now = Date.now();
            if (lastRef.current.text === value && now - lastRef.current.at < 8000) return;
            lastRef.current = { text: value, at: now };
            onScanRef.current(value);
          },
          () => {},
        );
        setRunning(true);
        return;
      } catch {
        scannerRef.current = null;
        try {
          scanner.clear();
        } catch {
          // Ignore a camera that never started.
        }
      }
    }

    setRunning(false);
    setError('Camera access is unavailable. Allow the camera in your browser, or use the demo scan below.');
  }

  async function stop() {
    await stopScanner();
    setRunning(false);
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-slate-100">
        <div id="exam-qr-reader" className="min-h-52 w-full" />
        {!running && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-sm text-slate-500">
            <Camera size={22} />
            <p className="mt-2">Point the camera at any QR code. Attendance is marked as soon as it is read.</p>
          </div>
        )}
      </div>
      {error && <Banner tone="error">{error}</Banner>}
      <div className="flex flex-col gap-2 sm:flex-row">
        {!running ? (
          <PrimaryButton type="button" onClick={start} disabled={disabled} className="flex-1">
            <Camera size={16} />
            Start camera
          </PrimaryButton>
        ) : (
          <SecondaryButton type="button" onClick={stop} className="flex-1">
            Stop camera
          </SecondaryButton>
        )}
      </div>
    </div>
  );
}
