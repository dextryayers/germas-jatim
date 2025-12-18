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
}

// ==========================================
// COMPONENT: EVALUASI FORM (DYNAMIC)
// ==========================================
const EvaluasiForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<FormStep>('SELECTION');
  const [instansiData, setInstansiData] = useState<InstansiData>({
    tingkat: '', nama: '', alamat: '', pejabat: '', jmlLaki: '', jmlPerempuan: '', tanggal: ''
  });
  
  // Dynamic Clusters Data
  const [clusters, setClusters] = useState<Cluster[]>([]);
  
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [remarks, setRemarks] = useState<Record<number, string>>({}); // Keterangan

  const handleLevelSelect = (level: string) => {
    // 1. Set Level
    setInstansiData(prev => ({ ...prev, tingkat: level.toUpperCase() }));
    
    // 2. Fetch Config from Store
    const loadedClusters = FormStore.getEvaluasiTemplate(level);
    setClusters(loadedClusters);

    // 3. Move to Form
    setStep('FORM');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInstansiData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instansiData.nama) { toast.error("Mohon isi Nama Instansi"); return; }

    // Save to SubmissionStore (Simulated Backend)
    SubmissionStore.add({
      type: 'evaluasi',
      instansiName: instansiData.nama,
      submitDate: new Date().toISOString(),
      year: new Date().getFullYear(),
      payload: {
        instansiData,
        clusters,
        answers,
        remarks,
        score: calculateScore(),
        category: getCategory(calculateScore())
      }
    });

    toast.success("Laporan Evaluasi berhasil dikirim!");

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));

    setStep('RESULT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- PDF GENERATION USING UTILITY ---
  const handleDownloadPDF = () => {
    const score = calculateScore();
    const category = getCategory(score);
    
    generateEvaluasiPDF(
      instansiData,
      score,
      category,
      clusters,
      answers,
      remarks
    );
    
    toast.success("File PDF berhasil diunduh!");
  };

  // --- RENDER STEP 1: SELECTION ---
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

  // --- RENDER STEP 3: RESULT ---
  if (step === 'RESULT') {
    const score = calculateScore();
    const category = getCategory(score);
    
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex items-center justify-center py-10 px-4 bg-[#f6fbf9]">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden relative border border-emerald-50">
           
           {/* Header Title */}
           <div className="pt-12 pb-6 px-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-emerald-700 uppercase leading-snug tracking-tight">
                 FORM EVALUASI GERMAS DI <br/> TATANAN TEMPAT KERJA
              </h1>
              <h2 className="text-xl font-bold text-slate-800 mt-4">Provinsi Jawa Timur</h2>
           </div>

           {/* Green Container Box */}
           <div className="mx-6 md:mx-12 mb-12 bg-emerald-50/60 rounded-3xl p-8 md:p-12 relative border border-emerald-100">
              <h3 className="text-center text-2xl font-bold text-emerald-700 mb-10">Hasil Evaluasi</h3>

              {/* Detail Data Grid */}
              <div className="grid grid-cols-1 gap-y-4 max-w-2xl mx-auto text-slate-800 text-lg">
                 <div className="grid grid-cols-[220px,20px,1fr]">
                    <span className="font-bold">Nama Instansi</span>
                    <span>:</span>
                    <span>{instansiData.nama}</span>
                 </div>
                 <div className="grid grid-cols-[220px,20px,1fr]">
                    <span className="font-bold">Alamat Instansi</span>
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

                 <div className="h-2"></div>

                 <div className="grid grid-cols-[220px,20px,1fr] items-start">
                    <span className="font-bold">Kategori:</span>
                    <span></span>
                    <ul className="list-none space-y-1 text-base">
                       <li>• <span className="font-medium">Kurang</span> : &lt;50% dari nilai total</li>
                       <li>• <span className="font-medium">Cukup</span> : 50-75% dari nilai total</li>
                       <li>• <span className="font-medium">Baik</span> : &gt;75% dari nilai total</li>
                    </ul>
                 </div>
              </div>

              {/* Emerald Line Separator */}
              <div className="mt-12 w-full h-px bg-emerald-200"></div>
           </div>

           {/* Footer Buttons */}
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

  // --- RENDER STEP 2: FORM INPUT (FORMULIR PAGE) ---
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-emerald-200">
         
         {/* Header Title */}
         <div className="bg-emerald-50 pt-10 pb-2 px-6 text-center">
           <h1 className="text-2xl md:text-3xl font-bold text-emerald-700 uppercase leading-relaxed tracking-wide">
              FORM EVALUASI GERMAS DI <br/> TATANAN TEMPAT KERJA
            </h1>
            <h2 className="text-lg md:text-xl font-bold text-emerald-700 mt-3 uppercase tracking-widest">
               {instansiData.tingkat}
            </h2>
         </div>

         <form onSubmit={handleSubmit} className="p-6 md:p-10">
            {/* ... (Existing Form Code) ... */}
            
            {/* Box Identitas Instansi */}
            <div className="bg-emerald-50 p-8 rounded-2xl mb-10 border border-emerald-100">
               <div className="space-y-5">
                  {[
                     { label: 'Nama Instansi:', name: 'nama', type: 'text' },
                     { label: 'Alamat Instansi:', name: 'alamat', type: 'text' },
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
                  
                  <div className="grid md:grid-cols-[250px,1fr] items-center gap-2">
                     <label className="font-medium text-emerald-800 text-base">Hari, Tanggal:</label>
                     <div className="relative max-w-[200px]">
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
                                    
                                    {/* Yes Radio */}
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

                                    {/* No Radio */}
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

                                    {/* Keterangan Input */}
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
                  <li>Bagi instansi yang tidak membutuhkan APD bisa mengisi kolom keterangan dengan N/A atau (-)</li>
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
// COMPONENT: LAPORAN FORM (DYNAMIC)
// ==========================================
type LaporanStep = 'LEVEL_SELECT' | 'INSTANSI_SELECT' | 'FORM_INPUT' | 'SUCCESS';

const LaporanForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<LaporanStep>('LEVEL_SELECT');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedInstansiId, setSelectedInstansiId] = useState<string>('');
  const [template, setTemplate] = useState<LaporanTemplate | null>(null);
  
  // State to hold dynamic inputs
  const [laporanInputs, setLaporanInputs] = useState<Record<string, any>>({});

  const navigate = useNavigate();

  // ... (Existing Select Handlers) ...
  const handleLevelSelect = (level: string) => {
    setSelectedLevel(level);
    setStep('INSTANSI_SELECT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInstansiSubmit = () => {
    if (!selectedInstansiId) {
      toast.error("Silakan pilih instansi terlebih dahulu");
      return;
    }
    
    // Fetch Template from Store
    const loadedTemplate = FormStore.getLaporanTemplate(selectedInstansiId);
    setTemplate(loadedTemplate);

    setStep('FORM_INPUT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLaporanInput = (sectionId: string, field: string, value: string) => {
     setLaporanInputs(prev => ({
        ...prev,
        [`${sectionId}-${field}`]: value
     }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    // Save to SubmissionStore
    SubmissionStore.add({
      type: 'laporan',
      instansiName: template.instansiName,
      submitDate: new Date().toISOString(),
      year: 2026, // As hardcoded in the form
      payload: {
        template,
        level: selectedLevel,
        laporanInputs,
        year: 2026
      }
    });

    toast.success("Laporan Kegiatan berhasil dikirim!");

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));

    setStep('SUCCESS');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadPDF = () => {
    if (!template) return;
    
    generateLaporanPDF(
      template,
      selectedLevel,
      laporanInputs,
      '2026'
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
               
               <div className="flex flex-col gap-6 max-w-md mx-auto">
                  <button 
                     onClick={() => handleLevelSelect('Provinsi')}
                     className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-5 px-8 rounded-xl shadow-lg hover:shadow-emerald-200 hover:-translate-y-1 transition-all duration-300 border-2 border-emerald-600"
                  >
                     Tingkat Provinsi Jawa Timur
                  </button>
                  
                  <div className="flex items-center gap-4 text-slate-400">
                     <div className="h-px bg-slate-300 flex-1"></div>
                     <span className="text-sm uppercase tracking-widest font-semibold">Atau</span>
                     <div className="h-px bg-slate-300 flex-1"></div>
                  </div>

                  <button 
                     onClick={() => handleLevelSelect('Kab/Kota')}
                     className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-5 px-8 rounded-xl shadow-lg hover:shadow-emerald-200 hover:-translate-y-1 transition-all duration-300 border-2 border-emerald-600"
                  >
                     Tingkat Kabupaten / Kota
                  </button>
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
               <h2 className="text-lg font-bold text-slate-700 uppercase tracking-widest mb-12">
                  Instansi {selectedLevel === 'Provinsi' ? 'Tingkat Provinsi' : 'Tingkat Kab/Kota'}
               </h2>

               <div className="mb-8">
                  <label className="block text-lg font-medium text-slate-600 mb-4">Pilih instansi:</label>
                  <div className="relative">
                     <select 
                        value={selectedInstansiId}
                        onChange={(e) => setSelectedInstansiId(e.target.value)}
                        className="w-full appearance-none bg-white border-2 border-emerald-500 text-slate-700 py-4 px-6 pr-12 rounded-xl text-lg font-medium focus:outline-none focus:ring-4 focus:ring-emerald-100 cursor-pointer shadow-sm hover:border-emerald-600 transition-colors"
                     >
                        <option value="" disabled>Jenis Instansi</option>
                        {INSTANSI_LIST.map(inst => (
                           <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                     </select>
                     <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-600 pointer-events-none" />
                  </div>
                  <p className="text-sm text-slate-400 mt-3 italic">Opsi pada dropdown</p>
               </div>

               <div className="flex flex-col gap-4 mt-8 max-w-xs mx-auto">
                  <Button 
                     onClick={handleInstansiSubmit}
                     disabled={!selectedInstansiId}
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
                        {selectedLevel === 'Provinsi' ? 'Instansi Tingkat Provinsi' : 'Instansi Tingkat Kab/Kota'}
                     </h2>
                     <p className="text-lg font-bold text-slate-800">Tahun 2026</p>
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
                       <p className="text-slate-500">Belum ada konfigurasi kegiatan untuk instansi ini.</p>
                    </div>
                  )}
               </div>

               {/* Footer Action */}
               <div className="p-8 bg-white border-t border-emerald-100 flex justify-between items-center sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(15,118,110,0.08)]">
                   <Button 
                     type="button" 
                     variant="outline" 
                     onClick={() => setStep('INSTANSI_SELECT')}
                     className="px-8 py-3 h-auto text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-lg font-medium"
                   >
                     Kembali
                   </Button>
                   <Button 
                     type="submit" 
                     className="px-10 py-3 h-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-emerald-200"
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
                   Instansi {selectedLevel === 'Provinsi' ? 'Tingkat Provinsi' : 'Tingkat Kab/Kota'}
                </h2>
                <h2 className="text-lg font-bold text-slate-700 uppercase tracking-widest mb-10">
                   Tahun 2026
                </h2>

                <div className="bg-emerald-50/70 rounded-3xl p-10 mb-10 max-w-2xl mx-auto border border-emerald-100">
                   <h2 className="text-2xl font-bold text-emerald-700 mb-6 uppercase">{template.instansiName}</h2>
                   
                   <h3 className="text-xl font-bold text-emerald-600 mb-4 uppercase tracking-widest">Laporan Terkirim!</h3>
                   
                   <p className="text-slate-600 text-lg leading-relaxed mb-6">
                      Terima Kasih telah mengirim <strong>Laporan Pemantauan Semesteran dan Tahunan Kegiatan Germas {template.instansiName}</strong> pada <strong>Tahun 2026</strong>.
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