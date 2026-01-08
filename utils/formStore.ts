import { ReportType } from '../types';

// --- TYPES ---

export interface Question {
  id: number;
  text: string;
}

export interface Cluster {
  id: number;
  title: string;
  questions: Question[];
}

export interface EvaluasiTemplate {
  level: string; // e.g., 'INSTANSI TINGKAT PROVINSI'
  clusters: Cluster[];
}

export interface LaporanSection {
  id: string;
  title: string;
  indicator: string;
  hasTarget: boolean;
  hasBudget: boolean;
}

export interface LaporanTemplate {
  instansiId: string;
  instansiName: string;
  level?: string;
  sections: LaporanSection[];
}

// --- DEFAULT DATA (Initial State) ---

const DEFAULT_EVALUASI_CLUSTERS: Cluster[] = [
  {
    id: 1,
    title: "A. Kluster Peningkatan Aktifitas Fisik",
    questions: [
      { id: 1, text: 'Melakukan gerakan "Ayo Bergerak" atau senam bersama di tempat kerja secara rutin' },
      { id: 2, text: 'Menyediakan dan memanfaatkan fasilitas olahraga di tempat kerja' },
      { id: 3, text: 'Melaksanakan peregangan setiap jam 10.00 WIB dan jam 14.00 WIB minimal 5 menit' },
      { id: 4, text: 'Menganjurkan penggunaan tangga daripada lift/eskalator (untuk tempat kerja yang memiliki lebih dari 1 lantai)' },
    ]
  },
  {
    id: 2,
    title: "B. Kluster Peningkatan Perilaku Hidup Sehat",
    questions: [
      { id: 5, text: 'Menyediakan sarana dan menerapkan PHBS (Perilaku Hidup Bersih dan Sehat) di tempat kerja;' },
      { id: 6, text: 'Menerapkan Kawasan Tanpa Rokok (KTR);' },
      { id: 7, text: 'Menyediakan ruang laktasi di tempat kerja' },
      { id: 8, text: 'Menyediakan sarana dan fasilitas yang ergonomis di tempat kerja;' },
    ]
  },
  {
    id: 3,
    title: "PENGELOLAAN PELAKSANAAN GERMAS",
    questions: [
      { id: 9, text: 'Adakah Komitmen Pimpinan' },
      { id: 10, text: 'Adanya Koordinator/Tim Pelaksana tertuang dalam bentuk SK' },
      { id: 11, text: 'Adanya Perencanaan terintegrasi' },
      { id: 12, text: 'Adanya Monitoring & Evaluasi' },
    ]
  },
  {
    id: 4,
    title: "PEMANTAUAN DAN EVALUASI",
    questions: [
      { id: 13, text: 'Adakah Komitmen Pimpinan' },
      { id: 14, text: 'Adanya Koordinator/Tim Pelaksana tertuang dalam bentuk SK' },
      { id: 15, text: 'Adanya Perencanaan terintegrasi' },
      { id: 16, text: 'Adanya Monitoring & Evaluasi' }, 
    ]
  }
];

const DEFAULT_LAPORAN_BAPPEDA: LaporanTemplate = {
  instansiId: 'bappeda',
  instansiName: 'Badan Perencanaan Pembangunan Daerah',
  sections: [
    {
      id: 's1',
      title: 'A. Koordinasi dan fasilitasi pemerintah daerah dalam pelaksanaan Gerakan Masyarakat Hidup Sehat',
      indicator: 'Terselenggaranya rapat koordinasi Germas lintas sektor dan kab/kota',
      hasTarget: true, hasBudget: true
    },
    {
      id: 's2',
      title: 'B. Evaluasi dan Pelaporan pelaksanaan Gerakan Masyarakat Hidup Sehat (Germas) tingkat Provinsi',
      indicator: 'Jumlah Laporan pelaksanaan Gerakan Masyarakat Hidup Sehat (Germas) Provinsi Jawa Timur',
      hasTarget: true, hasBudget: true
    },
  ]
};

const DEFAULT_LAPORAN_DINKES: LaporanTemplate = {
  instansiId: 'dinkes',
  instansiName: 'Dinas Kesehatan',
  sections: [
    {
      id: 's1',
      title: 'A. Kabupaten Kota yang melakukan kampanye kesehatan (Pembudayaan Germas)',
      indicator: 'Persentase kabupaten/kota yang melakukan kampanye kesehatan (Pembudayaan Germas)',
      hasTarget: true, hasBudget: true
    },
    {
      id: 's2',
      title: 'B. Implementasi penerapan Kawasan Tanpa Rokok (KTR)',
      indicator: 'Persentase Kab/Kota yang melaksanakan kebijakan KTR di 3 tatanan (Fasyankes, Sekolah dan Tempat Bermain anak)',
      hasTarget: true, hasBudget: true
    },
  ]
};

export const INSTANSI_LEVELS = [
  'INSTANSI TINGKAT PROVINSI', 
  'INSTANSI TINGKAT KABUPATEN / KOTA', 
  'INSTANSI TINGKAT KECAMATAN', 
  'INSTANSI TINGKAT KELURAHAN / DESA', 
  'INSTANSI TINGKAT PERUSAHAAN'
];

const INSTANSI_LIST_PROV_INTERNAL = [
  { id: 'bappeda', name: 'Badan Perencanaan Pembangunan Daerah' },
  { id: 'dinkes', name: 'Dinas Kesehatan' },
  { id: 'dispora', name: 'Dinas Kepemudaan dan Olahraga' },
  { id: 'diknas', name: 'Dinas Pendidikan' },
  { id: 'dibun', name: 'Dinas Perkebunan' },
  { id: 'disnak', name: 'Dinas Peternakan' },
  { id: 'dpu-sda', name: 'Dinas Pekerjaan Umum Sumber Daya Air' },
  { id: 'esdm', name: 'Dinas Energi dan Sumberdaya Mineral' },
  { id: 'biro-kesra', name: 'Biro  Kesejahteraan Rakyat' },
  { id: 'biro-organisasi', name: 'Biro Organisasi Sekda Provinsi' },
  { id: 'dishut', name: 'Dinas Kehutanan' },
  { id: 'distan-kp', name: 'Dinas Pertanian dan Ketahanan Pangan' },
  { id: 'diskanlut', name: 'Dinas Perikanan dan Kelautan' },
  { id: 'disperkim-cipta-karya', name: 'Dinas Perumahan Rakyat, Kawasan Perrukiman dan Cipta Karya' },
  { id: 'dishub', name: 'Dinas Perhubungan' },
  { id: 'dlh', name: 'Dinas Lingkungan Hidup' },
  { id: 'disperindag', name: 'Dinas Perindustrian dan Perdagangan' },
  { id: 'disnakertrans', name: 'Dinas Tenaga Kerja dan Transmigrasi' },
  { id: 'diskominfo', name: 'Dinas Komunikasi dan Informatika' },
  { id: 'kpid-jatim', name: 'Komisi Penyiaran Indonesia Daerah (KPID) Jatim' },
  { id: 'dp3akb', name: 'Dinas Pemberdayaan Perempuan, Perlindungan Anak, dan Kependudukan' },
  { id: 'pom', name: 'Balai Besar POM di Surabaya' },
  { id: 'bpjs', name: 'BPJS Kesehatan' },
  { id: 'bkkbn', name: 'BKKBN' },
  { id: 'lldikti7', name: 'Lembaga Layanan Pendidikan Tinggi Wilayah VII' },
  { id: 'dpmddes', name: 'Dinas Pemberdayaan Masyarakat dan Desa' },
  { id: 'bumn-pln', name: 'BUMN (PT PLN )' },
  { id: 'tni', name: 'TNI' },
  { id: 'polri', name: 'POLRI' },
  { id: 'bnn', name: 'BNN' },
  { id: 'kanwil-agama', name: 'Kanwil Agama' },
  { id: 'fkm-unair', name: 'FKM UNAIR' },  
];

export const INSTANSI_LIST_PROV = INSTANSI_LIST_PROV_INTERNAL;

// Backwards-compatible export used in various parts of the app (defaults to provinsi list)
export const INSTANSI_LIST = INSTANSI_LIST_PROV_INTERNAL;

// Khusus untuk Laporan Tingkat Kabupaten/Kota (dropdown kab/kota)
export const INSTANSI_LIST_KABKOTA = [
  { id: 'bappeda', name: 'Badan Perencanaan Pembangunan Daerah' },
  { id: 'dinkes', name: 'Dinas Kesehatan' },
  { id: 'dispora', name: 'Dinas Kepemudaan dan Olahraga' },
  { id: 'dikbud', name: 'Dinas Pendidikan dan Kebudayaan' },
  { id: 'kanwil-agama', name: 'Kanwil Agama' },
  { id: 'dinas-pertanian-kp', name: 'Dinas Pertanian dan Ketahanan Pangan' },
  { id: 'dinas-perikanan-kelautan', name: 'Dinas Perikanan dan Kelautan' },
  { id: 'dinas-perumahan-prkp', name: 'Dinas Perumahan Rakyat, kawasan permukiman dan Cipta Karya' },
  { id: 'dishub-kabkota', name: 'Dinas Perhubungan' },
  { id: 'dlh-kabkota', name: 'Dinas  Lingkungan Hidup' },
  { id: 'disperindag', name: 'Dinas Perindustrian dan Perdagangan' },
  { id: 'disnakertrans', name: 'Dinas Tenaga Kerja dan Transmigrasi' },
  { id: 'diskominfo-kabkota', name: 'Dinas Komunikasi dan Informatika' },
  { id: 'dp3akb', name: 'Dinas Pemberdayaan Perempuan, Perlindungan Anak, dan Kependudukan' },
  { id: 'bpjs-kesehatan', name: 'BPJS Kesehatan' },
  { id: 'bupati-walikota', name: 'Bupati/Walikota' },
  { id: 'bkkbn', name: 'Badan Kependudukan dan Keluarga Berencana Nasional (BKKBN)' },
  { id: 'dinas-pariwisata', name: 'Dinas Kebudayaan dan Pariwisata' },
  { id: 'dinas-sosial-kabkota', name: 'Dinas Sosial' },
  { id: 'bumn', name: 'BUMN' },
  { id: 'dinas-pmd', name: 'Dinas Pemberdayaan Masyarakat dan Desa' },
  { id: 'tni-kabkota', name: 'TNI' },
  { id: 'polri-kabkota', name: 'POLRI' },
  { id: 'bnn-kabkota', name: 'BNN' },
];

// --- STORE LOGIC ---

const STORAGE_KEY_EVALUASI = 'germas_evaluasi_config';
const STORAGE_KEY_LAPORAN = 'germas_laporan_config';

export const FormStore = {
  // Evaluasi
  getEvaluasiTemplate: (level: string): Cluster[] => {
    const stored = localStorage.getItem(STORAGE_KEY_EVALUASI);
    let allTemplates: Record<string, Cluster[]> = {};
    
    if (stored) {
      allTemplates = JSON.parse(stored);
    }

    // Return stored or default if not found
    if (allTemplates[level]) {
      return allTemplates[level];
    }
    
    // Fallback: If no config exists for this level, return default
    return DEFAULT_EVALUASI_CLUSTERS;
  },

  saveEvaluasiTemplate: (level: string, clusters: Cluster[]) => {
    const stored = localStorage.getItem(STORAGE_KEY_EVALUASI);
    let allTemplates: Record<string, Cluster[]> = stored ? JSON.parse(stored) : {};
    
    allTemplates[level] = clusters;
    localStorage.setItem(STORAGE_KEY_EVALUASI, JSON.stringify(allTemplates));
  },

  // Laporan
  getLaporanTemplate: (instansiId: string, level?: string): LaporanTemplate => {
    const stored = localStorage.getItem(STORAGE_KEY_LAPORAN);
    let allTemplates: Record<string, LaporanTemplate> = {};

    if (stored) {
      allTemplates = JSON.parse(stored);
    }

    const compositeKey = level ? `${level}::${instansiId}` : null;

    if (compositeKey && allTemplates[compositeKey]) {
      return allTemplates[compositeKey];
    }

    if (allTemplates[instansiId]) {
      return allTemplates[instansiId];
    }

    // Defaults
    if (instansiId === 'bappeda') return { ...DEFAULT_LAPORAN_BAPPEDA, level };
    if (instansiId === 'dinkes') return { ...DEFAULT_LAPORAN_DINKES, level };

    // Generic Default if unknown
    const instansiName = INSTANSI_LIST.find(i => i.id === instansiId)?.name || 'Instansi';
    return {
      instansiId,
      instansiName,
      level,
      sections: []
    };
  },

  saveLaporanTemplate: (template: LaporanTemplate, level?: string) => {
    const stored = localStorage.getItem(STORAGE_KEY_LAPORAN);
    let allTemplates: Record<string, LaporanTemplate> = stored ? JSON.parse(stored) : {};

    const resolvedLevel = level ?? template.level;
    const key = resolvedLevel ? `${resolvedLevel}::${template.instansiId}` : template.instansiId;

    allTemplates[key] = {
      ...template,
      level: resolvedLevel,
    };
    localStorage.setItem(STORAGE_KEY_LAPORAN, JSON.stringify(allTemplates));
  },
  
  // Reset
  resetDefaults: () => {
    localStorage.removeItem(STORAGE_KEY_EVALUASI);
    localStorage.removeItem(STORAGE_KEY_LAPORAN);
  }
};
