import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  applySessionAction,
  clearSession,
  createInitialState,
  loadSession,
  sessionReducer,
  toReceivePayload,
  type ReceivingSessionState,
} from "../receiving-session";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockedGetItem = AsyncStorage.getItem as jest.Mock;
const mockedSetItem = AsyncStorage.setItem as jest.Mock;
const mockedRemoveItem = AsyncStorage.removeItem as jest.Mock;

function baseState(overrides: Partial<ReceivingSessionState> = {}): ReceivingSessionState {
  return {
    po_id: "po_1",
    session_id: "session-fixed",
    serialsByLine: {},
    quantitiesByLine: {},
    started_at: "2026-07-12T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSetItem.mockResolvedValue(undefined);
  mockedRemoveItem.mockResolvedValue(undefined);
  mockedGetItem.mockResolvedValue(null);
});

describe("createInitialState", () => {
  it("creates a fresh state with empty maps and a session id", () => {
    const state = createInitialState("po_1");
    expect(state.po_id).toBe("po_1");
    expect(state.serialsByLine).toEqual({});
    expect(state.quantitiesByLine).toEqual({});
    expect(typeof state.session_id).toBe("string");
    expect(state.session_id.length).toBeGreaterThan(0);
    expect(typeof state.started_at).toBe("string");
  });
});

describe("sessionReducer — addSerial", () => {
  it("adds a serial to the target line", () => {
    const state = baseState();
    const result = sessionReducer(state, { type: "addSerial", line_id: "line_1", serial: "SN-1" });

    expect(result.rejected).toBeUndefined();
    expect(result.state.serialsByLine).toEqual({ line_1: ["SN-1"] });
    // original state is untouched
    expect(state.serialsByLine).toEqual({});
  });

  it("appends multiple distinct serials to the same line", () => {
    let state = baseState();
    state = sessionReducer(state, { type: "addSerial", line_id: "line_1", serial: "SN-1" }).state;
    state = sessionReducer(state, { type: "addSerial", line_id: "line_1", serial: "SN-2" }).state;

    expect(state.serialsByLine.line_1).toEqual(["SN-1", "SN-2"]);
  });

  it("rejects a serial already scanned on the SAME line", () => {
    const state = baseState({ serialsByLine: { line_1: ["SN-1"] } });
    const result = sessionReducer(state, { type: "addSerial", line_id: "line_1", serial: "SN-1" });

    expect(result.rejected).toBe("DUP_IN_SESSION");
    expect(result.state).toBe(state); // unchanged
  });

  it("rejects a serial already scanned on a DIFFERENT line in the same session", () => {
    const state = baseState({ serialsByLine: { line_1: ["SN-1"] } });
    const result = sessionReducer(state, { type: "addSerial", line_id: "line_2", serial: "SN-1" });

    expect(result.rejected).toBe("DUP_IN_SESSION");
    expect(result.state).toBe(state); // unchanged
    expect(result.state.serialsByLine.line_2).toBeUndefined();
  });
});

describe("sessionReducer — removeSerial", () => {
  it("removes a serial from its line", () => {
    const state = baseState({ serialsByLine: { line_1: ["SN-1", "SN-2"] } });
    const result = sessionReducer(state, { type: "removeSerial", line_id: "line_1", serial: "SN-1" });

    expect(result.rejected).toBeUndefined();
    expect(result.state.serialsByLine.line_1).toEqual(["SN-2"]);
  });

  it("is a no-op when the serial isn't present on that line", () => {
    const state = baseState({ serialsByLine: { line_1: ["SN-1"] } });
    const result = sessionReducer(state, { type: "removeSerial", line_id: "line_1", serial: "SN-9" });

    expect(result.state).toBe(state);
  });

  it("is a no-op when the line has no serials at all", () => {
    const state = baseState();
    const result = sessionReducer(state, { type: "removeSerial", line_id: "line_1", serial: "SN-9" });

    expect(result.state).toBe(state);
  });

  it("freeing a serial by removal allows it to be re-added (undoes the dup lock)", () => {
    let state = baseState();
    state = sessionReducer(state, { type: "addSerial", line_id: "line_1", serial: "SN-1" }).state;
    state = sessionReducer(state, { type: "removeSerial", line_id: "line_1", serial: "SN-1" }).state;
    const result = sessionReducer(state, { type: "addSerial", line_id: "line_2", serial: "SN-1" });

    expect(result.rejected).toBeUndefined();
    expect(result.state.serialsByLine.line_2).toEqual(["SN-1"]);
  });
});

describe("sessionReducer — setQuantity", () => {
  it("sets the quantity for a line", () => {
    const state = baseState();
    const result = sessionReducer(state, { type: "setQuantity", line_id: "line_1", quantity: 5 });

    expect(result.rejected).toBeUndefined();
    expect(result.state.quantitiesByLine).toEqual({ line_1: 5 });
  });

  it("allows setting a quantity of zero", () => {
    const state = baseState();
    const result = sessionReducer(state, { type: "setQuantity", line_id: "line_1", quantity: 0 });

    expect(result.rejected).toBeUndefined();
    expect(result.state.quantitiesByLine).toEqual({ line_1: 0 });
  });

  it("overwrites a previous quantity for the same line", () => {
    const state = baseState({ quantitiesByLine: { line_1: 3 } });
    const result = sessionReducer(state, { type: "setQuantity", line_id: "line_1", quantity: 7 });

    expect(result.state.quantitiesByLine).toEqual({ line_1: 7 });
  });

  it("rejects a negative quantity and leaves state unchanged", () => {
    const state = baseState({ quantitiesByLine: { line_1: 3 } });
    const result = sessionReducer(state, { type: "setQuantity", line_id: "line_1", quantity: -1 });

    expect(result.rejected).toBe("INVALID_QUANTITY");
    expect(result.state).toBe(state);
  });
});

describe("sessionReducer — reset / hydrate", () => {
  it("reset produces a fresh state for the same po_id with a new session id", () => {
    const state = baseState({
      session_id: "old-session",
      serialsByLine: { line_1: ["SN-1"] },
      quantitiesByLine: { line_2: 4 },
    });
    const result = sessionReducer(state, { type: "reset" });

    expect(result.state.po_id).toBe("po_1");
    expect(result.state.session_id).not.toBe("old-session");
    expect(result.state.serialsByLine).toEqual({});
    expect(result.state.quantitiesByLine).toEqual({});
  });

  it("hydrate replaces the state wholesale", () => {
    const state = baseState();
    const incoming = baseState({ session_id: "hydrated-session", quantitiesByLine: { line_1: 9 } });
    const result = sessionReducer(state, { type: "hydrate", state: incoming });

    expect(result.state).toEqual(incoming);
  });
});

describe("persistence round-trip", () => {
  it("dispatch persists the full state, and hydrating from that payload reproduces it", () => {
    const initial = baseState();

    const result = applySessionAction(initial.po_id, initial, {
      type: "addSerial",
      line_id: "line_1",
      serial: "SN-1",
    });

    expect(mockedSetItem).toHaveBeenCalledTimes(1);
    const [key, payload] = mockedSetItem.mock.calls[0];
    expect(key).toBe("receiving-session:po_1");

    const persisted = JSON.parse(payload as string) as ReceivingSessionState;
    expect(persisted).toEqual(result.state);

    // Hydrating a brand-new in-memory state from that exact payload
    // reproduces the dispatched state.
    const rehydrated = sessionReducer(baseState({ session_id: "irrelevant" }), {
      type: "hydrate",
      state: persisted,
    });
    expect(rehydrated.state).toEqual(result.state);
  });

  it("persists on setQuantity too", () => {
    const initial = baseState();
    applySessionAction(initial.po_id, initial, { type: "setQuantity", line_id: "line_1", quantity: 3 });

    expect(mockedSetItem).toHaveBeenCalledWith(
      "receiving-session:po_1",
      JSON.stringify({ ...initial, quantitiesByLine: { line_1: 3 } }),
    );
  });
});

describe("hydration after an app kill", () => {
  it("loadSession returns the persisted state exactly", async () => {
    const persisted = baseState({ serialsByLine: { line_1: ["SN-1", "SN-2"] } });
    mockedGetItem.mockResolvedValue(JSON.stringify(persisted));

    const loaded = await loadSession("po_1");

    expect(mockedGetItem).toHaveBeenCalledWith("receiving-session:po_1");
    expect(loaded).toEqual(persisted);
  });

  it("returns null when nothing was persisted", async () => {
    mockedGetItem.mockResolvedValue(null);

    const loaded = await loadSession("po_1");

    expect(loaded).toBeNull();
  });

  it("returns null and warns when the persisted payload is corrupt", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockedGetItem.mockResolvedValue("{not-json");

    const loaded = await loadSession("po_1");

    expect(loaded).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("reset clears storage", () => {
  it("applySessionAction with reset removes the persisted session instead of writing one", async () => {
    const state = baseState({ serialsByLine: { line_1: ["SN-1"] } });

    applySessionAction(state.po_id, state, { type: "reset" });
    // clearSession is fire-and-forget from within applySessionAction; flush microtasks.
    await Promise.resolve();
    await Promise.resolve();

    expect(mockedRemoveItem).toHaveBeenCalledWith("receiving-session:po_1");
    expect(mockedSetItem).not.toHaveBeenCalled();
  });

  it("clearSession removes the storage entry for that PO", async () => {
    await clearSession("po_1");
    expect(mockedRemoveItem).toHaveBeenCalledWith("receiving-session:po_1");
  });
});

describe("toReceivePayload", () => {
  it("builds a serials-only item for a fully serialized line", () => {
    const state = baseState({ serialsByLine: { line_1: ["SN-1", "SN-2"] } });
    const payload = toReceivePayload(state);

    expect(payload.session_id).toBe(state.session_id);
    expect(payload.items).toEqual([{ line_id: "line_1", serials: ["SN-1", "SN-2"] }]);
  });

  it("builds a quantity-only item for a non-serialized line", () => {
    const state = baseState({ quantitiesByLine: { line_2: 6 } });
    const payload = toReceivePayload(state);

    expect(payload.items).toEqual([{ line_id: "line_2", quantity: 6 }]);
  });

  it("builds a mixed payload across serialized and quantity lines", () => {
    const state = baseState({
      serialsByLine: { line_1: ["SN-1"] },
      quantitiesByLine: { line_2: 2 },
    });
    const payload = toReceivePayload(state);

    expect(payload.items).toHaveLength(2);
    expect(payload.items).toEqual(
      expect.arrayContaining([
        { line_id: "line_1", serials: ["SN-1"] },
        { line_id: "line_2", quantity: 2 },
      ]),
    );
  });

  it("skips lines with no serials and no positive quantity", () => {
    const state = baseState({
      serialsByLine: { line_1: [], line_2: ["SN-1"] },
      quantitiesByLine: { line_3: 0 },
    });
    const payload = toReceivePayload(state);

    expect(payload.items).toEqual([{ line_id: "line_2", serials: ["SN-1"] }]);
  });

  it("returns an empty items array for an untouched session", () => {
    const payload = toReceivePayload(baseState());
    expect(payload.items).toEqual([]);
    expect(payload.session_id).toBe("session-fixed");
  });
});
