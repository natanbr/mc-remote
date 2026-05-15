import { ArrowLeft } from 'lucide-react';
import { ControlButton } from './ControlButton';
import type { RemoteAction } from '../types';

interface SnakeControllerProps {
  dispatchAction: (action: RemoteAction, actionId: string) => void;
  onBack: () => void;
}

export function SnakeController({ dispatchAction, onBack }: SnakeControllerProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-6 text-white overflow-hidden">
       {/* Header with Back Button */}
       <div className="relative z-50 flex items-center mb-8">
         <button 
           onClick={() => {
             console.log('Back button clicked');
             onBack();
           }} 
           className="flex items-center gap-3 px-4 py-2 -ml-4 rounded-full bg-slate-800/50 text-slate-300 font-bold hover:bg-slate-800 hover:text-white transition-all active:scale-95"
         >
           <ArrowLeft className="w-5 h-5" /> Back to Dashboard
         </button>
       </div>

       {/* Main Content */}
       <div className="flex-1 flex flex-col items-center justify-center pb-12">
          <div className="text-sm font-black text-slate-600 mb-12 uppercase tracking-[0.3em]">Snake Remote</div>
          
          {/* Controller Grid */}
          <div className="grid grid-cols-3 grid-rows-3 gap-6 w-full max-w-[320px] aspect-square">
             <div />
             <ControlButton 
                icon={<span className="text-4xl">⬆️</span>} 
                label="" 
                aria-label="Snake Up"
                onClick={() => dispatchAction({ type: 'SNAKE_DIR', dir: 'up' }, 'snake-up')} 
                bg="bg-slate-800"
                border="border-slate-700"
                className="row-start-1 col-start-2 w-full h-full active:bg-slate-700 shadow-xl"
             />
             <div />
             <ControlButton 
                icon={<span className="text-4xl">⬅️</span>} 
                label="" 
                aria-label="Snake Left"
                onClick={() => dispatchAction({ type: 'SNAKE_DIR', dir: 'left' }, 'snake-left')} 
                bg="bg-slate-800"
                border="border-slate-700"
                className="row-start-2 col-start-1 w-full h-full active:bg-slate-700 shadow-xl"
             />
             <ControlButton 
                icon={<span className="text-4xl">⬇️</span>} 
                label="" 
                aria-label="Snake Down"
                onClick={() => dispatchAction({ type: 'SNAKE_DIR', dir: 'down' }, 'snake-down')} 
                bg="bg-slate-800"
                border="border-slate-700"
                className="row-start-2 col-start-2 w-full h-full active:bg-slate-700 shadow-xl"
             />
             <ControlButton 
                icon={<span className="text-4xl">➡️</span>} 
                label="" 
                aria-label="Snake Right"
                onClick={() => dispatchAction({ type: 'SNAKE_DIR', dir: 'right' }, 'snake-right')} 
                bg="bg-slate-800"
                border="border-slate-700"
                className="row-start-2 col-start-3 w-full h-full active:bg-slate-700 shadow-xl"
             />
          </div>
       </div>
    </div>
  );
}
