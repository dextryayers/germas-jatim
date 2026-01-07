import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Download } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FormStore, Cluster, INSTANSI_LEVELS } from '../../utils/formStore';
import { SubmissionStore } from '../../utils/submissionStore';
import { generateEvaluasiPDF } from '../../utils/pdfGenerator';
import { apiClient } from '../../utils/apiClient';

type FormStep = 'SELECTION' | 'FORM' | 'RESULT';

interface InstansiData {
  tingkat: string;
  nama: string;
  alamat: string;
  pejabat: string;
  jmlLaki: string;
  jmlPerempuan: string;
  tanggal: string;
}

// Kode level instansi seperti di tabel instansi_levels (dipakai untuk evaluasi)
const EVAL_LEVEL_TO_CODE: Record<string, string> = {
  'INSTANSI TINGKAT PROVINSI': 'provinsi',
  'INSTANSI TINGKAT KABUPATEN / KOTA': 'kab_kota',
  'INSTANSI TINGKAT KECAMATAN': 'kecamatan',
  'INSTANSI TINGKAT KELURAHAN / DESA': 'kelurahan_desa',
  'INSTANSI TINGKAT PERUSAHAAN': 'perusahaan',
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

const computeIsLate = (submissionDateIso: string): boolean => {
  if (typeof window === 'undefined') return false;
  const deadline = window.localStorage.getItem('reporting_deadline');
  if (!deadline) return false;

  const deadlineDate = new Date(deadline);
  const submittedAt = new Date(submissionDateIso);
  if (Number.isNaN(deadlineDate.getTime()) || Number.isNaN(submittedAt.getTime())) {
    return false;
  }

  return submittedAt.getTime() > deadlineDate.getTime();
};

const EvaluasiForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<FormStep>('SELECTION');
  const [instansiData, setInstansiData] = useState<InstansiData>({
    tingkat: '',
    nama: '',
    alamat: '',
    pejabat: '',
    jmlLaki: '',
    jmlPerempuan: '',
    tanggal: '',
  });

  const reportingYear = getReportingYear();

  const [regencies, setRegencies] = useState<RegencyOption[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [originRegencyId, setOriginRegencyId] = useState('');
  const [originDistrictId, setOriginDistrictId] = useState('');
  const [originVillageId, setOriginVillageId] = useState('');
  const [regionLoading, setRegionLoading] = useState(false);

  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [remarks, setRemarks] = useState<Record<number, string>>({});

  const [resultScore, setResultScore] = useState<number | null>(null);
  const [resultCategory, setResultCategory] = useState<{ label: string; color: string } | null>(null);

  const handleLevelSelect = async (level: string) => {
    setInstansiData((prev) => ({ ...prev, tingkat: level.toUpperCase() }));

    setOriginRegencyId('');
    setOriginDistrictId('');
    setOriginVillageId('');
    setDistricts([]);
    setVillages([]);
    setAnswers({});
    setRemarks({});

    try {
      const levelCode = EVAL_LEVEL_TO_CODE[level] ?? null;
      const resp = await apiClient.get<any>('/templates/evaluasi', {
        query: {
          // gunakan kode level agar tidak tergantung ID numerik
          instansi_level_code: levelCode || undefined,
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
  const needsOriginDistrict =
    normalizedInstansiLevel.includes('KECAMATAN') ||
    normalizedInstansiLevel.includes('KELURAHAN') ||
    normalizedInstansiLevel.includes('DESA');
  const needsOriginVillage =
    normalizedInstansiLevel.includes('KELURAHAN') ||
    normalizedInstansiLevel.includes('DESA');

  // Helper grouping: Section I (Implementasi), II (Pengelolaan), III (Pemantauan)
  // Section II & III ditentukan dari awal judul klaster, sedangkan Section I adalah sisanya (A-F).
  const IMPLEMENTASI_PREFIX = 'IMPLEMENTASI GERMAS DI TEMPAT KERJA - ';

  const sectionIIClusters = clusters.filter((c) =>
    c.title.toUpperCase().startsWith('PENGELOLAAN PELAKSANAAN GERMAS'),
  );
  const sectionIIIClusters = clusters.filter((c) =>
    c.title.toUpperCase().startsWith('PEMANTAUAN DAN EVALUASI'),
  );

  const sectionIIAndIIIIds = new Set([
    ...sectionIIClusters.map((c) => c.id),
    ...sectionIIIClusters.map((c) => c.id),
  ]);

  const sectionIClusters = clusters.filter((c) => !sectionIIAndIIIIds.has(c.id));

  const selectedLevelLabel = instansiData.tingkat
    ? instansiData.tingkat
    : 'Instansi Tingkat -';

  const renderClusterTable = (cluster: Cluster, variant: 'implementasi' | 'section') => {
    let displayTitle = cluster.title;

    if (variant === 'implementasi' && cluster.title.startsWith(IMPLEMENTASI_PREFIX)) {
      displayTitle = cluster.title.slice(IMPLEMENTASI_PREFIX.length).trim();
    }

    return (
      <div key={cluster.id} className="space-y-4">
        {variant === 'implementasi' && (
          <h4 className="text-lg font-bold text-emerald-600">
            {displayTitle}
          </h4>
        )}

        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-emerald-600">
              <th className="py-3 px-2 font-normal text-slate-700 w-[50%] text-center">
                Indikator Evaluasi
              </th>
              <th className="py-3 px-2 font-normal text-slate-700 w-[10%] text-center border-l border-emerald-600">
                Ya/Ada
              </th>
              <th className="py-3 px-2 font-normal text-slate-700 w-[10%] text-center border-l border-emerald-600 leading-tight">
                Tidak
                <br />
                ada
              </th>
              <th className="py-3 px-2 font-normal text-slate-700 w-[30%] text-left pl-4 border-l border-emerald-600">
                Keterangan
              </th>
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
                    <div
                      className={`w-8 h-8 rounded-full border-2 border-emerald-600 flex items-center justify-center transition-colors ${
                        answers[q.id] === 1 ? 'bg-emerald-100' : 'bg-white'
                      }`}
                    >
                      {answers[q.id] === 1 && (
                        <div className="w-4 h-4 bg-emerald-600 rounded-full" />
                      )}
                    </div>
                  </div>
                </td>

                <td className="py-4 px-2 align-top text-center border-l border-emerald-600">
                  <div
                    onClick={() => handleAnswer(q.id, 0)}
                    className="flex items-center justify-center h-full cursor-pointer"
                  >
                    <div
                      className={`w-8 h-8 rounded-full border-2 border-red-500 flex items-center justify-center transition-colors ${
                        answers[q.id] === 0 ? 'bg-red-50' : 'bg-white'
                      }`}
                    >
                      {answers[q.id] === 0 && (
                        <div className="w-4 h-4 bg-red-500 rounded-full" />
                      )}
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
        <div className="w-full h-px bg-emerald-200 mt-2" />
        <div className="text-xs text-slate-500 font-bold pl-2">
          *Nilai: <span className="ml-2 font-normal">Ya = 1; Tidak = 0</span>
        </div>
      </div>
    );
  };

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
          })),
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
          })),
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
          })),
        );
      })
      .catch(() => {
        setVillages([]);
      })
      .finally(() => setRegionLoading(false));
  }, [needsOriginVillage, originDistrictId]);

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleRemarkChange = (questionId: number, value: string) => {
    setRemarks((prev) => ({ ...prev, [questionId]: value }));
  };

  const calculateScore = () => {
    const totalQuestions = clusters.reduce((acc, curr) => acc + curr.questions.length, 0);
    const totalScore = (Object.values(answers) as number[]).reduce((acc, curr) => acc + curr, 0);
    return totalQuestions === 0 ? 0 : Math.round((totalScore / totalQuestions) * 100);
  };

  const getCategory = (score: number) => {
    if (score > 75) return { label: 'Baik', color: 'text-emerald-600', class: 'text-emerald-600' } as any;
    if (score >= 50) return { label: 'Cukup', color: 'text-yellow-600', class: 'text-slate-600' } as any;
    return { label: 'Kurang', color: 'text-red-600', class: 'text-slate-600' } as any;
  };

  const handleDownloadPDF = () => {
    const score = resultScore ?? calculateScore();
    const category = resultCategory ?? getCategory(score);

    const instansiForPdf = {
      ...instansiData,
      // Pastikan tahun pelaporan dan tingkat ikut terbawa ke PDF
      reportYear: reportingYear,
      tingkat: instansiData.tingkat || instansiNoun,
      originRegencyName: regencies.find((r) => String(r.id) === String(originRegencyId))?.name || null,
      originDistrictName: districts.find((d) => String(d.id) === String(originDistrictId))?.name || null,
      originVillageName: villages.find((v) => String(v.id) === String(originVillageId))?.name || null,
    };

    generateEvaluasiPDF(instansiForPdf, score, category, clusters, answers, remarks);
    toast.success('File PDF berhasil diunduh!');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInstansiData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instansiData.nama) {
      toast.error(`Mohon isi Nama ${instansiNoun}`);
      return;
    }

    try {
      const payloadAnswers = clusters.flatMap((cluster) =>
        cluster.questions.map((q) => ({
          question_id: q.id,
          question_text: q.text,
          answer_value: Number(answers[q.id] ?? 0),
          remark: remarks[q.id] ?? undefined,
        })),
      );

      if (payloadAnswers.length === 0) {
        toast.error('Mohon isi minimal satu indikator evaluasi.');
        return;
      }

      const submissionDateIso = new Date().toISOString();
      const isLate = computeIsLate(submissionDateIso);

      const requestBody = {
        instansi_id: null,
        instansi_name: instansiData.nama,
        instansi_level_id: null,
        instansi_level_text: instansiData.tingkat || null,
        origin_regency_id: originRegencyId || null,
        origin_district_id: originDistrictId || null,
        origin_village_id: originVillageId || null,
        instansi_address: instansiData.alamat || null,
        pejabat_nama: instansiData.pejabat || null,
        employee_male_count: instansiData.jmlLaki ? Number(instansiData.jmlLaki) : null,
        employee_female_count: instansiData.jmlPerempuan ? Number(instansiData.jmlPerempuan) : null,
        report_year: reportingYear,
        evaluation_date: instansiData.tanggal || null,
        is_late: isLate,
        remarks: null as string | null,
        answers: payloadAnswers,
      };

      const response = await apiClient.post<{ status: string; message?: string; data?: any }>(
        '/evaluasi/submissions',
        requestBody,
      );

      const submission = response?.data;

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
          else if (lower === 'cukup')
            categoryFromBackend = { label: 'Cukup', color: 'text-yellow-600' };
          else categoryFromBackend = { label: catLabel, color: 'text-red-600' };
        }

        finalCategory = categoryFromBackend;
      } else {
        const localScore = calculateScore();
        finalScore = localScore;
        finalCategory = getCategory(localScore);
      }

      setResultScore(finalScore);
      setResultCategory(finalCategory);

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto py-8 px-4"
      >
        <Card className="p-8 md:p-12 text-center shadow-xl border-t-8 border-t-emerald-600 rounded-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-emerald-700 mb-2 uppercase leading-tight">
            Form Evaluasi Germas di
            <br />
            Tatanan Tempat Kerja
          </h1>
          <h2 className="text-xl font-bold text-slate-600 mb-10">Provinsi Jawa Timur</h2>
          <p className="text-slate-500 mb-6 font-medium text-lg">Pilih tingkat instansi:</p>
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            {INSTANSI_LEVELS.map((level, idx) => (
              <button
                key={idx}
                onClick={() => handleLevelSelect(level)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-lg shadow-md transition-all border-2 border-emerald-600"
              >
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center py-10 px-4 bg-[#f6fbf9]"
      >
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden relative border border-emerald-50">
          <div className="pt-10 pb-6 px-5 sm:px-8 text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-700 uppercase leading-snug tracking-tight">
              FORM EVALUASI GERMAS DI
              <br /> TATANAN TEMPAT KERJA
            </h1>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 mt-4">Provinsi Jawa Timur</h2>
            <p className="text-base sm:text-lg font-semibold text-slate-700 mt-1">Tahun {reportingYear}</p>
          </div>

          <div className="mx-4 sm:mx-6 md:mx-12 mb-10 bg-emerald-50/60 rounded-3xl p-6 sm:p-8 md:p-12 relative border border-emerald-100">
            <h3 className="text-center text-xl sm:text-2xl font-bold text-emerald-700 mb-8 sm:mb-10">Hasil Evaluasi</h3>

            <div className="grid grid-cols-1 gap-y-3 sm:gap-y-4 max-w-2xl mx-auto text-slate-800 text-sm sm:text-base md:text-lg">
              <div className="grid grid-cols-1 sm:grid-cols-[220px,20px,1fr] gap-x-2 sm:gap-x-0">
                <span className="font-bold">Nama {instansiNoun}</span>
                <span className="hidden sm:inline">:</span>
                <span>{instansiData.nama}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[220px,20px,1fr] gap-x-2 sm:gap-x-0">
                <span className="font-bold">Alamat {instansiNoun}</span>
                <span className="hidden sm:inline">:</span>
                <span>{instansiData.alamat || '-'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[220px,20px,1fr] gap-x-2 sm:gap-x-0">
                <span className="font-bold">Nama Pejabat/Pengelola</span>
                <span className="hidden sm:inline">:</span>
                <span>{instansiData.pejabat || '-'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[220px,20px,1fr] gap-x-2 sm:gap-x-0">
                <span className="font-bold">Jumlah Pekerja Laki-Laki</span>
                <span className="hidden sm:inline">:</span>
                <span>{instansiData.jmlLaki || '-'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[220px,20px,1fr] gap-x-2 sm:gap-x-0">
                <span className="font-bold">Jumlah Pekerja Perempuan</span>
                <span className="hidden sm:inline">:</span>
                <span>{instansiData.jmlPerempuan || '-'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[220px,20px,1fr] gap-x-2 sm:gap-x-0">
                <span className="font-bold">Hari, Tanggal</span>
                <span className="hidden sm:inline">:</span>
                <span>{instansiData.tanggal || new Date().toLocaleDateString('id-ID')}</span>
              </div>

              <div className="h-4" />

              <div className="grid grid-cols-1 sm:grid-cols-[220px,20px,1fr] items-center gap-x-2 sm:gap-x-0">
                <span className="font-bold">Nilai Total</span>
                <span className="hidden sm:inline">:</span>
                <span className="text-lg sm:text-xl">
                  {score}{' '}
                  <span className={`font-bold ${category.color}`}>({category.label})</span>
                </span>
              </div>
            </div>

            <div className="mt-10 sm:mt-12 w-full h-px bg-emerald-200" />
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-10 sm:mb-12 px-5 sm:px-8">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              className="w-full sm:w-auto border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 px-6 sm:px-8 py-3 h-auto text-base sm:text-lg rounded-lg min-w-[200px]"
              leftIcon={<Download className="w-5 h-5" />}
            >
              Unduh Hasil (PDF)
            </Button>
            <Button
              onClick={onBack}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 sm:px-8 py-3 h-auto text-base sm:text-lg rounded-lg shadow-lg shadow-emerald-200 min-w-[200px]"
            >
              Kembali ke Halaman Utama
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto py-8 px-4"
    >
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-emerald-200">
        <form onSubmit={handleSubmit} className="p-6 md:p-10">
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-extrabold text-emerald-700 uppercase leading-snug tracking-tight">
              FORM EVALUASI GERMAS DI
              <br /> TATANAN TEMPAT KERJA
            </h1>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 mt-3 uppercase tracking-wide">
              {selectedLevelLabel}
            </h2>
            <p className="text-sm md:text-base font-semibold text-slate-600 mt-1">Tahun {reportingYear}</p>
          </div>

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

                      let typeLabel: string | null = null;
                      if (lowerName.startsWith('kota ')) typeLabel = 'Kota';
                      else if (lowerName.startsWith('kabupaten ')) typeLabel = 'Kabupaten';

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

        {/* SECTION I: IMPLEMENTASI GERMAS DI TEMPAT KERJA (Kluster A-F) */}
        <div className="mb-10">
          <div className="text-center mb-4">
            <p className="text-sm font-semibold text-slate-500 tracking-wide mb-1">I.</p>
            <h3 className="text-xl font-extrabold text-slate-700 uppercase tracking-widest mb-1">
              IMPLEMENTASI GERMAS DI TEMPAT KERJA
            </h3>
            <p className="text-lg font-bold text-slate-700">Tahun {reportingYear}</p>
          </div>

          <div className="bg-emerald-50/60 rounded-2xl border border-emerald-100 p-4 md:p-6 space-y-8">
            {sectionIClusters.length > 0 ? (
              sectionIClusters.map((cluster) => renderClusterTable(cluster, 'implementasi'))
            ) : (
              <p className="text-center text-slate-500">
                Belum ada konfigurasi pertanyaan Implementasi Germas untuk tingkat ini.
              </p>
            )}
          </div>
        </div>

          {/* SECTION II: PENGELOLAAN PELAKSANAAN GERMAS */}
          <div className="mb-10">
            <div className="text-center mb-4">
              <p className="text-sm font-semibold text-slate-500 tracking-wide mb-1">II.</p>
              <h3 className="text-xl font-extrabold text-slate-700 uppercase tracking-widest mb-1">
                PENGELOLAAN PELAKSANAAN GERMAS
              </h3>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 md:p-6 space-y-8">
              {sectionIIClusters.length > 0 ? (
                sectionIIClusters.map((cluster) => renderClusterTable(cluster, 'section'))
              ) : (
                <p className="text-center text-slate-500">
                  Belum ada konfigurasi kluster Pengelolaan untuk tingkat ini.
                </p>
              )}
            </div>
          </div>

          {/* SECTION III: PEMANTAUAN DAN EVALUASI */}
          <div className="mb-10">
            <div className="text-center mb-4">
              <p className="text-sm font-semibold text-slate-500 tracking-wide mb-1">III.</p>
              <h3 className="text-xl font-extrabold text-slate-700 uppercase tracking-widest mb-1">
                PEMANTAUAN DAN EVALUASI
              </h3>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 md:p-6 space-y-8">
              {sectionIIIClusters.length > 0 ? (
                sectionIIIClusters.map((cluster) => renderClusterTable(cluster, 'section'))
              ) : (
                <p className="text-center text-slate-500">
                  Belum ada konfigurasi kluster Pemantauan & Evaluasi untuk tingkat ini.
                </p>
              )}
            </div>
          </div>

          <div className="mt-12 bg-[#f0fbf7] rounded-xl p-6 border border-emerald-100">
            <span className="font-bold text-slate-800 block mb-2">NB:</span>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 leading-relaxed">
              <li>
                Untuk Tempat kerja yang hanya berlantai 1 maka indikator menganjurkan penggunaan tangga daripada lift nilainya 1 <b>(Pilih Ya)</b>
              </li>
              <li>
                {isCompanyLevel
                  ? 'Bagi perusahaan'
                  : 'Bagi instansi'}{' '}
                yang tidak membutuhkan APD bisa mengisi kolom keterangan dengan N/A atau (-)
              </li>
              <li>
                Menyediakan sarana sanitasi aman yang responsif terhadap GEDSI berarti memastikan fasilitas sanitasi
                dapat diakses, digunakan, dan dirasakan manfaatnya oleh semua pekerja tanpa kecuali, termasuk
                perempuan, penyandang disabilitas, serta kelompok dengan kebutuhan khusus. Pendekatan ini menekankan
                kesetaraan dan inklusi sosial, sehingga tidak ada kelompok yang terpinggirkan dalam pemenuhan hak dasar
                atas kesehatan dan kebersihan di tempat kerja.
              </li>
            </ul>
          </div>

          <div className="flex justify-between items-center mt-12 gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('SELECTION')}
              className="px-8 border-emerald-600 text-emerald-700 hover:bg-emerald-50 h-12"
            >
              Kembali
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 shadow-lg shadow-emerald-200 rounded-lg"
            >
              Kirim Laporan
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default EvaluasiForm;
