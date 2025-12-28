import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { UserPlus, Mail, Lock, ShieldCheck, Phone, KeyRound, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';
import { closeAlert, showError, showLoading, showSuccess } from '../utils/alerts';
import { apiClient } from '../utils/apiClient';
import LogoGermas from '../components/svg/logo-germas.svg';

const NAMA_INSTANSI = [
  'Dinas Lingkungan Hidup',
  'Dinas Kehutanan',
  'Dinas Pendidikan',
  'Dinas Komunkasi dan Informasi',
  'Dinas Sosial',
  'Dinas Perhubungan',
  'Dinas Kesehatan',
  'Dinas Perikanan',
  'Dinas Kebudyaan dan Pariwisata',
  'Dinas Perkebunan',
  'Dinas Kepemudaan dan Olahraga',
  'Dinas Koperasi dan Usaha Mikro Kecil',
  'Dinas Peternakan',
  'Dinas Pekerjaan Umum Sumber Daya Air',
  'Dinas Energi dan Sumber Daya Mineral',
  'Biro Kesejahteraan Rakyat',
  'Biro Organisasi Sekda Provinsi',
  'Dinas Pertanian dan Ketahanan Pangan',
  'Dinas Perumahan Rakyat, Kawasan Pemukiman dan Cipta  Karya',
  'Dinas Perindustrian dan Pedagangan',
  'Dinas Tenaga Kerja dan Transmigasi',
  'Komisi Penyiaran Indonesia',
  'Dinas Pemberdayaan Perempuan, Perlindungan Anak, dan Kependudukan',
  'Balai Besar POM',
  'BPJS Kesehatan',
  'BKKBN',
  'Lembaga Layanan Pendidikan Tinggi Wilayah FII',
  'Dinas PMD',
  'PT. PLN',
  'TNI',
  'Polri',
  'BNN',
  'Kanwil Agama',
  'FKM Unair',
];

const TINGKAT_INSTANSI = ['Provinsi', 'Kabupaten/Kota', 'Kecamatan', 'Desa/Kelurahan', 'Perusahaan'];
const PILIH_TINGKAT_INSTANSI = TINGKAT_INSTANSI.map((region) => `Tingkat ${region}`);

type AdminCodeMeta =
  | { status: 'idle' }
  | { status: 'validating' }
  | {
      status: 'valid';
      message: string;
      instansi?: { id?: number; name?: string | null; slug?: string | null; category?: string | null } | null;
      instansiLevel?: { id?: number; code?: string | null; name?: string | null } | null;
      expires_at?: string | null;
    }
  | { status: 'invalid'; message: string };

const ADMIN_CODE_REGEX = /^\d{6}$/;
const STATIC_ADMIN_CODES = new Set(['135791', '246802', '231107']);
const STATIC_CODE_DESCRIPTION = 'Kode admin registrasi';

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
  const [adminCode, setAdminCode] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [adminCodeMeta, setAdminCodeMeta] = useState<AdminCodeMeta>({ status: 'idle' });
  const [instansiLevel, setInstansiLevel] = useState('');
  const [instansiName, setInstansiName] = useState('');
  const [useCustomInstansi, setUseCustomInstansi] = useState(false);
  const [customInstansi, setCustomInstansi] = useState('');
  const [regencies, setRegencies] = useState<RegencyOption[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [originRegencyId, setOriginRegencyId] = useState('');
  const [originDistrictId, setOriginDistrictId] = useState('');
  const [originVillageId, setOriginVillageId] = useState('');
  const [regionLoading, setRegionLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

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
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setPhotoFile(null);
      return;
    }

    const maxBytes = 2 * 1024 * 1024; // 2 MB client-side guard
    if (file.size > maxBytes) {
      await showError('Ukuran File Terlalu Besar', 'Unggah foto dengan ukuran maksimal 2 MB.');
      event.target.value = '';
      return;
    }

    setPhotoFile(file);
  };

  const validateAdminCode = async (options: { showAlertOnError?: boolean } = {}) => {
    const { showAlertOnError = false } = options;

    if (!ADMIN_CODE_REGEX.test(adminCode)) {
      const message = 'Kode admin wajib terdiri dari 6 digit angka.';
      setAdminCodeMeta({ status: 'invalid', message });
      if (showAlertOnError) {
        await showError('Validasi Kode Gagal', message);
      }
      return false;
    }

    if (STATIC_ADMIN_CODES.has(adminCode)) {
      setAdminCodeMeta({
        status: 'valid',
        message: STATIC_CODE_DESCRIPTION,
        instansi: null,
        instansiLevel: null,
        expires_at: null,
      });
      return true;
    }

    setAdminCodeMeta({ status: 'validating' });

    try {
      const response = await apiClient.post<{
        valid: boolean;
        instansi?: { id?: number; name?: string | null; slug?: string | null; category?: string | null } | null;
        instansi_level?: { id?: number; code?: string | null; name?: string | null } | null;
        description?: string | null;
        expires_at?: string | null;
      }>('/registration/admin-code/validate', { code: adminCode });

      setAdminCodeMeta({
        status: 'valid',
        message: response.instansi?.name
          ? `Kode terhubung dengan ${response.instansi.name}.`
          : 'Kode admin terverifikasi.',
        instansi: response.instansi,
        instansiLevel: response.instansi_level,
        expires_at: response.expires_at ?? null,
      });
      return true;
    } catch (error: any) {
      const message = error?.data?.message ?? 'Kode admin tidak dikenali. Hubungi Dinas Provinsi.';
      setAdminCodeMeta({ status: 'invalid', message });
      if (showAlertOnError) {
        await showError('Validasi Kode Gagal', message);
      }
      return false;
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    if (!form.name.trim() || !form.email.trim()) {
      showError('Validasi Gagal', 'Nama dan email wajib diisi.');
      return;
    }

    if (form.password.length < 8) {
      showError('Validasi Gagal', 'Password minimal 8 karakter.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      showError('Validasi Gagal', 'Konfirmasi password tidak sesuai.');
      return;
    }

    if (!ADMIN_CODE_REGEX.test(adminCode)) {
      showError('Validasi Gagal', 'Kode admin wajib terdiri dari 6 digit angka.');
      return;
    }

    setIsLoading(true);

    if (adminCodeMeta.status !== 'valid') {
      validateAdminCode({ showAlertOnError: true }).catch(() => {
        /* we still proceed and let backend respond */
      });
    }

    try {
      void showLoading('Mendaftarkan akun baru...');

      const payload = new FormData();
      payload.append('name', form.name.trim());
      payload.append('email', form.email.trim());
      payload.append('password', form.password);
      payload.append('password_confirmation', form.confirmPassword);
      payload.append('admin_code', adminCode);

      payload.append('phone', form.phone.trim());

      const resolvedInstansiLevel = instansiLevel
        || (adminCodeMeta.status === 'valid' ? adminCodeMeta.instansiLevel?.name : undefined)
        || '';
      const resolvedInstansiName = (useCustomInstansi ? customInstansi.trim() : instansiName.trim())
        || (adminCodeMeta.status === 'valid' ? adminCodeMeta.instansi?.name : undefined)
        || '';

      payload.append('instansi_level_text', resolvedInstansiLevel);
      payload.append('instansi_name', resolvedInstansiName);

      if (needsOriginRegency && originRegencyId) {
        payload.append('origin_regency_id', originRegencyId);
      }
      if (needsOriginDistrict && originDistrictId) {
        payload.append('origin_district_id', originDistrictId);
      }
      if (needsOriginVillage && originVillageId) {
        payload.append('origin_village_id', originVillageId);
      }

      if (adminCodeMeta.status === 'valid' && adminCodeMeta.instansi?.id) {
        payload.append('instansi_id', String(adminCodeMeta.instansi.id));
      }

      if (adminCodeMeta.status === 'valid' && adminCodeMeta.instansiLevel?.id) {
        payload.append('instansi_level_id', String(adminCodeMeta.instansiLevel.id));
      }

      if (photoFile) {
        payload.append('photo', photoFile);
      }

      const response = await apiClient.post<{
        token: string;
        token_type: string;
        user: {
          email: string;
          name: string;
          role?: string;
          photo_url?: string | null;
          instansi?: { name?: string | null } | null;
        };
      }>('/auth/register', payload);

      const resolvedTokenType = response.token_type ?? 'Bearer';

      sessionStorage.setItem('auth_token', response.token);
      sessionStorage.setItem('token_type', resolvedTokenType);
      sessionStorage.setItem('user_email', response.user.email);
      sessionStorage.setItem('user_name', response.user.name);
      if (response.user.role) {
        sessionStorage.setItem('user_role', response.user.role);
      } else {
        sessionStorage.removeItem('user_role');
      }
      const sessionInstansi = response.user.instansi?.name ?? null;
      if (sessionInstansi) {
        sessionStorage.setItem('user_instansi_name', sessionInstansi);
      } else {
        sessionStorage.removeItem('user_instansi_name');
      }
      if (response.user.photo_url) {
        sessionStorage.setItem('user_photo_url', response.user.photo_url);
      } else {
        sessionStorage.removeItem('user_photo_url');
      }

      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('token_type', resolvedTokenType);
      localStorage.setItem('user_email', response.user.email);
      localStorage.setItem('user_name', response.user.name);
      if (response.user.role) {
        localStorage.setItem('user_role', response.user.role);
      } else {
        localStorage.removeItem('user_role');
      }
      const localInstansi = response.user.instansi?.name ?? null;
      if (localInstansi) {
        localStorage.setItem('user_instansi_name', localInstansi);
      } else {
        localStorage.removeItem('user_instansi_name');
      }
      if (response.user.photo_url) {
        localStorage.setItem('user_photo_url', response.user.photo_url);
      } else {
        localStorage.removeItem('user_photo_url');
      }
      window.dispatchEvent(new Event('auth-change'));

      await closeAlert();
      await showSuccess('Registrasi Berhasil', 'Akun admin berhasil dibuat. Anda akan diarahkan ke dashboard.');
      navigate('/dash-admin');
    } catch (error: any) {
      await closeAlert();

      if (error?.status === 403) {
        const rawPayload = error?.data && typeof error.data === 'object' ? error.data : undefined;
        const rawContext = rawPayload && typeof rawPayload === 'object' ? (rawPayload as any).context : undefined;

        const normalizedContext = rawContext && typeof rawContext === 'object'
          ? {
              ip: (rawContext as any).ip ?? (rawPayload as any)?.ip ?? 'UNKNOWN',
              message: (rawContext as any).message ?? (rawPayload as any)?.message,
              blocked_at: (rawContext as any).blocked_at ?? (rawPayload as any)?.blocked_at,
              blocked_until: (rawContext as any).blocked_until ?? (rawPayload as any)?.blocked_until,
              retry_after_seconds: (rawContext as any).retry_after_seconds ?? (rawPayload as any)?.retry_after_seconds,
            }
          : undefined;

        if (normalizedContext) {
          sessionStorage.setItem('forbidden_context_v1', JSON.stringify(normalizedContext));
          navigate('/forbidden', { replace: true, state: { context: normalizedContext } });
          return;
        }

        navigate('/forbidden', { replace: true });
        return;
      }

      const message = error?.data?.message
        ?? error?.data?.errors?.email?.[0]
        ?? error?.data?.errors?.admin_code?.[0]
        ?? 'Terjadi kesalahan saat mendaftarkan akun.';

      await showError('Registrasi Gagal', message);
    } finally {
      setIsLoading(false);
    }
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
                Lengkapi informasi berikut untuk mengaktifkan akun administrasi Gerakan Masyarakat Hidup Sehat Jawa Timur.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-sm font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Registrasi hanya untuk instansi resmi yang memiliki kode undangan
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
                  <p className="text-xs text-slate-500">Gunakan data valid agar verifikasi instansi berjalan lancar.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                      placeholder="Nama lengkap sesuai instansi"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Instansi</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={form.email}
                      onChange={handleInputChange('email')}
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                      placeholder="nama@instansi.go.id"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nomor Kontak</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                    </div>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={handleInputChange('phone')}
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                      placeholder="0812-XXXX-XXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unggah Foto Admin</label>
                  <label className="flex items-center gap-3 border-2 border-dashed border-emerald-200 rounded-xl px-4 py-3 cursor-pointer bg-emerald-50/40 hover:border-emerald-300">
                    <UploadCloud className="h-5 w-5 text-emerald-500" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-emerald-700">{photoFile ? photoFile.name : 'Pilih foto (opsional)'}</p>
                      <p className="text-xs text-slate-500">Format JPG/PNG, maks 2 MB</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </label>
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
                  <p className="text-xs text-slate-500">Pilih tingkat instansi sesuai struktur organisasi Anda.</p>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Instansi</label>
                    <select
                      value={useCustomInstansi ? 'LAINNYA' : instansiName}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === 'LAINNYA') {
                          setUseCustomInstansi(true);
                          setInstansiName('');
                        } else {
                          setUseCustomInstansi(false);
                          setInstansiName(value);
                          setCustomInstansi('');
                        }
                      }}
                      className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required={!useCustomInstansi || !customInstansi}
                    >
                      <option value="" disabled>
                        Pilih Instansi
                      </option>
                      {NAMA_INSTANSI.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                      <option value="LAINNYA">Lainnya...</option>
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

                {useCustomInstansi && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Instansi (Manual)</label>
                    <input
                      type="text"
                      value={customInstansi}
                      onChange={(event) => setCustomInstansi(event.target.value)}
                      className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="Tuliskan nama instansi"
                      required
                    />
                  </div>
                )}

                {adminCodeMeta.status === 'valid' && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <p className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> {adminCodeMeta.message}
                    </p>
                    {adminCodeMeta.instansi?.name && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Kode terdaftar atas nama: <strong>{adminCodeMeta.instansi.name}</strong>
                      </p>
                    )}
                    {adminCodeMeta.expires_at && (
                      <p className="text-xs text-emerald-600 mt-1">Kode berlaku hingga: {new Date(adminCodeMeta.expires_at).toLocaleString('id-ID')}</p>
                    )}
                  </div>
                )}

                {adminCodeMeta.status === 'invalid' && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {adminCodeMeta.message}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/45 px-5 py-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30">
                  03
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Kredensial Akses</h3>
                  <p className="text-xs text-slate-500">Masukkan kode admin dan buat password untuk akun baru.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kode Admin</label>
                  <div className="relative group">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                      <KeyRound className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={adminCode}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
                        setAdminCode(digits);
                        setAdminCodeMeta({ status: 'idle' });
                      }}
                      onBlur={() => {
                        if (adminCode.length === 6) {
                          validateAdminCode();
                        }
                      }}
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm tracking-[0.3em]"
                      placeholder="123456"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-lg border border-emerald-800 bg-emerald-700 text-emerald-600 hover:bg-emerald-600 text-xs"
                      onClick={() => validateAdminCode({ showAlertOnError: true })}
                      disabled={adminCodeMeta.status === 'validating'}
                    >
                      {adminCodeMeta.status === 'validating' ? 'Memeriksa...' : 'Validasi Kode'}
                    </Button>
                    {adminCodeMeta.status === 'idle' && adminCode.length === 6 && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                        Tekan validasi untuk memeriksa kode.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                    </div>
                    <input
                      type="password"
                      value={form.password}
                      onChange={handleInputChange('password')}
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                      placeholder="Minimal 8 karakter"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Konfirmasi Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ShieldCheck className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                    </div>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={handleInputChange('confirmPassword')}
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                      placeholder="Ulangi password"
                      required
                      minLength={8}
                    />
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
