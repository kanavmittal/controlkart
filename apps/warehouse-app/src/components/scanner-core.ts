/**
 * Pure scanning logic for the shared camera scanner component.
 *
 * This module intentionally has zero dependency on `expo-camera`, React, or
 * any native module, so it can be unit tested without rendering a camera.
 * `Scanner.tsx` is a thin shell over the functions defined here.
 *
 * v1 retro lesson: a screen that had already lost focus (or fully unmounted)
 * could still receive a late camera frame from the native side, and that
 * frame's scan callback would double-commit a scan. The fix is a generation
 * counter: every focus/unfocus/reset bumps it, and any scan callback whose
 * captured generation no longer matches the live generation is dropped
 * silently, no matter how "valid" the underlying camera event looked.
 */

/** Verdict returned by the caller-supplied `onScan` handler. */
export type ScanVerdict = "accept" | "reject" | "warn" | "ignore";

/** Reason a scan was NOT accepted for processing. */
export type ScanRejectionReason = "stale-generation" | "busy" | "duplicate";

export interface ScannerState {
  /** The live "session" generation. Bumped on focus, unfocus, and reset. */
  readonly generation: number;
  /** Last-seen timestamp (ms) per raw decoded string, for the dedupe window. */
  readonly lastSeenAt: ReadonlyMap<string, number>;
  /** True while an `onScan` promise is in flight (busy latch). */
  readonly busy: boolean;
}

export type ScanCheckResult =
  | { accepted: true; state: ScannerState }
  | { accepted: false; reason: ScanRejectionReason; state: ScannerState };

/** Identical decoded strings within this window (ms) are treated as one scan. */
export const DEDUPE_WINDOW_MS = 1800;

export function createScannerState(): ScannerState {
  return { generation: 0, lastSeenAt: new Map(), busy: false };
}

/**
 * Bumps the generation counter, invalidating any scan callback that captured
 * an earlier generation. Called on every focus and unfocus transition.
 * Does NOT touch dedupe state or the busy latch.
 */
export function bumpGeneration(state: ScannerState): ScannerState {
  return { ...state, generation: state.generation + 1 };
}

/**
 * Full session reset: bumps the generation (so any in-flight/late scans from
 * the previous session are dropped), clears the dedupe map, and releases the
 * busy latch. Called from the component's exposed `resetSession()`.
 */
export function resetScannerState(state: ScannerState): ScannerState {
  return { generation: state.generation + 1, lastSeenAt: new Map(), busy: false };
}

/** Releases (or re-acquires) the busy latch, e.g. once an `onScan` promise settles. */
export function setBusy(state: ScannerState, busy: boolean): ScannerState {
  return { ...state, busy };
}

/**
 * Decides whether a decoded scan should be processed, given the generation
 * captured when the scan callback was registered.
 *
 * Order of checks matters: a stale-generation scan is dropped before it can
 * affect the busy latch or dedupe map, so late frames from an unfocused
 * screen can never block or pollute state for the screen that replaced it.
 */
export function shouldAcceptScan(
  state: ScannerState,
  generation: number,
  raw: string,
  now: number,
): ScanCheckResult {
  if (generation !== state.generation) {
    return { accepted: false, reason: "stale-generation", state };
  }

  if (state.busy) {
    return { accepted: false, reason: "busy", state };
  }

  const lastSeen = state.lastSeenAt.get(raw);
  if (lastSeen !== undefined && now - lastSeen < DEDUPE_WINDOW_MS) {
    return { accepted: false, reason: "duplicate", state };
  }

  const lastSeenAt = new Map(state.lastSeenAt);
  lastSeenAt.set(raw, now);

  return { accepted: true, state: { ...state, lastSeenAt, busy: true } };
}
