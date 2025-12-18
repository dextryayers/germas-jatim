import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { User, MapPin, Mail, Phone, Building2, Shield, Calendar, Edit, Camera, KeyRound } from 'lucide-react';

const Profile: React.FC = () => {
  // Mock Data User yang sedang login (Simulasi data dari backend)
  const userData = {
    name: 'Dr. Budi Santoso, M.Kes',
    nip: '19800101 200501 1 005',
    email: 'budi.santoso@surabaya.go.id',
    phone: '0812-3456-7890',
    role: 'Admin Kab/Kota',
    lastLogin: '20 Maret 2024, 08:30 WIB',
    avatar: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=0ea5e9&color=fff&bold=true',
    instansi: {
      nama: 'Dinas Kesehatan Kota Surabaya',
      kode: '3578',
      alamat: 'Jl. Jemursari No.197, Sidosermo, Kec. Wonocolo, Kota Surabaya, Jawa Timur 60243',
      telp: '(031) 8439473',
      email_instansi: 'dinkes@surabaya.go.id',
      status: 'Terverifikasi'
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Profil Pengguna</h1>
          <p className="text-slate-500 text-sm">Kelola informasi akun pribadi dan data instansi anda</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" leftIcon={<KeyRound className="w-4 h-4" />}>Ubah Password</Button>
           <Button leftIcon={<Edit className="w-4 h-4" />}>Edit Profil</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Identity Card */}
        <div className="space-y-6">
          <Card className="text-center p-8 border-t-4 border-t-green-600 relative overflow-visible shadow-lg">
            {/* Background Pattern */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-green-50 to-transparent -z-0"></div>
            
            <div className="relative inline-block mx-auto z-10">
              <img 
                src={userData.avatar} 
                alt="Profile" 
                className="w-32 h-32 rounded-full border-4 border-white shadow-xl mx-auto mb-4 object-cover"
              />
              <button className="absolute bottom-4 right-0 p-2 bg-green-600 text-white rounded-full hover:bg-green-700 shadow-md transition-colors group" title="Ubah Foto">
                <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
            
            <div className="relative z-10">
               <h2 className="text-xl font-bold text-slate-800">{userData.name}</h2>
               <p className="text-slate-500 text-sm font-medium mt-1">NIP. {userData.nip}</p>
               
               <div className="mt-4 flex justify-center gap-2 flex-wrap">
                 <Badge variant="info">{userData.role}</Badge>
                 <Badge variant="success">Akun Aktif</Badge>
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 text-left space-y-4 relative z-10">
              <div className="flex items-center gap-3 text-slate-600 group hover:text-green-700 transition-colors">
                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-green-100 transition-colors">
                   <Mail className="w-4 h-4 text-slate-500 group-hover:text-green-600" />
                </div>
                <span className="text-sm font-medium">{userData.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 group hover:text-green-700 transition-colors">
                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-green-100 transition-colors">
                   <Phone className="w-4 h-4 text-slate-500 group-hover:text-green-600" />
                </div>
                <span className="text-sm font-medium">{userData.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="p-2 bg-slate-100 rounded-lg">
                   <Calendar className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Terakhir Login</span>
                  <span className="text-xs font-semibold">{userData.lastLogin}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Account Security Summary */}
          <Card title="Keamanan Akun" className="shadow-md">
            <div className="space-y-4">
               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                     <Shield className="w-5 h-5 text-green-600" />
                     <div>
                        <p className="text-sm font-bold text-slate-700">Status Keamanan</p>
                        <p className="text-xs text-slate-500">Baik</p>
                     </div>
                  </div>
                  <Badge variant="success" size="sm">Secure</Badge>
               </div>
               <p className="text-xs text-slate-400 text-center">
                  Password terakhir diubah 30 hari yang lalu.
               </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Instansi Info */}
          <Card 
            title="Informasi Instansi" 
            footer={
              <div className="flex justify-between items-center w-full">
                <p className="text-xs text-slate-400 italic">Data ini disinkronisasi dari database pusat.</p>
                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50">Ajukan Perubahan Data</Button>
              </div>
            }
            className="shadow-md"
          >
            <div className="space-y-6">
              <div className="flex items-start gap-5 p-6 bg-gradient-to-r from-green-50 to-white rounded-xl border border-green-100">
                 <div className="p-4 bg-white rounded-xl shadow-sm text-green-600 border border-green-50">
                    <Building2 className="w-8 h-8" />
                 </div>
                 <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                       <h3 className="font-bold text-slate-800 text-lg">{userData.instansi.nama}</h3>
                       <Badge size="sm" variant="success">{userData.instansi.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                       <Badge size="sm" variant="outline" className="bg-white">Kode Wilayah: {userData.instansi.kode}</Badge>
                    </div>
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Alamat Kantor</label>
                       <div className="flex gap-3 text-slate-700 text-sm group">
                          <MapPin className="w-5 h-5 text-slate-400 group-hover:text-green-500 transition-colors flex-shrink-0 mt-0.5" />
                          <span className="leading-relaxed font-medium">{userData.instansi.alamat}</span>
                       </div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Kontak Resmi</label>
                       <div className="space-y-3">
                          <div className="flex gap-3 text-slate-700 text-sm items-center group">
                             <Phone className="w-4 h-4 text-slate-400 group-hover:text-green-500 transition-colors" />
                             <span className="font-medium">{userData.instansi.telp}</span>
                          </div>
                          <div className="flex gap-3 text-slate-700 text-sm items-center group">
                             <Mail className="w-4 h-4 text-slate-400 group-hover:text-green-500 transition-colors" />
                             <span className="font-medium text-green-600 hover:underline cursor-pointer">{userData.instansi.email_instansi}</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </Card>

          {/* Recent Activity Log (Simple) */}
          <Card title="Aktivitas Terakhir Anda" className="shadow-md">
             <div className="space-y-0">
                {[
                   { action: 'Login ke sistem', time: 'Hari ini, 08:30', ip: '192.168.1.10' },
                   { action: 'Mengirim Laporan Semester 1', time: 'Kemarin, 14:20', ip: '192.168.1.10' },
                   { action: 'Mengupdate Profil Instansi', time: '18 Mar 2024, 10:15', ip: '192.168.1.10' },
                ].map((log, idx) => (
                   <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-green-500"></div>
                         <span className="text-sm font-medium text-slate-700">{log.action}</span>
                      </div>
                      <div className="text-right">
                         <p className="text-xs text-slate-500">{log.time}</p>
                         <p className="text-[10px] text-slate-400">IP: {log.ip}</p>
                      </div>
                   </div>
                ))}
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;