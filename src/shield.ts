// Mirrors the desktop's missionStreak.ts: one segment per mission the child can
// still miss; at zero left the desktop freezes the child's economy.
export const SHIELD_SEGMENTS = 6;

/** Segments still filled, or null before the first state broadcast. */
export function shieldSegmentsLeft(missedMissionStreak: unknown): number | null {
  if (typeof missedMissionStreak !== 'number' || !Number.isFinite(missedMissionStreak)) return null;
  const missed = Math.min(SHIELD_SEGMENTS, Math.max(0, Math.floor(missedMissionStreak)));
  return SHIELD_SEGMENTS - missed;
}
