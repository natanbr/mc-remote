import { ArrowLeft } from 'lucide-react';
import { ControlButton } from './ControlButton';
import type { RemoteAction } from '../types';

interface SnakeControllerProps {
  dispatchAction: (action: RemoteAction, actionId: string) => void;
  onBack: () => void;
}

export function SnakeController({ dispatchAction, onBack }: SnakeControllerProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-4 text-white">
       <button onClick={onBack} className="self-start flex items-center gap-2 p-2 mb-8 text-slate-400 font-bold active:text-white transition-colors">
         <ArrowLeft className="w-5 h-5" /> Back to Remote
       </button>
       <div className="flex-1 flex flex-col items-center justify-center -mt-20">
         <div className="text-xl font-black text-slate-500 mb-12 uppercase tracking-widest">Snake Controller</div>
         <div className="grid grid-cols-3 grid-rows-3 gap-4 w-full max-w-sm aspect-square px-4">
            <div />
            <ControlButton 
               icon={<span className="text-4xl">⬆️</span>} 
               label="" 
               aria-label="Snake Up"
               onClick={() => dispatchAction({ type: 'SNAKE_DIR', dir: 'up' }, 'snake-up')} 
               bg="bg-slate-800"
               border="border-slate-700"
               className="row-start-1 col-start-2 w-full h-full active:bg-slate-700"
            />
            <div />
            <ControlButton 
               icon={<span className="text-4xl">⬅️</span>} 
               label="" 
               aria-label="Snake Left"
               onClick={() => dispatchAction({ type: 'SNAKE_DIR', dir: 'left' }, 'snake-left')} 
               bg="bg-slate-800"
               border="border-slate-700"
               className="row-start-2 col-start-1 w-full h-full active:bg-slate-700"
            />
            <ControlButton 
               icon={<span className="text-4xl">⬇️</span>} 
               label="" 
               aria-label="Snake Down"
               onClick={() => dispatchAction({ type: 'SNAKE_DIR', dir: 'down' }, 'snake-down')} 
               bg="bg-slate-800"
               border="border-slate-700"
               className="row-start-2 col-start-2 w-full h-full active:bg-slate-700"
            />
            <ControlButton 
               icon={<span className="text-4xl">➡️</span>} 
               label="" 
               aria-label="Snake Right"
               onClick={() => dispatchAction({ type: 'SNAKE_DIR', dir: 'right' }, 'snake-right')} 
               bg="bg-slate-800"
               border="border-slate-700"
               className="row-start-2 col-start-3 w-full h-full active:bg-slate-700"
            />
         </div>
       </div>
    </div>
  );
}
