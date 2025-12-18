import React, { useRef, useState, useEffect } from 'react';
import { cn } from '../../utils/cn';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({ 
  length = 6, 
  value, 
  onChange,
  disabled = false
}) => {
  const [activeInput, setActiveInput] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (isNaN(Number(val))) return;

    const newOtp = value.split('');
    // Take the last character entered
    newOtp[index] = val.substring(val.length - 1);
    const combined = newOtp.join('');
    
    onChange(combined);

    // Move to next input if value is entered
    if (val && index < length - 1) {
      setActiveInput(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // Move to previous input on backspace if current is empty
        setActiveInput(index - 1);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, length);
    if (!/^\d+$/.test(pastedData)) return; // Only allow numbers

    onChange(pastedData);
    inputRefs.current[Math.min(pastedData.length - 1, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          onFocus={() => setActiveInput(index)}
          disabled={disabled}
          className={cn(
            "w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200 outline-none caret-green-600 bg-slate-50",
            disabled ? "opacity-50 cursor-not-allowed bg-slate-100" : "bg-white",
            activeInput === index 
              ? "border-green-500 ring-4 ring-green-500/20 z-10 scale-105" 
              : "border-slate-200 hover:border-slate-300 focus:border-green-500"
          )}
        />
      ))}
    </div>
  );
};