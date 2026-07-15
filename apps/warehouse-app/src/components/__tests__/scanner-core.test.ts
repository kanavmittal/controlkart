import {
  bumpGeneration,
  createScannerState,
  DEDUPE_WINDOW_MS,
  resetScannerState,
  setBusy,
  shouldAcceptScan,
} from "../scanner-core";

describe("shouldAcceptScan", () => {
  it("drops a scan whose captured generation is stale", () => {
    let state = createScannerState();
    state = bumpGeneration(state); // generation is now 1, e.g. screen focused

    // A camera frame callback that captured generation 0 (from before focus,
    // or from a screen that has since unfocused) fires late.
    const result = shouldAcceptScan(state, 0, "ABC123", 1_000);

    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.reason).toBe("stale-generation");
    }
    // State is untouched by a dropped stale scan.
    expect(result.state).toBe(state);
  });

  it("accepts a scan whose captured generation matches the live generation", () => {
    const state = createScannerState();

    const result = shouldAcceptScan(state, 0, "ABC123", 1_000);

    expect(result.accepted).toBe(true);
  });

  it("ignores the identical raw string within the 1.8s dedupe window (+1.7s)", () => {
    let state = createScannerState();

    const first = shouldAcceptScan(state, 0, "ABC123", 1_000);
    expect(first.accepted).toBe(true);
    state = setBusy(first.state, false); // release busy latch as the component would after onScan resolves

    const second = shouldAcceptScan(state, 0, "ABC123", 1_000 + 1_700);

    expect(second.accepted).toBe(false);
    if (!second.accepted) {
      expect(second.reason).toBe("duplicate");
    }
  });

  it("accepts the identical raw string once the dedupe window has elapsed (+1.9s)", () => {
    let state = createScannerState();

    const first = shouldAcceptScan(state, 0, "ABC123", 1_000);
    expect(first.accepted).toBe(true);
    state = setBusy(first.state, false);

    const second = shouldAcceptScan(state, 0, "ABC123", 1_000 + 1_900);

    expect(second.accepted).toBe(true);
  });

  it("sanity-checks the dedupe window constant used above", () => {
    expect(DEDUPE_WINDOW_MS).toBe(1800);
  });

  it("accepts a different raw string within the dedupe window", () => {
    let state = createScannerState();

    const first = shouldAcceptScan(state, 0, "ABC123", 1_000);
    expect(first.accepted).toBe(true);
    state = setBusy(first.state, false);

    const second = shouldAcceptScan(state, 0, "XYZ789", 1_000 + 50);

    expect(second.accepted).toBe(true);
  });

  it("blocks a concurrent scan while the busy latch is held", () => {
    const state = createScannerState();

    const first = shouldAcceptScan(state, 0, "ABC123", 1_000);
    expect(first.accepted).toBe(true);
    expect(first.state.busy).toBe(true);

    // A second, different code scanned while onScan's promise is still in
    // flight for the first one must be ignored, not just deduped.
    const second = shouldAcceptScan(first.state, 0, "DIFFERENT", 1_000 + 10);

    expect(second.accepted).toBe(false);
    if (!second.accepted) {
      expect(second.reason).toBe("busy");
    }
  });

  it("clears dedupe state on reset, allowing an immediate re-scan of the same code", () => {
    let state = createScannerState();

    const first = shouldAcceptScan(state, 0, "ABC123", 1_000);
    expect(first.accepted).toBe(true);
    state = setBusy(first.state, false);

    state = resetScannerState(state);

    // Reset also bumps the generation, so the caller must use the new one.
    const second = shouldAcceptScan(state, state.generation, "ABC123", 1_000 + 10);

    expect(second.accepted).toBe(true);
  });

  it("resetScannerState releases the busy latch too", () => {
    let state = createScannerState();
    const first = shouldAcceptScan(state, 0, "ABC123", 1_000);
    expect(first.state.busy).toBe(true);

    state = resetScannerState(first.state);

    expect(state.busy).toBe(false);
  });
});
