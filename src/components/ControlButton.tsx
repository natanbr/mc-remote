import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
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
  bg = "bg-white", 
  border = "border-slate-200", 
  fullWidth = false,
  className = ""
}: ControlButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.94, y: 2 }}
      onClick={onClick}
      disabled={loading}
      aria-label={label || (typeof icon === 'string' ? icon : 'action button')}
      className={`
        ${bg} ${border} border-[1.5px] rounded-2xl p-4
        flex flex-col items-center justify-center gap-2
        shadow-sm active:shadow-inner transition-all
        ${fullWidth ? 'col-span-full flex-row' : ''}
        ${loading ? 'opacity-70 grayscale-[0.5]' : 'opacity-100'}
        ${className}
      `}
    >
      <div className={`
        ${loading ? 'animate-spin' : ''}
        p-2 rounded-full bg-white/60 shadow-sm
      `}>
        {loading ? <RefreshCw className="w-5 h-5 text-slate-400" /> : icon}
      </div>
      <span className="font-black text-slate-700 text-[12px] uppercase tracking-tight">{label}</span>
    </motion.button>
  );
}
