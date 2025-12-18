import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { Button } from '../components/ui/Button';

const STORAGE_KEY = 'forbidden_context_v1';

const FALLBACK_QUOTES = [
  'Setiap batasan adalah tanda bahwa kita butuh strategi baru. Kamu pasti bisa! ',
  'Berhenti sejenak bukan berarti menyerah. Satukan lagi energimu dan coba lagi.',
  'Fokus pada tujuan, bukan hambatan. Esok pasti lebih baik.',
  'Usaha tidak pernah mengkhianati hasil—ambil napas dan kembali berjuang.',
  'Jangan biarkan kegagalan sementara menghalangi kesuksesan yang permanen.',
  'Tetaplah jadi diri sendiri walaupun badai mengguncang duniamu',
  'heyy, haloo, siapa kamu?, balik sekarang tumbuhkan skillmu itu lagi'
];

type ForbiddenContext = {
  ip: string;
  message?: string;
  blocked_at?: string;
  blocked_until?: string;
  retry_after_seconds?: number;
};

const formatDuration = (seconds?: number) => {
  if (seconds === undefined || seconds <= 0) return 'segera';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} detik`;
  if (secs === 0) return `${mins} menit`;
  return `${mins} menit ${secs} detik`;
};

const formatDateTime = (iso?: string) => {
  if (!iso) return '-';
  const date = new Date(iso);
  return date.toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const Forbidden: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [context, setContext] = useState<ForbiddenContext | null>(null);

  const fallbackQuote = useMemo(
    () => FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)],
    [],
  );

  useEffect(() => {
    const stateContext = (location.state as { context?: ForbiddenContext } | null)?.context;

    if (stateContext) {
      setContext(stateContext);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateContext));
      return;
    }

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ForbiddenContext;
        setContext(parsed);
        return;
      } catch (error) {
        console.warn('Failed to parse stored forbidden context', error);
      }
    }

    navigate('/login', { replace: true });
  }, [location.state, navigate]);

  if (!context) {
    return null;
  }

  const motivationalText = context.message || fallbackQuote;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/80 shadow-[0_40px_120px_-50px_rgba(8,47,73,0.9)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent)]" />
        <div className="relative z-10 p-10 md:p-14 space-y-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400">
                  Akses Dibatasi
                </p>
                <h1 className="mt-3 text-4xl md:text-5xl font-black text-white leading-tight">
                  403 Forbidden
                </h1>
                <p className="mt-3 text-slate-300 text-base md:text-lg leading-relaxed max-w-xl">
                  Sistem mendeteksi percobaan login yang tidak valid sebanyak tiga kali dari alamat IP di bawah ini.
                  Demi keamanan data, akses kamu sementara dibatasi. Ambil jeda sejenak dan coba lagi nanti.
                </p>
              </div>
            </div>
            <div className="shrink-0 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 text-right shadow-inner">
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-300 font-semibold">Alamat IP</p>
              <p className="mt-2 text-2xl font-black text-emerald-200">{context.ip}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Motivasi Untukmu</p>
              <p className="mt-4 text-lg font-semibold text-white leading-relaxed">“{motivationalText}”</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-lg space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Diblokir Sejak</p>
                <p className="mt-2 text-sm text-slate-200">{formatDateTime(context.blocked_at)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Dapat Dicoba Lagi Dalam</p>
                <p className="mt-2 text-sm text-emerald-300 font-bold">{formatDuration(context.retry_after_seconds)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Perkiraan Berakhir</p>
                <p className="mt-2 text-sm text-slate-200">{formatDateTime(context.blocked_until)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm text-slate-400">
              Jika kamu merasa ini kekeliruan, segera hubungi tim administrator untuk pengecekan manual.
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                className="border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => navigate('/')}
              >
                Kembali ke Beranda
              </Button>
              <Button
                className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700"
                leftIcon={<LogIn className="h-4 w-4" />}
                onClick={() => {
                  sessionStorage.removeItem(STORAGE_KEY);
                  navigate('/login');
                }}
              >
                Coba Login Lagi
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
