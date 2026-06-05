import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, RefreshCw, Wand2, Gamepad2 } from 'lucide-react';
import { useRemoteControl } from './hooks/useRemoteControl';
import { MainController } from './components/MainController';
import { SnakeController } from './components/SnakeController';

export default function App() {
  const { 
    config, 
    status, 
    actionFeedback, 
    loadingActions, 
    gameState,
    dispatchAction, 
    reconnect,
    isConfigured 
  } = useRemoteControl();

  const [view, setView] = useState<'main' | 'snake'>('main');

  const snakeGameActive = gameState?.snakeGameActive;

  // Auto-switch remote view based on host game state transitions
  useEffect(() => {
    if (typeof snakeGameActive === 'boolean') {
      const targetView = snakeGameActive ? 'snake' : 'main';
      const timer = setTimeout(() => {
        setView(targetView);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [snakeGameActive]);

  if (!isConfigured) return <SetupRequiredScreen />;
  if (!config) return <NotPairedScreen />;

  if (view === 'snake') {
    return <SnakeController dispatchAction={dispatchAction} onBack={() => setView('main')} />;
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header status={status} onReconnect={reconnect} onOpenSnake={() => setView('snake')} />

      <MainController 
        gameState={gameState} 
        loadingActions={loadingActions} 
        dispatchAction={dispatchAction} 
      />

      <FeedbackOverlay message={actionFeedback} />
    </div>
  );
}

function Header({ status, onReconnect, onOpenSnake }: { status: string; onReconnect: () => void; onOpenSnake: () => void }) {
  return (
    <header className="bg-white/80 backdrop-blur border-b border-slate-200/50 sticky top-0 z-20 px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm">📱</span>
        </div>
        <div className="flex flex-col">
          <span className="font-black text-slate-800 tracking-wide uppercase text-sm leading-none">Remote</span>
          <span className="text-[9px] text-slate-400 font-mono mt-0.5">v1.5.0</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={onOpenSnake} 
          className="p-1.5 bg-slate-100 rounded-lg active:bg-slate-200 transition-colors mr-2"
        >
          <Gamepad2 className="w-4 h-4 text-slate-500" />
        </button>
        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">
          {status === 'connected' ? '🟢 Live' : status === 'connecting' ? '🟡 Connecting' : '🔴 Offline'}
        </span>
        {status !== 'connected' && (
          <button 
            onClick={onReconnect}
            className="p-1.5 bg-slate-100 rounded-lg active:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-slate-500" />
          </button>
        )}
      </div>
    </header>
  );
}

function FeedbackOverlay({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full font-black text-sm shadow-2xl flex items-center gap-3 z-50 border border-slate-700/50"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SetupRequiredScreen() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
      <h1 className="text-xl font-bold mb-2">Vercel Setup Required</h1>
      <p className="text-zinc-400 text-sm">
        You must set <code className="bg-zinc-800 px-1 rounded text-red-300">VITE_SUPABASE_URL</code> and <code className="bg-zinc-800 px-1 rounded text-red-300">VITE_SUPABASE_ANON_KEY</code>.
      </p>
    </div>
  );
}

function NotPairedScreen() {
  return (
    <div className="min-h-screen bg-bg text-slate-800 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-white shadow-xl rounded-2xl flex items-center justify-center mb-6">
        <Wand2 className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-2xl font-black mb-3">Not Paired</h1>
      <p className="text-slate-500 mb-8 max-w-xs">
        Open Settings in Mission Control and scan the Remote Control QR code.
      </p>
    </div>
  );
}

