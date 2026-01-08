import React from 'react';
import { Link } from 'react-router-dom';
import LogoGermas from '../components/svg/logo-germas.svg';

const Maintenance: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 text-emerald-50 px-4">
      <div className="max-w-xl w-full text-center">
        <div className="flex justify-center mb-8">
          <img
            src={LogoGermas}
            alt="Logo Germas"
            className="h-14 w-auto drop-shadow-lg"
          />
        </div>

        <div className="bg-emerald-900/60 border border-emerald-500/40 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
            Sistem Sedang Dalam Pemeliharaan
          </h1>
          <p className="text-emerald-100/90 text-sm sm:text-base mb-6 leading-relaxed">
            Untuk sementara waktu, akses ke aplikasi pelaporan GERMAS sedang dinonaktifkan
            karena proses pemeliharaan sistem. Silakan kembali beberapa saat lagi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex justify-center rounded-full border border-emerald-400/70 px-6 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-50/10 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-emerald-900 transition-colors"
            >
              Muat Ulang
            </Link>
          </div>
        </div>

        <p className="mt-6 text-[11px] sm:text-xs text-emerald-100/50">
          &copy; {new Date().getFullYear()} Dinas Kesehatan Provinsi Jawa Timur. Semua hak dilindungi.
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
