import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Lock, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { closeAlert, showError, showLoading, showSuccess } from '../utils/alerts';
import LogoGermas from '../components/svg/logo-germas.svg';
import { apiClient } from '../utils/apiClient';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    apiClient.prefetchCsrf().catch(() => {
      /* noop – CSRF fetch will retry when needed */
    });
  }, []);

  type LoginResponse = {
    token: string;
    token_type: string;
    user: {
      email: string;
      name: string;
      role?: string;
      photo_url?: string | null;
      instansi?: { name?: string | null } | null;
    };
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      void showLoading('Memverifikasi kredensial...');

      const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });

      const resolvedTokenType = response.token_type ?? 'Bearer';

      sessionStorage.setItem('auth_token', response.token);
      sessionStorage.setItem('token_type', resolvedTokenType);
      sessionStorage.setItem('user_email', response.user.email);
      sessionStorage.setItem('user_name', response.user.name);
      if (response.user.role) {
        sessionStorage.setItem('user_role', response.user.role);
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
      await showSuccess('Login Berhasil', 'Selamat datang kembali!');
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

      if (error?.status === 401) {
        await showError('Login Gagal', error?.data?.message ?? 'Email atau kata sandi tidak cocok.');
      } else {
        await showError(
          'Terjadi Kesalahan',
          'Kami tidak dapat memproses permintaan Anda saat ini. Coba beberapa saat lagi atau hubungi administrator.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6fbf9] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-[0_28px_80px_-60px_rgba(16,185,129,0.55)] border border-emerald-50 w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-8 text-center relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white/95 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-emerald-100 p-2">
              <img src={LogoGermas} alt="Logo Germas" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-white text-2xl font-bold">Admin Portal</h2>
            <p className="text-emerald-100 text-sm mt-2">Masuk untuk mengelola data GERMAS</p>
          </div>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                </div>
                <input
                  type="email"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 sm:text-sm transition-all"
                  placeholder="nama@instansi.go.id"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                </div>
                <input
                  type="password"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 sm:text-sm transition-all"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember_me"
                  name="remember_me"
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember_me" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">
                  Ingat saya
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-semibold text-emerald-600 hover:text-emerald-500 hover:underline transition-all">
                  Lupa password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02]"
              disabled={loading}
            >
              Masuk
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500">
            Belum punya akun?{' '}
            <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-500 hover:underline transition-all">
              Daftar di sini
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

export default Login;