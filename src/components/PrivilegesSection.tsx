import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, X, Clock } from 'lucide-react';
import { Section } from './Section';
import type { RemoteAction, PrivilegeCard } from '../types';

interface PrivilegesSectionProps {
  privileges?: PrivilegeCard[];
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

const PRIV_ICON: Record<string, string> = {
  Utensils: '🔪',
  Scissors: '✂️',
  Flame:    '🔥',
  Sprout:   '🌱',
  Smartphone: '📱',
};

const DURATIONS = [
  { label: '1 Day',  hours: 24 },
  { label: '3 Days', hours: 72 },
  { label: '1 Week', hours: 168 },
  { label: '2 Weeks', hours: 336 },
];

function getRemainingTimeText(suspendedUntil: string | null): string {
  if (!suspendedUntil) return '';
  const diff = new Date(suspendedUntil).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days  = Math.floor(hours / 24);
  if (days >= 1) return `${days}d left`;
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}

function getSuspendedUntilDate(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function PrivilegesSection({ privileges, loadingActions, dispatchAction }: PrivilegesSectionProps) {
  const [selectedPriv, setSelectedPriv] = useState<PrivilegeCard | null>(null);

  // Force periodic update of countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!privileges || privileges.length === 0) return null;

  const handleSuspend = (hours: number) => {
    if (!selectedPriv) return;
    const until = getSuspendedUntilDate(hours);
    dispatchAction({
      type: 'SET_PRIVILEGE_STATUS',
      cardId: selectedPriv.id,
      status: 'suspended',
      suspendedUntil: until
    }, `priv-suspend-${selectedPriv.id}`);
    setSelectedPriv(null);
  };

  const handleReinstate = (p: PrivilegeCard) => {
    dispatchAction({
      type: 'SET_PRIVILEGE_STATUS',
      cardId: p.id,
      status: 'active',
      suspendedUntil: null
    }, `priv-reinstate-${p.id}`);
  };

  const allActive = privileges.every(p => p.status !== 'suspended');

  return (
    <Section
      title={
        <div className="flex items-center justify-between w-full">
          <span>Privileges</span>
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black tracking-wide uppercase flex items-center gap-1 ${
            allActive 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-rose-100 text-rose-700'
          }`}>
            {allActive ? (
              <>
                <Shield className="w-3 h-3" /> All Active
              </>
            ) : (
              <>
                <ShieldAlert className="w-3 h-3" /> Suspended
              </>
            )}
          </span>
        </div>
      }
    >
      <div className="grid grid-cols-5 gap-2">
        {privileges.map(p => {
          const isSuspended = p.status === 'suspended';
          const countdown = getRemainingTimeText(p.suspendedUntil);

          return (
            <motion.button
              key={p.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                if (isSuspended) {
                  handleReinstate(p);
                } else {
                  setSelectedPriv(p);
                }
              }}
              disabled={loadingActions.has(`priv-suspend-${p.id}`) || loadingActions.has(`priv-reinstate-${p.id}`)}
              className={`
                aspect-square rounded-2xl p-2 flex flex-col items-center justify-center gap-1 border-[1.5px] relative overflow-hidden transition-all
                ${isSuspended 
                  ? 'bg-rose-50 border-rose-200 text-rose-800 shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-700 shadow-sm active:shadow-inner'
                }
              `}
            >
              {isSuspended && (
                <div 
                  className="absolute inset-0 opacity-[0.06]" 
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 10px, transparent 10px, transparent 20px)'
                  }}
                />
              )}
              <span className="text-2.5xl leading-none z-10">{PRIV_ICON[p.icon] ?? '⭐'}</span>
              <span className="text-[9px] font-black uppercase tracking-tight text-center leading-tight truncate w-full z-10">
                {p.label}
              </span>
              {isSuspended && countdown && (
                <span className="text-[8px] font-bold bg-rose-200/80 px-1 rounded text-rose-900 leading-none mt-0.5 z-10 flex items-center gap-0.5 font-mono">
                  <Clock className="w-2 h-2" /> {countdown}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Duration Picker Modal */}
      <AnimatePresence>
        {selectedPriv && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPriv(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />

            {/* Content Drawer */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] p-6 shadow-2xl z-50 border-t border-slate-100 flex flex-col gap-5 max-w-md mx-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{PRIV_ICON[selectedPriv.icon]}</span>
                  <div className="flex flex-col">
                    <span className="font-black text-slate-800 text-sm uppercase tracking-tight">Suspend Privilege</span>
                    <span className="text-xs text-slate-500 font-medium">Temporarily remove {selectedPriv.label}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPriv(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 active:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-1">
                {DURATIONS.map(d => (
                  <motion.button
                    key={d.label}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleSuspend(d.hours)}
                    className="py-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-2xl flex flex-col items-center justify-center gap-0.5 active:bg-rose-200 transition-colors"
                  >
                    <span className="font-black text-rose-800 text-[13px] uppercase tracking-tight">{d.label}</span>
                    <span className="text-[10px] text-rose-500 font-medium font-mono">{d.hours} hours</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Section>
  );
}
