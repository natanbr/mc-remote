import { ControlButton } from './ControlButton';
import { Section } from './Section';
import { ResponsibilitiesSection } from './ResponsibilitiesSection';
import { MissionsSection } from './MissionsSection';
import { PrivilegesSection } from './PrivilegesSection';
import { ActivityLogsSection } from './ActivityLogsSection';
import type { RemoteAction, PrivilegeCard, RemoteMission } from '../types';

const REACTION_EMOJIS = [
  { id: 'clap', codepoint: '1f44f', label: 'Clap', fallback: '👏' },
  { id: 'thumbs-up', codepoint: '1f44d', label: 'Like', fallback: '👍' },
  { id: 'slightly-happy', codepoint: '1f642', label: 'Smile', fallback: '🙂' },
  { id: 'triumph', codepoint: '1f624', label: 'Triumph', fallback: '😤' },
  { id: 'scrunched', codepoint: '1f616', label: 'Ouch', fallback: '😖' },
  { id: 'shaking-face', codepoint: '1fae8', label: 'Shook', fallback: '🫨' },
  { id: 'hear-no-evil', codepoint: '1f649', label: 'Hear-no-evil', fallback: '🙉' },
  { id: 'hourglass', codepoint: '23f3', label: 'Wait', fallback: '⏳' },
  { id: 'check-mark', codepoint: '2705', label: 'Yes', fallback: '✅' },
  { id: 'cross-mark', codepoint: '274c', label: 'No', fallback: '❌' },
];

interface RemoteGameState {
  bankCount?: number;
  gameTokens?: number;
  activeMission?: 'morning' | 'evening' | 'none';
  missionStartedAt?: string | null;
  missionDurationMins?: number | null;
  whiningDetected?: boolean;
  missionTasks?: Array<{ id: string; label: string; icon: string; completed: boolean; locked: boolean }>;
  activityLogs?: Array<{
    id: string;
    timestamp: string;
    icon: string;
    message: string;
    delta?: number;
    type: string;
    colorKey?: string;
    isRemote?: boolean;
  }>;
  responsibilities?: Array<{ id: string; pointsEarned: number; pointsRequired: number }>;
  privileges?: PrivilegeCard[];
  missions?: RemoteMission[];
  lastCompletedOrFailedMorningDate?: string | null;
  lastCompletedOrFailedEveningDate?: string | null;
}

interface MainControllerProps {
  gameState: Record<string, unknown> | null;
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

export function MainController({ gameState, loadingActions, dispatchAction }: MainControllerProps) {
  const state = gameState as RemoteGameState | null;
  const recycling = state?.responsibilities?.find((r) => r.id === 'recycling');
  const activity = state?.responsibilities?.find((r) => r.id === 'activity');

  return (
    <main className="p-5 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
      {/* Left Column */}
      <div className="flex flex-col gap-8 w-full max-w-md md:max-w-none mx-auto">
        {/* 1. EFFECTS */}
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

        {/* REACTIONS */}
        <Section title="Reactions">
          <div className="grid grid-cols-5 gap-2">
            {REACTION_EMOJIS.map((emoji) => (
              <ControlButton
                key={emoji.id}
                icon={
                  <picture className="pointer-events-none select-none flex items-center justify-center">
                    <source srcSet={`https://fonts.gstatic.com/s/e/notoemoji/latest/${emoji.codepoint}/512.webp`} type="image/webp" />
                    <img 
                      src={`https://fonts.gstatic.com/s/e/notoemoji/latest/${emoji.codepoint}/512.gif`} 
                      alt={emoji.fallback} 
                      className="w-10 h-10 object-contain" 
                    />
                  </picture>
                }
                label={emoji.label}
                loading={loadingActions.has(`fx-${emoji.id}`)}
                onClick={() => dispatchAction({ type: 'TRIGGER_ANIMATION', animation: emoji.id }, `fx-${emoji.id}`)}
                bg="bg-slate-50"
                border="border-slate-100"
                className="!p-2 rounded-xl [&_span]:text-[9px] [&_span]:tracking-tighter"
              />
            ))}
          </div>
        </Section>


        {/* 2. MISSIONS */}
        <MissionsSection 
          activeMission={state?.activeMission}
          missionStartedAt={state?.missionStartedAt}
          missionDurationMins={state?.missionDurationMins}
          whiningDetected={state?.whiningDetected}
          missionTasks={state?.missionTasks}
          missions={state?.missions}
          lastCompletedOrFailedMorningDate={state?.lastCompletedOrFailedMorningDate}
          lastCompletedOrFailedEveningDate={state?.lastCompletedOrFailedEveningDate}
          loadingActions={loadingActions}
          dispatchAction={dispatchAction}
        />
      </div>

      {/* Right Column */}
      <div className="flex flex-col gap-8 w-full max-w-md md:max-w-none mx-auto">
        {/* 3. TOKEN MANAGEMENT: BANK TOKENS */}
        <Section 
          title={
            <div className="flex items-center justify-between w-full">
              <span>Bank Tokens</span>
              {state?.bankCount !== undefined && (
                <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-black">
                  {state.bankCount} 🪙
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

        {/* 4. PRIVILEGES */}
        <PrivilegesSection
          privileges={state?.privileges}
          loadingActions={loadingActions}
          dispatchAction={dispatchAction}
        />

        {/* 5. TOKEN MANAGEMENT: RESPONSIBILITIES */}
        <ResponsibilitiesSection 
          gameTokens={state?.gameTokens}
          recycling={recycling}
          activity={activity}
          loadingActions={loadingActions}
          dispatchAction={dispatchAction}
        />
      </div>

      {/* 6. LOGS */}
      {state?.activityLogs && state.activityLogs.length > 0 && (
        <div className="md:col-span-2 w-full max-w-md md:max-w-none mx-auto">
          <ActivityLogsSection logs={state.activityLogs} />
        </div>
      )}
    </main>
  );
}
