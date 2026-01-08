import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { OtpInput } from '../components/ui/OtpInput';
import { Mail, ArrowLeft, CheckCircle, ShieldCheck, KeyRound, Timer, ArrowRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import LogoGermas from '../components/svg/logo-germas.svg';
import { apiClient } from '../utils/apiClient';

type Step = 'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('EMAIL');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Timer State
  const [timer, setTimer] = useState(0);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
       toast.error('Mohon masukkan email anda');
       return;
    }
    setIsLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setStep('OTP');
      setTimer(60); // 60 seconds cooldown
      toast.success('Kode OTP telah dikirim ke email anda.');
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Gagal mengirim kode OTP.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Kode OTP harus 6 digit');
      return;
    }
    setIsLoading(true);

    try {
      await apiClient.post('/auth/forgot-password/verify', { email, otp });
      setStep('NEW_PASSWORD');
      toast.success('OTP valid! Silakan buat password baru.');
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Kode OTP salah atau sudah kadaluarsa.';
      toast.error(message);
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
       toast.error('Password minimal 8 karakter');
       return;
    }

    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasLowercase || !hasUppercase || !hasNumber) {
      toast.error('Password harus mengandung huruf besar, huruf kecil, dan angka.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }
    setIsLoading(true);

    try {
      await apiClient.post('/auth/forgot-password/reset', {
        email,
        otp,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setStep('SUCCESS');
      toast.success('Password berhasil diperbarui!');
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Gagal memperbarui password. Coba lagi.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
     if (timer > 0) return;
     setIsLoading(true);
     try {
       await apiClient.post('/auth/forgot-password', { email });
       setTimer(60);
       toast.success('Kode OTP baru telah dikirim ke email anda.');
     } catch (error: any) {
       const message = error?.response?.data?.message ?? 'Gagal mengirim ulang kode OTP.';
       toast.error(message);
     } finally {
       setIsLoading(false);
     }
  };

  return (
    <div className="min-h-screen bg-[#f6fbf9] flex items-center justify-center p-4">
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-3xl shadow-[0_32px_90px_-60px_rgba(16,185,129,0.55)] w-full max-w-md overflow-hidden relative border border-emerald-50"
      >
        {/* Dynamic Header Background based on Step */}
        <div className={`h-40 relative overflow-hidden transition-colors duration-500 ${
           step === 'SUCCESS'
             ? 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500'
             : 'bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700'
        }`}>
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
           <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl"></div>
           
           <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-20 h-20 bg-white/95 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-emerald-100 p-2">
                <img src={LogoGermas} alt="Logo Germas" className="w-full h-full object-contain" />
              </div>
           </div>
        </div>
        
        <div className="p-8">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: EMAIL INPUT */}
            {step === 'EMAIL' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-800">Lupa Password?</h2>
                  <p className="text-slate-500 text-sm mt-2">
                    Masukkan email terdaftar untuk menerima kode OTP verifikasi.
                  </p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Instansi</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border-2 border-emerald-100 rounded-xl leading-5 bg-emerald-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-0 sm:text-sm transition-all"
                        placeholder="nama@dinkes.jatimprov.go.id"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 shadow-lg shadow-emerald-500/30 rounded-xl text-sm font-bold tracking-wide"
                    rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
                  >
                    KIRIM KODE OTP
                  </Button>
                </form>
              </motion.div>
            )}

            {/* STEP 2: OTP INPUT */}
            {step === 'OTP' && (
               <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
               >
                  <div className="text-center">
                     <h2 className="text-2xl font-bold text-slate-800">Verifikasi OTP</h2>
                     <p className="text-slate-500 text-sm mt-2">
                        Kode 6 digit telah dikirim ke <br/>
                        <span className="font-semibold text-slate-800">{email}</span>
                        <button onClick={() => setStep('EMAIL')} className="text-green-600 ml-2 text-xs hover:underline">(Ubah)</button>
                     </p>
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-8">
                     <OtpInput 
                        value={otp} 
                        onChange={setOtp} 
                        length={6} 
                        disabled={isLoading}
                     />

                     <div className="text-center">
                        {timer > 0 ? (
                           <p className="text-sm text-slate-400 flex items-center justify-center gap-2">
                              <Timer className="w-4 h-4" />
                              Kirim ulang dalam <span className="font-mono font-bold text-slate-600">{timer}s</span>
                           </p>
                        ) : (
                           <button 
                              type="button"
                              onClick={handleResendCode}
                              className="text-sm font-bold text-green-600 hover:text-green-700 hover:underline"
                           >
                              Kirim Ulang Kode
                           </button>
                        )}
                     </div>

                     <Button
                        type="submit"
                        isLoading={isLoading}
                        className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white py-3.5 shadow-lg shadow-emerald-500/30 rounded-xl text-sm font-bold tracking-wide"
                     >
                        VERIFIKASI
                     </Button>
                  </form>
               </motion.div>
            )}

            {/* STEP 3: NEW PASSWORD */}
            {step === 'NEW_PASSWORD' && (
               <motion.div
                  key="password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
               >
                  <div className="text-center">
                     <h2 className="text-2xl font-bold text-slate-800">Reset Password</h2>
                     <p className="text-slate-500 text-sm mt-2">
                        Buat password baru yang aman untuk akun anda.
                     </p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password Baru</label>
                        <div className="relative group">
                           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                           </div>
                           <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="block w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-green-500 focus:ring-0 sm:text-sm transition-all"
                              placeholder="Minimal 8 karakter dengan huruf besar, huruf kecil, dan angka"
                              required
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Konfirmasi Password</label>
                        <div className="relative group">
                           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <CheckCircle className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                           </div>
                           <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="block w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-green-500 focus:ring-0 sm:text-sm transition-all"
                              placeholder="Ulangi password baru"
                              required
                           />
                        </div>
                     </div>

                     <Button
                        type="submit"
                        isLoading={isLoading}
                        className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white py-3.5 shadow-lg shadow-emerald-500/30 rounded-xl text-sm font-bold tracking-wide mt-4"
                     >
                        SIMPAN PASSWORD BARU
                     </Button>
                  </form>
               </motion.div>
            )}

            {/* STEP 4: SUCCESS */}
            {step === 'SUCCESS' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-4"
              >
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <CheckCircle className="w-12 h-12 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Selesai!</h2>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    Password anda berhasil diperbarui.<br/>Silakan login menggunakan password baru.
                  </p>
                </div>
                
                <Button 
                   onClick={() => navigate('/login')}
                   className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 mt-4"
                >
                   Kembali ke Halaman Login
                </Button>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Footer Link */}
          {step !== 'SUCCESS' && (
             <div className="mt-8 text-center border-t border-slate-100 pt-6">
                <Link to="/login" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 font-bold transition-colors group">
                   <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" />
                   Kembali ke Login
                </Link>
             </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;