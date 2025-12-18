import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Lock, Search, Filter, FileText, CheckCircle, Download, Calendar, ChevronDown, BarChart3, PieChart } from 'lucide-react';
import toast from 'react-hot-toast';
import { SubmissionStore, SubmissionRecord } from '../utils/submissionStore';
import { apiClient } from '../utils/apiClient';
import { generateEvaluasiPDF, generateLaporanPDF } from '../utils/pdfGenerator';

// Local SVG Assets
import LogoGermas from '../components/svg/logo-germas.svg';
import ChecklistIcon from '../components/svg/checklist.svg';
import BookIcon from '../components/svg/book.svg';
import GDriveIcon from '../components/svg/gdrive.svg';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // State for Data & Filters
  const [verifiedReports, setVerifiedReports] = useState<SubmissionRecord[]>([]);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<{ state: 'loading' | 'online' | 'offline'; message?: string }>({ state: 'loading' });
  
  // Tab State: 'laporan' or 'evaluasi'
  const [activeTab, setActiveTab] = useState<'laporan' | 'evaluasi'>('laporan');

  // Handle hash scrolling, Auth check, and Data Fetching
  useEffect(() => {
    // Function to check auth
    const checkAuth = () => {
      const token = sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token');
      setIsLoggedIn(!!token);
    };

    // Load Verified Data from Store
    const loadPublicData = () => {
       const allData = SubmissionStore.getAll();
       // Only load verified data
       const verified = allData.filter(item => item.status === 'verified');
       setVerifiedReports(verified);
    };

    // Run check immediately
    checkAuth();
    loadPublicData();

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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDownloadPDF = (submission: SubmissionRecord) => {
    try {
      if (submission.type === 'evaluasi') {
        const { instansiData, score, category, clusters, answers, remarks } = submission.payload;
        generateEvaluasiPDF(instansiData, score, category, clusters, answers, remarks);
      } else {
        const { template, level, laporanInputs, year } = submission.payload;
        generateLaporanPDF(template, level, laporanInputs, year);
      }
      toast.success('File berhasil diunduh');
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengunduh file');
    }
  };

  const availableYears = Array.from(new Set(verifiedReports.map(r => r.year))).sort((a: number, b: number) => b - a);

  // Filter Data based on Active Tab, Year, and Search
  const getFilteredData = () => {
      return verifiedReports.filter(item => {
          const matchesType = item.type === activeTab;
          const matchesYear = yearFilter === 'all' || item.year.toString() === yearFilter;
          const matchesSearch = item.instansiName.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesType && matchesYear && matchesSearch;
      });
  };

  const currentData = getFilteredData();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
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
                  transition: { duration: 0.6 }
                } : {})}
                className="order-last md:order-first md:pr-8 text-left"
              >
                 <h1 className="text-3xl md:text-5xl font-black text-slate-800 mb-3 leading-tight tracking-tight">
                    SEL <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500">GERMAS</span> Kerja
                 </h1>
                 <h2 className="text-lg md:text-2xl text-slate-600 font-medium mb-4 text-teal-900">
                    Sistem Evaluasi dan Laporan GERMAS Pada Tatanan Tempat Kerja
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
                        <h3 className="text-xl md:text-2xl font-bold tracking-widest mb-2">FORMULIR<br/>EVALUASI</h3>
                        <p className="text-emerald-100 font-medium text-lg">Penerapan GERMAS<br/>dalam Instansi</p>
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
                        <h3 className="text-xl md:text-2xl font-bold tracking-widest mb-2">FORMULIR<br/>LAPORAN</h3>
                        <p className="text-emerald-100 font-medium text-lg">Semesteran dan<br/>Tahunan GERMAS</p>
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
                                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                </div>

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
                                    {currentData.length > 0 ? currentData.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-slate-700">{row.year}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{row.instansiName}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{row.payload.instansiData?.alamat || 'Jawa Timur'}</div>
                                            </td>
                                            
                                            {/* Evaluasi Specific Column */}
                                            {activeTab === 'evaluasi' && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">{row.payload.score}</span>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                                                            row.payload.category?.label === 'Baik' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                            row.payload.category?.label === 'Cukup' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                            'bg-red-50 text-red-700 border-red-200'
                                                        }`}>
                                                            {row.payload.category?.label || '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}

                                            <td className="px-6 py-4">
                                                {activeTab === 'laporan' ? (
                                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-full border border-blue-100">
                                                        {row.payload.level === 'Provinsi' ? 'Tingkat Provinsi' : 'Tingkat Kab/Kota'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50/80 px-2.5 py-1 rounded-full border border-emerald-100">
                                                        Evaluasi Mandiri
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {new Date(row.submitDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
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
                                    )) : (
                                        <tr>
                                            <td colSpan={activeTab === 'evaluasi' ? 6 : 5} className="px-6 py-12 text-center text-slate-400 italic bg-slate-50/50">
                                                Tidak ada data {activeTab} terverifikasi yang ditemukan.
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Separator with Label */}
                    <div className="relative text-center">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <span className="relative z-10 bg-white px-4 text-sm font-bold text-slate-400 uppercase tracking-widest">
                            Dashboard Analitik
                        </span>
                    </div>

                    {/* Dashboard Navigation Buttons (Existing) */}
                    <div className="grid gap-8">
                        {/* Laporan Section */}
                        <div>
                            <h3 className="text-xl text-slate-700 font-bold mb-4 flex items-center gap-2">
                                <BarChart3 className="w-6 h-6 text-blue-600" />
                                Dashboard Laporan Semesteran
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <button 
                                    onClick={() => navigate('/dashboard?filter=prov')}
                                    className="bg-white border-2 border-blue-100 hover:border-blue-500 rounded-xl p-5 flex items-center gap-4 hover:bg-blue-50 transition-all group text-left shadow-sm hover:shadow-md"
                                >
                                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center transform rotate-3 group-hover:rotate-6 transition-transform">
                                        <img src={GDriveIcon} className="w-12 h-12 object-contain" alt="GDrive" />
                                    </div>
                                    <div>
                                        <span className="block text-blue-900 font-bold text-lg">Laporan Tingkat Provinsi</span>
                                        <span className="text-sm text-slate-500">Analitik capaian indikator provinsi</span>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => navigate('/dashboard?filter=kab')}
                                    className="bg-white border-2 border-blue-100 hover:border-blue-500 rounded-xl p-5 flex items-center gap-4 hover:bg-blue-50 transition-all group text-left shadow-sm hover:shadow-md"
                                >
                                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center transform rotate-3 group-hover:rotate-6 transition-transform">
                                        <img src={GDriveIcon} className="w-12 h-12 object-contain" alt="GDrive" />
                                    </div>
                                    <div>
                                        <span className="block text-blue-900 font-bold text-lg">Laporan Tingkat Kab/Kota</span>
                                        <span className="text-sm text-slate-500">Analitik capaian indikator daerah</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Evaluasi Section */}
                        <div>
                            <h3 className="text-xl text-slate-700 font-bold mb-4 flex items-center gap-2">
                                <PieChart className="w-6 h-6 text-green-600" />
                                Dashboard Evaluasi Penerapan
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    'Tingkat Provinsi',
                                    'Tingkat Kab/Kota',
                                    'Tingkat Kecamatan',
                                    'Tingkat Kel/Desa',
                                    'Tingkat Perusahaan'
                                ].map((label, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => navigate('/dashboard')}
                                        className="bg-white border border-slate-200 hover:border-green-500 rounded-lg p-4 flex items-center gap-4 hover:bg-green-50 transition-all group text-left shadow-sm"
                                    >
                                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center transform rotate-3 group-hover:rotate-6 transition-transform">
                                            <img src={GDriveIcon} className="w-8 h-8 object-contain" alt="Check" />
                                        </div>
                                        <span className="text-slate-700 font-semibold group-hover:text-green-800">Hasil Evaluasi {label}</span>
                                    </button>
                                ))}
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