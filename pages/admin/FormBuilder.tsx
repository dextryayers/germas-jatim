import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Save, Plus, Trash2, GripVertical, FileText, CheckSquare, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { FormStore, INSTANSI_LEVELS, INSTANSI_LIST, Cluster, Question, LaporanTemplate, LaporanSection } from '../../utils/formStore';

const FormBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'evaluasi' | 'laporan'>('evaluasi');
  
  // --- STATE FOR EVALUASI ---
  const [selectedLevel, setSelectedLevel] = useState(INSTANSI_LEVELS[0]);
  const [clusters, setClusters] = useState<Cluster[]>([]);

  // --- STATE FOR LAPORAN ---
  const [selectedInstansi, setSelectedInstansi] = useState(INSTANSI_LIST[0].id);
  const [laporanTemplate, setLaporanTemplate] = useState<LaporanTemplate | null>(null);

  // Load Data Effect
  useEffect(() => {
    if (activeTab === 'evaluasi') {
      const data = FormStore.getEvaluasiTemplate(selectedLevel);
      setClusters(JSON.parse(JSON.stringify(data))); // Deep copy
    } else {
      const data = FormStore.getLaporanTemplate(selectedInstansi);
      setLaporanTemplate(JSON.parse(JSON.stringify(data))); // Deep copy
    }
  }, [activeTab, selectedLevel, selectedInstansi]);

  // --- HANDLERS EVALUASI ---
  const handleSaveEvaluasi = () => {
    FormStore.saveEvaluasiTemplate(selectedLevel, clusters);
    toast.success('Konfigurasi Formulir Evaluasi tersimpan!');
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
  const handleSaveLaporan = () => {
    if (laporanTemplate) {
      FormStore.saveLaporanTemplate(laporanTemplate);
      toast.success('Konfigurasi Formulir Laporan tersimpan!');
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
      {activeTab === 'laporan' && laporanTemplate && (
        <div className="space-y-6">
          <Card className="bg-amber-50 border-amber-100">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <label className="font-bold text-slate-700 whitespace-nowrap">Pilih Jenis Instansi:</label>
              <select 
                value={selectedInstansi}
                onChange={(e) => setSelectedInstansi(e.target.value)}
                className="w-full md:w-auto flex-1 bg-white border border-amber-200 text-slate-800 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5"
              >
                {INSTANSI_LIST.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
          </Card>

          <div className="space-y-6">
            {laporanTemplate.sections.map((section, idx) => (
              <div key={section.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Judul Kegiatan</label>
                      <input 
                        type="text" 
                        value={section.title} 
                        onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                        className="w-full font-bold text-slate-800 border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <button onClick={() => removeSection(section.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Indikator Kinerja</label>
                    <textarea 
                      value={section.indicator} 
                      onChange={(e) => updateSection(section.id, 'indicator', e.target.value)}
                      className="w-full text-sm text-slate-700 border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-4 pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={section.hasTarget} 
                        onChange={(e) => updateSection(section.id, 'hasTarget', e.target.checked)}
                        className="rounded text-green-600 focus:ring-green-500" 
                      />
                      Input Target & Capaian
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={section.hasBudget} 
                        onChange={(e) => updateSection(section.id, 'hasBudget', e.target.checked)}
                        className="rounded text-green-600 focus:ring-green-500" 
                      />
                      Input Anggaran
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <Button onClick={addSection} variant="outline" className="border-dashed border-2 border-slate-300 text-slate-500 hover:border-amber-500 hover:text-amber-600 w-full justify-center">
              <Plus className="w-4 h-4 mr-2" /> Tambah Kegiatan Baru
            </Button>
          </div>

          <div className="sticky bottom-6 flex justify-end">
            <div className="bg-white/80 backdrop-blur p-2 rounded-xl shadow-xl border border-slate-200">
              <Button onClick={handleSaveLaporan} leftIcon={<Save className="w-4 h-4"/>} className="bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/30">
                Simpan Konfigurasi Laporan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
