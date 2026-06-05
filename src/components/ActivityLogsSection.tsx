import { Section } from './Section';

interface LogEntry {
  id: string;
  timestamp: string;
  icon: string;
  message: string;
  delta?: number;
  type: string;
  colorKey?: string;
  isRemote?: boolean;
}

interface ActivityLogsSectionProps {
  logs?: LogEntry[];
}

function renderHighlightedMessage(message: string) {
  const parts = message.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return message;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span
        key={i}
        className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black text-[11px]"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function ActivityLogsSection({ logs }: ActivityLogsSectionProps) {
  if (!logs || logs.length === 0) {
    return (
      <Section title="Activity Logs">
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-2xl">📋</span>
          <p className="text-xs font-bold uppercase tracking-wider">No activity logs synced</p>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Activity Logs">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
          {logs.map((log) => {
            let colorClass = "text-slate-700";
            let bgClass = "bg-white hover:bg-slate-50";

            if (log.colorKey === 'cheat') {
              colorClass = "text-red-700 font-extrabold";
              bgClass = "bg-red-50/40 hover:bg-red-50/60";
            } else if (log.colorKey === 'morning') {
              colorClass = "text-amber-600";
            } else if (log.colorKey === 'evening') {
              colorClass = "text-indigo-600";
            } else if (log.colorKey === 'recycling') {
              colorClass = "text-emerald-600";
            } else if (log.colorKey === 'activity') {
              colorClass = "text-blue-600";
            } else if (log.colorKey === 'bank') {
              colorClass = "text-slate-900";
            } else if (log.colorKey === 'system') {
              colorClass = "text-slate-500";
            }

            const timeString = new Date(log.timestamp).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            });

            return (
              <div key={log.id} className={`flex items-start gap-3 p-3 transition-colors ${bgClass}`}>
                {/* Icon */}
                <span className="text-lg leading-none shrink-0 mt-0.5">{log.icon}</span>

                {/* Content */}
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className={`text-xs font-bold leading-normal break-words ${colorClass}`}>
                    {renderHighlightedMessage(log.message)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                    <span>{timeString}</span>
                    {log.isRemote && (
                      <span className="text-[10px]" title="Triggered from remote">📱</span>
                    )}
                  </div>
                </div>

                {/* Delta / Token updates */}
                {log.delta !== undefined && log.delta !== 0 && (
                  <div className="shrink-0 flex items-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border leading-none ${
                      log.delta > 0
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      {log.delta > 0 ? '+' : ''}{log.delta}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
