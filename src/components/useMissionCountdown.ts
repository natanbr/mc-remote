import { useEffect, useState } from 'react';

export function useMissionCountdown(startedAt: string | null | undefined, durationMins: number | null | undefined): string | null {
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!startedAt || durationMins == null) {
      const timer = setTimeout(() => {
        setDisplay(null);
      }, 0);
      return () => clearTimeout(timer);
    }

    const tick = () => {
      const elapsedMs = Date.now() - new Date(startedAt).getTime();
      const totalMs = durationMins * 60 * 1000;
      const remainingMs = totalMs - elapsedMs;

      if (remainingMs <= 0) {
        setDisplay('00:00');
        return;
      }

      const totalSecs = Math.floor(remainingMs / 1000);
      const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
      const secs = (totalSecs % 60).toString().padStart(2, '0');
      setDisplay(`${mins}:${secs}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [startedAt, durationMins]);

  return display;
}

