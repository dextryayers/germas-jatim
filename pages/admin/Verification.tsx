import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Check, X, Eye, FileText, Search, Download, ChevronDown, Calendar, Building2, User, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { SubmissionStore, SubmissionRecord } from '../../utils/submissionStore';
import { generateEvaluasiPDF, generateLaporanPDF } from '../../utils/pdfGenerator';
import { showConfirmation } from '../../utils/alerts';

const Verification: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [reports, setReports] = useState<SubmissionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [selectedRecord, setSelectedRecord] = useState<SubmissionRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDelete = (id: string) => {
    SubmissionStore.remove(id);

    setReports(prev => prev.filter(r => r.id !== id));

    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord(null);
      setIsModalOpen(false);
    }

    toast.success(<b>Surat laporan berhasil dihapus.</b>);
  };

  // Load data from Store
  useEffect(() => {
    const fetchData = () => {
      const data = SubmissionStore.getAll();
      setReports(data);
    };

    fetchData();
    
    const interval = setInterval(fetchData, 5000); // Polling for updates
    return () => clearInterval(interval);
  }, []);

  const handleVerify = (id: string, newStatus: 'verified' | 'rejected') => {
    SubmissionStore.updateStatus(id, newStatus);
    
    // Update local state immediately
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    
    // If modal is open, update the selected record too
    if (selectedRecord && selectedRecord.id === id) {
        setSelectedRecord(prev => prev ? { ...prev, status: newStatus } : null);
    }

    if (newStatus === 'verified') {
      toast.success(<b>Laporan berhasil diverifikasi!</b>);
    } else {
      toast.error(<b>Laporan ditolak.</b>);
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
      toast.success('PDF berhasil diunduh');
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengunduh PDF: Data tidak lengkap');
    }
  };

  const openDetail = (record: SubmissionRecord) => {
      setSelectedRecord(record);
      setIsModalOpen(true);
  };

  // Filter Logic
  const filteredReports = reports.filter(r => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesYear = filterYear === 'all' || r.year.toString() === filterYear;
    const matchesSearch = r.instansiName.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesYear && matchesSearch;
  });

  // Split Data
  const evaluasiList = filteredReports.filter(r => r.type === 'evaluasi');
  const laporanList = filteredReports.filter(r => r.type === 'laporan');

  const availableYears = Array.from(new Set(reports.map(r => r.year))).sort((a: number, b: number) => b - a);

  // --- RENDER MODAL CONTENT ---
  const renderDetailContent = () => {
      if (!selectedRecord) return null;
      const { payload, type } = selectedRecord;

      if (type === 'evaluasi') {
          const { instansiData, score, category, clusters, answers, remarks } = payload;
          const categoryLabel = category?.label || 'Belum Dinilai';
          
          return (
              <div className="space-y-6">
                  {/* Header Info */}
                  <div className="grid md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                          <p className="text-xs text-slate-500 uppercase font-bold">Instansi</p>
                          <p className="font-semibold text-slate-800">{instansiData.nama}</p>
                          <p className="text-xs text-slate-600 mt-1">{instansiData.alamat}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-xs text-slate-500 uppercase font-bold">Pejabat</p>
                          <p className="font-semibold text-slate-800">{instansiData.pejabat}</p>
                          <p className="text-xs text-slate-600 mt-1">Jml Pegawai: L {instansiData.jmlLaki} / P {instansiData.jmlPerempuan}</p>
                      </div>
                  </div>

                  {/* Score Card */}
                  <div className="flex items-center justify-between bg-green-50 p-6 rounded-xl border border-green-100">
                      <div>
                          <p className="text-sm text-green-800 font-bold mb-1">SKOR AKHIR</p>
                          <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-extrabold text-green-700">{score}</span>
                              <span className="text-sm text-green-600 font-medium">/ 100</span>
                          </div>
                      </div>
                      <div className="text-right">
                          <span className={`px-4 py-2 rounded-lg text-sm font-bold ${categoryLabel === 'Baik' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                              Kategori: {categoryLabel}
                          </span>
                      </div>
                  </div>

                  {/* Detail Jawaban */}
                  <div className="space-y-6">
                      <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Rincian Jawaban</h4>
                      {clusters && clusters.length > 0 ? clusters.map((cluster: any, idx: number) => (
                          <div key={idx} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                              <div className="bg-slate-100 px-4 py-2 font-semibold text-xs text-slate-700 uppercase">
                                  {cluster.title}
                              </div>
                              <div className="divide-y divide-slate-100">
                                  {cluster.questions.map((q: any) => (
                                      <div key={q.id} className="p-3 flex items-start gap-4 text-sm">
                                          <div className="flex-1 text-slate-700">{q.text}</div>
                                          <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                              {answers && answers[q.id] === 1 ? (
                                                  <span className="flex items-center text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">
                                                      <Check className="w-3 h-3 mr-1" /> Ya
                                                  </span>
                                              ) : (
                                                  <span className="flex items-center text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded">
                                                      <X className="w-3 h-3 mr-1" /> Tidak
                                                  </span>
                                              )}
                                              {remarks && remarks[q.id] && <span className="text-[10px] text-slate-400 italic">{remarks[q.id]}</span>}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )) : (
                        <div className="text-center p-4 text-slate-500 italic">Data rincian tidak tersedia untuk laporan ini.</div>
                      )}
                  </div>
              </div>
          );
      } else {
          // LAPORAN TYPE
          const { template, laporanInputs, year } = payload;
          return (
              <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-bold">Instansi Pelapor</p>
                      <p className="font-semibold text-slate-800 text-lg">{template?.instansiName}</p>
                      <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                          <Calendar className="w-3 h-3" /> Tahun Laporan: {year}
                      </p>
                  </div>

                  <div className="space-y-6">
                      <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Indikator Kinerja & Capaian</h4>
                      {template?.sections.map((section: any, idx: number) => (
                          <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                              <div className="bg-slate-50 p-4 border-b border-slate-200">
                                  <p className="font-bold text-slate-800 text-sm">{section.title}</p>
                                  <p className="text-xs text-slate-500 mt-1 italic">{section.indicator}</p>
                              </div>
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                                  {section.hasTarget && (
                                      <div className="space-y-2">
                                          <p className="text-xs font-bold text-green-600 uppercase border-b border-green-100 pb-1">Target & Realisasi Fisik</p>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                              <span className="text-slate-500">Target Tahunan:</span>
                                              <span className="font-mono font-medium">{laporanInputs?.[`${section.id}-target-year`] || '-'}</span>
                                              <span className="text-slate-500">Sem 1:</span>
                                              <span className="font-mono font-medium">{laporanInputs?.[`${section.id}-target-sem1`] || '-'}</span>
                                              <span className="text-slate-500">Sem 2:</span>
                                              <span className="font-mono font-medium">{laporanInputs?.[`${section.id}-target-sem2`] || '-'}</span>
                                          </div>
                                      </div>
                                  )}
                                  {section.hasBudget && (
                                      <div className="space-y-2">
                                          <p className="text-xs font-bold text-blue-600 uppercase border-b border-blue-100 pb-1">Anggaran</p>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                              <span className="text-slate-500">Pagu:</span>
                                              <span className="font-mono font-medium">{laporanInputs?.[`${section.id}-budget-year`] || '-'}</span>
                                              <span className="text-slate-500">Realisasi S1:</span>
                                              <span className="font-mono font-medium">{laporanInputs?.[`${section.id}-budget-sem1`] || '-'}</span>
                                              <span className="text-slate-500">Realisasi S2:</span>
                                              <span className="font-mono font-medium">{laporanInputs?.[`${section.id}-budget-sem2`] || '-'}</span>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          );
      }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-slate-50 z-10 py-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Verifikasi Laporan</h1>
          <p className="text-slate-500 text-sm">Validasi data laporan masuk dari instansi dan wilayah</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Status Filter Tabs */}
          <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
             {['all', 'pending', 'verified', 'rejected'].map(status => (
                <button
                   key={status}
                   onClick={() => setFilterStatus(status)}
                   className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                      filterStatus === status ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                   }`}
                >
                   {status === 'all' ? 'Semua' : status}
                </button>
             ))}
          </div>

          <div className="relative">
             <select 
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl text-sm py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm cursor-pointer font-medium text-slate-700"
             >
                <option value="all">Semua Tahun</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
             <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
          </div>

          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-48 shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* SECTION 1: EVALUASI LIST */}
      <section>
         <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 text-green-700 rounded-lg">
               <Check className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Data Evaluasi Mandiri</h2>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{evaluasiList.length}</span>
         </div>
         
         <Card className="p-0 overflow-hidden border-0 shadow-lg shadow-green-100/50 ring-1 ring-slate-100 rounded-2xl">
            {evaluasiList.length > 0 ? (
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                     <thead className="text-xs font-semibold text-slate-500 bg-slate-50/50 border-b border-slate-100">
                        <tr>
                           <th className="px-6 py-4">Instansi</th>
                           <th className="px-6 py-4">Skor & Kategori</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {evaluasiList.map((row) => (
                           <tr key={row.id} className="group hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">E</div>
                                    <div>
                                       <div className="font-semibold text-slate-800">{row.instansiName}</div>
                                       <div className="text-xs text-slate-400 font-mono mt-0.5">{new Date(row.submitDate).toLocaleDateString('id-ID')}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg text-slate-700">{row.payload.score}</span>
                                    <Badge variant={row.payload.category?.label === 'Baik' ? 'success' : 'warning'} size="sm">
                                       {row.payload.category?.label || '-'}
                                    </Badge>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <Badge variant={row.status === 'verified' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>
                                    {row.status === 'verified' ? 'Terverifikasi' : row.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                                 </Badge>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center justify-center gap-2">
                                    <button 
                                       onClick={() => openDetail(row)}
                                       className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-green-600 transition-colors text-xs font-semibold shadow-sm"
                                    >
                                       <Eye className="w-3.5 h-3.5" /> Detail
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            ) : (
               <div className="p-8 text-center text-slate-400 text-sm bg-slate-50/30 border-t border-slate-100">
                  Tidak ada data evaluasi.
               </div>
            )}
         </Card>
      </section>

      {/* SECTION 2: LAPORAN LIST */}
      <section>
         <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
               <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Data Laporan Semesteran</h2>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{laporanList.length}</span>
         </div>

         <Card className="p-0 overflow-hidden border-0 shadow-lg shadow-blue-100/50 ring-1 ring-slate-100 rounded-2xl">
            {laporanList.length > 0 ? (
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                     <thead className="text-xs font-semibold text-slate-500 bg-slate-50/50 border-b border-slate-100">
                        <tr>
                           <th className="px-6 py-4">Instansi</th>
                           <th className="px-6 py-4">Tingkat & Tahun</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {laporanList.map((row) => (
                           <tr key={row.id} className="group hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">L</div>
                                    <div>
                                       <div className="font-semibold text-slate-800">{row.instansiName}</div>
                                       <div className="text-xs text-slate-400 font-mono mt-0.5">{new Date(row.submitDate).toLocaleDateString('id-ID')}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="text-slate-700 font-medium">{row.payload.level === 'Provinsi' ? 'Tingkat Provinsi' : 'Kab/Kota'}</div>
                                 <div className="text-xs text-slate-500 mt-0.5">Tahun {row.year}</div>
                              </td>
                              <td className="px-6 py-4">
                                 <Badge variant={row.status === 'verified' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>
                                    {row.status === 'verified' ? 'Terverifikasi' : row.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                                 </Badge>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center justify-center gap-2">
                                    <button 
                                       onClick={() => openDetail(row)}
                                       className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors text-xs font-semibold shadow-sm"
                                    >
                                       <Eye className="w-3.5 h-3.5" /> Detail
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            ) : (
               <div className="p-8 text-center text-slate-400 text-sm bg-slate-50/30 border-t border-slate-100">
                  Tidak ada data laporan.
               </div>
            )}
         </Card>
      </section>

      {/* DETAIL MODAL */}
      <Modal 
         isOpen={isModalOpen} 
         onClose={() => setIsModalOpen(false)}
         title={`Detail ${selectedRecord?.type === 'evaluasi' ? 'Evaluasi Mandiri' : 'Laporan Kegiatan'}`}
         size="xl"
         footer={
            <div className="flex justify-between w-full">
                <Button 
                   variant="outline" 
                   onClick={() => selectedRecord && handleDownloadPDF(selectedRecord)}
                   leftIcon={<FileText className="w-4 h-4 text-red-500"/>}
                   className="border-slate-300 text-slate-600"
                >
                   Unduh PDF
                </Button>
                
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!selectedRecord) return;

                      const result = await showConfirmation(
                        'Hapus Surat?',
                        'Tindakan ini akan menghapus data laporan secara permanen.',
                        'Ya, hapus',
                        'Batal'
                      );

                      if (result.isConfirmed) {
                        handleDelete(selectedRecord.id);
                      }
                    }}
                    leftIcon={<Trash2 className="w-4 h-4 text-red-500" />}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Hapus Surat
                  </Button>

                  {selectedRecord?.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (selectedRecord) handleVerify(selectedRecord.id, 'rejected');
                          setIsModalOpen(false);
                        }}
                      >
                        Tolak
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (selectedRecord) handleVerify(selectedRecord.id, 'verified');
                          setIsModalOpen(false);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Setujui & Verifikasi
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-slate-500 text-sm font-medium">
                      {selectedRecord?.status === 'verified' ? (
                        <><Check className="w-4 h-4 text-green-600" /> Sudah Diverifikasi</>
                      ) : (
                        <><X className="w-4 h-4 text-red-600" /> Sudah Ditolak</>
                      )}
                    </div>
                  )}
                </div>
            </div>
         }
      >
         {renderDetailContent()}
      </Modal>
    </div>
  );
};

export default Verification;