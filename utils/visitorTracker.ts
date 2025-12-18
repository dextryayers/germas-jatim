const STORAGE_KEY = 'germas_visitor_stats_v2';
const SESSION_KEY = 'germas_visitor_session_flag';

export type VisitorHistoryEntry = {
  date: string; // YYYY-MM-DD
  visits: number;
};

export type VisitorStats = {
  totalVisits: number;
  todayVisits: number;
  weekVisits: number;
  history: VisitorHistoryEntry[];
};

const clampHistory = (history: VisitorHistoryEntry[], maxEntries = 90) => {
  if (history.length <= maxEntries) return history;
  return history.slice(history.length - maxEntries);
};

const formatDate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

const getStartOfWeek = (date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const readStorage = (): VisitorStats => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { totalVisits: 0, todayVisits: 0, weekVisits: 0, history: [] };
    }
    const parsed = JSON.parse(raw) as VisitorStats;
    return {
      totalVisits: parsed.totalVisits ?? 0,
      todayVisits: parsed.todayVisits ?? 0,
      weekVisits: parsed.weekVisits ?? 0,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch (error) {
    console.warn('Failed to parse visitor stats:', error);
    return { totalVisits: 0, todayVisits: 0, weekVisits: 0, history: [] };
  }
};

const writeStorage = (stats: VisitorStats) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

const broadcastUpdate = (stats: VisitorStats) => {
  window.dispatchEvent(new CustomEvent('visitor-stats-update', { detail: stats }));
};

const shouldRecordSession = (): boolean => {
  try {
    const flag = sessionStorage.getItem(SESSION_KEY);
    if (flag) return false;
    sessionStorage.setItem(SESSION_KEY, Date.now().toString());
    return true;
  } catch (error) {
    // sessionStorage mungkin tidak tersedia (mode privat). Tetap catat kunjungan.
    return true;
  }
};

const recalcAggregates = (history: VisitorHistoryEntry[]): { todayVisits: number; weekVisits: number } => {
  const today = formatDate(new Date());
  const weekStart = getStartOfWeek();
  const weekStartKey = formatDate(weekStart);

  let todayVisits = 0;
  let weekVisits = 0;

  history.forEach((entry) => {
    if (entry.date === today) {
      todayVisits += entry.visits;
    }
    if (entry.date >= weekStartKey) {
      weekVisits += entry.visits;
    }
  });

  return { todayVisits, weekVisits };
};

export const VisitorTracker = {
  getStats: (): VisitorStats => {
    return readStorage();
  },

  recordVisit: () => {
    if (!shouldRecordSession()) {
      return readStorage();
    }

    const stats = readStorage();
    const todayKey = formatDate(new Date());

    const historyMap = new Map<string, number>();
    stats.history.forEach((entry) => historyMap.set(entry.date, entry.visits));

    const currentVisits = historyMap.get(todayKey) ?? 0;
    historyMap.set(todayKey, currentVisits + 1);

    const updatedHistory = clampHistory(
      Array.from(historyMap.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([date, visits]) => ({ date, visits })),
    );

    const { todayVisits, weekVisits } = recalcAggregates(updatedHistory);

    const updatedStats: VisitorStats = {
      totalVisits: stats.totalVisits + 1,
      todayVisits,
      weekVisits,
      history: updatedHistory,
    };

    writeStorage(updatedStats);
    broadcastUpdate(updatedStats);
    return updatedStats;
  },

  subscribe: (callback: (stats: VisitorStats) => void) => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<VisitorStats>).detail;
      callback(detail);
    };
    window.addEventListener('visitor-stats-update', handler);

    const current = readStorage();
    callback(current);

    return () => {
      window.removeEventListener('visitor-stats-update', handler);
    };
  },

  getHistorySeries: (days = 14): { label: string; date: string; visits: number }[] => {
    const stats = readStorage();
    const today = new Date();
    const map = new Map<string, number>();
    stats.history.forEach((entry) => map.set(entry.date, entry.visits));

    const series: { label: string; date: string; visits: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = formatDate(date);
      const visits = map.get(key) ?? 0;
      const label = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      series.push({ label, date: key, visits });
    }
    return series;
  },
};
