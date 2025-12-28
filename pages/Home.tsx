import React, { useEffect, useMemo, useState } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Lock, Search, Filter, FileText, CheckCircle, Download, Calendar, ChevronDown } from 'lucide-react';

import toast from 'react-hot-toast';
import { SubmissionRecord } from '../utils/submissionStore';
import { apiClient } from '../utils/apiClient';
import { generateEvaluasiPDF, generateLaporanPDF } from '../utils/pdfGenerator';

// Local SVG Assets
import LogoGermas from '../components/svg/logo-germas.svg';
import ChecklistIcon from '../components/svg/checklist.svg';
import BookIcon from '../components/svg/book.svg';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // State for Data & Filters
  const [verifiedReports, setVerifiedReports] = useState<SubmissionRecord[]>([]);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [instansiLevelFilter, setInstansiLevelFilter] = useState<string>('all');

  // Filter asal wilayah (Home)
  const [regencyOptions, setRegencyOptions] = useState<{ id: number; name: string }[]>([]);
  const [districtOptions, setDistrictOptions] = useState<{ id: number; name: string }[]>([]);
  const [villageOptions, setVillageOptions] = useState<{ id: number; name: string }[]>([]);

  const [filterRegencyId, setFilterRegencyId] = useState<string>('');
  const [filterDistrictId, setFilterDistrictId] = useState<string>('');
  const [filterVillageId, setFilterVillageId] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');

  const [apiStatus, setApiStatus] = useState<{ state: 'loading' | 'online' | 'offline'; message?: string }>({ state: 'loading' });

  // Tab State: 'laporan' or 'evaluasi'
  const [activeTab, setActiveTab] = useState<'laporan' | 'evaluasi'>('laporan');

  // Pagination state for verified data table
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Handle hash scrolling, Auth check, and Data Fetching
  useEffect(() => {
    // Function to check auth
    const checkAuth = () => {
      const token = sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token');
      setIsLoggedIn(!!token);
    };

    // Run check immediately
    checkAuth();

    // Listen to custom event for logout/login updates within the app
    window.addEventListener('auth-change', checkAuth);

    // Scroll Logic
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        // Add a small delay to ensure rendering is complete
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return () => window.removeEventListener('auth-change', checkAuth);
  }, [location]);

  // Load verified reports from backend so data is consistent across devices
  useEffect(() => {
    let cancelled = false;

    if (!isLoggedIn) {
      setVerifiedReports([]);
      return;
    }

    const fetchReports = async () => {
      try {
        const [evalResp, lapResp] = await Promise.all([
          apiClient.get<any>('/evaluasi/submissions', { query: { per_page: 100, status: 'verified' } }),
          apiClient.get<any>('/laporan/submissions', { query: { per_page: 100, status: 'verified' } }),
        ]);

        if (cancelled) return;

        const evalItems: any[] = (evalResp as any)?.data?.data ?? (evalResp as any)?.data ?? [];
        const lapItems: any[] = (lapResp as any)?.data?.data ?? (lapResp as any)?.data ?? [];

        const mapEval: SubmissionRecord[] = evalItems.map((item: any) => {
          const submissionDate = item.submission_date ?? item.created_at ?? null;
          const yearFromEvaluation = item.evaluation_date ? new Date(item.evaluation_date).getFullYear() : null;
          const yearFromSubmission = submissionDate ? new Date(submissionDate).getFullYear() : new Date().getFullYear();

          return {
            id: item.submission_code ?? String(item.id),
            type: 'evaluasi',
            instansiName: item.instansi_name ?? 'Instansi tidak dikenal',
            submitDate: submissionDate ?? new Date().toISOString(),
            year: yearFromEvaluation ?? yearFromSubmission,
            status: item.status ?? 'pending',
            payload: {
              // Seragamkan dengan struktur sebelumnya: backend.data menampung resource
              backend: { data: item },
            },
          };
        });

        const mapLap: SubmissionRecord[] = lapItems.map((item: any) => {
          const submittedAt = item.submitted_at ?? item.created_at ?? null;
          const year = item.report_year ?? (submittedAt ? new Date(submittedAt).getFullYear() : new Date().getFullYear());

          return {
            id: item.submission_code ?? String(item.id),
            type: 'laporan',
            instansiName: item.instansi_name ?? 'Instansi tidak dikenal',
            submitDate: submittedAt ?? new Date().toISOString(),
            year,
            status: item.status ?? 'pending',
            payload: {
              backend: { data: item },
            },
          };
        });

        setVerifiedReports([...mapEval, ...mapLap]);
      } catch (error) {
        // Jika gagal, biarkan state sebelumnya tetap ada dan log error saja
        console.error('Gagal memuat laporan terverifikasi dari server', error);
      }
    };

    fetchReports();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const result = await apiClient.get<{ status: string; app?: string; timestamp?: string }>('status');
        if (!cancelled) {
          setApiStatus({ state: 'online', message: result.status ?? 'Terhubung' });
        }
      } catch (error: any) {
        if (cancelled) return;

        const message =
          typeof error?.message === 'string'
            ? error.message
            : error?.data?.message ?? 'API tidak dapat dijangkau';

        setApiStatus({ state: 'offline', message });
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- LOAD REGION OPTIONS FOR ORIGIN FILTERS ---
  useEffect(() => {
    if (regencyOptions.length > 0) return;

    apiClient
      .get<any>('/regions', { query: { province_code: '35' } })
      .then((response) => {
        const raw = (response as any)?.regencies ?? (response as any)?.data ?? response;
        const items: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setRegencyOptions(
          items.map((item: any) => ({ id: Number(item.id), name: String(item.name ?? '') })),
        );
      })
      .catch(() => {
        setRegencyOptions([]);
      });
  }, [regencyOptions.length]);

  useEffect(() => {
    setFilterDistrictId('');
    setFilterVillageId('');
    setDistrictOptions([]);
    setVillageOptions([]);

    if (!filterRegencyId) return;

    apiClient
      .get<any>(`/regions/${filterRegencyId}/districts`)
      .then((response) => {
        const raw = (response as any)?.districts ?? (response as any)?.data ?? response;
        const items: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setDistrictOptions(
          items.map((item: any) => ({ id: Number(item.id), name: String(item.name ?? '') })),
        );
      })
      .catch(() => {
        setDistrictOptions([]);
      });
  }, [filterRegencyId]);

  useEffect(() => {
    setFilterVillageId('');
    setVillageOptions([]);

    if (!filterDistrictId) return;

    apiClient
      .get<any>(`/districts/${filterDistrictId}/villages`)
      .then((response) => {
        const raw = (response as any)?.villages ?? (response as any)?.data ?? response;
        const items: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setVillageOptions(
          items.map((item: any) => ({ id: Number(item.id), name: String(item.name ?? '') })),
        );
      })
      .catch(() => {
        setVillageOptions([]);
      });
  }, [filterDistrictId]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Download PDF handler for verified reports on Home page
  const handleDownloadPDF = (submission: SubmissionRecord) => {
    try {
      if (submission.type === 'evaluasi') {
        // Rebuild data from backend payload (similar to admin Verification page)
        const backendData: any = (submission.payload as any)?.backend?.data ?? null;

        if (!backendData) {
          toast.error('Data evaluasi tidak lengkap untuk diunduh.');
          return;
        }

        const score = typeof backendData?.score === 'number' ? backendData.score : null;
        const categoryLabel: string | undefined =
          backendData?.category?.label ?? backendData?.category_label ?? undefined;
        const category = categoryLabel
          ? { label: categoryLabel, color: 'text-emerald-600' }
          : undefined;

        const instansiData: any = {
          nama: backendData?.instansi_name ?? 'Instansi tidak dikenal',
          alamat: backendData?.instansi_address ?? '-',
          pejabat: backendData?.pejabat_nama ?? '-',
          jmlLaki: backendData?.employee_male_count ?? 0,
          jmlPerempuan: backendData?.employee_female_count ?? 0,
          tanggal: backendData?.evaluation_date ?? backendData?.submission_date ?? null,
        };

        const answersFromBackend: any[] = backendData?.answers ?? [];

        // Group answers by cluster
        const clustersMap: Record<string, { id: number; title: string; questions: { id: number; text: string }[] }> = {};
        let clusterIndex = 1;

        answersFromBackend.forEach((a) => {
          const clusterTitle: string = a.cluster_title || 'Rincian Jawaban';
          const key = String(a.cluster_id ?? clusterTitle);

          if (!clustersMap[key]) {
            clustersMap[key] = {
              id: typeof a.cluster_id === 'number' ? a.cluster_id : clusterIndex++,
              title: clusterTitle,
              questions: [],
            };
          }

          clustersMap[key].questions.push({
            id: a.question_id,
            text: a.question_text,
          });
        });

        const clusters = Object.values(clustersMap) as any;

        const answers: Record<number, number> = {};
        const remarks: Record<number, string> = {};
        answersFromBackend.forEach((a) => {
          if (a && typeof a.question_id !== 'undefined') {
            answers[a.question_id] = a.answer_value;
            if (a.remark) {
              remarks[a.question_id] = a.remark;
            }
          }
        });

        const instansiForPdf = {
          ...instansiData,
          originRegencyName: backendData?.origin_regency_name ?? null,
          originDistrictName: backendData?.origin_district_name ?? null,
          originVillageName: backendData?.origin_village_name ?? null,
        };

        generateEvaluasiPDF(instansiForPdf, score, category, clusters, answers, remarks);
      } else {
        // LAPORAN: bangun kembali struktur template & input dari data backend (mirip halaman Verifikasi)
        const backendData: any = (submission.payload as any)?.backend?.data ?? null;

        if (!backendData) {
          toast.error('Data laporan tidak lengkap untuk diunduh.');
          return;
        }

        const rawTemplate = backendData?.template;
        const submittedSections: any[] = backendData?.sections ?? [];
        const year: string = String(backendData?.report_year ?? new Date().getFullYear());

        const effectiveTemplate: any =
          rawTemplate && Array.isArray(rawTemplate.sections) && rawTemplate.sections.length > 0
            ? rawTemplate
            : {
                instansiName: backendData?.instansi_name ?? 'Instansi tidak dikenal',
                sections: submittedSections.map((sec) => ({
                  id: sec.section_id ?? sec.id,
                  title: sec.section_title ?? 'Indikator',
                  indicator: sec.section_title ?? '',
                  hasTarget: true,
                  hasBudget: true,
                })),
              };

        if (!Array.isArray(effectiveTemplate.sections) || effectiveTemplate.sections.length === 0) {
          toast.error('Template atau daftar indikator laporan belum tersedia.');
          return;
        }

        const laporanInputs: Record<string, any> = {};

        submittedSections.forEach((sec) => {
          const sectionId = sec.section_id ?? sec.section_code ?? sec.id ?? null;
          if (!sectionId) return;
          const key = String(sectionId);

          laporanInputs[`${key}-target-year`] = sec.target_year ?? '';
          laporanInputs[`${key}-target-sem1`] = sec.target_semester_1 ?? '';
          laporanInputs[`${key}-target-sem2`] = sec.target_semester_2 ?? '';

          laporanInputs[`${key}-budget-year`] = sec.budget_year ?? '';
          laporanInputs[`${key}-budget-sem1`] = sec.budget_semester_1 ?? '';
          laporanInputs[`${key}-budget-sem2`] = sec.budget_semester_2 ?? '';
        });

        const originName: string | undefined = backendData?.origin_regency_name ?? undefined;

        generateLaporanPDF(effectiveTemplate, originName, laporanInputs, year);
      }

      toast.success('File PDF berhasil diunduh');
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengunduh PDF: Data tidak lengkap');
    }
  };

  // Helper: available years from verified reports
  const availableYears = Array.from(new Set(verifiedReports.map((r) => r.year))).sort(
    (a: number, b: number) => b - a,
  );

  // Helper: pretty label for instansi level text
  const formatInstansiLevelLabel = (raw: string | null | undefined): string => {
    if (!raw) return '-';
    const upper = raw.toUpperCase();

    if (upper.includes('PROVINSI')) return 'Tingkat Provinsi';
    if (upper.includes('KABUPATEN') || upper.includes('KOTA')) return 'Tingkat Kabupaten/Kota';
    if (upper.includes('KECAMATAN')) return 'Tingkat Kecamatan';
    if (upper.includes('KELURAHAN') || upper.includes('DESA')) return 'Tingkat Kelurahan/Desa';
    if (upper.includes('PERUSAHAAN')) return 'Tingkat Perusahaan';

    return `Tingkat ${raw}`;
  };

  const availableInstansiLevels = useMemo(() => {
    // Semua label tingkat yang "resmi" agar selalu muncul di dropdown
    const ALL_LEVEL_LABELS = [
      'Tingkat Provinsi',
      'Tingkat Kabupaten/Kota',
      'Tingkat Kecamatan',
      'Tingkat Kelurahan/Desa',
      'Tingkat Perusahaan',
    ];

    const fromData = Array.from(
      new Set(
        verifiedReports
          .map((item) => {
            let raw: string | null = null;

            if (item.type === 'evaluasi') {
              const backendData: any = (item.payload as any)?.backend?.data ?? null;
              raw =
                backendData?.instansi_level_text ??
                backendData?.instansi_level?.name ??
                (item.payload as any)?.instansiData?.level ??
                null;
            } else if (item.type === 'laporan') {
              const backendData: any = (item.payload as any)?.backend?.data ?? null;
              raw =
                backendData?.instansi_level_text ??
                backendData?.instansi_level?.name ??
                (item.payload as any)?.level ??
                null;
            }

            if (!raw) return null;
            const label = formatInstansiLevelLabel(raw);
            return label === '-' ? null : label;
          })
          .filter((v): v is string => typeof v === 'string' && v.trim().length > 0),
      ),
    );

    // Gabungkan label dari data + label resmi agar opsi seperti "Tingkat Kecamatan" selalu ada
    return Array.from(new Set([...ALL_LEVEL_LABELS, ...fromData]));
  }, [verifiedReports]);

  // Filter Data based on Active Tab, Year, and Search
  const getFilteredData = () => {
    return verifiedReports.filter((item) => {
      const matchesType = item.type === activeTab;
      const matchesYear = yearFilter === 'all' || item.year.toString() === yearFilter;
      const matchesSearch = item.instansiName.toLowerCase().includes(searchQuery.toLowerCase());

      let instansiLevelText: string | null = null;
      let originRegencyId: number | null = null;
      let originDistrictId: number | null = null;
      let originVillageId: number | null = null;
      if (item.type === 'evaluasi') {
        const backendData: any = (item.payload as any)?.backend?.data ?? null;

        instansiLevelText =
          backendData?.instansi_level_text ?? backendData?.instansi_level?.name ?? (item.payload as any)?.instansiData?.level ?? null;

        originRegencyId = backendData?.origin_regency_id ?? null;
        originDistrictId = backendData?.origin_district_id ?? null;
        originVillageId = backendData?.origin_village_id ?? null;
      } else if (item.type === 'laporan') {
        const backendData: any = (item.payload as any)?.backend?.data ?? null;
        instansiLevelText =
          backendData?.instansi_level_text ?? backendData?.instansi_level?.name ?? (item.payload as any)?.level ?? null;

        originRegencyId = backendData?.origin_regency_id ?? null;
        originDistrictId = backendData?.origin_district_id ?? null;
        originVillageId = backendData?.origin_village_id ?? null;
      }

      const matchesInstansiLevel =
        instansiLevelFilter === 'all' ||
        (instansiLevelText &&
          formatInstansiLevelLabel(instansiLevelText) === instansiLevelFilter);

      // Filter berdasarkan asal wilayah (jika dipilih)
      const matchesRegency =
        !filterRegencyId || (originRegencyId !== null && String(originRegencyId) === String(filterRegencyId));
      const matchesDistrict =
        !filterDistrictId || (originDistrictId !== null && String(originDistrictId) === String(filterDistrictId));
      const matchesVillage =
        !filterVillageId || (originVillageId !== null && String(originVillageId) === String(filterVillageId));

      return (
        matchesType &&
        matchesYear &&
        matchesSearch &&
        matchesInstansiLevel &&
        matchesRegency &&
        matchesDistrict &&
        matchesVillage
      );
    });
  };

  const currentData = getFilteredData();

  // Reset halaman ketika filter/tab berubah agar tidak keluar range
  useEffect(() => {
    setPage(1);
  }, [
    activeTab,
    yearFilter,
    instansiLevelFilter,
    filterRegencyId,
    filterDistrictId,
    filterVillageId,
    searchQuery,
  ]);

  // Pagination helper untuk tabel verified data
  const totalItems = currentData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = currentData.slice(startIndex, endIndex);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="relative min-h-screen pb-20 overflow-hidden bg-[#f6fbf9]">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-10 md:py-16 relative">
        <div className="bg-white rounded-3xl shadow-xl border border-emerald-50 p-8 md:p-12 relative">
          <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center max-w-6xl mx-auto">
            {/* Text Content */}
            <motion.div
              {...(!shouldReduceMotion ? {
                initial: { opacity: 0, x: -20 },
                animate: { opacity: 1, x: 0 },
                transition: { duration: 0.6 },
              } : {})}
              className="order-last md:order-first md:pr-8 text-left"
            >
              <h1 className="text-3xl md:text-5xl font-black text-slate-800 mb-3 leading-tight tracking-tight">
                SI-PORSI <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500">GERMAS</span>
              </h1>
              <h2 className="text-lg md:text-2xl text-slate-600 font-medium mb-4 text-teal-900">
                Sistem Pelaporan dan Evaluasi GERMAS Pada Tatanan Tempat Kerja
              </h2>
              <h3 className="text-lg md:text-2l text-slate-600 font-medium mb-4">
                Dinas Kesehatan Provinsi Jawa Timur
              </h3>
              <div className="flex flex-wrap gap-4 justify-start">
                <button
                  onClick={() => scrollToSection('section-formulir')}
                  className="group bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-1"
                >
                  <span className="flex items-center gap-3">
                    Form Pelaporan
                  </span>
                </button>
                <button
                  onClick={() => scrollToSection('section-laporan')}
                  className="group bg-white/90 backdrop-blur border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold py-3 px-8 rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                  <span className="flex items-center gap-3">
                    Lihat Hasil Laporan
                  </span>
                </button>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 max-w-md">
              </div>
              <div className="mt-6">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                    apiStatus.state === 'online'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : apiStatus.state === 'loading'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-red-100 text-red-700 border border-red-200'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      apiStatus.state === 'online'
                        ? 'bg-emerald-500'
                        : apiStatus.state === 'loading'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                  />
                  {apiStatus.state === 'loading'
                    ? 'Menghubungkan ke API...'
                    : apiStatus.state === 'online'
                      ? 'API terhubung'
                      : 'API tidak dapat dijangkau'}
                  {apiStatus.message && (
                    <span className="font-normal text-[11px] text-slate-500">({apiStatus.message})</span>
                  )}
                </span>
              </div>
            </motion.div>

            {/* Logo Germas */}
            <div className="flex-1 flex justify-center md:justify-center relative order-first md:order-last md:pl-8">
              <div className="w-56 h-56 md:w-80 md:h-80 relative flex items-center justify-center">
                <img
                  src={LogoGermas}
                  alt="Logo GERMAS"
                  loading="lazy"
                  decoding="async"
                  className="relative z-10 w-full h-full object-contain drop-shadow-[0_20px_38px_rgba(16,185,129,0.32)] hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Formulir Section */}
      <section id="section-formulir" className="container mx-auto px-4 mt-8 scroll-mt-24">
        <motion.div
          variants={containerVariants}
          initial={shouldReduceMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-3xl shadow-xl border border-emerald-50 p-8 md:p-12"
        >
          <motion.h2 variants={itemVariants} className="text-2xl md:text-3xl font-extrabold text-slate-800 text-center mb-12 uppercase">
            Formulir Evaluasi &amp; Pelaporan
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-8 relative">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 -ml-[0.5px]"></div>

            {/* Card 1 */}
            <motion.div variants={itemVariants} className="flex flex-col items-center">
              <div
                onClick={() => navigate('/formulir?type=evaluasi')}
                className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white p-8 rounded-3xl shadow-xl cursor-pointer transition-transform hover:-translate-y-2 w-full max-w-sm text-center h-full flex items-center justify-center flex-col gap-6 aspect-square md:aspect-auto md:h-80 relative overflow-hidden group"
              >
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_60%)]" />
                <div className="w-20 h-20 bg-white/15 rounded-2xl flex items-center justify-center p-4 backdrop-blur-sm group-hover:scale-110 transition-transform relative z-10">
                  <img src={ChecklistIcon} alt="Checklist Icon" loading="lazy" decoding="async" className="w-full h-full object-contain brightness-0 invert" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl md:text-2xl font-bold tracking-widest mb-2">FORMULIR<br />EVALUASI</h3>
                  <p className="text-emerald-100 font-medium text-lg">Penerapan GERMAS<br />dalam Instansi</p>
                </div>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div variants={itemVariants} className="flex flex-col items-center">
              <div
                onClick={() => navigate('/formulir?type=laporan')}
                className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white p-8 rounded-3xl shadow-xl cursor-pointer transition-transform hover:-translate-y-2 w-full max-w-sm text-center h-full flex items-center justify-center flex-col gap-6 aspect-square md:aspect-auto md:h-80 relative overflow-hidden group"
              >
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_60%)]" />
                <div className="w-20 h-20 bg-white/15 rounded-2xl flex items-center justify-center p-4 backdrop-blur-sm group-hover:scale-110 transition-transform relative z-10">
                  <img src={BookIcon} alt="Archive Icon" loading="lazy" decoding="async" className="w-full h-full object-contain brightness-0 invert" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl md:text-2xl font-bold tracking-widest mb-2">FORMULIR<br />LAPORAN</h3>
                  <p className="text-emerald-100 font-medium text-lg">Semesteran dan<br />Tahunan GERMAS</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Hasil Section (AUTHENTICATED ONLY) */}
      <section id="section-laporan" className="container mx-auto px-4 mt-8 scroll-mt-24">
        <motion.div
          variants={containerVariants}
          initial={shouldReduceMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-8 md:p-12 min-h-[400px]"
        >
          <motion.h2 variants={itemVariants} className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2 uppercase">
            Hasil Evaluasi &amp; Laporan GERMAS
          </motion.h2>
          <motion.p variants={itemVariants} className="text-slate-600 mb-10 text-lg">
            Arsip terverifikasi yang siap diunduh beserta akses menuju dashboard analitik GERMAS Provinsi Jawa Timur.
          </motion.p>

          <AnimatePresence mode="wait">
            {isLoggedIn ? (
              // CONTENT FOR LOGGED IN USERS
              <motion.div
                key="logged-in-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-12"
              >
                {/* --- VERIFIED DATA TABLE (With Tabs) --- */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  {/* Header Controls */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                    {/* Tabs */}
                    <div className="flex p-1 bg-slate-50/80 backdrop-blur rounded-2xl border border-slate-200/70 shadow-inner shadow-white/20">
                      <button
                        onClick={() => setActiveTab('laporan')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'laporan' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}
                      >
                        <FileText className="w-4 h-4" />
                        Data Laporan
                      </button>
                      <button
                        onClick={() => setActiveTab('evaluasi')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'evaluasi' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Data Evaluasi
                      </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                      <div className="relative">
                        <select
                          value={yearFilter}
                          onChange={(e) => setYearFilter(e.target.value)}
                          className="appearance-none bg-white/90 backdrop-blur border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-sm hover:border-emerald-300 transition"
                        >
                          <option value="all">Semua Tahun</option>
                          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>

                      {availableInstansiLevels.length > 0 && (
                        <div className="relative">
                          <select
                            value={instansiLevelFilter}
                            onChange={(e) => setInstansiLevelFilter(e.target.value)}
                            className="appearance-none bg-white/90 backdrop-blur border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-sm hover:border-emerald-300 transition"
                          >
                            <option value="all">Semua Tingkat</option>
                            {availableInstansiLevels.map((level) => (
                              <option key={level} value={level}>
                                {formatInstansiLevelLabel(level)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      )}

                      {/* Dynamic Origin Region Filters */}
                      {instansiLevelFilter !== 'all' && (
                        (() => {
                          const upper = instansiLevelFilter.toUpperCase();
                          const showRegency =
                            upper.includes('KABUPATEN') ||
                            upper.includes('KOTA') ||
                            upper.includes('PERUSAHAAN') ||
                            upper.includes('KECAMATAN') ||
                            upper.includes('KELURAHAN') ||
                            upper.includes('DESA');
                          const showDistrict =
                            upper.includes('KECAMATAN') ||
                            upper.includes('KELURAHAN') ||
                            upper.includes('DESA');
                          const showVillage =
                            upper.includes('KELURAHAN') || upper.includes('DESA');

                          return (
                            <>
                              {showRegency && (
                                <div className="relative">
                                  <select
                                    value={filterRegencyId}
                                    onChange={(e) => setFilterRegencyId(e.target.value)}
                                    className="appearance-none bg-white/90 backdrop-blur border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-sm hover:border-emerald-300 transition"
                                  >
                                    <option value="">Semua Kab/Kota</option>
                                    {regencyOptions.map((r) => (
                                      <option key={r.id} value={String(r.id)}>{r.name}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                              )}

                              {showDistrict && (
                                <div className="relative">
                                  <select
                                    value={filterDistrictId}
                                    onChange={(e) => setFilterDistrictId(e.target.value)}
                                    className="appearance-none bg-white/90 backdrop-blur border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-sm hover:border-emerald-300 transition"
                                  >
                                    <option value="">Semua Kecamatan</option>
                                    {districtOptions.map((d) => (
                                      <option key={d.id} value={String(d.id)}>{d.name}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                              )}

                              {showVillage && (
                                <div className="relative">
                                  <select
                                    value={filterVillageId}
                                    onChange={(e) => setFilterVillageId(e.target.value)}
                                    className="appearance-none bg-white/90 backdrop-blur border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-sm hover:border-emerald-300 transition"
                                  >
                                    <option value="">Semua Desa/Kel</option>
                                    {villageOptions.map((v) => (
                                      <option key={v.id} value={String(v.id)}>{v.name}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                              )}
                            </>
                          );
                        })()
                      )}

                      <div className="relative flex-1 md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari nama instansi..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white/90 backdrop-blur border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all shadow-sm hover:border-emerald-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200 bg-white/95 backdrop-blur">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className={`text-xs font-bold text-white uppercase border-b tracking-[0.2em] ${activeTab === 'laporan' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
                          <tr>
                            <th className="px-6 py-4">Tahun</th>
                            <th className="px-6 py-4">Nama Instansi</th>
                            {activeTab === 'evaluasi' && <th className="px-6 py-4">Skor & Kategori</th>}
                            <th className="px-6 py-4">Detail Info</th>
                            <th className="px-6 py-4">Tanggal Verifikasi</th>
                            <th className="px-6 py-4 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/70">
                          {paginatedData.length > 0 ? (
                            paginatedData.map((row) => {
                              const backendData: any = (row.payload as any)?.backend?.data ?? null;
                              const scoreFromPayload = (row.payload as any)?.score;
                              const categoryFromPayload = (row.payload as any)?.category;

                              const resolvedScore: number | null =
                                typeof scoreFromPayload === 'number'
                                  ? scoreFromPayload
                                  : typeof backendData?.score === 'number'
                                    ? backendData.score
                                    : null;

                              const categoryLabel: string | undefined =
                                categoryFromPayload?.label ?? backendData?.category?.label ?? backendData?.category_label ?? undefined;

                              const instansiLevelText: string | null =
                                backendData?.instansi_level_text ??
                                backendData?.instansi_level?.name ??
                                (row.payload as any)?.level ??
                                null;

                              // Tentukan label asal wilayah yang ditampilkan di bawah nama instansi
                              const isProvinsiLevel =
                                !!instansiLevelText && instansiLevelText.toUpperCase().includes('PROVINSI');

                              let originLabel: string = 'Jawa Timur';

                              if (!isProvinsiLevel) {
                                if (activeTab === 'evaluasi') {
                                  const regencyName: string | undefined = backendData?.origin_regency_name;
                                  const districtName: string | undefined = backendData?.origin_district_name;
                                  const villageName: string | undefined = backendData?.origin_village_name;

                                  const parts: string[] = [];
                                  if (regencyName) parts.push(regencyName);
                                  if (districtName) parts.push(`Kec ${districtName}`);
                                  if (villageName) parts.push(`Desa/Kel ${villageName}`);

                                  if (parts.length > 0) {
                                    originLabel = parts.join(', ');
                                  }
                                } else {
                                  // Laporan: gunakan nama kab/kota asal instansi jika tersedia
                                  const regencyName: string | undefined = backendData?.origin_regency_name;
                                  if (regencyName) {
                                    originLabel = regencyName;
                                  }
                                }
                              }

                              return (
                                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-6 py-4 font-semibold text-slate-700">{row.year}</td>
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800">{row.instansiName}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">{originLabel}</div>
                                  </td>

                                  {/* Evaluasi Specific Column */}
                                  {activeTab === 'evaluasi' && (
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">{resolvedScore ?? '-'}</span>
                                        <span
                                          className={`text-xs font-bold px-2 py-1 rounded-full border ${
                                            categoryLabel === 'Baik'
                                              ? 'bg-green-50 text-green-700 border-green-200'
                                              : categoryLabel === 'Cukup'
                                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                : 'bg-red-50 text-red-700 border-red-200'
                                          }`}
                                        >
                                          {categoryLabel || '-'}
                                        </span>
                                      </div>
                                    </td>
                                  )}

                                  <td className="px-6 py-4">
                                    {activeTab === 'laporan' ? (
                                      <span className="text-xs font-semibold text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-full border border-blue-100">
                                        {instansiLevelText ? formatInstansiLevelLabel(instansiLevelText) : '-'}
                                      </span>
                                    ) : (
                                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50/80 px-2.5 py-1 rounded-full border border-emerald-100">
                                        {instansiLevelText ? formatInstansiLevelLabel(instansiLevelText) : '-'}
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-6 py-4 text-slate-500 text-xs">
                                    {new Date(row.submitDate).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                    })}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <button
                                      onClick={() => handleDownloadPDF(row)}
                                      className={`inline-flex items-center gap-1.5 font-bold text-xs bg-white px-3.5 py-1.5 rounded-lg transition-all shadow-sm border ${
                                        activeTab === 'laporan'
                                          ? 'text-blue-600 border-blue-200 hover:bg-blue-50/80 hover:border-blue-300'
                                          : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50/80 hover:border-emerald-300'
                                      }`}
                                    >
                                      <Download className="w-3.5 h-3.5" /> PDF
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td
                                colSpan={activeTab === 'evaluasi' ? 6 : 5}
                                className="px-6 py-12 text-center text-slate-400 italic bg-slate-50/50"
                              >
                                Tidak ada data {activeTab} terverifikasi yang ditemukan.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination bar */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/70 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <span>Tampil</span>
                        <select
                          className="border border-slate-200 rounded-lg px-2 py-1 bg-white text-xs"
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPage(1);
                          }}
                        >
                          {[10, 25, 50, 100].map((size) => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                        <span>data per halaman</span>
                        <span className="ml-3">
                          Menampilkan {totalItems === 0 ? 0 : startIndex + 1}
                          {' - '}
                          {Math.min(endIndex, totalItems)} dari {totalItems} data
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className="px-2 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={safePage <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Sebelumnya
                        </button>
                        <span>
                          Halaman {safePage} / {totalPages}
                        </span>
                        <button
                          className="px-2 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={safePage >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                          Selanjutnya
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            ) : (
              // CONTENT FOR GUESTS (RESTRICTED)
              <motion.div
                key="guest-content"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"
              >
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <Lock className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">Akses Dashboard Terbatas</h3>
                <p className="text-slate-500 mb-8 max-w-md text-lg">
                  Untuk melihat <strong>Data Laporan</strong>, <strong>Hasil Evaluasi</strong>, dan <strong>Dashboard Analitik</strong>, Anda diwajibkan untuk login sebagai petugas instansi.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 px-8 py-3 h-auto text-lg"
                >
                  Login Petugas
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>
    </div>
  );
};

export default Home;