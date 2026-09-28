import type { ProtocolMode } from './pairing.ts';
import { classifyStateUpdate, decideStateUpdate } from './remoteProtocol.ts';

/** The hook's refs and callbacks, injected so the wiring is testable without React. */
export interface StateUpdateReceiverDeps {
  getSecretKey: () => string | null;
  isCurrentChannel: () => boolean;
  getMode: () => ProtocolMode;
  getLast: () => number;
  setLast: (timestamp: number) => void;
  onState: (state: Record<string, unknown>) => void;
  /** A verified, newer state was refused only because the clocks differ; at most once per join. */
  onClockSkew: (diffMs: number) => void;
  now: () => number;
}

export interface StateUpdateReceiver {
  receive: (payload: unknown) => Promise<void>;
  /**
   * Call on every SUBSCRIBED, an automatic rejoin included: resets the last accepted timestamp
   * (so a desktop clock set backwards cannot freeze the view; the clock bound in
   * decideStateUpdate still limits a replay to recent states) and re-arms the skew report.
   */
  connected: () => void;
}

export function createStateUpdateReceiver(deps: StateUpdateReceiverDeps): StateUpdateReceiver {
  let clockSkewReported = false;

  const receive = async (payload: unknown) => {
    const secretKey = deps.getSecretKey();
    if (!secretKey) return;

    const candidate = await classifyStateUpdate(payload, secretKey, deps.getMode());
    if (!deps.isCurrentChannel()) return; // reconnected while this was verifying
    if (deps.getSecretKey() !== secretKey) return; // re-paired in this tab while this was verifying

    // Read the mode and the last timestamp now, after the await, not before it.
    const decision = decideStateUpdate(candidate, deps.getMode(), deps.getLast(), deps.now());
    if (!decision.accept) {
      if (decision.clockSkewMs !== undefined && !clockSkewReported) {
        clockSkewReported = true;
        deps.onClockSkew(decision.clockSkewMs);
      }
      return;
    }
    if (decision.acceptedTimestamp !== null) deps.setLast(decision.acceptedTimestamp);
    deps.onState(decision.state);
  };

  const connected = () => {
    deps.setLast(0);
    clockSkewReported = false;
  };

  return { receive, connected };
}
