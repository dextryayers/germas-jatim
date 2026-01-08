import React, { useEffect, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Save, Shield, Database, Calendar, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { apiClient } from '../../utils/apiClient';

const Settings: React.FC = () => {
  const [reportingYear, setReportingYear] = useState<number>(new Date().getFullYear());
  const [deadlineDate, setDeadlineDate] = useState<string>('');
  const [lastBackupLabel, setLastBackupLabel] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        // Ambil konfigurasi global periode & batas pelaporan dari backend
        const globalSettings = await apiClient.get<{
          reporting_year: number;
          reporting_deadline: string | null;
          last_backup_at?: string | null;
        }>('/admin/settings/reporting');

        if (typeof globalSettings.reporting_year === 'number') {
          setReportingYear(globalSettings.reporting_year);
        }
        if (globalSettings.reporting_deadline) {
          setDeadlineDate(globalSettings.reporting_deadline);
        }

        // Jika backend sudah punya informasi backup terakhir, tampilkan secara global
        if (globalSettings.last_backup_at) {
          const dt = new Date(globalSettings.last_backup_at);
          const formatted = dt.toLocaleString('id-ID', {
            dateStyle: 'long',
            timeStyle: 'short',
          } as any);
          setLastBackupLabel(`${formatted}`);
        }

        // Sinkronkan ke localStorage sebagai cache
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('reporting_year', String(globalSettings.reporting_year));
          if (globalSettings.reporting_deadline) {
            window.localStorage.setItem('reporting_deadline', globalSettings.reporting_deadline);
          } else {
            window.localStorage.removeItem('reporting_deadline');
          }
        }
      } catch (error) {
        // Jika gagal, fallback ke localStorage bila ada
        if (typeof window !== 'undefined') {
          const storedYear = window.localStorage.getItem('reporting_year');
          if (storedYear) {
            const parsed = parseInt(storedYear, 10);
            if (!Number.isNaN(parsed)) {
              setReportingYear(parsed);
            }
          }

          const storedDeadline = window.localStorage.getItem('reporting_deadline');
          if (storedDeadline) {
            setDeadlineDate(storedDeadline);
          }
        }
      }

      // Cek status maintenance dari backend jika endpoint tersedia
      try {
        // Gunakan endpoint status publik yang sama dengan MaintenanceGate
        const response = await apiClient.get<{ enabled: boolean; mode?: string }>('/maintenance/status');
        if (typeof response.enabled === 'boolean') {
          setIsMaintenance(response.enabled);
        }
      } catch {
        // abaikan jika gagal
      }
    })();
  }, []);

  const handleSave = () => {
    toast.promise(
      (async () => {
        // Simpan ke backend sebagai sumber kebenaran utama
        await apiClient.post('/admin/settings/reporting', {
          reporting_year: reportingYear,
          reporting_deadline: deadlineDate || null,
        });

        // Sinkronkan ke localStorage sebagai cache
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('reporting_year', String(reportingYear));
          if (deadlineDate) {
            window.localStorage.setItem('reporting_deadline', deadlineDate);
          } else {
            window.localStorage.removeItem('reporting_deadline');
          }
          // Fitur pelaporan terlambat selalu aktif
          window.localStorage.setItem('allow_late_reporting', 'true');
        }

        await Swal.fire({
          icon: 'success',
          title: 'Konfigurasi tersimpan',
          text: 'Pengaturan periode & batas pelaporan berhasil disimpan.',
          confirmButtonColor: '#16a34a',
        });
      })(),
      {
        loading: 'Menyimpan konfigurasi...',
        success: 'Pengaturan berhasil disimpan!',
        error: 'Gagal menyimpan.',
      }
    );
  };

  const handleBackupDatabase = async () => {
    if (isBackingUp) return;

    setIsBackingUp(true);

    try {
      type BackupResponse = {
        status: string;
        message: string;
        filename: string;
        absolute_path: string;
        relative_path: string;
        last_backup_at?: string | null;
      };

      const response = await apiClient.get<BackupResponse & { last_backup_at?: string | null }>('/admin/maintenance/backup');

      // Gunakan informasi waktu dari backend jika tersedia; jika tidak, pakai waktu lokal
      let label: string;
      if (response.last_backup_at) {
        const dt = new Date(response.last_backup_at);
        const formatted = dt.toLocaleString('id-ID', {
          dateStyle: 'long',
          timeStyle: 'short',
        } as any);
        label = `${formatted}`;
      } else {
        const now = new Date();
        const formatted = now.toLocaleString('id-ID', {
          dateStyle: 'long',
          timeStyle: 'short',
        } as any);
        label = `${formatted}`;
      }

      // Hanya simpan di state; sumber kebenaran tetap backend
      setLastBackupLabel(label);

      await Swal.fire({
        icon: 'success',
        title: 'Backup Berhasil',
        html: `
          <div style="text-align:left;font-size:13px;line-height:1.5;">
            <p class="mb-1">Database berhasil dibackup.</p>
            <p class="mb-1"><strong>Nama file:</strong><br><code>${response.filename}</code></p>
            <p class="mb-0"><strong>Lokasi file:</strong><br><code>${response.relative_path}</code></p>
          </div>
        `,
        confirmButtonColor: '#16a34a',
      });
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat backup database. Silakan coba lagi.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (isTogglingMaintenance) return;

    const willEnable = !isMaintenance;
    const confirmResult = await Swal.fire({
      icon: 'warning',
      title: willEnable ? 'Aktifkan Maintenance Mode?' : 'Nonaktifkan Maintenance Mode?',
      text: willEnable
        ? 'Maintenance ini adalah SOFT MODE: user biasa akan diarahkan ke halaman "Under Maintenance" di frontend, namun API dan server tetap berjalan. Gunakan untuk pemeliharaan ringan, bukan untuk mematikan server atau melakukan update besar yang berisiko.'
        : 'Soft maintenance mode akan dinonaktifkan dan sistem kembali dapat diakses oleh semua user.',
      showCancelButton: true,
      confirmButtonText: willEnable ? 'Ya, aktifkan' : 'Ya, nonaktifkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: willEnable ? '#dc2626' : '#16a34a',
    });

    if (!confirmResult.isConfirmed) return;

    setIsTogglingMaintenance(true);
    const loadingId = toast.loading(
      willEnable ? 'Mengaktifkan maintenance mode...' : 'Menonaktifkan maintenance mode...'
    );

    try {
      if (willEnable) {
        await apiClient.post('/admin/maintenance/enable');
      } else {
        await apiClient.post('/admin/maintenance/disable');
      }

      setIsMaintenance(willEnable);
      toast.success(
        willEnable ? 'Maintenance mode berhasil diaktifkan.' : 'Maintenance mode berhasil dinonaktifkan.'
      );
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengubah status maintenance mode.');
    } finally {
      toast.dismiss(loadingId);
      setIsTogglingMaintenance(false);
    }
  };

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
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Tahun Periode Pelaporan</label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={reportingYear}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!Number.isNaN(value)) {
                    setReportingYear(value);
                  } else if (e.target.value === '') {
                    setReportingYear(new Date().getFullYear());
                  }
                }}
                className="w-40 border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm py-2.5 px-3"
              />
              <p className="text-xs text-slate-500">Tahun ini akan digunakan sebagai periode pelaporan pada form evaluasi dan laporan.</p>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Batas Pelaporan Tahun Ini</label>
              <input
                type="date"
                className="w-full md:w-64 border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm py-2.5 px-3"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Tanggal ini akan digunakan sebagai batas akhir pelaporan untuk tahun tersebut. Data yang dikirim
                setelah tanggal ini akan otomatis diberi label <span className="font-semibold">"Terlambat"</span>
                di halaman Home dan Verifikasi.
              </p>
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
                        <p className="text-xs text-slate-500">
                          {lastBackupLabel ?? 'Belum ada informasi backup tersimpan.'}
                        </p>
                     </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white"
                    onClick={handleBackupDatabase}
                    disabled={isBackingUp}
                  >
                    {isBackingUp ? 'Memproses...' : 'Backup Sekarang'}
                  </Button>
               </div>
               
               <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                     <h4 className="font-bold text-slate-800 text-sm">Maintenance Mode</h4>
                     <p className="text-xs text-slate-600 mt-1 mb-3 leading-relaxed">
                        <span className="font-semibold">Soft maintenance mode</span>. Gunakan untuk pemeliharaan tampilan atau konfigurasi ringan, <span className="font-semibold">bukan</span> untuk mematikan server atau melakukan update besar yang berisiko.
                      </p>
                     <Button
                       variant="outline"
                       className="border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                       onClick={handleToggleMaintenance}
                       disabled={isTogglingMaintenance}
                     >
                       {isMaintenance ? 'Nonaktifkan Maintenance Mode' : 'Aktifkan Maintenance Mode'}
                     </Button>
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