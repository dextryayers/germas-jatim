import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Save, Plus, Trash2, GripVertical, FileText, CheckSquare, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { FormStore, INSTANSI_LEVELS, INSTANSI_LIST, Cluster, Question, LaporanTemplate, LaporanSection, INSTANSI_LIST_PROV, INSTANSI_LIST_KABKOTA } from '../../utils/formStore';
import { apiClient } from '../../utils/apiClient';
import { showSuccess } from '../../utils/alerts';

// Mapping tampilan level instansi -> ID level (dipakai untuk Laporan & instansi options)
const LEVEL_TO_ID: Record<string, number> = {
  'INSTANSI TINGKAT PROVINSI': 1,
  'INSTANSI TINGKAT KABUPATEN / KOTA': 2,
  'INSTANSI TINGKAT KECAMATAN': 3,
  'INSTANSI TINGKAT KELURAHAN / DESA': 6, // kelurahan_desa
  'INSTANSI TINGKAT PERUSAHAAN': 5,
};

// Mapping tampilan level instansi -> kode level di tabel instansi_levels
const LEVEL_TO_CODE: Record<string, string> = {
  'INSTANSI TINGKAT PROVINSI': 'provinsi',
  'INSTANSI TINGKAT KABUPATEN / KOTA': 'kab_kota',
  'INSTANSI TINGKAT KECAMATAN': 'kecamatan',
  'INSTANSI TINGKAT KELURAHAN / DESA': 'kelurahan_desa',
  'INSTANSI TINGKAT PERUSAHAAN': 'perusahaan',
};

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const FormBuilder: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const roleRaw =
      (typeof window !== 'undefined' && window.sessionStorage.getItem('user_role')) ||
      (typeof window !== 'undefined' && window.localStorage.getItem('user_role')) ||
      null;

    const role = roleRaw ? roleRaw.toLowerCase().trim() : '';
    const isAllowed = role.includes('super_admin') || role.includes('admin_provinsi');

    if (!isAllowed) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);
  const [activeTab, setActiveTab] = useState<'evaluasi' | 'laporan'>('evaluasi');
  
  // --- STATE FOR EVALUASI ---
  const [selectedLevel, setSelectedLevel] = useState(INSTANSI_LEVELS[0]);
  const [clusters, setClusters] = useState<Cluster[]>([]);

  // --- STATE FOR LAPORAN ---
  const LAPORAN_LEVELS = [
    'INSTANSI TINGKAT PROVINSI',
    'INSTANSI TINGKAT KABUPATEN / KOTA',
  ] as const;

  const [selectedLaporanLevel, setSelectedLaporanLevel] = useState<string>(LAPORAN_LEVELS[0]);
  const [selectedInstansi, setSelectedInstansi] = useState<string>('');
  const [laporanTemplate, setLaporanTemplate] = useState<LaporanTemplate | null>(null);

  // Instansi options untuk tab laporan (dibaca dari backend per level)
  const [instansiOptions, setInstansiOptions] = useState<{ id: number; name: string; slug?: string }[]>([]);
  const [instansiLoading, setInstansiLoading] = useState(false);

  // Load Data Effect
  useEffect(() => {
    if (activeTab === 'evaluasi') {
      // Admin evaluasi builder sekarang membaca klaster dari backend
      const loadEvaluasi = async () => {
        try {
          const levelCode = LEVEL_TO_CODE[selectedLevel] ?? null;
          const resp = await apiClient.get<any>('/templates/evaluasi', {
            query: {
              // Gunakan kode level agar tidak bergantung pada ID numerik
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
          console.error('Gagal memuat template evaluasi dari server di FormBuilder, fallback ke FormStore lokal', error);
          const data = FormStore.getEvaluasiTemplate(selectedLevel);
          setClusters(JSON.parse(JSON.stringify(data)));
        }
      };

      loadEvaluasi();
    } else {
      // Admin laporan builder membaca daftar instansi & template laporan dari backend per tingkat instansi
      const loadInstansiAndLaporan = async () => {
        try {
          const currentYear = new Date().getFullYear();
          const levelId = LEVEL_TO_ID[selectedLaporanLevel] ?? null;

          // 1) Load daftar instansi untuk level terpilih
          setInstansiLoading(true);

          const instansiResp = await apiClient.get<any>('/instansi', {
            query: {
              instansi_level_id: levelId || undefined,
            },
          });

          const rawInstansi: any[] = (instansiResp as any)?.data ?? [];

          let options: { id: number; name: string; slug?: string }[] = [];

          if (rawInstansi.length > 0) {
            options = rawInstansi.map((item) => ({
              id: Number(item.id),
              name: String(item.name ?? 'Instansi'),
              slug: item.slug ? String(item.slug) : undefined,
            }));
          } else {
            // Fallback ke daftar statis jika backend kosong
            const fallbackList =
              selectedLaporanLevel === 'INSTANSI TINGKAT KABUPATEN / KOTA'
                ? INSTANSI_LIST_KABKOTA
                : INSTANSI_LIST_PROV;

            options = fallbackList.map((item: any, idx: number) => ({
              id: idx + 1,
              name: String(item.name),
              slug: slugify(item.name),
            }));
          }

          setInstansiOptions(options);

          // Pastikan selectedInstansi terisi
          const effectiveSelectedInstansi = selectedInstansi || (options[0] ? String(options[0].id) : '');
          if (!selectedInstansi && options[0]) {
            setSelectedInstansi(String(options[0].id));
          }

          if (!effectiveSelectedInstansi) {
            setLaporanTemplate(null);
            return;
          }

          const selectedOption = options.find((opt) => String(opt.id) === String(effectiveSelectedInstansi));

          if (!selectedOption) {
            setLaporanTemplate(null);
            return;
          }

          // 2) Load template laporan dari backend berdasarkan instansi_id + level_id (tanpa filter tahun)
          const resp = await apiClient.get<any>('/templates/laporan', {
            query: {
              instansi_level_id: levelId || undefined,
              instansi_id: selectedOption.id,
            },
          });

          const rawData: any[] = (resp as any)?.data ?? [];

          // Pilih template pertama sebagai dasar editing untuk tahun berjalan
          const first = rawData[0];

          if (!first) {
            setLaporanTemplate(null);
            toast.error('Belum ada template laporan aktif di server.');
            return;
          }

          const mappedTemplate: LaporanTemplate = {
            instansiId: String(selectedOption.id),
            instansiName: selectedOption.name,
            level: selectedLaporanLevel,
            sections: Array.isArray(first.sections)
              ? first.sections.map((s: any) => ({
                  id: String(s.id ?? s.code ?? ''),
                  title: String(s.title ?? ''),
                  indicator: String(s.indicator ?? ''),
                  hasTarget: Boolean(s.has_target ?? s.hasTarget ?? true),
                  hasBudget: Boolean(s.has_budget ?? s.hasBudget ?? true),
                }))
              : [],
          };

          // Simpan juga id template backend supaya bisa diupdate
          (mappedTemplate as any)._backendId = first.id;
          setLaporanTemplate(mappedTemplate);
        } catch (error) {
          console.error('Gagal memuat template laporan dari server di FormBuilder', error);
          setLaporanTemplate(null);
          toast.error('Gagal memuat template laporan dari server.');
        } finally {
          setInstansiLoading(false);
        }
      };

      loadInstansiAndLaporan();
    }
  }, [activeTab, selectedLevel, selectedInstansi, selectedLaporanLevel]);

  // --- HANDLERS EVALUASI ---
  const handleSaveEvaluasi = async () => {
    try {
      const levelId = LEVEL_TO_ID[selectedLevel] ?? null;
      const payload = {
        instansi_level_id: levelId,
        clusters: clusters.map((c, cIdx) => ({
          id: c.id,
          title: c.title,
          sequence: cIdx + 1,
          questions: c.questions.map((q, qIdx) => ({
            id: q.id,
            text: q.text,
            sequence: qIdx + 1,
          })),
        })),
      };

      await apiClient.post<any>('/admin/templates/evaluasi', payload);
      toast.success('Konfigurasi Formulir Evaluasi berhasil disimpan ke server!');
      await showSuccess('Berhasil disimpan', 'Konfigurasi Form Evaluasi telah berhasil disimpan.');
    } catch (error: any) {
      console.error('Gagal menyimpan konfigurasi evaluasi ke server', error);
      const message = (error as any)?.data?.message || 'Gagal menyimpan konfigurasi evaluasi. Coba lagi.';
      toast.error(message);
    }
  };

  const addCluster = () => {
    setClusters([...clusters, { id: Date.now(), title: 'Kluster Baru', questions: [] }]);
  };

  const removeCluster = (cId: number) => {
    setClusters(clusters.filter(c => c.id !== cId));
  };

  const updateClusterTitle = (cId: number, val: string) => {
    setClusters(clusters.map(c => c.id === cId ? { ...c, title: val } : c));
  };

  const addQuestion = (cId: number) => {
    setClusters(clusters.map(c => {
      if (c.id === cId) {
        return {
          ...c,
          questions: [...c.questions, { id: Date.now(), text: '' }]
        };
      }
      return c;
    }));
  };

  const removeQuestion = (cId: number, qId: number) => {
    setClusters(clusters.map(c => {
      if (c.id === cId) {
        return { ...c, questions: c.questions.filter(q => q.id !== qId) };
      }
      return c;
    }));
  };

  const updateQuestionText = (cId: number, qId: number, text: string) => {
    setClusters(clusters.map(c => {
      if (c.id === cId) {
        return {
          ...c,
          questions: c.questions.map(q => q.id === qId ? { ...q, text } : q)
        };
      }
      return c;
    }));
  };

  // --- HANDLERS LAPORAN ---
  const handleSaveLaporan = async () => {
    if (!laporanTemplate) {
      toast.error('Tidak ada template laporan yang dimuat dari server.');
      return;
    }

    try {
      const backendId = (laporanTemplate as any)._backendId;

      if (!backendId) {
        toast.error('Template laporan belum terhubung ke backend. Hubungi admin untuk inisialisasi template.');
        return;
      }

      const levelId = LEVEL_TO_ID[selectedLaporanLevel] ?? null;
      const selectedOption = instansiOptions.find((opt) => String(opt.id) === String(selectedInstansi));

      const payload = {
        name: (laporanTemplate as any).name ?? 'Laporan Germas',
        description: (laporanTemplate as any).description ?? null,
        year: new Date().getFullYear(),
        instansi_level_id: levelId,
        instansi_id: selectedOption ? selectedOption.id : undefined,
        sections: laporanTemplate.sections.map((s, idx) => ({
          id: (s as any).id && String((s as any).id).match(/^\d+$/) ? Number((s as any).id) : null,
          code: (s as any).code ?? null,
          title: s.title,
          indicator: s.indicator,
          has_target: s.hasTarget,
          has_budget: s.hasBudget,
          sequence: idx + 1,
        })),
      };

      await apiClient.post<any>(`/admin/templates/laporan/${backendId}`, payload);
      toast.success('Konfigurasi Formulir Laporan berhasil disimpan ke server!');
      await showSuccess('Berhasil disimpan', 'Konfigurasi Form Laporan telah berhasil disimpan.');
    } catch (error: any) {
      console.error('Gagal menyimpan konfigurasi laporan ke server', error);
      const message = (error as any)?.data?.message || 'Gagal menyimpan konfigurasi laporan. Coba lagi.';
      toast.error(message);
    }
  };

  const addSection = () => {
    if (!laporanTemplate) return;
    const newSection: LaporanSection = {
      id: `s-${Date.now()}`,
      title: 'Kegiatan Baru',
      indicator: '',
      hasTarget: true,
      hasBudget: true
    };
    setLaporanTemplate({
      ...laporanTemplate,
      sections: [...laporanTemplate.sections, newSection]
    });
  };

  const removeSection = (sId: string) => {
    if (!laporanTemplate) return;
    setLaporanTemplate({
      ...laporanTemplate,
      sections: laporanTemplate.sections.filter(s => s.id !== sId)
    });
  };

  const updateSection = (sId: string, field: keyof LaporanSection, value: any) => {
    if (!laporanTemplate) return;
    setLaporanTemplate({
      ...laporanTemplate,
      sections: laporanTemplate.sections.map(s => s.id === sId ? { ...s, [field]: value } : s)
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Formulir</h1>
          <p className="text-slate-500 text-sm">Kustomisasi konten kuisioner dan laporan per instansi</p>
        </div>
        <Button variant="outline" size="sm" onClick={FormStore.resetDefaults}>Reset ke Default</Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2">
        <button
          onClick={() => setActiveTab('evaluasi')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'evaluasi' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" /> Form Evaluasi
          </div>
        </button>
        <button
          onClick={() => setActiveTab('laporan')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'laporan' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Form Laporan
          </div>
        </button>
      </div>

      {/* --- CONTENT EVALUASI --- */}
      {activeTab === 'evaluasi' && (
        <div className="space-y-6">
          <Card className="bg-blue-50 border-blue-100">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <label className="font-bold text-slate-700 whitespace-nowrap">Pilih Tingkat Instansi:</label>
              <select 
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full md:w-auto flex-1 bg-white border border-blue-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
              >
                {INSTANSI_LEVELS.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </Card>

          <div className="space-y-6">
            {clusters.map((cluster, cIdx) => (
              <div key={cluster.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-3">
                  <GripVertical className="text-slate-400 w-5 h-5 cursor-move" />
                  <input 
                    type="text" 
                    value={cluster.title} 
                    onChange={(e) => updateClusterTitle(cluster.id, e.target.value)}
                    className="flex-1 bg-transparent border-none font-bold text-slate-700 focus:ring-0 placeholder-slate-400"
                    placeholder="Nama Kluster"
                  />
                  <button onClick={() => removeCluster(cluster.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                </div>
                
                <div className="p-4 space-y-3">
                  {cluster.questions.map((q, qIdx) => (
                    <div key={q.id} className="flex items-start gap-3 pl-2">
                      <span className="text-slate-400 font-mono text-sm pt-2">{qIdx + 1}.</span>
                      <textarea
                        value={q.text}
                        onChange={(e) => updateQuestionText(cluster.id, q.id, e.target.value)}
                        className="flex-1 text-sm border-slate-200 rounded-lg focus:ring-green-500 focus:border-green-500 min-h-[60px]"
                        placeholder="Tulis indikator pertanyaan..."
                      />
                      <button onClick={() => removeQuestion(cluster.id, q.id)} className="text-slate-300 hover:text-red-500 pt-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => addQuestion(cluster.id)}
                    className="text-xs font-bold text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg flex items-center gap-1 mt-2"
                  >
                    <Plus className="w-3 h-3" /> Tambah Pertanyaan
                  </button>
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <Button onClick={addCluster} variant="outline" className="border-dashed border-2 border-slate-300 text-slate-500 hover:border-green-500 hover:text-green-600 w-full justify-center">
                <Plus className="w-4 h-4 mr-2" /> Tambah Kluster Baru
              </Button>
            </div>
          </div>

          <div className="sticky bottom-6 flex justify-end">
            <div className="bg-white/80 backdrop-blur p-2 rounded-xl shadow-xl border border-slate-200">
              <Button onClick={handleSaveEvaluasi} leftIcon={<Save className="w-4 h-4"/>} className="shadow-lg shadow-green-500/30">
                Simpan Konfigurasi Evaluasi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONTENT LAPORAN --- */}
      {activeTab === 'laporan' && (
        <div className="space-y-6">
          <Card className="bg-amber-50 border-amber-100">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <label className="font-bold text-slate-700 whitespace-nowrap">Pilih Tingkat Instansi:</label>
              <select
                value={selectedLaporanLevel}
                onChange={(e) => setSelectedLaporanLevel(e.target.value)}
                className="w-full md:w-auto flex-1 bg-white border border-amber-200 text-slate-800 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5"
              >
                {LAPORAN_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>

              <label className="font-bold text-slate-700 whitespace-nowrap">Pilih Jenis Instansi:</label>
              <select
                value={selectedInstansi}
                onChange={(e) => setSelectedInstansi(e.target.value)}
                className="w-full md:w-auto flex-1 bg-white border border-amber-200 text-slate-800 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5"
                disabled={instansiLoading || instansiOptions.length === 0}
              >
                {instansiOptions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {laporanTemplate ? (
            <>
              <Card className="bg-white border border-amber-100 shadow-sm">
                <div className="p-4 border-b border-amber-100 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-500" />
                  <p className="text-xs text-amber-700 font-medium">
                    Pengaturan di bawah ini akan mengubah isi Form Laporan publik untuk kombinasi tingkat & jenis instansi yang dipilih.
                  </p>
                </div>
              </Card>

              <div className="space-y-4">
                {laporanTemplate.sections.map((section) => (
                  <Card key={section.id} className="border-slate-200 shadow-sm">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="text-slate-300 w-4 h-4 cursor-move" />
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                          className="font-semibold text-slate-800 bg-transparent border-none focus:ring-0 text-sm w-full"
                          placeholder="Judul Kegiatan"
                        />
                      </div>
                      <button
                        onClick={() => removeSection(section.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Indikator Kinerja</label>
                        <textarea
                          value={section.indicator}
                          onChange={(e) => updateSection(section.id, 'indicator', e.target.value)}
                          className="w-full text-sm border-slate-200 rounded-lg focus:ring-amber-500 focus:border-amber-500 min-h-[60px]"
                          placeholder="Deskripsikan indikator kegiatan..."
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-2">
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={section.hasTarget}
                            onChange={(e) => updateSection(section.id, 'hasTarget', e.target.checked)}
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                          />
                          Input Target & Capaian
                        </label>

                        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={section.hasBudget}
                            onChange={(e) => updateSection(section.id, 'hasBudget', e.target.checked)}
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                          />
                          Input Anggaran
                        </label>
                      </div>
                    </div>
                  </Card>
                ))}

                <Button
                  onClick={addSection}
                  variant="outline"
                  className="border-dashed border-2 border-amber-300 text-amber-600 hover:border-amber-500 hover:text-amber-700 w-full justify-center text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" /> Tambah Kegiatan Utama
                </Button>
              </div>

              <div className="sticky bottom-6 flex justify-end">
                <div className="bg-white/90 backdrop-blur p-2 rounded-xl shadow-xl border border-amber-100">
                  <Button
                    onClick={handleSaveLaporan}
                    leftIcon={<Save className="w-4 h-4" />}
                    className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30"
                  >
                    Simpan Konfigurasi Laporan
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <Card className="bg-white border border-amber-100 shadow-sm">
              <div className="p-6 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-700">
                  Belum ada template laporan aktif yang dimuat dari server.
                </p>
                <p className="text-xs text-slate-500">
                  Pastikan backend sudah memiliki data template laporan untuk tahun berjalan, kemudian muat ulang halaman ini.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
