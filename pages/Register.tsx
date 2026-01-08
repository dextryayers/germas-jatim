import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { UserPlus, Mail, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { showError } from '../utils/alerts';
import { apiClient } from '../utils/apiClient';
import LogoGermas from '../components/svg/logo-germas.svg';

const TINGKAT_INSTANSI = ['Provinsi', 'Kabupaten/Kota', 'Kecamatan', 'Desa/Kelurahan'];
const PILIH_TINGKAT_INSTANSI = TINGKAT_INSTANSI.map((region) => `Tingkat ${region}`);

const ADMIN_CODE_REGEX = /^\d{6}$/; // digunakan di halaman verifikasi terpisah

type RegencyOption = {
  id: number;
  code: string;
  name: string;
  type?: string;
};

type DistrictOption = {
  id: number;
  code: string;
  name: string;
};

type VillageOption = {
  id: number;
  code: string;
  name: string;
};

const normalizeCollection = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
    return (value as any).data as T[];
  }

  return [];
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [instansiLevel, setInstansiLevel] = useState('');
  const [regencies, setRegencies] = useState<RegencyOption[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [originRegencyId, setOriginRegencyId] = useState('');
  const [originDistrictId, setOriginDistrictId] = useState('');
  const [originVillageId, setOriginVillageId] = useState('');
  const [regionLoading, setRegionLoading] = useState(false);
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const normalizedInstansiLevel = instansiLevel.replace(/^Tingkat\s+/i, '').trim();
  const needsOriginRegency = ['Kabupaten/Kota', 'Perusahaan', 'Kecamatan', 'Desa/Kelurahan'].includes(normalizedInstansiLevel);
  const needsOriginDistrict = ['Kecamatan', 'Desa/Kelurahan'].includes(normalizedInstansiLevel);
  const needsOriginVillage = ['Desa/Kelurahan'].includes(normalizedInstansiLevel);

  useEffect(() => {
    apiClient.prefetchCsrf().catch(() => {
      /* swallow error; handled during actual request */
    });
  }, []);

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
        setRegencies(items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          type: item.type,
        })));
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
        setDistricts(items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
        })));
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
        setVillages(items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
        })));
      })
      .catch(() => {
        setVillages([]);
      })
      .finally(() => setRegionLoading(false));
  }, [needsOriginVillage, originDistrictId]);

  const handleInputChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = event.target;

    if (field === 'username') {
      // Hanya izinkan huruf kecil, angka, dan beberapa simbol tanpa spasi
      // 1) paksa lowercase
      value = value.toLowerCase();
      // 2) hilangkan spasi
      value = value.replace(/\s+/g, '');
      // 3) saring karakter yang diizinkan: a-z, 0-9, titik, underscore, dan dash
      value = value.replace(/[^a-z0-9._-]/g, '');
    }

    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    if (!form.username.trim() || !form.name.trim() || !form.email.trim()) {
      showError('Validasi Gagal', 'Username, nama, dan email wajib diisi.');
      return;
    }

    if (form.password.length < 8) {
      showError('Validasi Gagal', 'Password minimal 8 karakter.');
      return;
    }

    const password = form.password;
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLowercase || !hasUppercase || !hasNumber) {
      showError('Validasi Gagal', 'Password harus mengandung huruf besar, huruf kecil, dan angka.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      showError('Validasi Gagal', 'Konfirmasi password tidak sesuai.');
      return;
    }

    // Tentukan level_code untuk backend berdasarkan pilihan tingkat instansi
    const levelCodeMap: Record<string, string> = {
      Provinsi: 'provinsi',
      'Kabupaten/Kota': 'kab_kota',
      Kecamatan: 'kecamatan',
      'Desa/Kelurahan': 'kelurahan',
    };

    if (!normalizedInstansiLevel || !levelCodeMap[normalizedInstansiLevel]) {
      await showError('Validasi Gagal', 'Silakan pilih tingkat instansi yang valid (Provinsi/Kabupaten/Kota/Kecamatan/Desa/Kelurahan).');
      return;
    }

    const levelCode = levelCodeMap[normalizedInstansiLevel];

    // Redirect ke halaman verifikasi kode admin dengan membawa data registrasi di state
    navigate('/verify-admin-code', {
      state: {
        registration: {
          username: form.username.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          password_confirmation: form.confirmPassword,
          level_code: levelCode,
          origin_regency_id: needsOriginRegency && originRegencyId ? originRegencyId : null,
          origin_district_id: needsOriginDistrict && originDistrictId ? originDistrictId : null,
          origin_village_id: needsOriginVillage && originVillageId ? originVillageId : null,
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#f6fbf9] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-[0_32px_90px_-60px_rgba(16,185,129,0.6)] border border-emerald-50 overflow-hidden">
        <div className="relative px-8 sm:px-12 pt-12 pb-8 text-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="relative z-10 flex flex-col items-center gap-5">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white shadow-xl border border-green-100 rounded-3xl flex items-center justify-center">
              <img src={LogoGermas} alt="Logo Germas" className="w-20 h-20 object-contain" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Registrasi Admin GERMAS</h1>
              <p className="text-slate-500 max-w-xl mx-auto">
                Lengkapi informasi berikut untuk mengaktifkan akun administrasi SI-PORSI GERMAS Jawa Timur.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-sm font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Registrasi hanya untuk instansi resmi yang memiliki kode
            </div>
          </div>
        </div>

        <div className="px-8 sm:px-12 pb-12">
          <form onSubmit={handleRegister} className="bg-white border border-emerald-50 rounded-2xl shadow-inner px-6 sm:px-8 py-8 space-y-8">
            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-5 py-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30">
                  01
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Data Penanggung Jawab</h3>
                  <p className="text-xs text-slate-500">Gunakan data valid.</p>
                </div>
              </div>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserPlus className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
            </div>
            <input
              type="text"
              value={form.username}
              onChange={handleInputChange('username')}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              placeholder="Username"
              required
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Hanya huruf kecil, angka, titik (.), underscore (_), dan minus (-), tanpa spasi.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Lengkap</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserPlus className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
            </div>
            <input
              type="text"
              value={form.name}
              onChange={handleInputChange('name')}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              placeholder="Nama lengkap"
              required
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
            </div>
            <input
              type="email"
              value={form.email}
              onChange={handleInputChange('email')}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              placeholder="nama@email.com"
              required
            />
          </div>
        </div>
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-100 bg-white px-5 py-6 shadow-inner">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30">
                  02
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Detail Instansi</h3>
                  <p className="text-xs text-slate-500">Pilih tingkat instansi sesuai struktur wilayah Anda.</p>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tingkat Instansi</label>
                    <select
                      value={instansiLevel}
                      onChange={(event) => {
                        setInstansiLevel(event.target.value);
                        setOriginRegencyId('');
                        setOriginDistrictId('');
                        setOriginVillageId('');
                        setDistricts([]);
                        setVillages([]);
                      }}
                      className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    >
                      <option value="" disabled>
                        Pilih Tingkatan Instansi
                      </option>
                      {PILIH_TINGKAT_INSTANSI.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {needsOriginRegency && (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Asal Kab/Kota</label>
                      <select
                        value={originRegencyId}
                        onChange={(event) => setOriginRegencyId(event.target.value)}
                        className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        required
                        disabled={regionLoading}
                      >
                        <option value="" disabled>
                          {regionLoading ? 'Memuat kab/kota...' : 'Pilih Kab/Kota'}
                        </option>
                        {regencies.map((item) => {
                          const rawName = item.name || '';
                          const lowerName = rawName.toLowerCase();

                          // 1) Deteksi tipe dari awalan nama (lebih dipercaya)
                          let typeLabel: string | null = null;
                          if (lowerName.startsWith('kota ')) typeLabel = 'Kota';
                          else if (lowerName.startsWith('kabupaten ')) typeLabel = 'Kabupaten';

                          // 2) Jika nama tidak mengandung awalan yang jelas, gunakan field type dari API
                          if (!typeLabel) {
                            const rawType = item.type ? String(item.type).toLowerCase() : '';
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

                    {needsOriginDistrict && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Asal Kecamatan</label>
                        <select
                          value={originDistrictId}
                          onChange={(event) => setOriginDistrictId(event.target.value)}
                          className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          required
                          disabled={!originRegencyId || regionLoading}
                        >
                          <option value="" disabled>
                            {!originRegencyId ? 'Pilih kab/kota terlebih dahulu' : regionLoading ? 'Memuat kecamatan...' : 'Pilih Kecamatan'}
                          </option>
                          {districts.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {needsOriginVillage && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Asal Desa/Kelurahan</label>
                    <select
                      value={originVillageId}
                      onChange={(event) => setOriginVillageId(event.target.value)}
                      className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                      disabled={!originDistrictId || regionLoading}
                    >
                      <option value="" disabled>
                        {!originDistrictId ? 'Pilih kecamatan terlebih dahulu' : regionLoading ? 'Memuat desa/kelurahan...' : 'Pilih Desa/Kelurahan'}
                      </option>
                      {villages.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tidak ada lagi nama instansi dan status kode admin di halaman ini */}
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/45 px-5 py-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30">
                  03
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Kredensial Akses</h3>
                  <p className="text-xs text-slate-500">Buat password untuk akun admin.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleInputChange('password')}
                      className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                      placeholder="Minimal 8 karakter dengan huruf besar, huruf kecil, dan angka"
                      required
                      minLength={8}
                      pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}"
                      title="Password minimal 8 karakter dan harus mengandung huruf besar, huruf kecil, dan angka"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Konfirmasi Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ShieldCheck className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={handleInputChange('confirmPassword')}
                      className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                      placeholder="Ulangi password"
                      required
                      minLength={8}
                      pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}"
                      title="Password minimal 8 karakter dan harus mengandung huruf besar, huruf kecil, dan angka"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="pt-2">
              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white py-3 rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:translate-y-[-2px]"
              >
                Buat Akun
              </Button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 hover:underline transition-all">
              Masuk di sini
            </Link>
          </div>
          <div className="mt-6 pt-6 text-center border-t border-slate-100">
            <Link to="/" className="text-sm text-slate-500 hover:text-emerald-600 font-medium transition-colors">
              &larr; Kembali ke Halaman Utama
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
