import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  bg?: string;
  border?: string;
  fullWidth?: boolean;
  className?: string;
}

export function ControlButton({ 
  icon, 
  label, 
  onClick, 
  loading, 
  disabled,
  bg = "bg-white", 
  border = "border-slate-200", 
  fullWidth = false,
  className = ""
}: ControlButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.94, y: disabled || loading ? 0 : 2 }}
      onClick={onClick}
      disabled={loading || disabled}
      aria-label={label || (typeof icon === 'string' ? icon : 'action button')}
      className={`
        ${bg} ${border} border-[1.5px] rounded-2xl p-4
        flex flex-col items-center justify-center gap-2
        shadow-sm active:shadow-inner transition-all
        ${fullWidth ? 'col-span-full flex-row' : ''}
        ${loading || disabled ? 'opacity-50 grayscale-[0.5] cursor-not-allowed' : 'opacity-100'}
        ${className}
      `}
    >
      <div className={`
        ${loading ? 'animate-spin' : ''}
        flex items-center justify-center
      `}>
        {loading ? <RefreshCw className="w-5 h-5 text-slate-400" /> : icon}
      </div>
      {label && (
        <span className="font-black text-slate-700 text-[12px] uppercase tracking-tight">{label}</span>
      )}
    </motion.button>
  );
}
