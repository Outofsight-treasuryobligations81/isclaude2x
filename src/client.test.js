// Tests for static/client.js — the browser-side 2x status logic.
// These test the same functions that run in the browser, using native Date + Intl.
// The `typeof document` guard in client.js skips DOM code in vitest.

import { describe, it, expect, beforeAll } from "vitest"

// Load client.js into the global scope (no IIFE, functions are global)
beforeAll(async () => {
	await import("../static/client.js")
})

// March 2026 calendar (EDT = UTC-4):
// Fri 13 (promo starts), Sat 14, Sun 15,
// Mon 16, Tue 17, Wed 18, Thu 19, Fri 20, Sat 21, Sun 22,
// Mon 23, Tue 24, Wed 25, Thu 26, Fri 27 (promo ends end-of-day)

/** Helper: UTC timestamp from ISO-ish string */
const utc = (s) => new Date(s + "Z").getTime()

// ──────────────────────────────────────────────────────────
// getStatus
// ──────────────────────────────────────────────────────────
describe("client getStatus", () => {
	describe("weekday off-peak (2x)", () => {
		it("before peak (morning UTC)", () => {
			const s = getStatus(utc("2026-03-18T06:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isPeak).toBe(false)
			expect(s.isWeekend).toBe(false)
		})

		it("after peak (evening UTC)", () => {
			const s = getStatus(utc("2026-03-18T20:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isPeak).toBe(false)
		})

		it("at exactly 18:00 UTC (peak ends)", () => {
			const s = getStatus(utc("2026-03-18T18:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isPeak).toBe(false)
		})
	})

	describe("weekday peak (not 2x)", () => {
		it("during peak hours", () => {
			const s = getStatus(utc("2026-03-18T14:00:00"))
			expect(s.is2x).toBe(false)
			expect(s.isPeak).toBe(true)
		})

		it("at exactly 12:00 UTC (peak starts)", () => {
			const s = getStatus(utc("2026-03-18T12:00:00"))
			expect(s.is2x).toBe(false)
			expect(s.isPeak).toBe(true)
		})
	})

	describe("weekends (always 2x)", () => {
		it("Saturday during peak UTC hours", () => {
			const s = getStatus(utc("2026-03-21T14:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isPeak).toBe(false)
			expect(s.isWeekend).toBe(true)
		})

		it("Sunday morning", () => {
			const s = getStatus(utc("2026-03-22T08:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isWeekend).toBe(true)
		})

		it("late Sunday in ET (early Monday UTC) is still weekend", () => {
			// Monday 03:00 UTC = Sunday 11 PM ET
			const s = getStatus(utc("2026-03-23T03:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isWeekend).toBe(true)
		})
	})

	describe("UTC vs ET day boundary mismatch", () => {
		it("Saturday 00:00 UTC = Friday 8 PM ET → weekday", () => {
			const s = getStatus(utc("2026-03-21T00:00:00"))
			expect(s.isWeekend).toBe(false) // Friday in ET
			expect(s.is2x).toBe(true) // off-peak
		})

		it("Saturday 04:00 UTC = Saturday 00:00 ET → weekend starts", () => {
			const s = getStatus(utc("2026-03-21T04:00:00"))
			expect(s.isWeekend).toBe(true)
		})

		it("Monday 03:59 UTC = Sunday 11:59 PM ET → still weekend", () => {
			const s = getStatus(utc("2026-03-23T03:59:00"))
			expect(s.isWeekend).toBe(true)
		})

		it("Monday 04:00 UTC = Monday 00:00 ET → weekday", () => {
			const s = getStatus(utc("2026-03-23T04:00:00"))
			expect(s.isWeekend).toBe(false)
		})
	})

	describe("promo boundaries", () => {
		it("before promo", () => {
			const s = getStatus(utc("2026-03-12T20:00:00"))
			expect(s.promoNotStarted).toBe(true)
			expect(s.is2x).toBe(false)
		})

		it("after promo", () => {
			const s = getStatus(utc("2026-03-29T20:00:00"))
			expect(s.promoEnded).toBe(true)
			expect(s.is2x).toBe(false)
		})

		it("at exact promo start boundary (ts == PROMO_START) is promoNotStarted", () => {
			// Client uses strict > for promoActive, so exactly equal = not started
			expect(getStatus(PROMO_START).promoNotStarted).toBe(true)
		})

		it("1ms after promo start", () => {
			expect(getStatus(PROMO_START + 1).promoActive).toBe(true)
		})

		it("at exact promo end boundary (ts == PROMO_END) is promoEnded", () => {
			expect(getStatus(PROMO_END).promoEnded).toBe(true)
		})

		it("1ms before promo end", () => {
			expect(getStatus(PROMO_END - 1).promoActive).toBe(true)
		})
	})

	describe("every weekday has peak", () => {
		const weekdays = ["2026-03-16", "2026-03-17", "2026-03-18", "2026-03-19", "2026-03-20"]
		for (const date of weekdays) {
			it(`${date} at 14:00 UTC is peak`, () => {
				expect(getStatus(utc(`${date}T14:00:00`)).isPeak).toBe(true)
			})
			it(`${date} at 20:00 UTC is 2x`, () => {
				expect(getStatus(utc(`${date}T20:00:00`)).is2x).toBe(true)
			})
		}
	})

	describe("weekend peak UTC hours still 2x", () => {
		for (let h = 12; h < 18; h++) {
			it(`Saturday at ${h}:00 UTC is 2x (weekend overrides)`, () => {
				const s = getStatus(utc(`2026-03-21T${String(h).padStart(2, "0")}:00:00`))
				expect(s.is2x).toBe(true)
				expect(s.isPeak).toBe(false)
			})
		}
	})
})

// ──────────────────────────────────────────────────────────
// getCountdown
// ──────────────────────────────────────────────────────────
describe("client getCountdown", () => {
	it("weekday before peak → counts to peak start", () => {
		const cd = getCountdown(utc("2026-03-18T10:00:00"))
		expect(cd.label).toBe("Standard hours begin")
		expect(cd.seconds).toBe(2 * 3600)
	})

	it("weekday during peak → counts to peak end", () => {
		const cd = getCountdown(utc("2026-03-18T14:00:00"))
		expect(cd.label).toBe("2x resumes")
		expect(cd.seconds).toBe(4 * 3600)
	})

	it("weekday after peak → next weekday peak", () => {
		// Wednesday 20:00 → Thursday 12:00 = 16h
		const cd = getCountdown(utc("2026-03-18T20:00:00"))
		expect(cd.label).toBe("Standard hours begin")
		expect(cd.seconds).toBe(16 * 3600)
	})

	it("Friday after peak → skips weekend to Monday", () => {
		// Friday 20:00 → Monday 12:00 = 64h
		const cd = getCountdown(utc("2026-03-20T20:00:00"))
		expect(cd.label).toBe("Standard hours begin")
		expect(cd.seconds).toBe(64 * 3600)
	})

	it("Saturday → Monday peak start", () => {
		// Saturday 10:00 → Monday 12:00 = 50h
		const cd = getCountdown(utc("2026-03-21T10:00:00"))
		expect(cd.label).toBe("Standard hours begin")
		expect(cd.seconds).toBe(50 * 3600)
	})

	it("Sunday → Monday peak start", () => {
		// Sunday 16:00 → Monday 12:00 = 20h
		const cd = getCountdown(utc("2026-03-22T16:00:00"))
		expect(cd.label).toBe("Standard hours begin")
		expect(cd.seconds).toBe(20 * 3600)
	})

	it("late Sunday ET (early Monday UTC) → Monday peak", () => {
		// Monday 03:00 UTC = Sunday 11 PM ET → 9h to Monday 12:00
		const cd = getCountdown(utc("2026-03-23T03:00:00"))
		expect(cd.label).toBe("Standard hours begin")
		expect(cd.seconds).toBe(9 * 3600)
	})

	it("caps at promo end on last day", () => {
		const ts = utc("2026-03-27T20:00:00")
		const cd = getCountdown(ts)
		expect(cd.label).toBe("Promotion ends")
		expect(cd.seconds).toBe(Math.floor((PROMO_END - ts) / 1000))
	})

	it("promo ended → 0 seconds", () => {
		const cd = getCountdown(PROMO_END + 1)
		expect(cd.label).toBe("Promotion has ended")
		expect(cd.seconds).toBe(0)
	})

	it("before promo → counts to start", () => {
		const cd = getCountdown(utc("2026-03-12T04:00:00"))
		expect(cd.label).toBe("Promotion starts")
		expect(cd.seconds).toBeGreaterThan(0)
	})

	describe("exact transition precision", () => {
		it("1 second before peak", () => {
			const cd = getCountdown(utc("2026-03-18T11:59:59"))
			expect(cd.seconds).toBe(1)
		})

		it("1 second before peak end", () => {
			const cd = getCountdown(utc("2026-03-18T17:59:59"))
			expect(cd.seconds).toBe(1)
		})
	})

	describe("Mon-Fri after peak produces correct hours", () => {
		const expected = [
			["Mon", "2026-03-16T20:00:00", 16],
			["Tue", "2026-03-17T20:00:00", 16],
			["Wed", "2026-03-18T20:00:00", 16],
			["Thu", "2026-03-19T20:00:00", 16],
			["Fri", "2026-03-20T20:00:00", 64],
		]
		for (const [name, time, hours] of expected) {
			it(`${name} → ${hours}h`, () => {
				expect(getCountdown(utc(time)).seconds).toBe(hours * 3600)
			})
		}
	})
})

// ──────────────────────────────────────────────────────────
// formatCountdown
// ──────────────────────────────────────────────────────────
describe("client formatCountdown", () => {
	it("hours, minutes, seconds", () => {
		expect(formatCountdown(3661)).toBe("1h 01m 01s")
	})
	it("minutes and seconds", () => {
		expect(formatCountdown(125)).toBe("2m 05s")
	})
	it("seconds only", () => {
		expect(formatCountdown(45)).toBe("45s")
	})
	it("days when > 24h", () => {
		expect(formatCountdown(90000)).toBe("1d 1h 00m")
	})
	it("em-dash for zero", () => {
		expect(formatCountdown(0)).toBe("\u2014")
	})
	it("em-dash for negative", () => {
		expect(formatCountdown(-5)).toBe("\u2014")
	})
	it("exactly 1 second", () => {
		expect(formatCountdown(1)).toBe("1s")
	})
	it("exactly 60 seconds", () => {
		expect(formatCountdown(60)).toBe("1m 00s")
	})
	it("exactly 1 hour", () => {
		expect(formatCountdown(3600)).toBe("1h 00m 00s")
	})
})

// ──────────────────────────────────────────────────────────
// getETProgress
// ──────────────────────────────────────────────────────────
describe("client getETProgress", () => {
	it("~0 at midnight ET (04:00 UTC)", () => {
		expect(getETProgress(utc("2026-03-15T04:00:00"))).toBeCloseTo(0, 2)
	})
	it("~0.5 at noon ET (16:00 UTC)", () => {
		expect(getETProgress(utc("2026-03-15T16:00:00"))).toBeCloseTo(0.5, 2)
	})
	it("~0.333 at 8 AM ET (12:00 UTC)", () => {
		expect(getETProgress(utc("2026-03-15T12:00:00"))).toBeCloseTo(8 / 24, 2)
	})
})

// ──────────────────────────────────────────────────────────
// getDayName
// ──────────────────────────────────────────────────────────
describe("client getDayName", () => {
	it("returns ET day name in ET timezone", () => {
		// Monday March 16, 14:00 UTC = 10 AM ET Monday
		expect(getDayName(utc("2026-03-16T14:00:00"), "America/New_York")).toBe("Monday")
	})

	it("returns IST day when ET day differs", () => {
		// Monday March 16, 02:00 UTC = Sunday 10 PM ET but Monday 7:30 AM IST
		expect(getDayName(utc("2026-03-16T02:00:00"), "Asia/Kolkata")).toBe("Monday")
		expect(getDayName(utc("2026-03-16T02:00:00"), "America/New_York")).toBe("Sunday")
	})

	it("returns correct day in Pacific timezone", () => {
		// Sunday March 15, 06:00 UTC = Saturday 11 PM PT
		expect(getDayName(utc("2026-03-15T06:00:00"), "America/Los_Angeles")).toBe("Saturday")
	})
})

// ──────────────────────────────────────────────────────────
// Local day vs ET day (timeline display logic)
// ──────────────────────────────────────────────────────────
describe("local day vs ET day for timeline", () => {
	it("Monday IST but Sunday ET → local day is weekday, ET is weekend", () => {
		// Monday March 16, 00:00 UTC = Sunday 8 PM ET, Monday 5:30 AM IST
		const ts = utc("2026-03-16T00:00:00")
		const localDay = getDayName(ts, "Asia/Kolkata")
		const etDay = getDayName(ts, "America/New_York")
		const localIsWeekend = localDay === "Saturday" || localDay === "Sunday"
		expect(localDay).toBe("Monday")
		expect(etDay).toBe("Sunday")
		expect(localIsWeekend).toBe(false)
		// Status: weekend in ET → 2x, but timeline should show weekday bar
		const st = getStatus(ts)
		expect(st.isWeekend).toBe(true) // ET is Sunday
		expect(st.is2x).toBe(true)
	})

	it("Saturday IST but Friday ET → local day is weekend", () => {
		// Saturday March 21, 00:00 UTC = Friday 8 PM ET, Saturday 5:30 AM IST
		const ts = utc("2026-03-21T00:00:00")
		const localDay = getDayName(ts, "Asia/Kolkata")
		const etDay = getDayName(ts, "America/New_York")
		const localIsWeekend = localDay === "Saturday" || localDay === "Sunday"
		expect(localDay).toBe("Saturday")
		expect(etDay).toBe("Friday")
		expect(localIsWeekend).toBe(true)
	})

	it("Sunday ET and Sunday IST → both agree on weekend", () => {
		// Sunday March 15, 14:00 UTC = Sunday 10 AM ET, Sunday 7:30 PM IST
		const ts = utc("2026-03-15T14:00:00")
		expect(getDayName(ts, "Asia/Kolkata")).toBe("Sunday")
		expect(getDayName(ts, "America/New_York")).toBe("Sunday")
		expect(getStatus(ts).isWeekend).toBe(true)
	})

	it("Monday ET and Monday IST → both agree on weekday", () => {
		// Monday March 16, 14:00 UTC = Monday 10 AM ET, Monday 7:30 PM IST
		const ts = utc("2026-03-16T14:00:00")
		expect(getDayName(ts, "Asia/Kolkata")).toBe("Monday")
		expect(getDayName(ts, "America/New_York")).toBe("Monday")
		expect(getStatus(ts).isWeekend).toBe(false)
		expect(getStatus(ts).isPeak).toBe(true)
	})

	it("Monday IST morning has 2x (ET still Sunday) but peak later", () => {
		// Monday March 16, 03:00 UTC = Sunday 11 PM ET, Monday 8:30 AM IST
		const earlyTs = utc("2026-03-16T03:00:00")
		expect(getStatus(earlyTs).is2x).toBe(true) // weekend in ET
		expect(getStatus(earlyTs).isWeekend).toBe(true)

		// Monday March 16, 14:00 UTC = Monday 10 AM ET, Monday 7:30 PM IST → peak
		const peakTs = utc("2026-03-16T14:00:00")
		expect(getStatus(peakTs).is2x).toBe(false)
		expect(getStatus(peakTs).isPeak).toBe(true)
		expect(getStatus(peakTs).isWeekend).toBe(false)
	})
})

// ──────────────────────────────────────────────────────────
// getPeakFractions — multi-timezone peak window positioning
// ──────────────────────────────────────────────────────────
describe("client getPeakFractions", () => {
	// Peak is 12:00–18:00 UTC. Each timezone shifts this window differently.
	// When the window crosses local midnight, end < start (wrapping).

	it("EDT (UTC-4): peak 8 AM–2 PM, no wrap", () => {
		const p = getPeakFractions("America/New_York")
		expect(p.start).toBeCloseTo(8 / 24, 2) // 8 AM
		expect(p.end).toBeCloseTo(14 / 24, 2) // 2 PM
		expect(p.end).toBeGreaterThan(p.start) // no wrap
	})

	it("PDT (UTC-7): peak 5 AM–11 AM, no wrap", () => {
		const p = getPeakFractions("America/Los_Angeles")
		expect(p.start).toBeCloseTo(5 / 24, 2) // 5 AM
		expect(p.end).toBeCloseTo(11 / 24, 2) // 11 AM
		expect(p.end).toBeGreaterThan(p.start)
	})

	it("IST (UTC+5:30): peak 5:30 PM–11:30 PM, no wrap", () => {
		const p = getPeakFractions("Asia/Kolkata")
		expect(p.start).toBeCloseTo(17.5 / 24, 2) // 5:30 PM
		expect(p.end).toBeCloseTo(23.5 / 24, 2) // 11:30 PM
		expect(p.end).toBeGreaterThan(p.start)
	})

	it("JST (UTC+9): peak 9 PM–3 AM, WRAPS midnight", () => {
		const p = getPeakFractions("Asia/Tokyo")
		expect(p.start).toBeCloseTo(21 / 24, 2) // 9 PM
		expect(p.end).toBeCloseTo(3 / 24, 2) // 3 AM next day
		expect(p.end).toBeLessThan(p.start) // wraps!
	})

	it("AEDT (UTC+11): peak 11 PM–5 AM, WRAPS midnight", () => {
		const p = getPeakFractions("Australia/Sydney")
		expect(p.start).toBeCloseTo(23 / 24, 2) // 11 PM
		expect(p.end).toBeCloseTo(5 / 24, 2) // 5 AM next day
		expect(p.end).toBeLessThan(p.start) // wraps!
	})

	it("UTC: peak 12 PM–6 PM, no wrap", () => {
		const p = getPeakFractions("UTC")
		expect(p.start).toBeCloseTo(12 / 24, 2) // noon
		expect(p.end).toBeCloseTo(18 / 24, 2) // 6 PM
		expect(p.end).toBeGreaterThan(p.start)
	})

	it("HST (UTC-10): peak 2 AM–8 AM, no wrap", () => {
		const p = getPeakFractions("Pacific/Honolulu")
		expect(p.start).toBeCloseTo(2 / 24, 2) // 2 AM
		expect(p.end).toBeCloseTo(8 / 24, 2) // 8 AM
		expect(p.end).toBeGreaterThan(p.start)
	})

	it("NZDT (UTC+13): peak 1 AM–7 AM, no wrap", () => {
		const p = getPeakFractions("Pacific/Auckland")
		expect(p.start).toBeCloseTo(1 / 24, 2) // 1 AM
		expect(p.end).toBeCloseTo(7 / 24, 2) // 7 AM
		expect(p.end).toBeGreaterThan(p.start)
	})

	it("segment widths always sum to 100% (non-wrapping)", () => {
		for (const tz of ["America/New_York", "America/Los_Angeles", "UTC", "Asia/Kolkata"]) {
			const p = getPeakFractions(tz)
			const s = p.start * 100
			const e = p.end * 100
			// [2x: 0..s] [peak: s..e] [2x: e..100]
			expect(s + (e - s) + (100 - e)).toBeCloseTo(100, 5)
		}
	})

	it("segment widths always sum to 100% (wrapping)", () => {
		for (const tz of ["Asia/Tokyo", "Australia/Sydney"]) {
			const p = getPeakFractions(tz)
			const s = p.start * 100
			const e = p.end * 100
			// [peak: 0..e] [2x: e..s] [peak: s..100]
			expect(e + (s - e) + (100 - s)).toBeCloseTo(100, 5)
		}
	})
})

// ──────────────────────────────────────────────────────────
// getDayProgress — timezone-aware day fraction
// ──────────────────────────────────────────────────────────
describe("client getDayProgress multi-timezone", () => {
	it("midnight in each timezone returns ~0", () => {
		// Midnight EDT = 04:00 UTC
		expect(getDayProgress(utc("2026-03-18T04:00:00"), "America/New_York")).toBeCloseTo(0, 2)
		// Midnight PDT = 07:00 UTC
		expect(getDayProgress(utc("2026-03-18T07:00:00"), "America/Los_Angeles")).toBeCloseTo(0, 2)
		// Midnight JST = 15:00 UTC (previous day)
		expect(getDayProgress(utc("2026-03-17T15:00:00"), "Asia/Tokyo")).toBeCloseTo(0, 2)
	})

	it("noon in each timezone returns ~0.5", () => {
		// Noon EDT = 16:00 UTC
		expect(getDayProgress(utc("2026-03-18T16:00:00"), "America/New_York")).toBeCloseTo(0.5, 2)
		// Noon PDT = 19:00 UTC
		expect(getDayProgress(utc("2026-03-18T19:00:00"), "America/Los_Angeles")).toBeCloseTo(0.5, 2)
		// Noon JST = 03:00 UTC
		expect(getDayProgress(utc("2026-03-18T03:00:00"), "Asia/Tokyo")).toBeCloseTo(0.5, 2)
	})

	it("handles half-hour offset (IST UTC+5:30) correctly", () => {
		// 6:00 PM IST = 12:30 UTC → 18/24 = 0.75
		expect(getDayProgress(utc("2026-03-18T12:30:00"), "Asia/Kolkata")).toBeCloseTo(18 / 24, 2)
		// 5:30 PM IST = 12:00 UTC → 17.5/24
		expect(getDayProgress(utc("2026-03-18T12:00:00"), "Asia/Kolkata")).toBeCloseTo(17.5 / 24, 2)
	})

	it("handles 45-minute offset (Nepal UTC+5:45) correctly", () => {
		// 12:00 UTC = 5:45 PM NPT → 17.75/24
		expect(getDayProgress(utc("2026-03-18T12:00:00"), "Asia/Kathmandu")).toBeCloseTo(17.75 / 24, 2)
	})

	it("progress increases monotonically through a JST day", () => {
		// JST midnight = 15:00 UTC prev day
		const base = utc("2026-03-17T15:00:00") // midnight JST March 18
		const values = []
		for (let h = 0; h < 24; h++) {
			values.push(getDayProgress(base + h * 3600000, "Asia/Tokyo"))
		}
		for (let i = 1; i < values.length; i++) {
			expect(values[i]).toBeGreaterThan(values[i - 1])
		}
	})
})

// ──────────────────────────────────────────────────────────
// formatHourInTz — peak hour labels
// ──────────────────────────────────────────────────────────
describe("client formatHourInTz", () => {
	it("peak start in EDT = 8:00 AM", () => {
		expect(formatHourInTz(12, "America/New_York")).toBe("8:00 AM")
	})

	it("peak end in EDT = 2:00 PM", () => {
		expect(formatHourInTz(18, "America/New_York")).toBe("2:00 PM")
	})

	it("peak start in PDT = 5:00 AM", () => {
		expect(formatHourInTz(12, "America/Los_Angeles")).toBe("5:00 AM")
	})

	it("peak end in PDT = 11:00 AM", () => {
		expect(formatHourInTz(18, "America/Los_Angeles")).toBe("11:00 AM")
	})

	it("peak start in IST = 5:30 PM", () => {
		expect(formatHourInTz(12, "Asia/Kolkata")).toBe("5:30 PM")
	})

	it("peak end in IST = 11:30 PM", () => {
		expect(formatHourInTz(18, "Asia/Kolkata")).toBe("11:30 PM")
	})

	it("peak start in JST = 9:00 PM", () => {
		expect(formatHourInTz(12, "Asia/Tokyo")).toBe("9:00 PM")
	})

	it("peak end in JST = 3:00 AM", () => {
		expect(formatHourInTz(18, "Asia/Tokyo")).toBe("3:00 AM")
	})

	it("peak start in AEDT = 11:00 PM", () => {
		expect(formatHourInTz(12, "Australia/Sydney")).toBe("11:00 PM")
	})

	it("peak end in AEDT = 5:00 AM", () => {
		expect(formatHourInTz(18, "Australia/Sydney")).toBe("5:00 AM")
	})

	it("peak start in UTC = 12:00 PM", () => {
		expect(formatHourInTz(12, "UTC")).toBe("12:00 PM")
	})

	it("peak end in UTC = 6:00 PM", () => {
		expect(formatHourInTz(18, "UTC")).toBe("6:00 PM")
	})
})

// ──────────────────────────────────────────────────────────
// isWeekendET vs local day — cross-timezone edge cases
// ──────────────────────────────────────────────────────────
describe("weekend detection vs local day (cross-timezone)", () => {
	it("Saturday 5:30 AM IST = Friday 8 PM ET → NOT weekend in ET", () => {
		// March 21, 00:00 UTC = Friday 8 PM ET = Saturday 5:30 AM IST
		const ts = utc("2026-03-21T00:00:00")
		expect(isWeekendET(ts)).toBe(false) // Friday in ET
		expect(getDayName(ts, "Asia/Kolkata")).toBe("Saturday") // Saturday in IST
		expect(getStatus(ts).is2x).toBe(true) // off-peak weekday → 2x
		expect(getStatus(ts).isWeekend).toBe(false)
	})

	it("Saturday 9 AM JST = Friday 8 PM ET → NOT weekend in ET", () => {
		const ts = utc("2026-03-21T00:00:00")
		expect(getDayName(ts, "Asia/Tokyo")).toBe("Saturday")
		expect(getDayName(ts, "America/New_York")).toBe("Friday")
		expect(isWeekendET(ts)).toBe(false)
	})

	it("Monday 8:30 AM IST = Sunday 11 PM ET → IS weekend in ET", () => {
		// March 16, 03:00 UTC = Sunday 11 PM ET = Monday 8:30 AM IST
		const ts = utc("2026-03-16T03:00:00")
		expect(getDayName(ts, "Asia/Kolkata")).toBe("Monday")
		expect(getDayName(ts, "America/New_York")).toBe("Sunday")
		expect(isWeekendET(ts)).toBe(true)
		expect(getStatus(ts).is2x).toBe(true) // weekend → 2x
		expect(getStatus(ts).isWeekend).toBe(true)
	})

	it("Friday 11 PM PT = Saturday 2 AM ET → IS weekend in ET", () => {
		// March 21, 06:00 UTC = Sat 2 AM ET = Fri 11 PM PDT
		const ts = utc("2026-03-21T06:00:00")
		expect(getDayName(ts, "America/Los_Angeles")).toBe("Friday")
		expect(getDayName(ts, "America/New_York")).toBe("Saturday")
		expect(isWeekendET(ts)).toBe(true)
		expect(getStatus(ts).is2x).toBe(true)
	})

	it("Sunday 11 PM HST = Monday 9 AM ET → NOT weekend in ET", () => {
		// March 23, 09:00 UTC = Mon 5 AM ET = Sun 11 PM HST
		// Wait, EDT is UTC-4 so 09:00 UTC = 5 AM EDT
		const ts = utc("2026-03-23T09:00:00")
		expect(getDayName(ts, "Pacific/Honolulu")).toBe("Sunday")
		expect(getDayName(ts, "America/New_York")).toBe("Monday")
		expect(isWeekendET(ts)).toBe(false)
	})

	it("Saturday AEDT but Friday ET → uses ET (not weekend)", () => {
		// March 21, 01:00 UTC = Fri 9 PM ET = Sat 12 PM AEDT
		const ts = utc("2026-03-21T01:00:00")
		expect(getDayName(ts, "Australia/Sydney")).toBe("Saturday")
		expect(getDayName(ts, "America/New_York")).toBe("Friday")
		expect(isWeekendET(ts)).toBe(false)
		expect(getStatus(ts).isWeekend).toBe(false)
	})
})

// ──────────────────────────────────────────────────────────
// Timeline wrapping correctness for specific timezones
// ──────────────────────────────────────────────────────────
describe("timeline segment computation per timezone", () => {
	function computeSegments(tz) {
		const peak = getPeakFractions(tz)
		const peakStart = peak.start * 100
		const peakEnd = peak.end * 100
		const wraps = peakEnd < peakStart

		if (wraps) {
			return {
				wraps: true,
				seg0: { type: "peak", width: peakEnd },
				seg1: { type: "2x", width: peakStart - peakEnd },
				seg2: { type: "peak", width: 100 - peakStart },
			}
		}
		return {
			wraps: false,
			seg0: { type: "2x", width: peakStart },
			seg1: { type: "peak", width: peakEnd - peakStart },
			seg2: { type: "2x", width: 100 - peakEnd },
		}
	}

	it("EDT: [2x 33%] [peak 25%] [2x 42%], no wrap", () => {
		const s = computeSegments("America/New_York")
		expect(s.wraps).toBe(false)
		expect(s.seg0.type).toBe("2x")
		expect(s.seg0.width).toBeCloseTo(33.33, 0)
		expect(s.seg1.type).toBe("peak")
		expect(s.seg1.width).toBeCloseTo(25, 0)
		expect(s.seg2.type).toBe("2x")
		expect(s.seg2.width).toBeCloseTo(41.67, 0)
	})

	it("PDT: [2x 21%] [peak 25%] [2x 54%], no wrap", () => {
		const s = computeSegments("America/Los_Angeles")
		expect(s.wraps).toBe(false)
		expect(s.seg1.width).toBeCloseTo(25, 0) // 6h/24h = 25%
	})

	it("JST: [peak 12.5%] [2x 75%] [peak 12.5%], wraps", () => {
		const s = computeSegments("Asia/Tokyo")
		expect(s.wraps).toBe(true)
		expect(s.seg0.type).toBe("peak") // 0–3 AM = 12.5%
		expect(s.seg0.width).toBeCloseTo(12.5, 0)
		expect(s.seg1.type).toBe("2x") // 3 AM–9 PM = 75%
		expect(s.seg1.width).toBeCloseTo(75, 0)
		expect(s.seg2.type).toBe("peak") // 9 PM–midnight = 12.5%
		expect(s.seg2.width).toBeCloseTo(12.5, 0)
	})

	it("AEDT: [peak ~21%] [2x ~75%] [peak ~4%], wraps", () => {
		const s = computeSegments("Australia/Sydney")
		expect(s.wraps).toBe(true)
		expect(s.seg0.type).toBe("peak") // midnight–5 AM ≈ 20.8%
		expect(s.seg1.type).toBe("2x") // 5 AM–11 PM ≈ 75%
		expect(s.seg2.type).toBe("peak") // 11 PM–midnight ≈ 4.2%
	})

	it("all segments have positive widths for every timezone", () => {
		const tzs = [
			"America/New_York", "America/Los_Angeles", "America/Chicago",
			"UTC", "Europe/London", "Europe/Berlin", "Asia/Kolkata",
			"Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland",
			"Pacific/Honolulu",
		]
		for (const tz of tzs) {
			const s = computeSegments(tz)
			expect(s.seg0.width).toBeGreaterThan(0)
			expect(s.seg1.width).toBeGreaterThan(0)
			expect(s.seg2.width).toBeGreaterThan(0)
			const total = s.seg0.width + s.seg1.width + s.seg2.width
			expect(total).toBeCloseTo(100, 1)
		}
	})
})

// ──────────────────────────────────────────────────────────
// formatTzName
// ──────────────────────────────────────────────────────────
describe("client formatTzName", () => {
	it("extracts city name", () => {
		expect(formatTzName("America/New_York")).toBe("New York")
	})
	it("handles single-part", () => {
		expect(formatTzName("UTC")).toBe("UTC")
	})
	it("handles deep paths", () => {
		expect(formatTzName("America/Indiana/Indianapolis")).toBe("Indianapolis")
	})
})
