import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import EvaluasiForm from './forms/EvaluasiForm';
import LaporanForm from './forms/LaporanForm';

const Forms: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const formType = searchParams.get('type') || 'evaluasi'; // default to evaluasi


  return (
    <div className="min-h-screen bg-[#f6fbf9] pb-20 pt-4">
      <AnimatePresence mode='wait'>
        {formType === 'laporan' ? (
          <LaporanForm key="laporan" onBack={() => navigate('/')} />
        ) : (
          <EvaluasiForm key="evaluasi" onBack={() => navigate('/')} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Forms;