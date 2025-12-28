import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Check, Circle, User, Calendar, Save, CheckCircle2, AlertCircle, FileSpreadsheet, Download, ChevronDown, Send, Home, Building2, ChevronRight, Printer, Lock, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { utils, writeFile } from 'xlsx';
import { FormStore, Cluster, LaporanTemplate, INSTANSI_LEVELS, INSTANSI_LIST } from '../utils/formStore';
import { submitToGoogleSheets } from '../utils/googleSheets';
import { generateEvaluasiPDF, generateLaporanPDF } from '../utils/pdfGenerator';
import { SubmissionStore } from '../utils/submissionStore';
import { apiClient } from '../utils/apiClient';

// ==========================================
// DATA & TYPES 
// ==========================================

type FormStep = 'SELECTION' | 'FORM' | 'RESULT';

interface InstansiData {
  tingkat: string;
  nama: string;
  alamat: string;
  pejabat: string;
  jmlLaki: string;
  jmlPerempuan: string;
  tanggal: string; // YYYY-MM-DD if date input
};

const EVAL_LEVEL_TO_ID: Record<string, number> = {
  'INSTANSI TINGKAT PROVINSI': 1,
  'INSTANSI TINGKAT KABUPATEN / KOTA': 2,
  'INSTANSI TINGKAT KECAMATAN': 3,
  'INSTANSI TINGKAT KELURAHAN / DESA': 4,
  'INSTANSI TINGKAT PERUSAHAAN': 5,
};

type RegencyOption = { id: number; code: string; name: string; type?: string };
type DistrictOption = { id: number; code: string; name: string };
type VillageOption = { id: number; code: string; name: string };

const getReportingYear = (): number => {
  const fallback = new Date().getFullYear();
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem('reporting_year');
  if (!stored) return fallback;
  const parsed = parseInt(stored, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const slugifyInstansi = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ==========================================
// COMPONENT: EVALUASI FORM (DYNAMIC)
// ==========================================
const EvaluasiForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<FormStep>('SELECTION');
  const [instansiData, setInstansiData] = useState<InstansiData>({
    tingkat: '', nama: '', alamat: '', pejabat: '', jmlLaki: '', jmlPerempuan: '', tanggal: ''
  });

  const reportingYear = getReportingYear();

  const [regencies, setRegencies] = useState<RegencyOption[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [originRegencyId, setOriginRegencyId] = useState('');
  const [originDistrictId, setOriginDistrictId] = useState('');
  const [originVillageId, setOriginVillageId] = useState('');
  const [regionLoading, setRegionLoading] = useState(false);

  // Dynamic Clusters Data
  const [clusters, setClusters] = useState<Cluster[]>([]);
  
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [remarks, setRemarks] = useState<Record<number, string>>({}); // Keterangan

  // Hasil dari backend
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [resultCategory, setResultCategory] = useState<{ label: string; color: string } | null>(null);

  const handleLevelSelect = async (level: string) => {
    // 1. Set Level
    setInstansiData(prev => ({ ...prev, tingkat: level.toUpperCase() }));

    // Reset wilayah & jawaban ketika ganti tingkat
    setOriginRegencyId('');
    setOriginDistrictId('');
    setOriginVillageId('');
    setDistricts([]);
    setVillages([]);
    setAnswers({});
    setRemarks({});

    // 2. Fetch konfigurasi klaster dari backend agar global antar perangkat, per tingkat instansi
    try {
      const levelId = EVAL_LEVEL_TO_ID[level] ?? null;
      const resp = await apiClient.get<any>('/templates/evaluasi', {
        query: {
          instansi_level_id: levelId || undefined,
        },
      });

      const rawData: any[] = (resp as any)?.data ?? [];

      const mappedClusters: Cluster[] = rawData.map((cluster: any) => ({
        id: Number(cluster.id),
        title: String(cluster.title ?? ''),
        questions: Array.isArray(cluster.questions)
          ? cluster.questions.map((q: any) => ({
              id: Number(q.id),
              text: String(q.question_text ?? q.text ?? ''),
            }))
          : [],
      }));

      setClusters(mappedClusters);
    } catch (error) {
      console.error('Gagal memuat template evaluasi dari server, fallback ke FormStore lokal', error);
      const fallbackClusters = FormStore.getEvaluasiTemplate(level) || [];
      setClusters(fallbackClusters);
    }

    // 3. Pindah ke form
    setStep('FORM');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const normalizedInstansiLevel = instansiData.tingkat.trim().toUpperCase();
  const isCompanyLevel = normalizedInstansiLevel.includes('PERUSAHAAN');
  const instansiNoun = isCompanyLevel ? 'Perusahaan' : 'Instansi';
  const needsOriginRegency =
    normalizedInstansiLevel.includes('KABUPATEN') ||
    normalizedInstansiLevel.includes('KOTA') ||
    normalizedInstansiLevel.includes('KECAMATAN') ||
    normalizedInstansiLevel.includes('KELURAHAN') ||
    normalizedInstansiLevel.includes('DESA') ||
    normalizedInstansiLevel.includes('PERUSAHAAN');
  const needsOriginDistrict = normalizedInstansiLevel.includes('KECAMATAN') || normalizedInstansiLevel.includes('KELURAHAN') || normalizedInstansiLevel.includes('DESA');
  const needsOriginVillage = normalizedInstansiLevel.includes('KELURAHAN') || normalizedInstansiLevel.includes('DESA');

  const normalizeCollection = <T,>(collection: unknown): T[] => {
    if (Array.isArray(collection)) {
      return collection as T[];
    }

    if (collection && typeof collection === 'object' && Array.isArray((collection as any).data)) {
      return (collection as any).data as T[];
    }

    return [];
  };

  useEffect(() => {
    if (!needsOriginRegency) {
      setOriginRegencyId('');
      setOriginDistrictId('');
      setOriginVillageId('');
      setDistricts([]);
      setVillages([]);
      return;
    }

    if (regencies.length > 0) {
      return;
    }

    setRegionLoading(true);
    apiClient
      .get<{ regencies: unknown }>('/regions', { query: { province_code: '35' } })
      .then((response) => {
        const items = normalizeCollection<RegencyOption>((response as any)?.regencies);
        setRegencies(
          items.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            type: item.type,
          }))
        );
      })
      .catch(() => {
        setRegencies([]);
      })
      .finally(() => setRegionLoading(false));
  }, [needsOriginRegency, regencies.length]);

  useEffect(() => {
    setOriginDistrictId('');
    setOriginVillageId('');
    setDistricts([]);
    setVillages([]);

    if (!needsOriginDistrict || !originRegencyId) {
      return;
    }

    setRegionLoading(true);
    apiClient
      .get<{ districts: unknown }>(`/regions/${originRegencyId}/districts`)
      .then((response) => {
        const items = normalizeCollection<DistrictOption>((response as any)?.districts);
        setDistricts(
          items.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
          }))
        );
      })
      .catch(() => {
        setDistricts([]);
      })
      .finally(() => setRegionLoading(false));
  }, [needsOriginDistrict, originRegencyId]);

  useEffect(() => {
    setOriginVillageId('');
    setVillages([]);

    if (!needsOriginVillage || !originDistrictId) {
      return;
    }

    setRegionLoading(true);
    apiClient
      .get<{ villages: unknown }>(`/districts/${originDistrictId}/villages`)
      .then((response) => {
        const items = normalizeCollection<VillageOption>((response as any)?.villages);
        setVillages(
          items.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
          }))
        );
      })
      .catch(() => {
        setVillages([]);
      })
      .finally(() => setRegionLoading(false));
  }, [needsOriginVillage, originDistrictId]);

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleRemarkChange = (questionId: number, value: string) => {
    setRemarks(prev => ({ ...prev, [questionId]: value }));
  };

  const calculateScore = () => {
    const totalQuestions = clusters.reduce((acc, curr) => acc + curr.questions.length, 0);
    const totalScore = (Object.values(answers) as number[]).reduce((acc, curr) => acc + curr, 0);
    return totalQuestions === 0 ? 0 : Math.round((totalScore / totalQuestions) * 100);
  };

  const getCategory = (score: number) => {
    if (score > 75) return { label: 'Baik', color: 'text-emerald-600', class: 'text-emerald-600' };
    if (score >= 50) return { label: 'Cukup', color: 'text-yellow-600', class: 'text-slate-600' };
    return { label: 'Kurang', color: 'text-red-600', class: 'text-slate-600' };
  };

  const handleDownloadPDF = () => {
    const score = resultScore ?? calculateScore();
    const category = resultCategory ?? getCategory(score);

    const instansiForPdf = {
      ...instansiData,
      // gunakan NAMA wilayah untuk ditampilkan di PDF
      originRegencyName:
        regencies.find((r) => String(r.id) === String(originRegencyId))?.name || null,
      originDistrictName:
        districts.find((d) => String(d.id) === String(originDistrictId))?.name || null,
      originVillageName:
        villages.find((v) => String(v.id) === String(originVillageId))?.name || null,
    };

    generateEvaluasiPDF(
      instansiForPdf,
      score,
      category,
      clusters,
      answers,
      remarks
    );

    toast.success("File PDF berhasil diunduh!");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInstansiData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instansiData.nama) { toast.error(`Mohon isi Nama ${instansiNoun}`); return; }
    try {
      const payloadAnswers = clusters.flatMap((cluster) =>
        cluster.questions.map((q) => ({
          question_id: q.id,
          question_text: q.text,
          answer_value: Number(answers[q.id] ?? 0),
          remark: remarks[q.id] ?? undefined,
        }))
      );

      if (payloadAnswers.length === 0) {
        toast.error('Mohon isi minimal satu indikator evaluasi.');
        return;
      }

      const requestBody = {
        instansi_id: null,
        instansi_name: instansiData.nama,
        instansi_level_id: null,
        instansi_level_text: instansiData.tingkat || null,
        // kirim asal wilayah (ID) ke backend
        origin_regency_id: originRegencyId || null,
        origin_district_id: originDistrictId || null,
        origin_village_id: originVillageId || null,
        // data profil instansi
        instansi_address: instansiData.alamat || null,
        pejabat_nama: instansiData.pejabat || null,
        // mapping jumlah pegawai ke field yang diharapkan backend
        employee_male_count: instansiData.jmlLaki ? Number(instansiData.jmlLaki) : null,
        employee_female_count: instansiData.jmlPerempuan ? Number(instansiData.jmlPerempuan) : null,
        report_year: reportingYear,              // kalau kamu butuh, atau bisa dihapus jika backend tidak pakai
        evaluation_date: instansiData.tanggal || null,
        remarks: null as string | null,
        answers: payloadAnswers,
      };

      const response = await apiClient.post<{ status: string; message?: string; data?: any }>(
        '/evaluasi/submissions',
        requestBody,
      );

      const submission = response?.data;

      // Tentukan skor & kategori final yang akan dipakai di UI dan disimpan ke SubmissionStore
      let finalScore: number | null = null;
      let finalCategory: { label: string; color: string } | null = null;

      if (submission) {
        const backendScore = typeof submission.score === 'number' ? submission.score : null;
        finalScore = backendScore;

        let categoryFromBackend: { label: string; color: string } | null = null;
        const catLabel: string | undefined =
          submission.category?.label ?? submission.category_label ?? undefined;

        if (backendScore !== null) {
          categoryFromBackend = getCategory(backendScore);
        } else if (catLabel) {
          const lower = catLabel.toLowerCase();
          if (lower === 'baik') categoryFromBackend = { label: 'Baik', color: 'text-emerald-600' };
          else if (lower === 'cukup') categoryFromBackend = { label: 'Cukup', color: 'text-yellow-600' };
          else categoryFromBackend = { label: catLabel, color: 'text-red-600' };
        }

        finalCategory = categoryFromBackend;
      } else {
        // Fallback ke perhitungan lokal jika tidak ada data backend
        const localScore = calculateScore();
        finalScore = localScore;
        finalCategory = getCategory(localScore);
      }

      setResultScore(finalScore);
      setResultCategory(finalCategory);

      // Simpan juga ke SubmissionStore sebagai log lokal, termasuk skor & kategori final
      SubmissionStore.add({
        type: 'evaluasi',
        instansiName: instansiData.nama,
        submitDate: new Date().toISOString(),
        year: reportingYear,
        payload: {
          instansiData,
          origin: {
            originRegencyId: originRegencyId || null,
            originDistrictId: originDistrictId || null,
            originVillageId: originVillageId || null,
          },
          clusters,
          answers,
          remarks,
          score: finalScore,
          category: finalCategory,
          backend: response,
        },
      });

      toast.success(response?.message || 'Laporan Evaluasi berhasil dikirim!');

      setStep('RESULT');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      const message = error?.data?.message || 'Gagal mengirim Laporan Evaluasi. Silakan coba lagi.';
      toast.error(message);
    }
  };

  if (step === 'SELECTION') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto py-8 px-4">
        <Card className="p-8 md:p-12 text-center shadow-xl border-t-8 border-t-emerald-600 rounded-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-emerald-700 mb-2 uppercase leading-tight">Form Evaluasi Germas di<br/>Tatanan Tempat Kerja</h1>
          <h2 className="text-xl font-bold text-slate-600 mb-10">Provinsi Jawa Timur</h2>
          <p className="text-slate-500 mb-6 font-medium text-lg">Pilih tingkat instansi:</p>
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            {INSTANSI_LEVELS.map((level, idx) => (
              <button key={idx} onClick={() => handleLevelSelect(level)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-lg shadow-md transition-all border-2 border-emerald-600">
                {level}
              </button>
            ))}
          </div>
        </Card>
      </motion.div>
    );
  }

  if (step === 'RESULT') {
    const score = resultScore ?? calculateScore();
    const category = resultCategory ?? getCategory(score);

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex items-center justify-center py-10 px-4 bg-[#f6fbf9]">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden relative border border-emerald-50">
          <div className="pt-12 pb-6 px-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-emerald-700 uppercase leading-snug tracking-tight">
              FORM EVALUASI GERMAS DI <br/> TATANAN TEMPAT KERJA
            </h1>
            <h2 className="text-xl font-bold text-slate-800 mt-4">Provinsi Jawa Timur</h2>
            <p className="text-lg font-semibold text-slate-700 mt-1">Tahun {reportingYear}</p>
          </div>

          <div className="mx-6 md:mx-12 mb-12 bg-emerald-50/60 rounded-3xl p-8 md:p-12 relative border border-emerald-100">
            <h3 className="text-center text-2xl font-bold text-emerald-700 mb-10">Hasil Evaluasi</h3>

            <div className="grid grid-cols-1 gap-y-4 max-w-2xl mx-auto text-slate-800 text-lg">
              <div className="grid grid-cols-[220px,20px,1fr]">
                <span className="font-bold">Nama {instansiNoun}</span>
                <span>:</span>
                <span>{instansiData.nama}</span>
              </div>
              <div className="grid grid-cols-[220px,20px,1fr]">
                <span className="font-bold">Alamat {instansiNoun}</span>
                <span>:</span>
                <span>{instansiData.alamat || '-'}</span>
              </div>
              <div className="grid grid-cols-[220px,20px,1fr]">
                <span className="font-bold">Nama Pejabat/Pengelola</span>
                <span>:</span>
                <span>{instansiData.pejabat || '-'}</span>
              </div>
              <div className="grid grid-cols-[220px,20px,1fr]">
                <span className="font-bold">Jumlah Pekerja Laki-Laki</span>
                <span>:</span>
                <span>{instansiData.jmlLaki || '-'}</span>
              </div>
              <div className="grid grid-cols-[220px,20px,1fr]">
                <span className="font-bold">Jumlah Pekerja Perempuan</span>
                <span>:</span>
                <span>{instansiData.jmlPerempuan || '-'}</span>
              </div>
              <div className="grid grid-cols-[220px,20px,1fr]">
                <span className="font-bold">Hari, Tanggal</span>
                <span>:</span>
                <span>{instansiData.tanggal || new Date().toLocaleDateString('id-ID')}</span>
              </div>

              <div className="h-4"></div>

              <div className="grid grid-cols-[220px,20px,1fr] items-center">
                <span className="font-bold">Nilai Total</span>
                <span>:</span>
                <span className="text-xl">
                  {score} <span className={`font-bold ${category.color}`}>({category.label})</span>
                </span>
              </div>
            </div>

            <div className="mt-12 w-full h-px bg-emerald-200"></div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-6 mb-12 px-8">
            <Button 
              variant="outline" 
              onClick={handleDownloadPDF}
              className="border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 px-8 py-3 h-auto text-lg rounded-lg min-w-[200px]"
              leftIcon={<Download className="w-5 h-5"/>}
            >
              Unduh Hasil (PDF)
            </Button>
            <Button 
              onClick={onBack}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 h-auto text-lg rounded-lg shadow-lg shadow-emerald-200 min-w-[200px]"
            >
              Kembali ke Halaman Utama
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-emerald-200">
        {/* ... (Existing Code) */}
        
        <form onSubmit={handleSubmit} className="p-6 md:p-10">
          {/* ... (Existing Form Code) */}
          
          {/* Box Identitas Instansi */}
          <div className="bg-emerald-50 p-8 rounded-2xl mb-10 border border-emerald-100">
            <div className="space-y-5">
              {[
                { label: `Nama ${instansiNoun}:`, name: 'nama', type: 'text' },
                { label: `Alamat ${instansiNoun}:`, name: 'alamat', type: 'text' },
                { label: 'Nama Pejabat/Pengelola:', name: 'pejabat', type: 'text' },
                { label: 'Jumlah Pekerja Laki-Laki:', name: 'jmlLaki', type: 'number' },
                { label: 'Jumlah Pekerja Perempuan:', name: 'jmlPerempuan', type: 'number' },
              ].map((field) => (
                <div key={field.name} className="grid md:grid-cols-[250px,1fr] items-center gap-2">
                  <label className="font-medium text-emerald-800 text-base">{field.label}</label>
                  <input 
                    type={field.type}
                    name={field.name}
                    value={(instansiData as any)[field.name]} 
                    onChange={handleInputChange} 
                    min={field.type === 'number' ? 0 : undefined}
                    className="w-full rounded-lg border-2 border-emerald-400 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all text-emerald-800"
                    required={field.name === 'nama'}
                  />
                </div>
              ))}

              {needsOriginRegency && (
                <div className="grid md:grid-cols-[250px,1fr] items-center gap-2">
                  <label className="font-medium text-emerald-800 text-base">Asal Kab/Kota:</label>
                  <select
                    value={originRegencyId}
                    onChange={(e) => setOriginRegencyId(e.target.value)}
                    className="w-full rounded-lg border-2 border-emerald-400 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all text-emerald-800"
                    disabled={regionLoading || regencies.length === 0}
                  >
                    <option value="">Pilih Kab/Kota</option>
                    {regencies.map((item) => {
                      const rawName = (item as any).name || '';
                      const lowerName = rawName.toLowerCase();

                      // 1) Deteksi tipe dari awalan nama (lebih dipercaya)
                      let typeLabel: string | null = null;
                      if (lowerName.startsWith('kota ')) typeLabel = 'Kota';
                      else if (lowerName.startsWith('kabupaten ')) typeLabel = 'Kabupaten';

                      // 2) Jika nama tidak mengandung awalan yang jelas, gunakan field type dari API
                      if (!typeLabel) {
                        const rawType = (item as any).type ? String((item as any).type).toLowerCase() : '';
                        if (rawType.startsWith('kab')) typeLabel = 'Kabupaten';
                        else if (rawType.startsWith('kot')) typeLabel = 'Kota';
                      }

                      const baseName = rawName
                        .replace(/^Kabupaten\s+/i, '')
                        .replace(/^Kota\s+/i, '')
                        .trim();

                      const label = typeLabel ? `${typeLabel} ${baseName}`.trim() : rawName;

                      return (
                        <option key={item.id} value={String(item.id)}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {needsOriginDistrict && (
                <div className="grid md:grid-cols-[250px,1fr] items-center gap-2">
                  <label className="font-medium text-emerald-800 text-base">Asal Kecamatan:</label>
                  <select
                    value={originDistrictId}
                    onChange={(e) => setOriginDistrictId(e.target.value)}
                    className="w-full rounded-lg border-2 border-emerald-400 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all text-emerald-800"
                    disabled={regionLoading || !originRegencyId || districts.length === 0}
                  >
                    <option value="">Pilih Kecamatan</option>
                    {districts.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {needsOriginVillage && (
                <div className="grid md:grid-cols-[250px,1fr] items-center gap-2">
                  <label className="font-medium text-emerald-800 text-base">Asal Desa/Kelurahan:</label>
                  <select
                    value={originVillageId}
                    onChange={(e) => setOriginVillageId(e.target.value)}
                    className="w-full rounded-lg border-2 border-emerald-400 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-all text-emerald-800"
                    disabled={regionLoading || !originDistrictId || villages.length === 0}
                  >
                    <option value="">Pilih Desa/Kelurahan</option>
                    {villages.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid md:grid-cols-[250px,1fr] items-center gap-2">
                <label className="font-medium text-emerald-800 text-base">Hari, Tanggal:</label>
                <div className="relative">
                  <input
                    type="date"
                    name="tanggal"
                    value={instansiData.tanggal}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border-2 border-emerald-400 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-emerald-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Title Section */}
          <div className="text-center mb-8">
             <h3 className="text-xl font-bold text-slate-700 uppercase tracking-widest mb-1">IMPLEMENTASI GERMAS DI TEMPAT KERJA</h3>
             <p className="text-lg font-bold text-slate-700">Tahun {reportingYear}</p>
          </div>

          {/* Clusters Loop (Dynamic from Store) */}
          <div className="space-y-10">
             {clusters.length > 0 ? clusters.map((cluster, cIdx) => (
                <div key={cluster.id} className="space-y-4">
                   <h4 className={`text-lg font-bold ${cIdx >= 2 ? 'text-slate-800 uppercase text-center mt-8' : 'text-emerald-600'}`}>
                      {cluster.title}
                   </h4>
                   
                   <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                         <thead>
                            <tr className="border-b border-emerald-600">
                               <th className="py-3 px-2 font-normal text-slate-700 w-[50%] text-center">Indikator Evaluasi</th>
                               <th className="py-3 px-2 font-normal text-slate-700 w-[10%] text-center border-l border-emerald-600">Ya/Ada</th>
                               <th className="py-3 px-2 font-normal text-slate-700 w-[10%] text-center border-l border-emerald-600 leading-tight">Tidak<br/>ada</th>
                               <th className="py-3 px-2 font-normal text-slate-700 w-[30%] text-left pl-4 border-l border-emerald-600">Keterangan</th>
                            </tr>
                         </thead>
                         <tbody>
                            {cluster.questions.map((q, qIdx) => (
                               <tr key={q.id} className="hover:bg-slate-50">
                                  <td className="py-4 px-2 align-top text-slate-800">
                                     <div className="flex gap-2">
                                        <span>{qIdx + 1}.</span>
                                        <span>{q.text}</span>
                                     </div>
                                  </td>
                                  
                                  <td className="py-4 px-2 align-top text-center border-l border-emerald-600">
                                     <div 
                                        onClick={() => handleAnswer(q.id, 1)}
                                        className="flex items-center justify-center h-full cursor-pointer"
                                     >
                                        <div className={`w-8 h-8 rounded-full border-2 border-emerald-600 flex items-center justify-center transition-colors ${answers[q.id] === 1 ? 'bg-emerald-100' : 'bg-white'}`}>
                                           {answers[q.id] === 1 && <div className="w-4 h-4 bg-emerald-600 rounded-full"></div>}
                                        </div>
                                     </div>
                                  </td>

                                  <td className="py-4 px-2 align-top text-center border-l border-emerald-600">
                                     <div 
                                        onClick={() => handleAnswer(q.id, 0)}
                                        className="flex items-center justify-center h-full cursor-pointer"
                                     >
                                        <div className={`w-8 h-8 rounded-full border-2 border-red-500 flex items-center justify-center transition-colors ${answers[q.id] === 0 ? 'bg-red-50' : 'bg-white'}`}>
                                           {answers[q.id] === 0 && <div className="w-4 h-4 bg-red-500 rounded-full"></div>}
                                        </div>
                                     </div>
                                  </td>

                                  <td className="py-4 px-4 align-top border-l border-emerald-600">
                                     <input 
                                        type="text" 
                                        placeholder="Ket."
                                        className="w-full border-b border-slate-400 focus:border-emerald-600 outline-none py-1 bg-transparent text-slate-700"
                                        value={remarks[q.id] || ''}
                                        onChange={(e) => handleRemarkChange(q.id, e.target.value)}
                                     />
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                   <div className="w-full h-px bg-emerald-200 mt-2"></div>
                   <div className="text-xs text-slate-500 font-bold pl-2">*Nilai: <span className="ml-2 font-normal">Ya = 1; Tidak = 0</span></div>
                   {cIdx < 2 && <div className="text-xs text-slate-500 pl-14">Per-Kluster = 100</div>}
                </div>
             )) : (
               <div className="text-center p-8 bg-slate-50 rounded-lg text-slate-500">
                  Belum ada data indikator untuk tingkat instansi ini.
               </div>
             )}
          </div>

            {/* NB Section */}
            <div className="mt-12 bg-[#f0fbf7] rounded-xl p-6 border border-emerald-100">
               <span className="font-bold text-slate-800 block mb-2">NB:</span>
               <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 leading-relaxed">
                  <li>Untuk Tempat kerja yang hanya berlantai 1 maka indikator menganjurkan penggunaan tangga daripada lift nilainya 1</li>
                  <li>{isCompanyLevel ? 'Bagi perusahaan' : 'Bagi instansi'} yang tidak membutuhkan APD bisa mengisi kolom keterangan dengan N/A atau (-)</li>
                  <li>Menyediakan sarana sanitasi aman yang responsif terhadap GEDSI berarti memastikan fasilitas sanitasi dapat diakses, digunakan, dan dirasakan manfaatnya oleh semua pekerja tanpa kecuali, termasuk perempuan, penyandang disabilitas, serta kelompok dengan kebutuhan khusus. Pendekatan ini menekankan kesetaraan dan inklusi sosial, sehingga tidak ada kelompok yang terpinggirkan dalam pemenuhan hak dasar atas kesehatan dan kebersihan di tempat kerja.</li>
               </ul>
            </div>

            <div className="flex justify-between items-center mt-12 gap-4">
               <Button type="button" variant="outline" onClick={() => setStep('SELECTION')} className="px-8 border-emerald-600 text-emerald-700 hover:bg-emerald-50 h-12">Kembali</Button>
               <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 shadow-lg shadow-emerald-200 rounded-lg">Kirim Laporan</Button>
            </div>
         </form>
      </div>
    </motion.div>
  );
};

// ==========================================
type LaporanStep = 'LEVEL_SELECT' | 'INSTANSI_SELECT' | 'FORM_INPUT' | 'SUCCESS';

const LaporanForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<LaporanStep>('LEVEL_SELECT');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedInstansiLevel, setSelectedInstansiLevel] = useState<string>('INSTANSI TINGKAT PROVINSI');
  const [selectedInstansiId, setSelectedInstansiId] = useState<string>('');
  const [template, setTemplate] = useState<LaporanTemplate | null>(null);

  const [regencies, setRegencies] = useState<RegencyOption[]>([]);
  const [originRegencyId, setOriginRegencyId] = useState('');
  const [regionLoading, setRegionLoading] = useState(false);

  const [instansiOptions, setInstansiOptions] = useState<{ id: number; name: string; slug?: string }[]>([]);
  const [instansiLoading, setInstansiLoading] = useState(false);

  const LAPORAN_LEVELS: { label: string; value: string }[] = [
    { label: 'Tingkat Provinsi Jawa Timur', value: 'INSTANSI TINGKAT PROVINSI' },
    { label: 'Tingkat Kabupaten / Kota', value: 'INSTANSI TINGKAT KABUPATEN / KOTA' },
  ];

  // State to hold dynamic inputs
  const [laporanInputs, setLaporanInputs] = useState<Record<string, any>>({});

  const navigate = useNavigate();

  const reportingYear = getReportingYear();

  const LEVEL_TO_ID: Record<string, number> = {
    'INSTANSI TINGKAT PROVINSI': 1,
    'INSTANSI TINGKAT KABUPATEN / KOTA': 2,
    'INSTANSI TINGKAT KECAMATAN': 3,
    'INSTANSI TINGKAT KELURAHAN / DESA': 4,
    'INSTANSI TINGKAT PERUSAHAAN': 5,
  };

  // Load daftar instansi dari backend berdasarkan level terpilih
  useEffect(() => {
    if (!selectedInstansiLevel) {
      setInstansiOptions([]);
      setSelectedInstansiId('');

      return;
    }

    const levelId = LEVEL_TO_ID[selectedInstansiLevel] ?? null;

    setInstansiLoading(true);
    apiClient
      .get<any>('/instansi', {
        query: {
          instansi_level_id: levelId || undefined,
        },
      })
      .then((resp) => {
        const raw: any[] = (resp as any)?.data ?? [];
        if (raw.length > 0) {
          setInstansiOptions(
            raw.map((item) => ({
              id: Number(item.id),
              name: String(item.name ?? 'Instansi'),
              slug: item.slug ? String(item.slug) : undefined,
            })),
          );
        } else {
          // Fallback ke daftar statis jika backend belum menyediakan data instansi
          setInstansiOptions(
            INSTANSI_LIST.map((item) => ({
              id: (item as any).id,
              name: String(item.name),
              slug: undefined,
            })),
          );
        }
      })
      .catch(() => {
        // Jika request gagal (misalnya CORS), fallback ke daftar statis
        setInstansiOptions(
          INSTANSI_LIST.map((item) => ({
            id: (item as any).id,
            name: String(item.name),
            slug: undefined,
          })),
        );
      })
      .finally(() => setInstansiLoading(false));
  }, [selectedInstansiLevel]);

  const handleLevelSelect = (level: string) => {
    setSelectedLevel(level);
    setSelectedInstansiLevel(level);
    setSelectedInstansiId('');
    setOriginRegencyId('');
    setTemplate(null);
    setLaporanInputs({});
    setStep('INSTANSI_SELECT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isKabKotaLevel = selectedInstansiLevel.toUpperCase().includes('KABUPATEN') || selectedInstansiLevel.toUpperCase().includes('KOTA');

  // Load daftar kab/kota khusus untuk LaporanForm ketika tingkat instansi Kab/Kota
  useEffect(() => {
    if (!isKabKotaLevel) {
      setRegencies([]);
      setOriginRegencyId('');
      return;
    }

    // Jika sudah ada data, tidak perlu fetch ulang
    if (regencies.length > 0) {
      return;
    }

    setRegionLoading(true);
    apiClient
      .get<{ regencies: unknown }>('/regions', { query: { province_code: '35' } })
      .then((response) => {
        const items = normalizeCollection<RegencyOption>((response as any)?.regencies);
        setRegencies(
          items.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            type: (item as any).type,
          })),
        );
      })
      .catch(() => {
        setRegencies([]);
      })
      .finally(() => setRegionLoading(false));
  }, [isKabKotaLevel, regencies.length]);

  const normalizeCollection = <T,>(collection: unknown): T[] => {
    if (Array.isArray(collection)) {
      return collection as T[];
    }

    if (collection && typeof collection === 'object' && Array.isArray((collection as any).data)) {
      return (collection as any).data as T[];
    }

    return [];
  };

  const handleInstansiSubmit = async () => {
    if (!selectedInstansiId) return;

    if (isKabKotaLevel && !originRegencyId) return;

    const originRegencyName = isKabKotaLevel
      ? (regencies.find((r) => String(r.id) === String(originRegencyId))?.name ?? '')
      : '';

    // Simpan info asal kab/kota ke input laporan
    setLaporanInputs((prev) => ({
      ...prev,
      originRegencyId: originRegencyId || undefined,
      originRegencyName: originRegencyName || undefined,
    }));

    // 1) Coba ambil template dari backend agar global antar perangkat, per tingkat instansi
    try {
      const levelId = LEVEL_TO_ID[selectedInstansiLevel] ?? null;
      const selectedInstansi = instansiOptions.find((i) => String(i.id) === selectedInstansiId);
      const selectedInstansiName = selectedInstansi?.name || 'Instansi';
      const instansiSlug = selectedInstansi?.slug || slugifyInstansi(selectedInstansiName);

      const resp = await apiClient.get<any>('/templates/laporan', {
        query: {
          year: reportingYear,
          instansi_level_id: levelId || undefined,
          instansi_slug: instansiSlug,
        },
      });

      const rawTemplates: any[] = (resp as any)?.data ?? [];

      // Untuk saat ini, ambil template pertama yang aktif sebagai dasar
      const baseTemplate = rawTemplates[0];

      const mappedTemplate: LaporanTemplate = {
        instansiId: selectedInstansiId,
        instansiName: selectedInstansiName || baseTemplate?.name || 'Instansi',
        level: selectedInstansiLevel,
        sections: Array.isArray(baseTemplate?.sections)
          ? baseTemplate.sections.map((section: any) => ({
              id: String(section.id ?? section.code ?? ''),
              title: String(section.title ?? ''),
              indicator: String(section.indicator ?? ''),
              hasTarget: Boolean(section.has_target ?? section.hasTarget ?? true),
              hasBudget: Boolean(section.has_budget ?? section.hasBudget ?? true),
            }))
          : [],
      };

      setTemplate(mappedTemplate);
    } catch (error) {
      console.error('Gagal memuat template laporan dari server, fallback ke FormStore lokal', error);
      const fallback = FormStore.getLaporanTemplate(selectedInstansiId, selectedInstansiLevel);
      setTemplate(fallback);
    }

    setStep('FORM_INPUT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLaporanInput = (sectionId: string, field: string, value: string) => {
    setLaporanInputs(prev => ({
      ...prev,
      [`${sectionId}-${field}`]: value,
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;
    try {
      const sectionsPayload = template.sections.map((section) => {
        const baseKey = section.id;

        return {
          section_id: (section as any).id ?? null,
          section_code: (section as any).code ?? null,
          section_title: section.title,
          target_year: (laporanInputs[`${baseKey}-target-year`] as string) || null,
          target_semester_1: (laporanInputs[`${baseKey}-target-sem1`] as string) || null,
          target_semester_2: (laporanInputs[`${baseKey}-target-sem2`] as string) || null,
          budget_year: (laporanInputs[`${baseKey}-budget-year`] as string) || null,
          budget_semester_1: (laporanInputs[`${baseKey}-budget-sem1`] as string) || null,
          budget_semester_2: (laporanInputs[`${baseKey}-budget-sem2`] as string) || null,
          notes: (laporanInputs[`${baseKey}-notes`] as string) || null,
        };
      });

      const requestBody = {
        template_id: (template as any).id ?? null,
        instansi_id: null,
        instansi_name: template.instansiName,
        instansi_level_id: null,
        instansi_level_text: selectedInstansiLevel,
        // kirim asal kab/kota instansi
        origin_regency_id: laporanInputs.originRegencyId || null,
        origin_regency_name: laporanInputs.originRegencyName || null,
        report_year: reportingYear,
        report_level: selectedInstansiLevel,
        notes: null as string | null,
        sections: sectionsPayload,
      };

      const response = await apiClient.post<{ status: string; message?: string; data?: unknown }>(
        '/laporan/submissions',
        requestBody,
      );

      // Optional: simpan juga ke SubmissionStore sebagai log lokal
      SubmissionStore.add({
        type: 'laporan',
        instansiName: template.instansiName,
        submitDate: new Date().toISOString(),
        year: reportingYear,
        payload: {
          template,
          level: selectedInstansiLevel,
          laporanInputs,
          backend: response,
        },
      });

      toast.success((response as any)?.message || 'Laporan Kegiatan berhasil dikirim!');

      setStep('SUCCESS');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      const message = error?.data?.message || 'Gagal mengirim Laporan Kegiatan. Silakan coba lagi.';
      toast.error(message);
    }
  };

  const handleDownloadPDF = () => {
    if (!template) return;

    const originName: string | undefined = laporanInputs.originRegencyName;

    generateLaporanPDF(
      template,
      originName,
      laporanInputs,
      String(reportingYear)
    );

    toast.success("Laporan PDF berhasil diunduh!");
  };

  // ... (Keep existing Renders 1, 2, 3, 4 unchanged logic-wise) ...

  // 1. HALAMAN PILIH TINGKAT (No changes)
  if (step === 'LEVEL_SELECT') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto py-12 px-4">
        <Card className="bg-white rounded-[2.5rem] shadow-xl border border-emerald-50 overflow-hidden pb-12 pt-8">
          <div className="text-center px-4 mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-emerald-700 uppercase leading-snug mb-4">
              Form Laporan Pemantauan<br/>Semesteran dan Tahunan<br/>Kegiatan Germas
            </h1>
            <h2 className="text-xl font-bold text-slate-700">Provinsi Jawa Timur</h2>
            <div className="mt-10 mb-6 text-lg font-medium text-slate-600">Pilih tingkat instansi:</div>

            <div className="max-w-xl mx-auto">
              <Button
                type="button"
                onClick={() => handleLevelSelect(LAPORAN_LEVELS[0].value)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 rounded-xl text-lg shadow-lg shadow-emerald-200"
              >
                {LAPORAN_LEVELS[0].label}
              </Button>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-slate-200" />
                <div className="text-xs font-bold text-slate-400 tracking-widest">ATAU</div>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <Button
                type="button"
                onClick={() => handleLevelSelect(LAPORAN_LEVELS[1].value)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 rounded-xl text-lg shadow-lg shadow-emerald-200"
              >
                {LAPORAN_LEVELS[1].label}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // 2. HALAMAN PILIH INSTANSI (No changes)
  if (step === 'INSTANSI_SELECT') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto py-12 px-4">
         <Card className="bg-white rounded-[2.5rem] shadow-xl border border-emerald-50 overflow-hidden pb-12 pt-8 min-h-[500px] flex flex-col items-center justify-center">
            <div className="text-center px-4 w-full max-w-2xl">
               <h1 className="text-2xl md:text-3xl font-bold text-emerald-700 uppercase leading-snug mb-3">
                  Form Laporan Pemantauan<br/>Semesteran dan Tahunan<br/>Kegiatan Germas
               </h1>
                <h2 className="text-lg font-bold text-slate-700 uppercase tracking-widest mb-2">
                   {selectedInstansiLevel}
                </h2>
                <h2 className="text-lg font-bold text-slate-700 uppercase tracking-widest mb-10">
                   Tahun {reportingYear}
                </h2>

                <div className="mb-8">
                  {isKabKotaLevel && (
                    <div className="mb-8">
                      <label className="block text-lg font-medium text-slate-600 mb-4">Asal Kab/Kota instansi:</label>
                      <div className="relative">
                        <select
                          value={originRegencyId}
                          onChange={(e) => setOriginRegencyId(e.target.value)}
                          className="w-full appearance-none bg-white border-2 border-emerald-500 text-slate-700 py-4 px-6 pr-12 rounded-xl text-lg font-medium focus:outline-none focus:ring-4 focus:ring-emerald-100 cursor-pointer shadow-sm hover:border-emerald-600 transition-colors"
                          disabled={regionLoading || regencies.length === 0}
                        >
                          <option value="">Pilih Kab/Kota</option>
                          {regencies.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.name.replace('Kabupaten ', '').replace('Kota ', '')}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <label className="block text-lg font-medium text-slate-600 mb-4">Pilih instansi:</label>
                  <div className="relative">
                     <select 
                        value={selectedInstansiId}
                        onChange={(e) => setSelectedInstansiId(e.target.value)}
                        disabled={instansiLoading || instansiOptions.length === 0}
                        className="w-full appearance-none bg-white border-2 border-emerald-500 text-slate-700 py-4 px-6 pr-12 rounded-xl text-lg font-medium focus:outline-none focus:ring-4 focus:ring-emerald-100 cursor-pointer shadow-sm hover:border-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        <option value="" disabled>
                          {instansiLoading ? 'Memuat instansi...' : 'Jenis Instansi'}
                        </option>
                        {instansiOptions.map(inst => (
                           <option key={inst.id} value={String(inst.id)}>{inst.name}</option>
                        ))}
                     </select>
                     <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-600 pointer-events-none" />
                  </div>
                  <p className="text-sm text-slate-400 mt-3 italic">Opsi pada dropdown</p>
               </div>

               <div className="flex flex-col gap-4 mt-8 max-w-xs mx-auto">
                  <Button 
                     onClick={handleInstansiSubmit}
                     disabled={!selectedInstansiId || (isKabKotaLevel && !originRegencyId)}
                     className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     Lanjutkan
                  </Button>
                  <button 
                     onClick={() => setStep('LEVEL_SELECT')}
                     className="text-slate-400 hover:text-slate-600 font-medium text-sm mt-2"
                  >
                     Kembali
                  </button>
               </div>
            </div>
         </Card>
      </motion.div>
    );
  }

  // 3. HALAMAN FORMULIR DINAMIS (With onChange Handlers)
  if (step === 'FORM_INPUT' && template) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto py-8 px-4">
         <form onSubmit={handleFormSubmit}>
            <Card className="bg-white rounded-[2rem] shadow-xl border border-emerald-50 overflow-hidden p-0">
               {/* Header */}
               <div className="bg-white pt-10 pb-6 px-6 text-center border-b border-emerald-50">
                  <h1 className="text-2xl md:text-3xl font-bold text-emerald-700 uppercase leading-tight">
                     Form Laporan Pemantauan<br/>Semesteran dan Tahunan<br/>Kegiatan Germas
                  </h1>
                  <div className="mt-4 space-y-1">
                     <h2 className="text-lg font-bold text-slate-800 uppercase">
                        {selectedInstansiLevel}
                     </h2>
                     <p className="text-lg font-bold text-slate-700">Tahun {reportingYear}</p>
                  </div>
                  
                  <div className="mt-8 bg-emerald-50 rounded-xl py-6 px-4 border border-emerald-100">
                     <h3 className="text-xl md:text-2xl font-bold text-emerald-700 uppercase tracking-wide">
                        {template.instansiName}
                     </h3>
                  </div>

                  <div className="mt-6 inline-block bg-emerald-100 text-emerald-700 px-8 py-2 rounded-full font-bold text-sm uppercase tracking-wider">
                     Kegiatan Utama
                  </div>
               </div>

               {/* Form Sections */}
               <div className="p-6 md:p-10 space-y-10 bg-slate-50/50">
                  {template.sections.length > 0 ? template.sections.map((section, idx) => (
                     <div key={section.id} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
                        {/* Section Header */}
                        <h4 className="font-bold text-slate-800 text-base md:text-lg mb-4 leading-relaxed">
                           {section.title}
                        </h4>

                        {/* Indikator */}
                        <div className="mb-6 bg-emerald-50/70 p-4 rounded-xl border border-emerald-100">
                           <span className="block font-bold text-emerald-700 text-sm mb-1">Indikator:</span>
                           <p className="text-slate-700 font-medium">{section.indicator}</p>
                        </div>

                        <div className="space-y-6">
                           {/* Target & Capaian */}
                           {section.hasTarget && (
                              <div>
                                 <h5 className="font-bold text-emerald-700 text-sm mb-3">Target dan Capaian:</h5>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                       <label className="text-xs font-semibold text-slate-500 uppercase">Tahun 2026</label>
                                       <input 
                                          className="w-full border-emerald-400 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400 bg-white" 
                                          placeholder="Isi Kolom..."
                                          onChange={(e) => handleLaporanInput(section.id, 'target-year', e.target.value)}
                                       />
                                    </div>
                                    <div className="space-y-2 relative">
                                       <div className="hidden md:block absolute left-0 top-8 bottom-2 w-px bg-slate-200 -ml-2"></div>
                                       <label className="text-xs font-semibold text-slate-500 uppercase">Semester I</label>
                                       <input 
                                          className="w-full border-emerald-400 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400 bg-white" 
                                          placeholder="Isi Kolom..."
                                          onChange={(e) => handleLaporanInput(section.id, 'target-sem1', e.target.value)}
                                       />
                                    </div>
                                    <div className="space-y-2 relative">
                                       <div className="hidden md:block absolute left-0 top-8 bottom-2 w-px bg-slate-200 -ml-2"></div>
                                       <label className="text-xs font-semibold text-slate-500 uppercase">Semester II</label>
                                       <input 
                                          className="w-full border-emerald-400 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400 bg-white" 
                                          placeholder="Isi Kolom..."
                                          onChange={(e) => handleLaporanInput(section.id, 'target-sem2', e.target.value)}
                                       />
                                    </div>
                                 </div>
                              </div>
                           )}

                           {/* Anggaran */}
                           {section.hasBudget && (
                              <div className="mt-6 pt-6 border-t border-dashed border-emerald-100">
                                 <h5 className="font-bold text-emerald-700 text-sm mb-3">Alokasi Anggaran dan Capaian:</h5>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                       <label className="text-xs font-semibold text-slate-500 uppercase">Tahun 2026</label>
                                       <input 
                                          className="w-full border-emerald-400 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400 bg-white" 
                                          placeholder="Isi Kolom..."
                                          onChange={(e) => handleLaporanInput(section.id, 'budget-year', e.target.value)}
                                       />
                                    </div>
                                    <div className="space-y-2 relative">
                                       <div className="hidden md:block absolute left-0 top-8 bottom-2 w-px bg-slate-200 -ml-2"></div>
                                       <label className="text-xs font-semibold text-slate-500 uppercase">Semester I</label>
                                       <input 
                                          className="w-full border-emerald-400 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400 bg-white" 
                                          placeholder="Isi Kolom..."
                                          onChange={(e) => handleLaporanInput(section.id, 'budget-sem1', e.target.value)}
                                       />
                                    </div>
                                    <div className="space-y-2 relative">
                                       <div className="hidden md:block absolute left-0 top-8 bottom-2 w-px bg-slate-200 -ml-2"></div>
                                       <label className="text-xs font-semibold text-slate-500 uppercase">Semester II</label>
                                       <input 
                                          className="w-full border-emerald-400 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400 bg-white" 
                                          placeholder="Isi Kolom..."
                                          onChange={(e) => handleLaporanInput(section.id, 'budget-sem2', e.target.value)}
                                       />
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  )) : (
                    <div className="text-center p-8 bg-white rounded-2xl border border-slate-200">
                       Belum ada konfigurasi kegiatan untuk instansi ini.
                    </div>
                  )}
               </div>

               {/* Footer Action */}
               <div className="p-8 bg-white border-t border-emerald-100 flex justify-between items-center sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(15,118,110,0.08)]">
                   <Button 
                     type="button" 
                     variant="outline" 
                     onClick={() => setStep('INSTANSI_SELECT')}
                     className="px-8 py-3 h-auto text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-lg font-bold text-lg"
                     leftIcon={<ArrowLeft className="w-5 h-5"/>}
                   >
                     Kembali
                   </Button>
                   <Button 
                     type="submit" 
                     className="px-10 py-3 h-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-lg shadow-lg shadow-emerald-200"
                   >
                     Kirim Laporan
                   </Button>
               </div>
            </Card>
         </form>
      </motion.div>
    );
  }

  // 4. HALAMAN SUKSES (Updated with Download PDF Button)
  if (step === 'SUCCESS' && template) {
    return (
       <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto py-12 px-4">
         <Card className="bg-white rounded-[2.5rem] shadow-xl border border-emerald-50 overflow-hidden pb-12 pt-8 text-center">
            <div className="px-8">
               <h1 className="text-3xl font-bold text-emerald-700 uppercase leading-snug mb-3">
                  Form Laporan Pemantauan<br/>Semesteran dan Tahunan<br/>Kegiatan Germas
               </h1>
                <h2 className="text-lg font-bold text-slate-700 uppercase tracking-widest mb-2">
                   {selectedInstansiLevel}
                </h2>
                <h2 className="text-lg font-bold text-slate-700 uppercase tracking-widest mb-10">
                   Tahun {reportingYear}
                </h2>

                <div className="bg-emerald-50/70 rounded-3xl p-10 mb-10 max-w-2xl mx-auto border border-emerald-100">
                   <h2 className="text-2xl font-bold text-emerald-700 mb-6 uppercase">{template.instansiName}</h2>
                   
                   <h3 className="text-xl font-bold text-emerald-600 mb-4 uppercase tracking-widest">Laporan Terkirim!</h3>
                   
                   <p className="text-slate-600 text-lg leading-relaxed mb-6">
                      Terima Kasih telah mengirim <strong>Laporan Pemantauan Semesteran dan Tahunan Kegiatan Germas {template.instansiName}</strong> pada <strong>Tahun {reportingYear}</strong>.
                   </p>
                   
                   <div className="w-full h-px bg-emerald-200 mb-4"></div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                   <Button 
                      variant="outline" 
                      onClick={handleDownloadPDF}
                      className="px-8 py-3 h-auto text-emerald-700 border-emerald-600 hover:bg-emerald-50 rounded-lg font-bold text-lg"
                      leftIcon={<Download className="w-5 h-5"/>}
                   >
                      Unduh Hasil (PDF)
                   </Button>
                   <Button 
                      onClick={() => navigate('/')}
                      className="px-8 py-3 h-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-lg shadow-lg shadow-emerald-200"
                   >
                      Kembali ke Halaman Utama
                   </Button>
                </div>
             </div>
          </Card>
       </motion.div>
    );
  }

  return null;
};

// ... (Main Forms Component remains same)
const Forms: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const formType = searchParams.get('type') || 'evaluasi'; // default to evaluasi

  useEffect(() => {
    // Check Auth
    const token = localStorage.getItem('auth_token');
    if (!token) {
       toast.error('Anda diwajibkan login terlebih dahulu untuk mengisi formulir.', { icon: '🔒', duration: 4000 });
       navigate('/login');
       return;
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#f6fbf9] pb-20 pt-4">
      <AnimatePresence mode='wait'>
        {formType === 'laporan' ? (
          <LaporanForm key="laporan" onBack={() => navigate('/')} />
        ) : (
          <EvaluasiForm key="evaluasi" onBack={() => navigate('/')} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Forms;