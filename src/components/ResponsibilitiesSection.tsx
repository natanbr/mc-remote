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
                {gameTokens ?? 0} <span className="text-[10px] opacity-40">/</span> 5
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
  );
}
