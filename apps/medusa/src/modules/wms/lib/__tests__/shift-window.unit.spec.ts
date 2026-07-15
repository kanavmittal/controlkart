import { isShiftOpen, nextOpenAt, type ShiftRow } from "../shift-window"

/**
 * Reference dates (all instants, UTC ISO):
 *   2026-07-12 (Sun UTC)  = IST Sunday    (weekday 0)
 *   2026-07-13 (Mon UTC)  = IST Monday    (weekday 1)
 *   2026-07-17 (Fri UTC)  = IST Friday    (weekday 5)
 *   2026-07-18 (Sat UTC)  = IST Saturday  (weekday 6)
 *
 * IST = UTC+5:30 (no DST), so most instants land on the same IST weekday as
 * their UTC weekday, but late-UTC-night instants roll into the next IST day
 * — that's exercised explicitly below.
 */

describe("isShiftOpen", () => {
  const mondayNineToFive: ShiftRow = {
    weekday: 1,
    start_time: "09:00",
    end_time: "17:00",
    active: true,
  }

  it("is open exactly at the start boundary (inclusive)", () => {
    // 2026-07-13T03:30:00Z = Monday 09:00 IST
    const at = new Date("2026-07-13T03:30:00.000Z")
    expect(isShiftOpen([mondayNineToFive], at)).toBe(true)
  })

  it("is closed exactly at the end boundary (exclusive)", () => {
    // 2026-07-13T11:30:00Z = Monday 17:00 IST
    const at = new Date("2026-07-13T11:30:00.000Z")
    expect(isShiftOpen([mondayNineToFive], at)).toBe(false)
  })

  it("is open one minute before the end boundary", () => {
    // 2026-07-13T11:29:00Z = Monday 16:59 IST
    const at = new Date("2026-07-13T11:29:00.000Z")
    expect(isShiftOpen([mondayNineToFive], at)).toBe(true)
  })

  it("is closed one minute before the start boundary", () => {
    // 2026-07-13T03:29:00Z = Monday 08:59 IST
    const at = new Date("2026-07-13T03:29:00.000Z")
    expect(isShiftOpen([mondayNineToFive], at)).toBe(false)
  })

  it("is closed on a different weekday even within the same time-of-day range", () => {
    // 2026-07-12T03:30:00Z = Sunday 09:00 IST (row is Monday-only)
    const at = new Date("2026-07-12T03:30:00.000Z")
    expect(isShiftOpen([mondayNineToFive], at)).toBe(false)
  })

  describe("overnight windows (end_time < start_time)", () => {
    const fridayNightShift: ShiftRow = {
      weekday: 5, // Friday
      start_time: "22:00",
      end_time: "02:00",
      active: true,
    }

    it("is open before midnight, still on the configured weekday", () => {
      // 2026-07-17T17:30:00Z = Friday 23:00 IST
      const at = new Date("2026-07-17T17:30:00.000Z")
      expect(isShiftOpen([fridayNightShift], at)).toBe(true)
    })

    it("is open after midnight, on the following IST weekday", () => {
      // 2026-07-17T19:30:00Z = Saturday 01:00 IST
      const at = new Date("2026-07-17T19:30:00.000Z")
      expect(isShiftOpen([fridayNightShift], at)).toBe(true)
    })

    it("is closed at the end boundary on the following weekday (exclusive)", () => {
      // 2026-07-17T20:30:00Z = Saturday 02:00 IST
      const at = new Date("2026-07-17T20:30:00.000Z")
      expect(isShiftOpen([fridayNightShift], at)).toBe(false)
    })

    it("is closed before the start boundary on the configured weekday", () => {
      // 2026-07-17T16:29:00Z = Friday 21:59 IST
      const at = new Date("2026-07-17T16:29:00.000Z")
      expect(isShiftOpen([fridayNightShift], at)).toBe(false)
    })

    it("does not leak into the weekday after the overnight span (Sunday)", () => {
      // 2026-07-18T19:30:00Z = Sunday 01:00 IST — same time-of-day as the
      // Saturday-side open window, but Saturday->Sunday isn't configured.
      const at = new Date("2026-07-18T19:30:00.000Z")
      expect(isShiftOpen([fridayNightShift], at)).toBe(false)
    })
  })

  it("ignores inactive rows", () => {
    const inactiveRow: ShiftRow = {
      ...mondayNineToFive,
      active: false,
    }
    // Same instant as the "open at start boundary" case above.
    const at = new Date("2026-07-13T03:30:00.000Z")
    expect(isShiftOpen([inactiveRow], at)).toBe(false)
  })

  it("is closed with an empty shift config", () => {
    const at = new Date("2026-07-13T03:30:00.000Z")
    expect(isShiftOpen([], at)).toBe(false)
  })

  it("uses IST weekday, not UTC weekday, for the conversion", () => {
    // 2026-07-12T23:00:00Z is UTC Sunday 23:00 — but in IST (+5:30) that's
    // already Monday 04:30. A Monday-only row should treat this as open,
    // proving the conversion isn't accidentally using the UTC weekday.
    const mondayEarlyMorning: ShiftRow = {
      weekday: 1,
      start_time: "04:00",
      end_time: "05:00",
      active: true,
    }
    const at = new Date("2026-07-12T23:00:00.000Z")
    expect(isShiftOpen([mondayEarlyMorning], at)).toBe(true)
  })

  it("is open when any one of multiple rows matches", () => {
    const tuesdayShift: ShiftRow = {
      weekday: 2,
      start_time: "09:00",
      end_time: "17:00",
      active: true,
    }
    // 2026-07-13T03:30:00Z = Monday 09:00 IST — matches mondayNineToFive only.
    const at = new Date("2026-07-13T03:30:00.000Z")
    expect(isShiftOpen([tuesdayShift, mondayNineToFive], at)).toBe(true)
  })
})

describe("nextOpenAt", () => {
  it("returns the same instant when already open", () => {
    const shift: ShiftRow = {
      weekday: 1,
      start_time: "09:00",
      end_time: "17:00",
      active: true,
    }
    const at = new Date("2026-07-13T03:30:00.000Z") // Monday 09:00 IST
    expect(nextOpenAt([shift], at)?.getTime()).toBe(at.getTime())
  })

  it("returns null when there are no active shift rows", () => {
    const inactive: ShiftRow = {
      weekday: 1,
      start_time: "09:00",
      end_time: "17:00",
      active: false,
    }
    const at = new Date("2026-07-13T00:00:00.000Z")
    expect(nextOpenAt([], at)).toBeNull()
    expect(nextOpenAt([inactive], at)).toBeNull()
  })

  it("finds the next open instant when currently closed", () => {
    const shift: ShiftRow = {
      weekday: 1,
      start_time: "09:00",
      end_time: "17:00",
      active: true,
    }
    // Monday 08:00 IST -> next open should be Monday 09:00 IST exactly.
    const at = new Date("2026-07-13T02:30:00.000Z")
    const expected = new Date("2026-07-13T03:30:00.000Z")
    expect(nextOpenAt([shift], at)?.getTime()).toBe(expected.getTime())
  })
})
