/**
 * Pure-logic shift-window evaluation.
 *
 * The warehouse's shift schedule (`shift_config` rows) is defined in
 * warehouse-local time — IST (Asia/Kolkata, UTC+5:30, no DST) — regardless
 * of what timezone the server process happens to run in. This file converts
 * a JS `Date` (an absolute instant) to IST wall-clock weekday/time-of-day
 * using a fixed UTC offset, so results are correct no matter the host TZ.
 *
 * No Medusa / module / framework imports on purpose — stays a plain,
 * dependency-free TypeScript library, unit tested in isolation.
 */

/** IST is a fixed UTC+5:30 offset — India does not observe DST. */
const IST_OFFSET_MINUTES = 5 * 60 + 30

const MINUTES_PER_DAY = 24 * 60

export type ShiftRow = {
  /** 0 (Sunday) - 6 (Saturday), IST weekday. */
  weekday: number
  /** "HH:MM", IST wall-clock time. */
  start_time: string
  /** "HH:MM", IST wall-clock time. */
  end_time: string
  active: boolean
}

type IstParts = {
  /** 0 (Sunday) - 6 (Saturday). */
  weekday: number
  /** Minutes since IST midnight, 0-1439. */
  minutesOfDay: number
}

/**
 * Converts an absolute instant to its IST weekday + minutes-of-day.
 *
 * Trick: shift the epoch ms by the fixed IST offset, then read the shifted
 * instant's *UTC* fields. This sidesteps the host machine's local timezone
 * entirely — the calculation only depends on the epoch value of `at` and a
 * constant offset, never on `Date.prototype.getDay/getHours` (which are
 * host-TZ-dependent).
 */
function toIstParts(at: Date): IstParts {
  const shifted = new Date(at.getTime() + IST_OFFSET_MINUTES * 60 * 1000)
  return {
    weekday: shifted.getUTCDay(),
    minutesOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  }
}

/** Parses "HH:MM" into minutes since midnight. Throws on malformed input. */
function parseHHMM(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) {
    throw new Error(`Invalid HH:MM time: "${value}"`)
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid HH:MM time: "${value}"`)
  }
  return hours * 60 + minutes
}

/**
 * Is at least one active shift row open at `at` (an absolute instant)?
 *
 * Matching is against the IST weekday/time-of-day derived from `at`.
 * Windows are inclusive of `start_time`, exclusive of `end_time`.
 *
 * Overnight windows (end_time < start_time) span from `start_time` on
 * `weekday` through `end_time` on the *following* IST weekday — e.g.
 * weekday=5 (Fri) 22:00-02:00 is open Friday 22:00-23:59 AND Saturday
 * 00:00-01:59.
 */
export function isShiftOpen(shifts: ShiftRow[], at: Date): boolean {
  const { weekday, minutesOfDay } = toIstParts(at)
  const previousWeekday = (weekday + 6) % 7

  return shifts.some((row) => {
    if (!row.active) {
      return false
    }

    const start = parseHHMM(row.start_time)
    const end = parseHHMM(row.end_time)
    const overnight = end < start

    if (!overnight) {
      return (
        row.weekday === weekday && minutesOfDay >= start && minutesOfDay < end
      )
    }

    // Before-midnight side: still `row.weekday`, at/after start.
    if (row.weekday === weekday && minutesOfDay >= start) {
      return true
    }
    // After-midnight side: now the *next* IST weekday, before end.
    if (row.weekday === previousWeekday && minutesOfDay < end) {
      return true
    }
    return false
  })
}

/**
 * Finds the next instant (at or after `at`) when at least one active shift
 * is open, or `null` if no active shift row exists at all.
 *
 * Cheap bounded search: shift boundaries only ever fall on minute
 * granularity (HH:MM), so scanning minute-by-minute for up to 8 days
 * (covering every weekday plus one for overnight wrap) is guaranteed to
 * find the next open instant if one exists within that window — which it
 * always does, since the schedule repeats weekly.
 */
export function nextOpenAt(shifts: ShiftRow[], at: Date): Date | null {
  const activeShifts = shifts.filter((row) => row.active)
  if (!activeShifts.length) {
    return null
  }

  if (isShiftOpen(activeShifts, at)) {
    return at
  }

  const maxMinutesToScan = 8 * MINUTES_PER_DAY // 8 days covers a full week + overnight wrap
  for (let i = 1; i <= maxMinutesToScan; i++) {
    const candidate = new Date(at.getTime() + i * 60 * 1000)
    if (isShiftOpen(activeShifts, candidate)) {
      return candidate
    }
  }
  return null
}
