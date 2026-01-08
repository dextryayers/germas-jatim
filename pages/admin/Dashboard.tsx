import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileCheck,
  FileText,
  Gauge,
  History,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  BarElement,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
  type ChartOptions,
  type ChartData,
  type TooltipItem,
} from 'chart.js';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '../../utils/apiClient';
import Swal from 'sweetalert2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, ChartTooltip, Legend);

type DashboardCard = {
  id: string;
  label: string;
  value: number | null;
  description?: string | null;
};

type DashboardHistoryItem = {
  id: string;
  type: 'laporan' | 'evaluasi' | string;
  submission_db_id?: number;
  title: string;
  instansi: string | null;
  instansi_level?: string | null;
  status: 'pending' | 'verified' | 'rejected' | string;
  score: number | null;
  reviewer?: string | null;
  submitted_at: string | null;
  documents?: Array<{
    name: string;
    url?: string | null;
    path?: string | null;
  }>;
  tags?: string[];
};

type DashboardAnalyticsPoint = {
  date: string;
  label: string;
  total: number;
};

type DashboardAnalytics = {
  series: DashboardAnalyticsPoint[];
  total: number;
  today: number;
  week: number;
};

type DashboardActivityItem = {
  id: number | string;
  type: string;
  instansi?: string | null;
  description: string;
  created_at: string | null;
};

type DashboardSummary = {
  reports: {
    total: number;
    pending: number;
    verified: number;
    rejected: number;
  };
  evaluations: {
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    average_score: number | null;
  };
  instansi: {
    total: number;
  };
};

type DashboardMetricsResponse = {
  status: string;
  data: {
    summary: DashboardSummary;
    cards: DashboardCard[];
    history: DashboardHistoryItem[];
    analytics: DashboardAnalytics;
    recent_activity: DashboardActivityItem[];
  };
};

const FALLBACK_CARDS: DashboardCard[] = [
  { id: 'reports_total', label: 'Laporan Masuk', value: 0, description: 'Menunggu pembaruan data' },
  { id: 'reports_pending', label: 'Perlu Verifikasi', value: 0, description: 'Menunggu pembaruan data' },
  { id: 'average_score', label: 'Rata-rata Skor Evaluasi', value: 0, description: 'Menunggu pembaruan data' },
];

const FALLBACK_VISITOR_COUNTS = [24, 28, 26, 32, 35, 41, 44];

const buildVisitorFallback = (): {
  series: DashboardAnalyticsPoint[];
  total: number;
  today: number;
  week: number;
} => {
  const now = new Date();
  const length = FALLBACK_VISITOR_COUNTS.length;
  const series = FALLBACK_VISITOR_COUNTS.map((count, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (length - 1 - index));

    return {
      date: date.toISOString(),
      label: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      total: count,
    } as DashboardAnalyticsPoint;
  });

  const total = series.reduce((acc, point) => acc + point.total, 0);
  const today = series[series.length - 1]?.total ?? 0;
  const week = series.slice(-7).reduce((acc, point) => acc + point.total, 0);

  return { series, total, today, week };
};

type CardVisual = {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  halo: string;
};

const CARD_VISUALS: Record<string, CardVisual> = {
  reports_total: { icon: FileCheck, accent: 'bg-blue-500/15 text-blue-600', halo: 'bg-blue-500/10' },
  reports_pending: { icon: AlertCircle, accent: 'bg-amber-400/15 text-amber-500', halo: 'bg-amber-400/10' },
  average_score: { icon: TrendingUp, accent: 'bg-indigo-500/15 text-indigo-600', halo: 'bg-indigo-500/10' },
};

const DEFAULT_CARD_VISUAL: CardVisual = {
  icon: Gauge,
  accent: 'bg-slate-500/15 text-slate-600',
  halo: 'bg-slate-500/10',
};

const ACTIVITY_COLOR_MAP: Record<string, string> = {
  verify: 'bg-green-500',
  alert: 'bg-amber-500',
  submit: 'bg-blue-500',
  update: 'bg-slate-400',
  upload: 'bg-indigo-500',
  login: 'bg-violet-500',
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<DashboardCard[]>(FALLBACK_CARDS);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [historyItems, setHistoryItems] = useState<DashboardHistoryItem[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [recentActivity, setRecentActivity] = useState<DashboardActivityItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const refreshTimerRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const [userName, setUserName] = useState<string>('Administrator');
  const [userInstansi, setUserInstansi] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat('id-ID', options).format(value);
  }, []);

  const formatMetricValue = useCallback(
    (value: number | null | undefined, fractionDigits = 0) => {
      const numericValue = typeof value === 'number' ? value : 0;
      if (fractionDigits > 0) {
        return formatNumber(numericValue, {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        });
      }

      return formatNumber(numericValue);
    },
    [formatNumber],
  );

  const isProvLevelAdmin = useMemo(() => {
    const role = (userRole ?? '').toLowerCase().trim();
    if (!role) return false;
    if (role.includes('super_admin')) return true;
    if (role.includes('admin_provinsi')) return true;
    return false;
  }, [userRole]);

  const historyTrend = useMemo(() => {
    const grouping = new Map<
      string,
      {
        iso: string;
        label: string;
        pending: number;
        verified: number;
        rejected: number;
      }
    >();

    historyItems.forEach((item) => {
      if (!item.submitted_at) {
        return;
      }

      const parsed = new Date(item.submitted_at);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }

      const iso = parsed.toISOString().slice(0, 10);
      const label = parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      if (!grouping.has(iso)) {
        grouping.set(iso, {
          iso,
          label,
          pending: 0,
          verified: 0,
          rejected: 0,
        });
      }

      const bucket = grouping.get(iso)!;

      if (item.status === 'pending') {
        bucket.pending += 1;
      } else if (item.status === 'verified') {
        bucket.verified += 1;
      } else if (item.status === 'rejected') {
        bucket.rejected += 1;
      }
    });

    return Array.from(grouping.values())
      .sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime())
      .slice(-7);
  }, [historyItems]);

  const historyChartData = useMemo<ChartData<'bar'>>(
    () => ({
      labels: historyTrend.map((item) => item.label),
      datasets: [
        {
          label: 'Menunggu',
          data: historyTrend.map((item) => item.pending),
          backgroundColor: 'rgba(245, 158, 11, 0.75)',
          borderRadius: 12,
          stack: 'status',
        },
        {
          label: 'Terverifikasi',
          data: historyTrend.map((item) => item.verified),
          backgroundColor: 'rgba(34, 197, 94, 0.75)',
          borderRadius: 12,
          stack: 'status',
        },
        {
          label: 'Ditolak',
          data: historyTrend.map((item) => item.rejected),
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderRadius: 12,
          stack: 'status',
        },
      ],
    }),
    [historyTrend],
  );

  const historyChartOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: {
              size: 11,
              weight: 600,
            },
          },
        },
        tooltip: {
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          titleColor: '#0f172a',
          bodyColor: '#0f172a',
          padding: 12,
          callbacks: {
            label: (context: TooltipItem<'bar'>) => `${context.dataset.label}: ${formatNumber(context.parsed.y)}`,
            footer: (items: TooltipItem<'bar'>[]) => {
              const total = items.reduce((sum, item) => sum + item.parsed.y, 0);
              return `Total: ${formatNumber(total)}`;
            },
          },
        },
      },
      layout: {
        padding: {
          top: 12,
          right: 16,
          bottom: 8,
          left: 8,
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            display: false,
          },
          ticks: {
            color: '#64748b',
            font: {
              size: 11,
            },
          },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          grid: {
            color: '#e2e8f0',
            drawBorder: false,
          },
          ticks: {
            color: '#64748b',
            font: {
              size: 11,
            },
            callback: (value: string | number) => formatNumber(Number(value)),
          },
        },
      },
    }),
    [formatNumber],
  );

  const fetchMetrics = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
      }

      setError(null);

      try {
        const response = await apiClient.get<DashboardMetricsResponse>('/dashboard/metrics');
        const payload = response?.data;

        if (!payload) {
          throw new Error('Format data dashboard tidak sesuai.');
        }

        setCards(payload.cards && payload.cards.length > 0 ? payload.cards : FALLBACK_CARDS);
        setSummary(payload.summary);
        setHistoryItems(payload.history ?? []);
        setAnalytics(payload.analytics ?? null);
        setRecentActivity(payload.recent_activity ?? []);
      } catch (err) {
        console.error('[Dashboard] Gagal memuat data:', err);
        const message = err instanceof Error ? err.message : 'Tidak dapat memuat data dashboard.';
        setError(message);
        setCards(FALLBACK_CARDS);
        setSummary(null);
        setHistoryItems([]);
        setAnalytics(null);
        setRecentActivity([]);
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const storedName = sessionStorage.getItem('user_name') ?? localStorage.getItem('user_name');
    const storedInstansi = sessionStorage.getItem('user_instansi_name') ?? localStorage.getItem('user_instansi_name');
    const storedRole = sessionStorage.getItem('user_role') ?? localStorage.getItem('user_role');

    if (storedName) {
      setUserName(storedName);
    }
    if (storedInstansi) {
      setUserInstansi(storedInstansi);
    }
    if (storedRole) {
      setUserRole(storedRole);
    }

    // Muat metrik dashboard pertama kali saat komponen di-mount
    void fetchMetrics();

    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setInterval(() => {
      fetchMetrics({ silent: true });
    }, 60000);

    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [fetchMetrics]);

  const visitorAnalytics = useMemo(() => {
    if (!analytics || !Array.isArray(analytics.series) || analytics.series.length === 0) {
      const fallback = buildVisitorFallback();
      return { ...fallback, fallback: true } as const;
    }

    const normalizedSeries = analytics.series.map((point) => {
      const label = point.label ?? (() => {
        const parsed = new Date(point.date);
        if (Number.isNaN(parsed.getTime())) {
          return point.date;
        }
        return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      })();

      const rawTotal: any = (point as any).total;
      const numericTotal =
        typeof rawTotal === 'number' ? rawTotal : Number(typeof rawTotal === 'string' ? rawTotal.trim() : rawTotal) || 0;

      return {
        ...point,
        label,
        total: numericTotal,
      };
    });

    const totalSum = normalizedSeries.reduce((acc, point) => acc + point.total, 0);

    if (totalSum === 0) {
      const fallback = buildVisitorFallback();
      return { ...fallback, fallback: true } as const;
    }

    const todayValue = typeof analytics.today === 'number' ? analytics.today : normalizedSeries[normalizedSeries.length - 1]?.total ?? 0;
    const weekValue = typeof analytics.week === 'number'
      ? analytics.week
      : normalizedSeries.slice(-7).reduce((acc, point) => acc + point.total, 0);

    return {
      series: normalizedSeries,
      total: typeof analytics.total === 'number' ? analytics.total : totalSum,
      today: todayValue,
      week: weekValue,
      fallback: false,
    } as const;
  }, [analytics]);

  const resolvedVisitorSeries = visitorAnalytics.series;
  const hasVisitorData = useMemo(() => resolvedVisitorSeries.some((point) => point.total > 0), [resolvedVisitorSeries]);
  const visitorDelta = useMemo(() => {
    if (resolvedVisitorSeries.length < 2) return 0;
    const prev = resolvedVisitorSeries[resolvedVisitorSeries.length - 2].total;
    const current = resolvedVisitorSeries[resolvedVisitorSeries.length - 1].total;
    return current - prev;
  }, [resolvedVisitorSeries]);

  const analyticsTotals = useMemo(
    () => ({
      total: visitorAnalytics.total,
      today: visitorAnalytics.today,
      week: visitorAnalytics.week,
    }),
    [visitorAnalytics.total, visitorAnalytics.today, visitorAnalytics.week],
  );

  const scoreAverage = summary?.evaluations.average_score ?? null;

  const visitorChartData = useMemo<ChartData<'line'>>(
    () => ({
      labels: resolvedVisitorSeries.map((point) => point.label ?? point.date),
      datasets: [
        {
          label: 'Kunjungan',
          data: resolvedVisitorSeries.map((point) => point.total),
          borderColor: '#0ea5e9',
          backgroundColor: (context: { chart: ChartJS }) => {
            const { chart } = context;
            const { ctx, chartArea } = chart;
            if (!chartArea) {
              return 'rgba(14,165,233,0.18)';
            }
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(14,165,233,0.25)');
            gradient.addColorStop(1, 'rgba(14,165,233,0)');
            return gradient;
          },
          tension: 0.35,
          pointBorderColor: '#0ea5e9',
          pointBackgroundColor: '#0ea5e9',
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
        },
      ],
    }),
    [resolvedVisitorSeries],
  );

  const visitorChartOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 600,
        easing: 'easeOutQuart',
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          titleColor: '#0f172a',
          bodyColor: '#0f172a',
          titleFont: { size: 12, weight: 600 },
          bodyFont: { size: 12, weight: 500 },
          padding: 12,
          callbacks: {
            label: (context: TooltipItem<'line'>) => `${formatNumber(Number(context.parsed.y))} kunjungan`,
          },
        },
      },
      layout: {
        padding: {
          top: 12,
          right: 16,
          bottom: 8,
          left: 8,
        },
      },
      scales: {
        x: {
          grid: {
            color: '#e2e8f0',
            drawBorder: false,
          },
          ticks: {
            color: '#64748b',
            font: {
              size: 11,
            },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 7,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#e2e8f0',
            drawBorder: false,
          },
          ticks: {
            color: '#64748b',
            font: {
              size: 11,
            },
            callback: (value: string | number) => formatNumber(Number(value)),
          },
        },
      },
    }),
    [formatNumber],
  );

  const formatDateHeading = useCallback((isoString: string | null | undefined) => {
    if (!isoString) {
      return 'Tanggal tidak diketahui';
    }
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) {
      return 'Tanggal tidak dikenali';
    }
    return parsed.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') {
      return historyItems;
    }
    return historyItems.filter((item) => item.status === historyFilter);
  }, [historyFilter, historyItems]);

  const groupedHistory = useMemo(() => {
    const grouping = new Map<string, DashboardHistoryItem[]>();

    filteredHistory.forEach((item) => {
      const key = formatDateHeading(item.submitted_at);
      grouping.set(key, [...(grouping.get(key) ?? []), item]);
    });

    return Array.from(grouping.entries())
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => {
          const timeA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
          const timeB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
          return timeB - timeA;
        }),
      }))
      .sort((a, b) => {
        const latestA = a.items[0]?.submitted_at ? new Date(a.items[0].submitted_at as string).getTime() : 0;
        const latestB = b.items[0]?.submitted_at ? new Date(b.items[0].submitted_at as string).getTime() : 0;
        return latestB - latestA;
      });
  }, [filteredHistory, formatDateHeading]);

  const historyStats = useMemo(
    () =>
      historyItems.reduce(
        (acc, item) => {
          acc.total += 1;
          if (item.status === 'pending') {
            acc.pending += 1;
          } else if (item.status === 'verified') {
            acc.verified += 1;
          } else if (item.status === 'rejected') {
            acc.rejected += 1;
          }

          return acc;
        },
        { total: 0, pending: 0, verified: 0, rejected: 0 },
      ),
    [historyItems],
  );

  const historyFilterOptions = useMemo(
    () => [
      { value: 'all' as const, label: 'Semua', badge: historyStats.total },
      { value: 'verified' as const, label: 'Terverifikasi', badge: historyStats.verified },
      { value: 'pending' as const, label: 'Menunggu', badge: historyStats.pending },
      { value: 'rejected' as const, label: 'Ditolak', badge: historyStats.rejected },
    ],
    [historyStats],
  );

  const statusIconMap: Record<string, React.ReactNode> = {
    verified: <CheckCircle2 className="w-4 h-4" />,
    pending: <Clock3 className="w-4 h-4" />,
    rejected: <XCircle className="w-4 h-4" />,
  };

  const getStatusBadgeStyles = useCallback((status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'rejected':
        return 'bg-rose-100 text-rose-700 border border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  }, []);

  const formatTime = useCallback((isoString: string | null | undefined) => {
    if (!isoString) return '-';
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const formatRelativeTime = useCallback((isoString: string | null | undefined) => {
    if (!isoString) return '-';
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) return '-';

    const diff = Date.now() - parsed.getTime();

    if (diff < 60_000) {
      return 'Baru saja';
    }

    if (diff < 3_600_000) {
      const minutes = Math.floor(diff / 60_000);
      return `${minutes} menit lalu`;
    }

    if (diff < 86_400_000) {
      const hours = Math.floor(diff / 3_600_000);
      return `${hours} jam lalu`;
    }

    return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchMetrics({ silent: true });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchMetrics]);

  const handleDeleteHistory = useCallback(
    async (item: DashboardHistoryItem) => {
      const result = await Swal.fire({
        title: 'Hapus aktivitas ini?',
        text: `Aktivitas "${item.title}" akan dihapus dari histori dan diagram.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, hapus',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        reverseButtons: true,
      });

      if (!result.isConfirmed) {
        return;
      }

      try {
        if (item.submission_db_id && (item.type === 'laporan' || item.type === 'evaluasi')) {
          const basePath = item.type === 'laporan' ? '/laporan/submissions' : '/evaluasi/submissions';
          await apiClient.delete(`${basePath}/${item.submission_db_id}`);
        }

        setHistoryItems((prev) => prev.filter((history) => history.id !== item.id));

        void fetchMetrics({ silent: true });

        void Swal.fire({
          icon: 'success',
          title: 'Aktivitas dihapus',
          text: item.submission_db_id
            ? 'Data laporan di server dan histori dashboard telah diperbarui.'
            : 'Histori dan diagram telah diperbarui.',
          timer: 1800,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error('[Dashboard] Gagal menghapus aktivitas/backend submission:', error);
        void Swal.fire({
          icon: 'error',
          title: 'Gagal menghapus',
          text: 'Terjadi kesalahan saat menghapus data di server. Coba lagi.',
        });
      }
    },
    [fetchMetrics],
  );

  const handleAddHistory = useCallback(async () => {
    const { value: formValues, isConfirmed } = await Swal.fire<{ title: string; instansi: string; status: string; type: string; score: string } | undefined>({
      title: 'Tambah Aktivitas Manual',
      html: `
        <div class="space-y-3 text-left">
          <label class="block text-xs font-semibold text-slate-500">Judul Aktivitas
            <input id="swal-history-title" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Verifikasi laporan Surabaya" />
          </label>
          <label class="block text-xs font-semibold text-slate-500">Instansi
            <input id="swal-history-instansi" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Dinkes Kota Surabaya" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="block text-xs font-semibold text-slate-500">Status
              <select id="swal-history-status" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="verified">Terverifikasi</option>
                <option value="pending">Menunggu</option>
                <option value="rejected">Ditolak</option>
              </select>
            </label>
            <label class="block text-xs font-semibold text-slate-500">Jenis
              <select id="swal-history-type" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="laporan">Laporan</option>
                <option value="evaluasi">Evaluasi</option>
              </select>
            </label>
          </div>
          <label class="block text-xs font-semibold text-slate-500">Skor (opsional)
            <input type="number" min="0" max="100" id="swal-history-score" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="85" />
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const titleInput = document.getElementById('swal-history-title') as HTMLInputElement | null;
        const instansiInput = document.getElementById('swal-history-instansi') as HTMLInputElement | null;
        const statusSelect = document.getElementById('swal-history-status') as HTMLSelectElement | null;
        const typeSelect = document.getElementById('swal-history-type') as HTMLSelectElement | null;
        const scoreInput = document.getElementById('swal-history-score') as HTMLInputElement | null;

        const title = titleInput?.value.trim() ?? '';
        const instansi = instansiInput?.value.trim() ?? '';
        const status = statusSelect?.value ?? 'pending';
        const type = typeSelect?.value ?? 'laporan';
        const score = scoreInput?.value.trim() ?? '';

        if (!title) {
          Swal.showValidationMessage('Judul aktivitas wajib diisi');
          return;
        }

        return {
          title,
          instansi,
          status,
          type,
          score,
        };
      },
    });

    if (!isConfirmed || !formValues) {
      return;
    }

    const now = new Date();
    const newItem: DashboardHistoryItem = {
      id: `local-${now.getTime()}`,
      type: formValues.type,
      title: formValues.title,
      instansi: formValues.instansi || 'Instansi tidak dikenal',
      instansi_level: null,
      status: formValues.status as DashboardHistoryItem['status'],
      score: formValues.score ? Number(formValues.score) : null,
      reviewer: null,
      submitted_at: now.toISOString(),
      documents: [],
      tags: ['manual'],
    };

    setHistoryItems((prev) => [newItem, ...prev]);

    void Swal.fire({
      icon: 'success',
      title: 'Aktivitas ditambahkan',
      text: 'Histori dan diagram langsung diperbarui.',
      timer: 1800,
      showConfirmButton: false,
    });
  }, []);

  return (
    <div className="relative pb-20 bg-gradient-to-br from-[#f5fbf8] via-white to-[#f0f9f5]">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100/60 bg-white shadow-[0_28px_120px_-70px_rgba(6,95,70,0.55)]">
        <div className="absolute -right-24 -top-32 h-64 w-64 rounded-full bg-emerald-500/5 blur-2xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="relative z-10 px-6 py-10 sm:px-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600">
                <Sparkles className="h-4 w-4" />
                Selamat datang kembali
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-black tracking-tight text-slate-800 sm:text-4xl">
                  {userName}, mari lanjutkan orkestrasi data GERMAS.
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
                  {userInstansi
                    ? `Instansi ${userInstansi} terhubung ke ${historyStats.total} laporan aktif. Pastikan setiap verifikasi selesai tepat waktu.`
                    : 'Pantau progres verifikasi, statistik kunjungan, dan aktivitas terbaru tim dalam satu tempat.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500 sm:text-sm">
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-4 py-2 shadow-sm">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  <span>
                    Update: {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-4 py-2 shadow-sm">
                  <Gauge className="h-4 w-4 text-blue-500" />
                  <span>Sistem dalam kondisi stabil</span>
                </div>
              </div>
            </div>
            <aside className="w-full max-w-sm lg:max-w-xs">
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-500/10 via-white to-emerald-50 p-6 shadow-[0_20px_60px_-45px_rgba(6,95,70,0.6)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-500">Quick Impact</p>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{historyStats.pending} laporan menunggu</p>
                      <p className="text-xs text-slate-500">Prioritaskan verifikasi hari ini</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Skor rata-rata {formatMetricValue(scoreAverage, 1)}
                      </p>
                      <p className="text-xs text-slate-500">Pertahankan kategori sangat baik</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/verifikasi')}
                    className="flex items-center justify-between rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5 hover:shadow-emerald-500/40"
                  >
                    Tinjau laporan menunggu
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="mt-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            {loading ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-600">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
                Memuat data dashboard ...
              </span>
            ) : error ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Dashboard tersinkron dalam 60 detik terakhir
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Segarkan sekarang
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards
            .filter((card) => card.id !== 'instansi_total')
            .map((card, idx) => {
              const visuals = CARD_VISUALS[card.id] ?? DEFAULT_CARD_VISUAL;
              const Icon = visuals.icon;
              const formattedValue = card.id === 'average_score' ? formatMetricValue(card.value, 1) : formatMetricValue(card.value);
              const description = card.description ?? 'Data akan diperbarui otomatis saat tersedia.';

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="group relative overflow-hidden rounded-3xl border border-emerald-50 bg-white p-6 shadow-[0_12px_30px_-25px_rgba(15,118,110,0.38)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-30px_rgba(15,118,110,0.32)]"
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                        <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">{formattedValue}</h3>
                      </div>
                      <div className={`rounded-xl p-3 ${visuals.accent} shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <div className={`rounded-xl p-3 ${visuals.accent} shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-sm text-slate-500">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <ArrowUpRight className="h-3 w-3" />
                    </div>
                    <span>{description}</span>
                  </div>
                  <div className={`absolute -right-6 -bottom-6 h-28 w-28 rounded-full ${visuals.halo} opacity-40 transition-opacity group-hover:opacity-60`} />
                </motion.div>
              );
            })}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <section className="rounded-3xl border border-emerald-50 bg-white p-8 shadow-[0_18px_40px_-32px_rgba(15,118,110,0.34)] lg:col-span-2">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-700">
                  <History className="h-4 w-4" />
                  Histori Pelaporan
                </div>
                <h3 className="mt-3 text-xl font-bold text-slate-800">Pergerakan Laporan Terbaru</h3>
                <p className="text-sm text-slate-500">Tinjau perkembangan laporan masuk, status verifikasi, dan catatan tim.</p>
              </div>
              <div className="flex flex-col items-end gap-2 text-sm text-slate-500">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {historyStats.verified} laporan terverifikasi
                </span>
                <span className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-500" />
                  {historyStats.pending} menunggu proses
                </span>
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-rose-500" />
                  {historyStats.rejected} dikembalikan revisi
                </span>
              </div>
            </div>

            {historyTrend.length > 0 ? (
              <div className="mb-6 rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-white p-5 shadow-inner">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Diagram Aktivitas</p>
                    <h4 className="text-sm font-bold text-slate-700">Distribusi status laporan 7 hari terakhir</h4>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Live Metrics
                  </div>
                </div>
                <div className="h-56 w-full">
                  <Bar options={historyChartOptions} data={historyChartData} />
                </div>
              </div>
            ) : (
              <div className="mb-6 flex items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-5 text-sm text-slate-500">
                Diagram aktivitas akan muncul otomatis saat histori laporan tercatat.
              </div>
            )}

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {historyFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setHistoryFilter(option.value)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                      historyFilter === option.value
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-emerald-600'
                    }`}
                  >
                    {option.label}
                    {typeof option.badge === 'number' && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          historyFilter === option.value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {option.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddHistory}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
              >
                <Plus className="h-4 w-4" /> Tambah Aktivitas Manual
              </button>
            </div>

            <div className="max-h-[28rem] space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              {groupedHistory.length === 0 ? (
                <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40">
                  <div className="text-center text-sm text-slate-500">
                    <p>Belum ada histori untuk filter yang dipilih.</p>
                    <p className="mt-1 text-xs">Histori baru akan muncul otomatis saat laporan diproses.</p>
                  </div>
                </div>
              ) : (
                groupedHistory.map(({ date, items }) => (
                  <div key={date} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-700">{date}</p>
                      <span className="rounded-full border border-slate-100 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        {items.length} aktivitas
                      </span>
                    </div>
                    <div className="mt-4 space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="relative flex gap-4 rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                          <div className={`mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${getStatusBadgeStyles(item.status)}`}>
                            {statusIconMap[item.status] ?? <History className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-800">{item.title}</p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                                  {item.instansi ?? 'Instansi tidak dikenal'}
                                </p>
                                {item.instansi_level && (
                                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                    {item.instansi_level}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right text-xs text-slate-400">
                                  {(() => {
                                    const timeLabel = formatTime(item.submitted_at);
                                    return <p>{timeLabel === '-' ? '-' : `${timeLabel} WIB`}</p>;
                                  })()}
                                  <p className="mt-0.5">ID #{item.id}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHistory(item)}
                                  className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:border-rose-200 hover:text-rose-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeStyles(item.status)}`}>
                                {statusIconMap[item.status] ?? <History className="h-4 w-4" />}
                                {item.status === 'verified'
                                  ? 'Terverifikasi'
                                  : item.status === 'pending'
                                  ? 'Menunggu Verifikasi'
                                  : item.status === 'rejected'
                                  ? 'Perlu Revisi'
                                  : 'Status lain'}
                              </span>
                              {typeof item.score === 'number' && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">
                                  Skor {item.score}
                                </span>
                              )}
                              {item.reviewer && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-600">
                                  Reviewer {item.reviewer}
                                </span>
                              )}
                              {(item.tags || []).map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            {item.documents && item.documents.length > 0 && (
                              <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Lampiran Dokumen</p>
                                <div className="space-y-2">
                                  {item.documents.map((doc) => {
                                    const docHref = doc.url ?? doc.path ?? '#';
                                    const isDownloadable = docHref !== '#';
                                    return (
                                      <div
                                        key={`${item.id}-${doc.name}`}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-600 shadow-sm"
                                      >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                            <FileText className="h-4 w-4" />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-700">{doc.name}</p>
                                            {isDownloadable ? (
                                              <a
                                                href={docHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
                                              >
                                                <ExternalLink className="h-3.5 w-3.5" /> Buka dokumen
                                              </a>
                                            ) : (
                                              <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                                <ExternalLink className="h-3.5 w-3.5" /> Tidak ada tautan
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="flex flex-col gap-8">
            {isProvLevelAdmin && (
              <>
                <section className="rounded-3xl border border-sky-100 bg-white p-8 shadow-[0_18px_40px_-30px_rgba(2,132,199,0.35)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-sky-700">
                        <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                        Aktivitas Sistem
                      </div>
                      <h3 className="mt-3 text-xl font-bold text-slate-800">Statistik Aktivitas</h3>
                      <p className="mt-1 text-sm text-slate-500">Pergerakan perubahan status laporan & evaluasi</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Total Aktivitas</p>
                      <p className="text-xl font-bold text-slate-800">{formatMetricValue(analyticsTotals.total)}</p>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">Sejak pertama kali</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Hari ini</p>
                      <p className="text-xl font-bold text-slate-800">{formatMetricValue(analyticsTotals.today)}</p>
                      <span className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${visitorDelta >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {`${visitorDelta >= 0 ? '+' : ''}${formatNumber(Math.abs(visitorDelta))}`} vs kemarin
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">7 hari terakhir</p>
                      <p className="text-xl font-bold text-slate-800">{formatMetricValue(analyticsTotals.week)}</p>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                        Rata-rata {formatNumber((analyticsTotals.week || 0) / 7, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/hari
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 h-56">
                    {hasVisitorData ? (
                      <div className="h-full w-full">
                        <Line options={visitorChartOptions} data={visitorChartData} />
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-sm text-slate-400">
                        <p>Belum ada aktivitas yang terekam.</p>
                        <p className="mt-1 text-xs">Statistik akan muncul otomatis setelah ada perubahan status laporan atau evaluasi.</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="flex flex-col rounded-3xl border border-emerald-50 bg-white p-8 shadow-[0_18px_40px_-32px_rgba(15,118,110,0.34)]">
                  <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-800">
                    <Activity className="h-5 w-5 text-primary-500" />
                    Aktivitas Terbaru
                  </h3>
                  <div className="flex-1 space-y-0 overflow-y-auto pr-2 custom-scrollbar">
                    {recentActivity.length === 0 ? (
                      <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40">
                        <p className="text-sm text-slate-500">Belum ada aktivitas terbaru yang tercatat.</p>
                      </div>
                    ) : (
                      recentActivity.map((activity, index) => {
                        const colorClass = ACTIVITY_COLOR_MAP[activity.type] ?? 'bg-slate-400';
                        const isLast = index === recentActivity.length - 1;

                        return (
                          <div key={activity.id ?? `${activity.type}-${index}`} className="group relative flex gap-4 pb-6">
                            {!isLast && <div className="absolute left-2.5 top-8 bottom-0 w-0.5 bg-slate-100 transition-colors group-hover:bg-slate-200" />}
                            <div className={`relative z-10 mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ${colorClass}`}>
                              <div className="h-1.5 w-1.5 rounded-full bg-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 transition-colors group-hover:text-primary-600">
                                {activity.instansi ?? 'Aktivitas Sistem'}
                              </p>
                              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{activity.description}</p>
                              <p className="mt-1 text-[10px] font-medium text-slate-400">{formatRelativeTime(activity.created_at)}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;