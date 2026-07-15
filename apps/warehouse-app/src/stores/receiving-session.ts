/**
 * Local receiving-session store for the warehouse Expo app.
 *
 * A receiving "session" is the client-side scratchpad for one in-progress
 * receive against a purchase order: serials scanned per line, quantities
 * entered per line, and a session_id that ties everything together when it's
 * finally POSTed to `/wms/purchase-orders/:id/receive`.
 *
 * The server only finds out about a scan/quantity when we submit — so this
 * module is also the *only* place that can catch a duplicate serial scanned
 * twice within the same unsent session (possibly against two different
 * lines, e.g. a mis-scan). That's why `addSerial` checks every line, not
 * just the target line.
 *
 * This file is intentionally UI-free:
 *  - `sessionReducer` is a pure function — no I/O, no React.
 *  - The storage adapter (`persistSession` / `loadSession` / `clearSession`)
 *    is the only part that touches AsyncStorage.
 *  - A thin `useReceivingSession` hook at the bottom wires the two together
 *    for screens. Screens should use the hook; tests should use the pure
 *    pieces directly.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
// Used only by the thin `useReceivingSession` hook wrapper at the bottom of
// this file — everything above it is plain, React-free logic.
import { useCallback, useEffect, useReducer } from "react";

// --- Types -----------------------------------------------------------------

export interface ReceivingSessionState {
  po_id: string;
  session_id: string;
  /** Serial numbers scanned so far, keyed by PO line id. */
  serialsByLine: Record<string, string[]>;
  /** Manually-entered quantities so far, keyed by PO line id. */
  quantitiesByLine: Record<string, number>;
  started_at: string;
}

/** A PO line as needed by `sessionTotals` — just enough to compute progress. */
export interface PurchaseOrderLine {
  line_id: string;
  /** Ordered / expected quantity for this line. */
  quantity: number;
  /** Whether this line is received by scanning serials vs. entering a count. */
  requires_serial: boolean;
}

export interface LineTotals {
  /** Raw count of serials scanned against this line so far. */
  scanned: number;
  /** Ordered / expected quantity for this line (from the PO, not the session). */
  quantity: number;
  /** Effective amount received so far — serial count for serialized lines,
   *  entered quantity for non-serialized lines. */
  total: number;
}

export type RejectionReason = "DUP_IN_SESSION" | "INVALID_QUANTITY";

export type SessionAction =
  | { type: "addSerial"; line_id: string; serial: string }
  | { type: "setQuantity"; line_id: string; quantity: number }
  | { type: "removeSerial"; line_id: string; serial: string }
  | { type: "reset" }
  | { type: "hydrate"; state: ReceivingSessionState };

export interface SessionReducerResult {
  state: ReceivingSessionState;
  /** Set when the action was rejected and the state is unchanged. */
  rejected?: RejectionReason;
}

export interface ReceivePayloadItem {
  line_id: string;
  serials?: string[];
  quantity?: number;
}

export interface ReceivePayload {
  session_id: string;
  items: ReceivePayloadItem[];
}

// --- Session id generation ---------------------------------------------------

let fallbackSessionCounter = 0;

/**
 * Generate a session id. Prefers `crypto.randomUUID` (available in Hermes on
 * recent RN/Expo runtimes); falls back to a timestamp+counter id — good
 * enough for a value that only needs to be unique within one device/session.
 */
export function generateSessionId(): string {
  const globalCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof globalCrypto?.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }
  fallbackSessionCounter += 1;
  return `session-${Date.now()}-${fallbackSessionCounter}`;
}

export function createInitialState(po_id: string): ReceivingSessionState {
  return {
    po_id,
    session_id: generateSessionId(),
    serialsByLine: {},
    quantitiesByLine: {},
    started_at: new Date().toISOString(),
  };
}

// --- Pure reducer ------------------------------------------------------------

export function sessionReducer(
  state: ReceivingSessionState,
  action: SessionAction,
): SessionReducerResult {
  switch (action.type) {
    case "addSerial": {
      const alreadyInSession = Object.values(state.serialsByLine).some((serials) =>
        serials.includes(action.serial),
      );
      if (alreadyInSession) {
        return { state, rejected: "DUP_IN_SESSION" };
      }

      const existing = state.serialsByLine[action.line_id] ?? [];
      return {
        state: {
          ...state,
          serialsByLine: {
            ...state.serialsByLine,
            [action.line_id]: [...existing, action.serial],
          },
        },
      };
    }

    case "removeSerial": {
      const existing = state.serialsByLine[action.line_id];
      if (!existing || !existing.includes(action.serial)) {
        return { state };
      }
      return {
        state: {
          ...state,
          serialsByLine: {
            ...state.serialsByLine,
            [action.line_id]: existing.filter((serial) => serial !== action.serial),
          },
        },
      };
    }

    case "setQuantity": {
      if (action.quantity < 0) {
        return { state, rejected: "INVALID_QUANTITY" };
      }
      return {
        state: {
          ...state,
          quantitiesByLine: {
            ...state.quantitiesByLine,
            [action.line_id]: action.quantity,
          },
        },
      };
    }

    case "reset":
      return { state: createInitialState(state.po_id) };

    case "hydrate":
      return { state: action.state };

    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`Unhandled receiving session action: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

// --- Derived helpers -----------------------------------------------------

export function sessionTotals(
  state: ReceivingSessionState,
  lines: PurchaseOrderLine[],
): Record<string, LineTotals> {
  const totals: Record<string, LineTotals> = {};

  for (const line of lines) {
    const scanned = state.serialsByLine[line.line_id]?.length ?? 0;
    const total = line.requires_serial ? scanned : (state.quantitiesByLine[line.line_id] ?? 0);

    totals[line.line_id] = {
      scanned,
      quantity: line.quantity,
      total,
    };
  }

  return totals;
}

export function toReceivePayload(state: ReceivingSessionState): ReceivePayload {
  const lineIds = new Set<string>([
    ...Object.keys(state.serialsByLine),
    ...Object.keys(state.quantitiesByLine),
  ]);

  const items: ReceivePayloadItem[] = [];

  for (const line_id of lineIds) {
    const serials = state.serialsByLine[line_id];
    const quantity = state.quantitiesByLine[line_id];

    const hasSerials = Array.isArray(serials) && serials.length > 0;
    const hasQuantity = typeof quantity === "number" && quantity > 0;

    if (!hasSerials && !hasQuantity) {
      continue; // nothing recorded for this line — skip it
    }

    const item: ReceivePayloadItem = { line_id };
    if (hasSerials) {
      item.serials = serials;
    }
    if (hasQuantity) {
      item.quantity = quantity;
    }
    items.push(item);
  }

  return { session_id: state.session_id, items };
}

// --- Storage adapter -----------------------------------------------------

const STORAGE_PREFIX = "receiving-session:";

function storageKey(po_id: string): string {
  return `${STORAGE_PREFIX}${po_id}`;
}

/** Fire-and-forget persist; swallows errors (best-effort local cache). */
export function persistSession(po_id: string, state: ReceivingSessionState): void {
  AsyncStorage.setItem(storageKey(po_id), JSON.stringify(state)).catch((err: unknown) => {
    console.warn(`[receiving-session] failed to persist session for PO "${po_id}"`, err);
  });
}

export async function loadSession(po_id: string): Promise<ReceivingSessionState | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(po_id));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ReceivingSessionState;
  } catch (err) {
    console.warn(`[receiving-session] failed to load session for PO "${po_id}"`, err);
    return null;
  }
}

export async function clearSession(po_id: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(po_id));
  } catch (err) {
    console.warn(`[receiving-session] failed to clear session for PO "${po_id}"`, err);
  }
}

/**
 * Runs an action through the pure reducer and persists the result — this is
 * "every action persists the full state" from the storage side. `reset` is
 * special-cased: a reset abandons the session, so it clears storage instead
 * of persisting a fresh blank one.
 */
export function applySessionAction(
  po_id: string,
  state: ReceivingSessionState,
  action: SessionAction,
): SessionReducerResult {
  const result = sessionReducer(state, action);

  if (action.type === "reset") {
    void clearSession(po_id);
  } else {
    persistSession(po_id, result.state);
  }

  return result;
}

// --- React hook wrapper ----------------------------------------------------
// Thin glue over the pure pieces above. All the logic that matters lives
// above this line and can be used/tested without React at all.

type HookAction =
  | SessionAction
  | { type: "__hydrate"; state: ReceivingSessionState; po_id: string };

interface HookState {
  session: ReceivingSessionState;
  rejected: RejectionReason | null;
  /** po_id the current session was hydrated from storage for, or null if
   *  the initial load hasn't resolved yet. */
  hydratedFor: string | null;
}

function hookReducer(hookState: HookState, action: HookAction): HookState {
  if (action.type === "__hydrate") {
    return { session: action.state, rejected: null, hydratedFor: action.po_id };
  }
  const result = sessionReducer(hookState.session, action);
  return { ...hookState, session: result.state, rejected: result.rejected ?? null };
}

export interface UseReceivingSessionResult {
  state: ReceivingSessionState;
  rejected: RejectionReason | null;
  /** True once the initial load from AsyncStorage has completed. */
  isHydrated: boolean;
  addSerial: (line_id: string, serial: string) => void;
  removeSerial: (line_id: string, serial: string) => void;
  setQuantity: (line_id: string, quantity: number) => void;
  /** Abandon the in-progress session and clear it from storage. */
  reset: () => void;
  /** Clear the persisted session after a successful server commit. */
  commit: () => Promise<void>;
}

export function useReceivingSession(po_id: string): UseReceivingSessionResult {
  const [hookState, dispatch] = useReducer(hookReducer, po_id, (id) => ({
    session: createInitialState(id),
    rejected: null,
    hydratedFor: null,
  }));
  const isHydrated = hookState.hydratedFor === po_id;

  // Load any session persisted from a previous app run (or a kill mid-scan).
  // The dispatch only happens once the load resolves, never synchronously
  // in the effect body, so this doesn't trigger a cascading render on mount.
  useEffect(() => {
    let cancelled = false;

    loadSession(po_id).then((persisted) => {
      if (cancelled) {
        return;
      }
      dispatch({ type: "__hydrate", state: persisted ?? createInitialState(po_id), po_id });
    });

    return () => {
      cancelled = true;
    };
  }, [po_id]);

  // Persist on every change, once hydrated — avoids clobbering a persisted
  // session with the transient blank state that exists before load resolves.
  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    persistSession(po_id, hookState.session);
  }, [po_id, isHydrated, hookState.session]);

  const addSerial = useCallback(
    (line_id: string, serial: string) => dispatch({ type: "addSerial", line_id, serial }),
    [],
  );
  const removeSerial = useCallback(
    (line_id: string, serial: string) => dispatch({ type: "removeSerial", line_id, serial }),
    [],
  );
  const setQuantity = useCallback(
    (line_id: string, quantity: number) => dispatch({ type: "setQuantity", line_id, quantity }),
    [],
  );
  const reset = useCallback(() => {
    dispatch({ type: "reset" });
    void clearSession(po_id);
  }, [po_id]);
  const commit = useCallback(async () => {
    await clearSession(po_id);
  }, [po_id]);

  return {
    state: hookState.session,
    rejected: hookState.rejected,
    isHydrated,
    addSerial,
    removeSerial,
    setQuantity,
    reset,
    commit,
  };
}
