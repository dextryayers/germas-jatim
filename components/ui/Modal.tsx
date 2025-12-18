import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  size = 'md' 
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Prevent hydration mismatch and ensure DOM exists
  if (!mounted || typeof document === 'undefined') return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-all"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
             <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className={`bg-white w-full rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh] ${sizes[size]}`}
             >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                   <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                   <button 
                      onClick={onClose} 
                      className="p-2 -mr-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                   >
                      <X className="w-5 h-5" />
                   </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                   {children}
                </div>

                {/* Footer */}
                {footer && (
                   <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end gap-3">
                      {footer}
                   </div>
                )}
             </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};