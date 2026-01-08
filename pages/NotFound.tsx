import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f6fbf9] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-12 right-10 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-12 left-8 w-80 h-80 bg-teal-200/25 rounded-full blur-3xl"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md relative z-10"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-24 h-24 bg-white shadow-xl rounded-3xl flex items-center justify-center mx-auto mb-6 relative border border-emerald-100"
        >
          <AlertTriangle className="w-12 h-12 text-emerald-500" />
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-4 border-[#f6fbf9]">!</div>
        </motion.div>

        <h1 className="text-6xl font-bold text-slate-800 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-600 mb-4">Halaman Tidak Ditemukan</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Maaf, halaman yang anda tuju tidak dapat ditemukan atau telah dipindahkan ke alamat lain.
        </p>

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4"/>} className="border-emerald-200 text-emerald-600 hover:bg-emerald-50">Kembali</Button>
          <Button onClick={() => navigate('/')} leftIcon={<Home className="w-4 h-4"/>} className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white">Ke Beranda</Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;