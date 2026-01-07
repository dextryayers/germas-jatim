import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { apiClient } from '../utils/apiClient';
import { showError, showLoading, closeAlert, showSuccess } from '../utils/alerts';

const ADMIN_CODE_REGEX = /^\d{6}$/;

const VerifyAdminCode: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { registration?: any } };
  const registration = location.state?.registration;
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'valid' | 'invalid' | 'checking'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ADMIN_CODE_REGEX.test(code)) {
      setStatus('invalid');
      setMessage('Kode admin wajib terdiri dari 6 digit angka.');
      return;
    }

    if (!registration) {
      setStatus('invalid');
      setMessage('Data registrasi tidak ditemukan. Silakan ulangi proses registrasi.');
      return;
    }

    setStatus('checking');
    setMessage(null);

    try {
      void showLoading('Memeriksa kode admin...');

      const response = await apiClient.post<{
        valid?: boolean;
        description?: string | null;
      }>('/registration/admin-code/validate', { code });

      // Jika kode valid, lanjutkan dengan pembuatan akun admin menggunakan data registrasi
      const payload = {
        ...registration,
        admin_code: code,
      };

      const registerResponse = await apiClient.post<{
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

      await closeAlert();

      const resolvedTokenType = registerResponse.token_type ?? 'Bearer';

      sessionStorage.setItem('auth_token', registerResponse.token);
      sessionStorage.setItem('token_type', resolvedTokenType);
      sessionStorage.setItem('user_email', registerResponse.user.email);
      sessionStorage.setItem('user_name', registerResponse.user.name);
      if (registerResponse.user.role) {
        sessionStorage.setItem('user_role', registerResponse.user.role);
      } else {
        sessionStorage.removeItem('user_role');
      }
      const sessionInstansi = registerResponse.user.instansi?.name ?? null;
      if (sessionInstansi) {
        sessionStorage.setItem('user_instansi_name', sessionInstansi);
      } else {
        sessionStorage.removeItem('user_instansi_name');
      }
      if (registerResponse.user.photo_url) {
        sessionStorage.setItem('user_photo_url', registerResponse.user.photo_url);
      } else {
        sessionStorage.removeItem('user_photo_url');
      }

      localStorage.setItem('auth_token', registerResponse.token);
      localStorage.setItem('token_type', resolvedTokenType);
      localStorage.setItem('user_email', registerResponse.user.email);
      localStorage.setItem('user_name', registerResponse.user.name);
      if (registerResponse.user.role) {
        localStorage.setItem('user_role', registerResponse.user.role);
      } else {
        localStorage.removeItem('user_role');
      }
      const localInstansi = registerResponse.user.instansi?.name ?? null;
      if (localInstansi) {
        localStorage.setItem('user_instansi_name', localInstansi);
      } else {
        localStorage.removeItem('user_instansi_name');
      }
      if (registerResponse.user.photo_url) {
        localStorage.setItem('user_photo_url', registerResponse.user.photo_url);
      } else {
        localStorage.removeItem('user_photo_url');
      }
      window.dispatchEvent(new Event('auth-change'));

      setStatus('valid');
      setMessage(response.description || 'Kode admin terverifikasi dan akun berhasil dibuat.');
      await showSuccess('Registrasi Berhasil', 'Kode admin valid dan akun admin berhasil dibuat.');
      navigate('/dash-admin');
    } catch (error: any) {
      await closeAlert();
      const msg = error?.data?.message ?? 'Kode admin tidak dikenali. Hubungi Dinas Provinsi.';
      setStatus('invalid');
      setMessage(msg);
      await showError('Validasi Kode Gagal', msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6fbf9] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_32px_90px_-60px_rgba(16,185,129,0.6)] border border-emerald-50 overflow-hidden">
        <div className="px-6 pt-8 pb-4 text-center border-b border-emerald-50 bg-emerald-50/40">
          <h1 className="text-xl font-bold text-slate-800">Verifikasi Kode Admin</h1>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Masukkan kode admin 6 digit yang Anda terima dari Dinas Provinsi Jawa Timur untuk mengaktifkan akun admin.
          </p>
        </div>

        {!registration && (
          <div className="px-6 pt-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-start gap-2 mb-3">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>Data registrasi tidak ditemukan. Silakan ulangi proses registrasi admin.</span>
            </div>
            <Link to="/register" className="text-xs text-emerald-600 hover:text-emerald-500 font-semibold">
              &larr; Kembali ke halaman registrasi
            </Link>
          </div>
        )}

        <form onSubmit={handleVerify} className="px-6 py-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kode Admin</label>
            <div className="relative group">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <KeyRound className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
              </div>
              <input
                type="text"
                value={code}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(digits);
                  setStatus('idle');
                  setMessage(null);
                }}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm tracking-[0.3em]"
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>
          </div>

          {status === 'valid' && message && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {status === 'invalid' && message && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {status === 'idle' && (
            <p className="text-[11px] text-slate-400">
              Kode admin hanya dibagikan kepada instansi resmi melalui jalur komunikasi Dinas Provinsi Jawa Timur.
            </p>
          )}

          <div className="pt-1 flex flex-col gap-3">
            <Button
              type="submit"
              isLoading={status === 'checking'}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl"
            >
              Periksa Kode
            </Button>

            <p className="text-xs text-center text-slate-500">
              Belum punya akun admin?{' '}
              <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-500">
                Registrasi di sini
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyAdminCode;
