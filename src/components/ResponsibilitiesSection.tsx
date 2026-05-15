import { ControlButton } from './ControlButton';
import { Section } from './Section';
import type { RemoteAction } from '../types';

interface ResponsibilitiesSectionProps {
  gameTokens?: number;
  recycling?: { pointsEarned: number; pointsRequired: number };
  activity?: { pointsEarned: number; pointsRequired: number };
  loadingActions: Set<string>;
  dispatchAction: (action: RemoteAction, actionId: string) => void;
}

export function ResponsibilitiesSection({ 
  gameTokens, 
  recycling, 
  activity, 
  loadingActions, 
  dispatchAction 
}: ResponsibilitiesSectionProps) {
  return (
    <Section title="Responsibilities & Game Tokens">
      <div className="grid grid-cols-4 gap-x-3 gap-y-4">
        
        {/* Recycling Card */}
        <div className="col-span-2 grid grid-cols-[1fr_auto_auto] gap-x-1.5 bg-emerald-50/40 p-2 rounded-2xl border border-emerald-100/60 shadow-sm items-center">
           <div className="flex flex-col">
              <div className="text-[9px] font-black uppercase text-emerald-600/60 tracking-tight pl-1">♻️ Recy</div>
              <div className="text-sm font-black text-emerald-800 pl-1 leading-none mt-0.5">
                {recycling?.pointsEarned ?? 0}<span className="opacity-30">/</span>{recycling?.pointsRequired ?? 3}
              </div>
           </div>
           <ControlButton 
             icon={<span className="text-sm">➖</span>} 
             label="" 
             loading={loadingActions.has('resp-recycling-minus')}
             onClick={() => dispatchAction({ type: 'ADD_RESPONSIBILITY_POINT', taskId: 'recycling', amount: -1 }, 'resp-recycling-minus')} 
             bg="bg-emerald-50"
             border="border-emerald-200"
             className="h-9 w-9 !p-0 rounded-xl"
           />
           <ControlButton 
             icon={<span className="text-sm">➕</span>} 
             label="" 
             loading={loadingActions.has('resp-recycling-plus')}
             onClick={() => dispatchAction({ type: 'ADD_RESPONSIBILITY_POINT', taskId: 'recycling', amount: 1 }, 'resp-recycling-plus')} 
             bg="bg-emerald-50"
             border="border-emerald-200"
             className="h-9 w-9 !p-0 rounded-xl"
           />
        </div>

        {/* Activity Card */}
        <div className="col-span-2 grid grid-cols-[1fr_auto_auto] gap-x-1.5 bg-blue-50/40 p-2 rounded-2xl border border-blue-100/60 shadow-sm items-center">
           <div className="flex flex-col">
              <div className="text-[9px] font-black uppercase text-blue-600/60 tracking-tight pl-1">🛼 Acti</div>
              <div className="text-sm font-black text-blue-800 pl-1 leading-none mt-0.5">
                {activity?.pointsEarned ?? 0}<span className="opacity-30">/</span>{activity?.pointsRequired ?? 3}
              </div>
           </div>
           <ControlButton 
             icon={<span className="text-sm">➖</span>} 
             label="" 
             loading={loadingActions.has('resp-activity-minus')}
             onClick={() => dispatchAction({ type: 'ADD_RESPONSIBILITY_POINT', taskId: 'activity', amount: -1 }, 'resp-activity-minus')} 
             bg="bg-blue-50"
             border="border-blue-200"
             className="h-9 w-9 !p-0 rounded-xl"
           />
           <ControlButton 
             icon={<span className="text-sm">➕</span>} 
             label="" 
             loading={loadingActions.has('resp-activity-plus')}
             onClick={() => dispatchAction({ type: 'ADD_RESPONSIBILITY_POINT', taskId: 'activity', amount: 1 }, 'resp-activity-plus')} 
             bg="bg-blue-50"
             border="border-blue-200"
             className="h-9 w-9 !p-0 rounded-xl"
           />
        </div>

        {/* Game Token Buttons */}
        <div className="col-span-4 grid grid-cols-[1fr_auto_auto] gap-x-2 bg-teal-50/40 p-2 rounded-2xl border border-teal-100/60 shadow-sm mt-1 items-center">
           <div className="flex flex-col">
              <div className="text-[9px] font-black uppercase text-teal-600/60 tracking-tight pl-1">🎮 Tokens</div>
              <div className="text-sm font-black text-teal-800 pl-1 leading-none mt-0.5">
                {gameTokens ?? 0}<span className="opacity-30">/</span>5
              </div>
           </div>
           <ControlButton 
             icon={<span className="text-sm">➕</span>} 
             label="" 
             loading={loadingActions.has('game-grant')}
             onClick={() => dispatchAction({ type: 'GRANT_GAME_TOKEN', force: true }, 'game-grant')} 
             bg="bg-teal-50"
             border="border-teal-200"
             className="h-9 w-9 !p-0 rounded-xl"
           />
           <ControlButton 
             icon={<span className="text-sm">➖</span>} 
             label="" 
             loading={loadingActions.has('game-use')}
             onClick={() => dispatchAction({ type: 'CONSUME_GAME_TOKEN' }, 'game-use')} 
             bg="bg-teal-50"
             border="border-teal-200"
             className="h-9 w-9 !p-0 rounded-xl"
           />
        </div>
      </div>
    </Section>
  );
}
