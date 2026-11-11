import { useState } from 'react';
import { Play, RotateCcw, Square } from 'lucide-react';
import type { RemoteAction, RemoteMission } from '../types';
import { missionSessionAction } from './missionSessionAction';

interface MissionSessionControlsProps {
  phase: RemoteMission['phase'];
  active: boolean;
  attemptedToday: boolean;
  activeMission: RemoteMission['phase'] | 'none' | undefined;
  connected: boolean;
  loadingActions: Set<string>;
  startColor: string;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

const controlClass = 'py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800';

export function MissionSessionControls({ phase, active, attemptedToday, activeMission, connected, loadingActions, startColor, dispatchAction }: MissionSessionControlsProps) {
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const kind = active ? 'restart' : 'start';
  const action = missionSessionAction({ kind, phase, activeMission, connected, loadingActions });
  const stopAction = missionSessionAction({ kind: 'stop', phase, activeMission, connected, loadingActions, missionActive: active });
  const sessionId = `${phase}-${kind}`;

  const startSession = () => {
    if (!action) return;
    if (active) {
      setConfirmingRestart(true);
      return;
    }
    dispatchAction(action, sessionId);
  };

  const confirmRestart = () => {
    if (!action || !active) return;
    setConfirmingRestart(false);
    dispatchAction(action, sessionId);
  };

  return (
    <div className="flex flex-col gap-2">
      {active && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => stopAction && dispatchAction(stopAction, `${phase}-stop`)}
            disabled={!stopAction}
            className={`${controlClass} bg-slate-800 hover:bg-slate-900 text-white`}
          >
            <Square className="w-3 h-3 fill-current" />
            Stop
          </button>
          <button
            type="button"
            onClick={() => dispatchAction({ type: 'RESET_MISSION', missionPhase: phase }, `${phase}-reset`)}
            disabled={!action}
            className={`${controlClass} bg-white hover:bg-slate-50 border border-slate-200 text-slate-700`}
          >
            <RotateCcw className="w-3 h-3" />
            Reset tasks
          </button>
        </div>
      )}
      {confirmingRestart && active ? (
        <div role="group" aria-label="Restart confirmation" className="rounded-xl border border-slate-300 bg-white p-3 space-y-3">
          <p className="text-xs font-semibold text-slate-700">Restart with a fresh timer and checklist? Earlier misses still count.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmingRestart(false)} className={`${controlClass} border border-slate-300 text-slate-700 hover:bg-slate-50`}>
              Cancel
            </button>
            <button type="button" onClick={confirmRestart} disabled={!action} className={`${controlClass} ${startColor} hover:shadow-md`}>
              Restart now
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startSession}
          disabled={!action}
          className={`${controlClass} w-full shadow-sm hover:shadow-md ${startColor}`}
        >
          {active ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          {active ? 'Restart session' : attemptedToday ? 'Start another session' : 'Start mission'}
        </button>
      )}
      {!connected && <p className="text-xs text-slate-500">Connect to the desktop to start or restart a session.</p>}
      {connected && activeMission === undefined && <p className="text-xs text-slate-500">Waiting for desktop mission state.</p>}
    </div>
  );
}
