import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Save, Bell, Shield, Database, ToggleLeft, ToggleRight, Calendar, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const handleSave = () => {
     toast.promise(
        new Promise((resolve) => setTimeout(resolve, 1000)),
        {
           loading: 'Menyimpan konfigurasi...',
           success: 'Pengaturan berhasil disimpan!',
           error: 'Gagal menyimpan.',
        }
     );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan Sistem</h1>
        <p className="text-slate-500 text-sm">Konfigurasi umum aplikasi Evaluasi GERMAS</p>
      </div>

      <div className="grid gap-8">
        {/* Periode Pelaporan */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Calendar className="w-5 h-5"/></div>
              <h3 className="font-bold text-slate-800">Periode & Jadwal Pelaporan</h3>
           </div>
           
           <div className="p-6 grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700">Batas Pelaporan Semester 1</label>
                 <input 
                    type="date" 
                    className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm py-2.5 px-3" 
                    defaultValue="2024-07-31" 
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700">Batas Pelaporan Semester 2</label>
                 <input 
                    type="date" 
                    className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm py-2.5 px-3" 
                    defaultValue="2025-01-31" 
                 />
              </div>
              
              <div className="md:col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                 <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" defaultChecked />
                    <div>
                       <span className="text-sm font-semibold text-slate-800 block">Izinkan pelaporan terlambat</span>
                       <span className="text-xs text-slate-500">Instansi masih dapat mengirim laporan setelah tenggat waktu dengan status "Terlambat".</span>
                    </div>
                 </label>
              </div>
           </div>
        </div>

        {/* Notifikasi */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-white border-b border-amber-100 flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Bell className="w-5 h-5"/></div>
              <h3 className="font-bold text-slate-800">Pengaturan Notifikasi</h3>
           </div>
           
           <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                 <div>
                    <p className="font-semibold text-slate-800">Email Reminder Otomatis</p>
                    <p className="text-xs text-slate-500 mt-1">Kirim email pengingat ke instansi H-7 sebelum deadline</p>
                 </div>
                 <button className="text-primary-600 transition-colors">
                    <ToggleRight className="w-10 h-10" />
                 </button>
              </div>
              <div className="h-px bg-slate-100 w-full"></div>
              <div className="flex items-center justify-between">
                 <div>
                    <p className="font-semibold text-slate-800">Notifikasi Whatsapp</p>
                    <p className="text-xs text-slate-500 mt-1">Integrasi gateway WA untuk notifikasi real-time</p>
                 </div>
                 <button className="text-slate-300 hover:text-primary-600 transition-colors">
                    <ToggleLeft className="w-10 h-10" />
                 </button>
              </div>
           </div>
        </div>

        {/* System Maintenance */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-white border-b border-red-100 flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Shield className="w-5 h-5"/></div>
              <h3 className="font-bold text-slate-800">Maintenance & Keamanan</h3>
           </div>
            
            <div className="p-6 space-y-6">
               <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                     <Database className="w-5 h-5 text-slate-500" />
                     <div>
                        <p className="text-sm font-bold text-slate-700">Backup Database Terakhir</p>
                        <p className="text-xs text-slate-500">20 Maret 2024, 02:00 WIB (Otomatis)</p>
                     </div>
                  </div>
                  <Button variant="outline" size="sm" className="bg-white">Download Backup</Button>
               </div>
               
               <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                     <h4 className="font-bold text-slate-800 text-sm">Maintenance Mode</h4>
                     <p className="text-xs text-slate-600 mt-1 mb-3 leading-relaxed">
                        Jika diaktifkan, hanya Admin yang dapat mengakses sistem. User lain akan melihat halaman "Under Maintenance". Gunakan fitur ini saat melakukan update besar.
                     </p>
                     <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 bg-white">Aktifkan Maintenance Mode</Button>
                  </div>
               </div>
            </div>
        </div>

        <div className="flex justify-end pt-4 sticky bottom-6 z-20">
           <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-200">
             <Button leftIcon={<Save className="w-4 h-4" />} onClick={handleSave} className="shadow-lg shadow-primary-500/30">Simpan Semua Konfigurasi</Button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;