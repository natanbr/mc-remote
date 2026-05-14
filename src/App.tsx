import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, RefreshCw, Wand2 } from 'lucide-react';
import { ControlButton } from './components/ControlButton';
import { Section } from './components/Section';
import { useRemoteControl } from './hooks/useRemoteControl';

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

  const recycling = gameState?.responsibilities?.find((r: { id: string }) => r.id === 'recycling');
  const activity = gameState?.responsibilities?.find((r: { id: string }) => r.id === 'activity');

  if (!isConfigured) return <SetupRequiredScreen />;
  if (!config) return <NotPairedScreen />;

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header status={status} onReconnect={reconnect} />

      <main className="p-5 flex flex-col gap-14">
        
        {/* BANK TOKENS */}
        <Section 
          title={
            <div className="flex items-center justify-between w-full">
              <span>Bank Tokens</span>
              {gameState?.bankCount !== undefined && (
                <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-black">
                  {gameState.bankCount} 🪙
                </span>
              )}
            </div>
          }
        >
          <div className="grid grid-cols-4 gap-3">
            <ControlButton 
              icon={<span className="text-xl">⭐</span>} 
              label="+1" 
              loading={loadingActions.has('bank-add-1')}
              onClick={() => dispatchAction({ type: 'ADD_TOKENS', amount: 1, source: 'manual' }, 'bank-add-1')} 
              bg="bg-indigo-50"
              border="border-indigo-100"
            />
            <ControlButton 
              icon={<span className="text-xl">⭐</span>} 
              label="+5" 
              loading={loadingActions.has('bank-add-5')}
              onClick={() => dispatchAction({ type: 'ADD_TOKENS', amount: 5, source: 'manual' }, 'bank-add-5')} 
              bg="bg-indigo-100/50"
              border="border-indigo-200"
            />
            <ControlButton 
              icon={<span className="text-xl">⭐</span>} 
              label="+10" 
              loading={loadingActions.has('bank-add-10')}
              onClick={() => dispatchAction({ type: 'ADD_TOKENS', amount: 10, source: 'manual' }, 'bank-add-10')} 
              bg="bg-indigo-200/50"
              border="border-indigo-300"
            />
            <ControlButton 
              icon={<span className="text-xl">❌</span>} 
              label="-1" 
              loading={loadingActions.has('bank-rem-1')}
              onClick={() => dispatchAction({ type: 'REMOVE_TOKEN' }, 'bank-rem-1')} 
              bg="bg-slate-100"
              border="border-slate-200"
            />
          </div>
        </Section>

        {/* RESPONSIBILITIES & GAME TOKENS */}
        <Section title="Responsibilities & Game Tokens">
          <div className="grid grid-cols-4 gap-x-3 gap-y-4">
            
            {/* Recycling Card */}
            <div className="col-span-2 grid grid-cols-[1fr_auto] grid-rows-2 gap-x-2 bg-emerald-50/40 p-2.5 rounded-2xl border border-emerald-100/60 shadow-sm">
               <div className="flex flex-col justify-center">
                  <div className="text-[10px] font-black uppercase text-emerald-600/60 tracking-tight pl-1">♻️ Recycling</div>
                  <div className="text-base font-black text-emerald-800 pl-1 leading-none mt-1">
                    {recycling?.pointsEarned ?? 0} <span className="text-[10px] opacity-40">/</span> {recycling?.pointsRequired ?? 3}
                  </div>
               </div>
               <ControlButton 
                 icon={<span className="text-lg">➕</span>} 
                 label="+1" 
                 loading={loadingActions.has('resp-recycling-plus')}
                 onClick={() => dispatchAction({ type: 'ADD_RESPONSIBILITY_POINT', taskId: 'recycling', amount: 1 }, 'resp-recycling-plus')} 
                 bg="bg-emerald-50"
                 border="border-emerald-200"
                 className="row-span-2 h-full min-w-[56px] !p-0"
               />
            </div>

            {/* Activity Card */}
            <div className="col-span-2 grid grid-cols-[1fr_auto] grid-rows-2 gap-x-2 bg-blue-50/40 p-2.5 rounded-2xl border border-blue-100/60 shadow-sm">
               <div className="flex flex-col justify-center">
                  <div className="text-[10px] font-black uppercase text-blue-600/60 tracking-tight pl-1">🛼 Activity</div>
                  <div className="text-base font-black text-blue-800 pl-1 leading-none mt-1">
                    {activity?.pointsEarned ?? 0} <span className="text-[10px] opacity-40">/</span> {activity?.pointsRequired ?? 3}
                  </div>
               </div>
               <ControlButton 
                 icon={<span className="text-lg">➕</span>} 
                 label="+1" 
                 loading={loadingActions.has('resp-activity-plus')}
                 onClick={() => dispatchAction({ type: 'ADD_RESPONSIBILITY_POINT', taskId: 'activity', amount: 1 }, 'resp-activity-plus')} 
                 bg="bg-blue-50"
                 border="border-blue-200"
                 className="row-span-2 h-full min-w-[56px] !p-0"
               />
            </div>

            {/* Game Token Buttons */}
            <div className="col-span-4 grid grid-cols-[1fr_auto] gap-x-3 bg-teal-50/40 p-2.5 rounded-2xl border border-teal-100/60 shadow-sm mt-1">
               <div className="flex flex-col justify-center">
                  <div className="text-[10px] font-black uppercase text-teal-600/60 tracking-tight pl-1">🎮 Game Tokens</div>
                  <div className="text-base font-black text-teal-800 pl-1 leading-none mt-1">
                    {gameState?.gameTokens ?? 0} <span className="text-[10px] opacity-40">/</span> 5
                  </div>
               </div>
               <div className="flex gap-2">
                 <ControlButton 
                   icon={<span className="text-lg">➕</span>} 
                   label="Add" 
                   loading={loadingActions.has('game-grant')}
                   onClick={() => dispatchAction({ type: 'GRANT_GAME_TOKEN', force: true }, 'game-grant')} 
                   bg="bg-teal-50"
                   border="border-teal-200"
                   className="h-full min-w-[56px] !p-0"
                 />
                 <ControlButton 
                   icon={<span className="text-lg">➖</span>} 
                   label="Use" 
                   loading={loadingActions.has('game-use')}
                   onClick={() => dispatchAction({ type: 'CONSUME_GAME_TOKEN' }, 'game-use')} 
                   bg="bg-teal-50"
                   border="border-teal-200"
                   className="h-full min-w-[56px] !p-0"
                 />
               </div>
            </div>
          </div>
        </Section>

        {/* MISSIONS */}
        <Section title="Missions">
          <div className="grid grid-cols-4 gap-x-3 gap-y-8">
            
            {/* Morning Labels */}
            <div className="col-span-2 flex items-center gap-2 text-[11px] font-black uppercase text-amber-500 tracking-tight pl-1">
              ☀️ Morning
            </div>
            {/* Evening Labels */}
            <div className="col-span-2 flex items-center gap-2 text-[11px] font-black uppercase text-indigo-500 tracking-tight pl-1">
              🌙 Evening
            </div>

            {/* Morning Start/Stop */}
            <ControlButton 
              icon={<span className="text-xl">▶️</span>} 
              label="Start" 
              loading={loadingActions.has('mission-m-start')}
              onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: 'morning' }, 'mission-m-start')} 
              bg="bg-amber-50"
              border="border-amber-100"
            />
            <ControlButton 
              icon={<span className="text-xl">⏹️</span>} 
              label="Stop" 
              loading={loadingActions.has('mission-m-stop')}
              onClick={() => dispatchAction({ type: 'CANCEL_MISSION', missionPhase: 'morning' }, 'mission-m-stop')} 
              bg="bg-amber-50"
              border="border-amber-100"
            />

            {/* Evening Start/Stop */}
            <ControlButton 
              icon={<span className="text-xl">▶️</span>} 
              label="Start" 
              loading={loadingActions.has('mission-e-start')}
              onClick={() => dispatchAction({ type: 'SET_ACTIVE_MISSION', phase: 'evening' }, 'mission-e-start')} 
              bg="bg-indigo-50"
              border="border-indigo-100"
            />
            <ControlButton 
              icon={<span className="text-xl">⏹️</span>} 
              label="Stop" 
              loading={loadingActions.has('mission-e-stop')}
              onClick={() => dispatchAction({ type: 'CANCEL_MISSION', missionPhase: 'evening' }, 'mission-e-stop')} 
              bg="bg-indigo-50"
              border="border-indigo-100"
            />

            {/* Morning Time Adjustments */}
            <div className="col-span-2 grid grid-cols-3 gap-2">
              <ControlButton 
                icon={<span className="text-sm">➕1</span>} 
                label="Min" 
                loading={loadingActions.has('m-time-1')}
                onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'morning', deltaMinutes: 1 }, 'm-time-1')} 
                bg="bg-amber-50/50"
              />
              <ControlButton 
                icon={<span className="text-sm">➕5</span>} 
                label="Min" 
                loading={loadingActions.has('m-time-5')}
                onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'morning', deltaMinutes: 5 }, 'm-time-5')} 
                bg="bg-amber-50/50"
              />
              <ControlButton 
                icon={<span className="text-sm">➕10</span>} 
                label="Min" 
                loading={loadingActions.has('m-time-10')}
                onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'morning', deltaMinutes: 10 }, 'm-time-10')} 
                bg="bg-amber-50/50"
              />
            </div>

            {/* Evening Time Adjustments */}
            <div className="col-span-2 grid grid-cols-3 gap-2">
              <ControlButton 
                icon={<span className="text-sm">➖1</span>} 
                label="Min" 
                loading={loadingActions.has('e-time-1')}
                onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'evening', deltaMinutes: -1 }, 'e-time-1')} 
                bg="bg-indigo-50/50"
              />
              <ControlButton 
                icon={<span className="text-sm">➖5</span>} 
                label="Min" 
                loading={loadingActions.has('e-time-5')}
                onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'evening', deltaMinutes: -5 }, 'e-time-5')} 
                bg="bg-indigo-50/50"
              />
              <ControlButton 
                icon={<span className="text-sm">➖10</span>} 
                label="Min" 
                loading={loadingActions.has('e-time-10')}
                onClick={() => dispatchAction({ type: 'ADJUST_MISSION_END', missionPhase: 'evening', deltaMinutes: -10 }, 'e-time-10')} 
                bg="bg-indigo-50/50"
              />
            </div>

            {/* Morning Footer */}
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <ControlButton 
                icon={<span className="text-xl">🔄</span>} 
                label="Reset" 
                loading={loadingActions.has('m-reset')}
                onClick={() => dispatchAction({ type: 'RESET_MISSION', missionPhase: 'morning' }, 'm-reset')} 
                bg="bg-slate-50"
              />
              <ControlButton 
                icon={<span className="text-xl">😱</span>} 
                label="Whining" 
                loading={loadingActions.has('m-whine')}
                onClick={() => dispatchAction({ type: 'TOGGLE_WHINING', missionPhase: 'morning', lockedFromUI: true }, 'm-whine')} 
                bg="bg-red-50"
              />
            </div>

            {/* Evening Footer */}
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <ControlButton 
                icon={<span className="text-xl">🔄</span>} 
                label="Reset" 
                loading={loadingActions.has('e-reset')}
                onClick={() => dispatchAction({ type: 'RESET_MISSION', missionPhase: 'evening' }, 'e-reset')} 
                bg="bg-slate-50"
              />
              <ControlButton 
                icon={<span className="text-xl">😱</span>} 
                label="Whining" 
                loading={loadingActions.has('e-whine')}
                onClick={() => dispatchAction({ type: 'TOGGLE_WHINING', missionPhase: 'evening', lockedFromUI: true }, 'e-whine')} 
                bg="bg-red-50"
              />
            </div>

          </div>
        </Section>

        {/* EFFECTS */}
        <Section title="Effects">
          <div className="grid grid-cols-4 gap-x-3 gap-y-2">
            {/* Labels */}
            <div className="col-span-2 text-[10px] font-black uppercase text-emerald-500 tracking-tight pl-1">Positive</div>
            <div className="col-span-2 text-[10px] font-black uppercase text-red-500 tracking-tight pl-1">Negative</div>

            {/* Positive */}
            <ControlButton 
              icon={<span className="text-xl">😊👍</span>} 
              label="Good Job" 
              loading={loadingActions.has('fx-good-job')}
              onClick={() => dispatchAction({ type: 'TRIGGER_ANIMATION', animation: 'good-job' }, 'fx-good-job')} 
              bg="bg-emerald-50"
              border="border-emerald-100"
            />
            <ControlButton 
              icon={<span className="text-xl">🎉</span>} 
              label="Confetti" 
              loading={loadingActions.has('fx-confetti')}
              onClick={() => dispatchAction({ type: 'TRIGGER_ANIMATION', animation: 'confetti' }, 'fx-confetti')} 
              bg="bg-emerald-50"
              border="border-emerald-100"
            />

            {/* Negative */}
            <ControlButton 
              icon={<span className="text-xl">😱</span>} 
              label="Too Loud" 
              loading={loadingActions.has('fx-too-loud')}
              onClick={() => dispatchAction({ type: 'TRIGGER_ANIMATION', animation: 'too-loud' }, 'fx-too-loud')} 
              bg="bg-red-50"
              border="border-red-100"
            />
            <ControlButton 
              icon={<span className="text-xl">☝️</span>} 
              label="No" 
              loading={loadingActions.has('fx-cheat')}
              onClick={() => dispatchAction({ type: 'CHEAT_ATTEMPT' }, 'fx-cheat')} 
              bg="bg-red-50"
              border="border-red-100"
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
          <span className="text-sm">📱</span>
        </div>
        <div className="flex flex-col">
          <span className="font-black text-slate-800 tracking-wide uppercase text-sm leading-none">Remote</span>
          <span className="text-[9px] text-slate-400 font-mono mt-0.5">v1.5.0</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
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
