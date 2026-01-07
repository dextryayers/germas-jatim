import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, ChevronDown, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FormStore, LaporanTemplate, INSTANSI_LIST_PROV, INSTANSI_LIST_KABKOTA } from '../../utils/formStore';
import { SubmissionStore } from '../../utils/submissionStore';
import { apiClient } from '../../utils/apiClient';
import { generateLaporanPDF } from '../../utils/pdfGenerator';

type LaporanStep = 'LEVEL_SELECT' | 'INSTANSI_SELECT' | 'FORM_INPUT' | 'SUCCESS';

type RegencyOption = { id: number; code: string; name: string; type?: string };

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

const slugifyInstansi = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

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

  useEffect(() => {
    if (!selectedInstansiLevel) {
      setInstansiOptions([]);
      setSelectedInstansiId('');
      return;
    }

    const levelId = LEVEL_TO_ID[selectedInstansiLevel] ?? null;

    const fallbackList =
      selectedInstansiLevel === 'INSTANSI TINGKAT KABUPATEN / KOTA'
        ? INSTANSI_LIST_KABKOTA
        : INSTANSI_LIST_PROV;

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
          setInstansiOptions(
            fallbackList.map((item) => ({
              id: (item as any).id,
              name: String(item.name),
              slug: undefined,
            })),
          );
        }
      })
      .catch(() => {
        setInstansiOptions(
          fallbackList.map((item) => ({
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

  const isKabKotaLevel =
    selectedInstansiLevel.toUpperCase().includes('KABUPATEN') ||
    selectedInstansiLevel.toUpperCase().includes('KOTA');

  useEffect(() => {
    if (!isKabKotaLevel) {
      setRegencies([]);
      setOriginRegencyId('');
      return;
    }

    if (regencies.length > 0) {
      return;
    }

    const normalizeCollection = <T,>(collection: unknown): T[] => {
      if (Array.isArray(collection)) {
        return collection as T[];
      }

      if (collection && typeof collection === 'object' && Array.isArray((collection as any).data)) {
        return (collection as any).data as T[];
      }

      return [];
    };

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

  const handleInstansiSubmit = async () => {
    if (!selectedInstansiId) return;
    if (isKabKotaLevel && !originRegencyId) return;

    const originRegencyName = isKabKotaLevel
      ? regencies.find((r) => String(r.id) === String(originRegencyId))?.name ?? ''
      : '';

    setLaporanInputs((prev) => ({
      ...prev,
      originRegencyId: originRegencyId || undefined,
      originRegencyName: originRegencyName || undefined,
    }));

    try {
      const levelId = LEVEL_TO_ID[selectedInstansiLevel] ?? null;
      const selectedInstansi = instansiOptions.find((i) => String(i.id) === selectedInstansiId);
      const selectedInstansiName = selectedInstansi?.name || 'Instansi';
      const instansiSlug = selectedInstansi?.slug || slugifyInstansi(selectedInstansiName);

      const resp = await apiClient.get<any>('/templates/laporan', {
        query: {
          // Tidak lagi mengirim tahun; backend akan memakai template dasar (year = null)
          instansi_level_id: levelId || undefined,
          instansi_slug: instansiSlug,
        },
      });

      const rawTemplates: any[] = (resp as any)?.data ?? [];
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
    setLaporanInputs((prev) => ({
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

      const submissionDateIso = new Date().toISOString();
      const isLate = computeIsLate(submissionDateIso);

      const requestBody = {
        template_id: (template as any).id ?? null,
        instansi_id: null,
        instansi_name: template.instansiName,
        instansi_level_id: null,
        instansi_level_text: selectedInstansiLevel,
        origin_regency_id: laporanInputs.originRegencyId || null,
        origin_regency_name: laporanInputs.originRegencyName || null,
        report_year: reportingYear,
        report_level: selectedInstansiLevel,
        is_late: isLate,
        notes: null as string | null,
        sections: sectionsPayload,
      };

      const response = await apiClient.post<{ status: string; message?: string; data?: unknown }>(
        '/laporan/submissions',
        requestBody,
      );

      SubmissionStore.add({
        type: 'laporan',
        instansiName: template.instansiName,
        submitDate: submissionDateIso,
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

    generateLaporanPDF(template, originName, laporanInputs, String(reportingYear));
    toast.success('Laporan PDF berhasil diunduh!');
  };

  if (step === 'LEVEL_SELECT') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto py-12 px-4"
      >
        <Card className="bg-white rounded-[2.5rem] shadow-xl border border-emerald-50 overflow-hidden pb-12 pt-8">
          <div className="text-center px-4 mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-emerald-700 uppercase leading-snug mb-4">
              Form Laporan Pemantauan
              <br />
              Semesteran dan Tahunan
              <br />
              Kegiatan Germas
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

  if (step === 'INSTANSI_SELECT') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="max-w-4xl mx-auto py-12 px-4"
      >
        <Card className="bg-white rounded-[2.5rem] shadow-xl border border-emerald-50 overflow-hidden pb-12 pt-8 min-h-[500px] flex flex-col items-center justify-center">
          <div className="text-center px-4 w-full max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold text-emerald-700 uppercase leading-snug mb-3">
              Form Laporan Pemantauan
              <br />
              Semesteran dan Tahunan
              <br />
              Kegiatan Germas
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
                  <label className="block text-lg font-medium text-slate-600 mb-4">
                    Asal Kab/Kota instansi:
                  </label>
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
                  {instansiOptions.map((inst) => (
                    <option key={inst.id} value={String(inst.id)}>
                      {inst.name}
                    </option>
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
                type="button"
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

  if (step === 'FORM_INPUT' && template) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto py-8 px-4">
        <form onSubmit={handleFormSubmit}>
          <Card className="bg-white rounded-[2rem] shadow-xl border border-emerald-50 overflow-hidden p-0">
            <div className="bg-white pt-10 pb-6 px-6 text-center border-b border-emerald-50">
              <h1 className="text-2xl md:text-3xl font-bold text-emerald-700 uppercase leading-tight">
                Form Laporan Pemantauan
                <br />
                Semesteran dan Tahunan
                <br />
                Kegiatan Germas
              </h1>
              <div className="mt-4 space-y-1">
                <h2 className="text-lg font-bold text-slate-800 uppercase">{selectedInstansiLevel}</h2>
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

            <div className="p-6 md:p-10 space-y-10 bg-slate-50/50">
              {template.sections.length > 0 ? (
                template.sections.map((section) => (
                  <div
                    key={section.id}
                    className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200"
                  >
                    <h4 className="font-bold text-slate-800 text-base md:text-lg mb-4 leading-relaxed">
                      {section.title}
                    </h4>

                    <div className="mb-6 bg-emerald-50/70 p-4 rounded-xl border border-emerald-100">
                      <span className="block font-bold text-emerald-700 text-sm mb-1">Indikator:</span>
                      <p className="text-slate-700 font-medium">{section.indicator}</p>
                    </div>

                    <div className="space-y-6">
                      {section.hasTarget && (
                        <div>
                          <h5 className="font-bold text-emerald-700 text-sm mb-3">Target dan Capaian:</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-500 uppercase">
                                Tahun 2026
                              </label>
                              <input
                                className="w-full border-emerald-400 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400 bg-white"
                                placeholder="Isi Kolom..."
                                onChange={(e) => handleLaporanInput(section.id, 'target-year', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2 relative">
                              <div className="hidden md:block absolute left-0 top-8 bottom-2 w-px bg-slate-200 -ml-2" />
                              <label className="text-xs font-semibold text-slate-500 uppercase">Semester I</label>
                              <input
                                className="w-full border-emerald-400 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400 bg-white"
                                placeholder="Isi Kolom..."
                                onChange={(e) => handleLaporanInput(section.id, 'target-sem1', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2 relative">
                              <div className="hidden md:block absolute left-0 top-8 bottom-2 w-px bg-slate-200 -ml-2" />
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

                      {section.hasBudget && (
                        <div className="mt-6 pt-6 border-t border-dashed border-emerald-100">
                          <h5 className="font-bold text-emerald-700 text-sm mb-3">
                            Alokasi Anggaran dan Capaian:
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-500 uppercase">
                                Tahun 2026
                              </label>
                              <input
                                className="w-full border-emerald-400 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400 bg-white"
                                placeholder="Isi Kolom..."
                                onChange={(e) => handleLaporanInput(section.id, 'budget-year', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2 relative">
                              <div className="hidden md:block absolute left-0 top-8 bottom-2 w-px bg-slate-200 -ml-2" />
                              <label className="text-xs font-semibold text-slate-500 uppercase">Semester I</label>
                              <input
                                className="w-full border-emerald-400 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400 bg-white"
                                placeholder="Isi Kolom..."
                                onChange={(e) => handleLaporanInput(section.id, 'budget-sem1', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2 relative">
                              <div className="hidden md:block absolute left-0 top-8 bottom-2 w-px bg-slate-200 -ml-2" />
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
                ))
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-200">
                  Belum ada konfigurasi kegiatan untuk instansi ini.
                </div>
              )}

              {/* TUJUAN GERMAS section */}
              <div className="mt-4 bg-[#f0fbf7] rounded-xl p-6 border border-emerald-100">
                <h4 className="font-bold text-slate-800 mb-3">TUJUAN GERMAS</h4>
                <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 leading-relaxed">
                  <li>Peningkatan aktivitas fisik</li>
                  <li>Peningkatan perilaku hidup sehat</li>
                  <li>Penyediaan pangan sehat &amp; Percepatan perbaikan gizi</li>
                  <li>Peningkatan pencegahan dan deteksi dini penyakit</li>
                  <li>Peningkatan kualitas lingkungan</li>
                  <li>Peningkatan edukasi hidup sehat</li>
                </ol>
              </div>
            </div>

            <div className="p-8 bg-white border-t border-emerald-100 flex justify-between items-center sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(15,118,110,0.08)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('INSTANSI_SELECT')}
                className="px-8 py-3 h-auto text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-lg font-bold text-lg"
                leftIcon={<ArrowLeft className="w-5 h-5" />}
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

  if (step === 'SUCCESS' && template) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto py-12 px-4"
      >
        <Card className="bg-white rounded-[2.5rem] shadow-xl border border-emerald-50 overflow-hidden pb-12 pt-8 text-center">
          <div className="px-8">
            <h1 className="text-3xl font-bold text-emerald-700 uppercase leading-snug mb-3">
              Form Laporan Pemantauan
              <br />
              Semesteran dan Tahunan
              <br />
              Kegiatan Germas
            </h1>
            <h2 className="text-lg font-bold text-slate-700 uppercase tracking-widest mb-2">
              {selectedInstansiLevel}
            </h2>
            <h2 className="text-lg font-bold text-slate-700 uppercase tracking-widest mb-10">
              Tahun {reportingYear}
            </h2>

            <div className="bg-emerald-50/70 rounded-3xl p-10 mb-10 max-w-2xl mx-auto border border-emerald-100">
              <h2 className="text-2xl font-bold text-emerald-700 mb-6 uppercase">{template.instansiName}</h2>

              <h3 className="text-xl font-bold text-emerald-600 mb-4 uppercase tracking-widest">
                Laporan Terkirim!
              </h3>

              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Terima Kasih telah mengirim <strong>
                  Laporan Pemantauan Semesteran dan Tahunan Kegiatan Germas {template.instansiName}
                </strong>{' '}
                pada <strong>Tahun {reportingYear}</strong>.
              </p>

              <div className="w-full h-px bg-emerald-200 mb-4" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                className="px-8 py-3 h-auto text-emerald-700 border-emerald-600 hover:bg-emerald-50 rounded-lg font-bold text-lg"
                leftIcon={<Download className="w-5 h-5" />}
              >
                Unduh Hasil (PDF)
              </Button>
              <Button
                onClick={onBack ?? (() => navigate('/'))}
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

export default LaporanForm;

