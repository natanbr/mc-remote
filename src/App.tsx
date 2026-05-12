import { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Plus, Minus, Sun, Moon, RotateCcw, Clock, Wand2, PartyPopper, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Initialize Supabase only if env vars are present
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'offline'>('offline');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    // 1. Extract from URL params
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    const urlKey = params.get('key');

    let finalRoom = urlRoom;
    let finalKey = urlKey;

    // 2. Save or retrieve from localStorage
    if (urlRoom && urlKey) {
      localStorage.setItem('mc_room', urlRoom);
      localStorage.setItem('mc_key', urlKey);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      finalRoom = localStorage.getItem('mc_room');
      finalKey = localStorage.getItem('mc_key');
    }

    setRoomId(finalRoom);
    setSecretKey(finalKey);

    if (finalRoom && finalKey && supabase) {
      connectRealtime(finalRoom);
    }
  }, []);

  const connectRealtime = (room: string) => {
    if (!supabase) return;

    setStatus('connecting');
    const ch = supabase.channel(`remote-control:${room}`, {
      config: {
        broadcast: { ack: true }
      }
    });
    
    ch.subscribe((state, err) => {
      if (state === 'SUBSCRIBED') {
        setStatus('connected');
        setChannel(ch);
      } else {
        setStatus('offline');
      }
    });
  };

  const dispatchAction = useCallback((action: any) => {
    if (!channel || !secretKey) return;

    // Vibrate phone for feedback
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }

    channel.send({
      type: 'broadcast',
      event: 'action',
      payload: {
        key: secretKey,
        action,
      },
    }).then((res: any) => {
        if (res === 'ok') {
            showFeedback('Action sent!');
        } else {
            showFeedback('Failed to send!');
        }
    });
  }, [channel, secretKey]);

  const showFeedback = (msg: string) => {
      setActionFeedback(msg);
      setTimeout(() => setActionFeedback(null), 1500);
  };

  // Missing config UI
  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h1 className="text-xl font-bold mb-2">Vercel Setup Required</h1>
        <p className="text-zinc-400 text-sm">
          You must set <code className="bg-zinc-800 px-1 rounded text-red-300">VITE_SUPABASE_URL</code> and <code className="bg-zinc-800 px-1 rounded text-red-300">VITE_SUPABASE_ANON_KEY</code> in your environment variables.
        </p>
      </div>
    );
  }

  // Missing Pairing UI
  if (!roomId || !secretKey) {
    return (
      <div className="min-h-screen bg-bg text-slate-800 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-white shadow-xl rounded-2xl flex items-center justify-center mb-6">
          <Wand2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-black mb-3">Not Paired</h1>
        <p className="text-slate-500 mb-8 max-w-xs">
          Open the Settings panel in Mission Control and scan the Remote Control QR code.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-12">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-200/50 sticky top-0 z-10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-primary" />
          </div>
          <span className="font-black text-slate-800 tracking-wide uppercase text-sm">Remote</span>
        </div>
        
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">
                {status === 'connected' ? '🟢 Online' : status === 'connecting' ? '🟡 Connecting' : '🔴 Offline'}
            </span>
            {status !== 'connected' && (
                <button 
                    onClick={() => connectRealtime(roomId)}
                    className="p-1.5 bg-slate-100 rounded-lg"
                >
                    <RefreshCw className="w-3 h-3 text-slate-500" />
                </button>
            )}
        </div>
      </header>

      {/* Main Controls */}
      <main className="p-5 flex flex-col gap-6">
        
        {/* Game Tokens */}
        <section>
          <h2 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-widest px-1">Game Tokens</h2>
          <div className="grid grid-cols-2 gap-3">
            <ControlButton 
              icon={<Plus className="w-5 h-5 text-emerald-600" />} 
              label="Add Token" 
              onClick={() => dispatchAction({ type: 'GRANT_GAME_TOKEN', force: true })} 
              bg="bg-emerald-50"
              border="border-emerald-200"
            />
            <ControlButton 
              icon={<Minus className="w-5 h-5 text-rose-600" />} 
              label="Remove Token" 
              onClick={() => dispatchAction({ type: 'CONSUME_GAME_TOKEN' })} 
              bg="bg-rose-50"
              border="border-rose-200"
            />
             <ControlButton 
              icon={<RotateCcw className="w-5 h-5 text-slate-600" />} 
              label="Reset All" 
              onClick={() => dispatchAction({ type: 'RESET_GAME_TOKENS' })} 
              bg="bg-white"
              border="border-slate-200"
              fullWidth
            />
          </div>
        </section>

        {/* Missions */}
        <section>
          <h2 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-widest px-1">Missions</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <ControlButton 
              icon={<Sun className="w-5 h-5 text-amber-600" />} 
              label="Trigger Morning" 
              onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: 'morning' })} 
              bg="bg-amber-50"
              border="border-amber-200"
            />
            <ControlButton 
              icon={<Moon className="w-5 h-5 text-indigo-600" />} 
              label="Trigger Evening" 
              onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: 'evening' })} 
              bg="bg-indigo-50"
              border="border-indigo-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
             <ControlButton 
              icon={<Clock className="w-5 h-5 text-blue-600" />} 
              label="+10 Mins" 
              onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'morning', deltaMinutes: 10 })} 
              bg="bg-blue-50"
              border="border-blue-200"
            />
            <ControlButton 
              icon={<Clock className="w-5 h-5 text-orange-600" />} 
              label="-10 Mins" 
              onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'morning', deltaMinutes: -10 })} 
              bg="bg-orange-50"
              border="border-orange-200"
            />
          </div>
        </section>

        {/* Fun */}
        <section>
          <h2 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-widest px-1">Fun & Special</h2>
          <div className="grid grid-cols-2 gap-3">
            <ControlButton 
              icon={<Wand2 className="w-5 h-5 text-fuchsia-600" />} 
              label="Fireworks" 
              onClick={() => dispatchAction({ type: 'TRIGGER_ANIMATION', animation: 'fireworks' })} 
              bg="bg-fuchsia-50"
              border="border-fuchsia-200"
            />
            <ControlButton 
              icon={<PartyPopper className="w-5 h-5 text-teal-600" />} 
              label="Confetti" 
              onClick={() => dispatchAction({ type: 'TRIGGER_ANIMATION', animation: 'confetti' })} 
              bg="bg-teal-50"
              border="border-teal-200"
            />
            <ControlButton 
              icon={<AlertCircle className="w-5 h-5 text-red-600" />} 
              label="Cheat Trap" 
              onClick={() => dispatchAction({ type: 'CHEAT_ATTEMPT' })} 
              bg="bg-red-50"
              border="border-red-200"
              fullWidth
            />
          </div>
        </section>
      </main>

      {/* Floating Action Feedback */}
      <AnimatePresence>
          {actionFeedback && (
              <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full font-bold text-sm shadow-xl flex items-center gap-2"
              >
                  <Check className="w-4 h-4 text-emerald-400" />
                  {actionFeedback}
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}

function ControlButton({ icon, label, onClick, bg = "bg-white", border = "border-slate-200", fullWidth = false }: any) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        ${bg} ${border} border-[1.5px] rounded-xl p-4
        flex flex-col items-center justify-center gap-3
        shadow-sm
        ${fullWidth ? 'col-span-2 flex-row' : ''}
      `}
    >
      <div className="bg-white/50 p-2 rounded-full">
        {icon}
      </div>
      <span className="font-bold text-slate-700 text-sm">{label}</span>
    </motion.button>
  );
}

export default App;
