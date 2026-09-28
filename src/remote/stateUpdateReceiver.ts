import { markUpgradedToV2, type PairingStorage, type ProtocolMode } from './pairing.ts';
import { classifyStateUpdate, decideStateUpdate } from './remoteProtocol.ts';

/** The hook's refs and setters, injected so the wiring is testable without React. */
export interface StateUpdateReceiverDeps {
  getSecretKey: () => string | null;
  isCurrentChannel: () => boolean;
  getMode: () => ProtocolMode;
  setMode: (mode: ProtocolMode) => void;
  getLast: () => number;
  setLast: (timestamp: number) => void;
  onState: (state: Record<string, unknown>) => void;
  storage: PairingStorage;
  now: () => number;
}

/**
 * Handles incoming `state-update` payloads. Create one per connection: creating it resets the last
 * accepted timestamp, so Reconnect recovers from a desktop clock that was corrected backwards
 * (the clock bound in decideStateUpdate still limits a replay to recent states).
 */
export function createStateUpdateReceiver(deps: StateUpdateReceiverDeps): (payload: unknown) => Promise<void> {
  deps.setLast(0);

  return async (payload) => {
    const secretKey = deps.getSecretKey();
    if (!secretKey) return;

    // The mode only ever moves legacy -> v2, so reading it here can only let a legacy candidate
    // through that the decision below (which reads the mode again, after the await) rejects.
    const candidate = await classifyStateUpdate(payload, secretKey, deps.getMode() === 'legacy');
    if (!deps.isCurrentChannel()) return; // reconnected while this was verifying

    const decision = decideStateUpdate(candidate, deps.getMode(), deps.getLast(), deps.now());
    if (!decision.accept) return;
    if (decision.acceptedTimestamp !== null) deps.setLast(decision.acceptedTimestamp);
    deps.onState(decision.state);
    if (decision.upgradeToV2) {
      deps.setMode('v2');
      markUpgradedToV2(deps.storage);
    }
  };
}
