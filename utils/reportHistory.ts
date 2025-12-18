export type ReportDocument = {
  name: string;
  url?: string;
  path?: string;
};

export type ReportHistoryItem = {
  id: string;
  instansi: string;
  title: string;
  submittedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  score?: number;
  reviewer?: string;
  tags?: string[];
  documents?: ReportDocument[];
};

const STORAGE_KEY = 'germas_report_history_v1';
const MAX_HISTORY = 120;

const readStorage = (): { records: ReportHistoryItem[]; exists: boolean } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { records: [], exists: false };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { records: [], exists: true };
    }
    return { records: parsed, exists: true };
  } catch (error) {
    console.warn('Failed to read report history:', error);
    return { records: [], exists: true };
  }
};

const persistHistory = (items: ReportHistoryItem[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
};

const seedHistory = (): ReportHistoryItem[] => {
  const now = new Date();
  const baseItems: ReportHistoryItem[] = [
    {
      id: 'HST-2025-001',
      instansi: 'Dinas Kesehatan Kota Surabaya',
      title: 'Evaluasi Program GERMAS Q4 2025',
      submittedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30).toISOString(),
      status: 'verified',
      score: 88,
      reviewer: 'Dr. Ratna P',
      tags: ['Evaluasi', 'Kota Surabaya'],
    },
    {
      id: 'HST-2025-002',
      instansi: 'Puskesmas Pegirian',
      title: 'Laporan Aktivitas Mingguan',
      submittedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 15).toISOString(),
      status: 'pending',
      tags: ['Laporan', 'Surabaya'],
      documents: [
        { name: 'laporan-aktivitas.xlsx', path: '/docs/laporan-aktivitas.xlsx' },
        { name: 'foto-kegiatan.zip', path: '/docs/foto-kegiatan.zip' },
      ],
    },
    {
      id: 'HST-2025-003',
      instansi: 'Kabupaten Sidoarjo',
      title: 'Review Implementasi GERMAS 2025',
      submittedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 16, 45).toISOString(),
      status: 'verified',
      score: 92,
      reviewer: 'Dr. Yudi R',
      tags: ['Review', 'Kabupaten'],
      documents: [{ name: 'review-implementasi.pdf', path: '/docs/review-implementasi.pdf' }],
    },
    {
      id: 'HST-2025-004',
      instansi: 'RSUD Dr. Soetomo',
      title: 'Audit Fasilitas GERMAS',
      submittedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 14, 5).toISOString(),
      status: 'rejected',
      reviewer: 'Dr. Andi K',
      tags: ['Audit', 'Rumah Sakit'],
      documents: [{ name: 'audit-fasilitas.docx', path: '/docs/audit-fasilitas.docx' }],
    },
  ];
  persistHistory(baseItems);
  return baseItems;
};

export const ReportHistory = {
  getAll: (): ReportHistoryItem[] => {
    const { records, exists } = readStorage();
    if (!exists) {
      return seedHistory();
    }
    return records;
  },

  add: (item: ReportHistoryItem) => {
    const current = ReportHistory.getAll();
    const merged = [item, ...current].slice(0, MAX_HISTORY);
    persistHistory(merged);
    window.dispatchEvent(new CustomEvent('report-history-update', { detail: merged }));
  },

  remove: (id: string) => {
    const current = ReportHistory.getAll();
    const filtered = current.filter((item) => item.id !== id);
    persistHistory(filtered);
    window.dispatchEvent(new CustomEvent('report-history-update', { detail: filtered }));
  },

  removeDocument: (id: string, documentName: string) => {
    const current = ReportHistory.getAll();
    const updated = current.map((item) => {
      if (item.id !== id) return item;
      const remainingDocs = (item.documents || []).filter((doc) => doc.name !== documentName);
      return { ...item, documents: remainingDocs };
    });
    persistHistory(updated);
    window.dispatchEvent(new CustomEvent('report-history-update', { detail: updated }));
  },

  subscribe: (callback: (items: ReportHistoryItem[]) => void) => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ReportHistoryItem[]>).detail;
      callback(detail);
    };
    window.addEventListener('report-history-update', handler);
    callback(ReportHistory.getAll());
    return () => window.removeEventListener('report-history-update', handler);
  },
};
