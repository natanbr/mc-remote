import { Plus, Minus, Sun, Moon, RotateCcw, Clock, Wand2, Check, AlertCircle, RefreshCw, ThumbsUp, VolumeX, Frown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRemoteControl } from './hooks/useRemoteControl';
import { ControlButton } from './components/ControlButton';
import { Section } from './components/Section';

export default function App() {
  const { 
    config, 
    status, 
    actionFeedback, 
    loadingActions, 
    dispatchAction, 
    reconnect,
    isConfigured 
  } = useRemoteControl();

  if (!isConfigured) return <SetupRequiredScreen />;
  if (!config) return <NotPairedScreen />;

  return (
    <div className="min-h-screen bg-bg pb-12">
      <Header status={status} onReconnect={reconnect} />

      <main className="p-5 flex flex-col gap-8">
        <Section title="Bank Tokens (Wealth)">
          <div className="grid grid-cols-3 gap-3">
            <ControlButton 
              icon={<Plus className="w-5 h-5 text-indigo-600" />} 
              label="+1" 
              loading={loadingActions.has('bank-add-1')}
              onClick={() => dispatchAction({ type: 'ADD_TOKENS', amount: 1, source: 'manual' }, 'bank-add-1')} 
              bg="bg-indigo-50"
              border="border-indigo-100"
            />
            <ControlButton 
              icon={<Plus className="w-5 h-5 text-indigo-700" />} 
              label="+5" 
              loading={loadingActions.has('bank-add-5')}
              onClick={() => dispatchAction({ type: 'ADD_TOKENS', amount: 5, source: 'manual' }, 'bank-add-5')} 
              bg="bg-indigo-100/50"
              border="border-indigo-200"
            />
            <ControlButton 
              icon={<Minus className="w-5 h-5 text-slate-500" />} 
              label="-1" 
              loading={loadingActions.has('bank-rem-1')}
              onClick={() => dispatchAction({ type: 'REMOVE_TOKEN' }, 'bank-rem-1')} 
              bg="bg-slate-100"
              border="border-slate-200"
            />
          </div>
        </Section>

        <Section title="Responsibilities">
          <div className="grid grid-cols-2 gap-3">
            <ControlButton 
              icon={<RotateCcw className="w-5 h-5 text-emerald-600" />} 
              label="Recycling +1" 
              loading={loadingActions.has('resp-recycling')}
              onClick={() => dispatchAction({ type: 'ADD_RESPONSIBILITY_POINT', taskId: 'recycling' }, 'resp-recycling')} 
              bg="bg-emerald-50"
              border="border-emerald-100"
            />
            <ControlButton 
              icon={<RotateCcw className="w-5 h-5 text-amber-600" />} 
              label="Activity +1" 
              loading={loadingActions.has('resp-activity')}
              onClick={() => dispatchAction({ type: 'ADD_RESPONSIBILITY_POINT', taskId: 'activity' }, 'resp-activity')} 
              bg="bg-amber-50"
              border="border-amber-100"
            />
          </div>
        </Section>

        <Section title="Game Tokens (Max 5)">
          <div className="grid grid-cols-2 gap-3">
            <ControlButton 
              icon={<Plus className="w-5 h-5 text-teal-600" />} 
              label="Grant Token" 
              loading={loadingActions.has('game-grant')}
              onClick={() => dispatchAction({ type: 'GRANT_GAME_TOKEN', force: true }, 'game-grant')} 
              bg="bg-teal-50"
              border="border-teal-100"
            />
            <ControlButton 
              icon={<Minus className="w-5 h-5 text-rose-600" />} 
              label="Use Token" 
              loading={loadingActions.has('game-use')}
              onClick={() => dispatchAction({ type: 'CONSUME_GAME_TOKEN' }, 'game-use')} 
              bg="bg-rose-50"
              border="border-rose-100"
            />
            <ControlButton 
              icon={<RotateCcw className="w-4 h-4 text-slate-400" />} 
              label="Reset Tokens" 
              loading={loadingActions.has('game-reset')}
              onClick={() => dispatchAction({ type: 'RESET_GAME_TOKENS' }, 'game-reset')} 
              bg="bg-white"
              border="border-slate-200"
              fullWidth
            />
          </div>
        </Section>

        <Section title="Mission Control">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <ControlButton 
              icon={<Frown className="w-5 h-5 text-red-600" />} 
              label="AM -1 Whining" 
              loading={loadingActions.has('whining-morning')}
              onClick={() => dispatchAction({ type: 'TOGGLE_WHINING', missionPhase: 'morning', lockedFromUI: true }, 'whining-morning')} 
              bg="bg-red-50"
              border="border-red-100"
            />
            <ControlButton 
              icon={<Frown className="w-5 h-5 text-red-600" />} 
              label="PM -1 Whining" 
              loading={loadingActions.has('whining-evening')}
              onClick={() => dispatchAction({ type: 'TOGGLE_WHINING', missionPhase: 'evening', lockedFromUI: true }, 'whining-evening')} 
              bg="bg-red-50"
              border="border-red-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <ControlButton 
              icon={<Sun className="w-5 h-5 text-amber-600" />} 
              label="Start Morning" 
              loading={loadingActions.has('mission-morning')}
              onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: 'morning' }, 'mission-morning')} 
              bg="bg-amber-50"
              border="border-amber-100"
            />
            <ControlButton 
              icon={<Moon className="w-5 h-5 text-indigo-600" />} 
              label="Start Evening" 
              loading={loadingActions.has('mission-evening')}
              onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: 'evening' }, 'mission-evening')} 
              bg="bg-indigo-50"
              border="border-indigo-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ControlButton 
              icon={<Clock className="w-5 h-5 text-blue-600" />} 
              label="+10 Mins" 
              loading={loadingActions.has('mission-plus')}
              onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'morning', deltaMinutes: 10 }, 'mission-plus')} 
              bg="bg-blue-50"
              border="border-blue-100"
            />
            <ControlButton 
              icon={<Clock className="w-5 h-5 text-orange-600" />} 
              label="-10 Mins" 
              loading={loadingActions.has('mission-minus')}
              onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'morning', deltaMinutes: -10 }, 'mission-minus')} 
              bg="bg-orange-50"
              border="border-orange-100"
            />
          </div>
        </Section>

        <Section title="Special Effects">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <ControlButton 
              icon={<ThumbsUp className="w-5 h-5 text-emerald-600" />} 
              label="Good Job!" 
              loading={loadingActions.has('fx-good-job')}
              onClick={() => dispatchAction({ type: 'TRIGGER_ANIMATION', animation: 'good-job' }, 'fx-good-job')} 
              bg="bg-emerald-50"
              border="border-emerald-100"
            />
            <ControlButton 
              icon={<VolumeX className="w-5 h-5 text-orange-600" />} 
              label="Too Loud" 
              loading={loadingActions.has('fx-too-loud')}
              onClick={() => dispatchAction({ type: 'TRIGGER_ANIMATION', animation: 'too-loud' }, 'fx-too-loud')} 
              bg="bg-orange-50"
              border="border-orange-100"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 mb-3">
            <ControlButton 
              icon={<Sparkles className="w-5 h-5 text-fuchsia-600" />} 
              label="Party Time" 
              loading={loadingActions.has('fx-party')}
              onClick={() => dispatchAction({ type: 'TRIGGER_ANIMATION', animation: 'confetti-fireworks' }, 'fx-party')} 
              bg="bg-fuchsia-50"
              border="border-fuchsia-100"
              fullWidth
            />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <ControlButton 
              icon={<AlertCircle className="w-5 h-5 text-red-600" />} 
              label="No! \u261D\ufe0f" 
              loading={loadingActions.has('fx-cheat')}
              onClick={() => dispatchAction({ type: 'CHEAT_ATTEMPT' }, 'fx-cheat')} 
              bg="bg-red-50"
              border="border-red-100"
              fullWidth
            />
          </div>
        </Section>
      </main>

      <FeedbackOverlay message={actionFeedback} />
    </div>
  );
}

function Header({ status, onReconnect }: { status: string; onReconnect: () => void }) {
  return (
    <header className="bg-white/80 backdrop-blur border-b border-slate-200/50 sticky top-0 z-20 px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Wand2 className="w-4 h-4 text-primary" />
        </div>
        <span className="font-black text-slate-800 tracking-wide uppercase text-sm">Remote</span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">
          {status === 'connected' ? '🟢 Online' : status === 'connecting' ? '🟡 Connecting' : '🔴 Offline'}
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
