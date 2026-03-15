import { describe, it, expect } from "vitest"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import {
	getStatus,
	getCountdown,
	formatCountdown,
	getETProgress,
	formatTimeET,
	formatTzName,
	PROMO_END,
} from "./claude2x"

dayjs.extend(utc)
dayjs.extend(timezone)

// Helper: create a dayjs for a specific ET day/time
// March 2026 calendar (EDT = UTC-4):
// Mon 16, Tue 17, Wed 18, Thu 19, Fri 20, Sat 21, Sun 22

describe("getStatus", () => {
	describe("weekday off-peak (2x)", () => {
		it("before peak (morning UTC)", () => {
			// Wednesday March 18, 06:00 UTC = 2 AM ET
			const s = getStatus(dayjs.utc("2026-03-18 06:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isPeak).toBe(false)
			expect(s.isWeekend).toBe(false)
			expect(s.promoActive).toBe(true)
		})

		it("after peak (evening UTC)", () => {
			// Wednesday March 18, 20:00 UTC = 4 PM ET
			const s = getStatus(dayjs.utc("2026-03-18 20:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isPeak).toBe(false)
			expect(s.isWeekend).toBe(false)
		})

		it("just before peak at 11:59 UTC", () => {
			const s = getStatus(dayjs.utc("2026-03-18 11:59:00"))
			expect(s.is2x).toBe(true)
			expect(s.isPeak).toBe(false)
		})

		it("at exactly 18:00 UTC (peak ends)", () => {
			const s = getStatus(dayjs.utc("2026-03-18 18:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isPeak).toBe(false)
		})
	})

	describe("weekday peak (not 2x)", () => {
		it("during peak hours", () => {
			// Wednesday March 18, 14:00 UTC = 10 AM ET
			const s = getStatus(dayjs.utc("2026-03-18 14:00:00"))
			expect(s.is2x).toBe(false)
			expect(s.isPeak).toBe(true)
			expect(s.isWeekend).toBe(false)
		})

		it("at exactly 12:00 UTC (peak starts)", () => {
			const s = getStatus(dayjs.utc("2026-03-18 12:00:00"))
			expect(s.is2x).toBe(false)
			expect(s.isPeak).toBe(true)
		})
	})

	describe("weekends (always 2x)", () => {
		it("Saturday during what would be peak hours", () => {
			// Saturday March 21, 14:00 UTC = 10 AM ET
			const s = getStatus(dayjs.utc("2026-03-21 14:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isPeak).toBe(false)
			expect(s.isWeekend).toBe(true)
		})

		it("Sunday morning", () => {
			// Sunday March 22, 08:00 UTC = 4 AM ET
			const s = getStatus(dayjs.utc("2026-03-22 08:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isWeekend).toBe(true)
		})

		it("Saturday evening", () => {
			// Saturday March 21, 22:00 UTC = 6 PM ET
			const s = getStatus(dayjs.utc("2026-03-21 22:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isWeekend).toBe(true)
		})

		it("late Sunday night in ET (early Monday UTC) is still weekend", () => {
			// Monday March 23, 03:00 UTC = Sunday March 22, 11 PM ET
			const s = getStatus(dayjs.utc("2026-03-23 03:00:00"))
			expect(s.is2x).toBe(true)
			expect(s.isWeekend).toBe(true)
		})
	})

	describe("promo boundaries", () => {
		it("before promo", () => {
			const s = getStatus(dayjs.utc("2026-03-12 20:00:00"))
			expect(s.is2x).toBe(false)
			expect(s.promoNotStarted).toBe(true)
		})

		it("after promo", () => {
			const s = getStatus(dayjs.utc("2026-03-29 20:00:00"))
			expect(s.is2x).toBe(false)
			expect(s.promoEnded).toBe(true)
		})

		it("just before promo start", () => {
			expect(getStatus(dayjs.utc("2026-03-13 03:59:59")).promoNotStarted).toBe(true)
		})

		it("just after promo start", () => {
			expect(getStatus(dayjs.utc("2026-03-13 04:00:01")).promoActive).toBe(true)
		})

		it("just before promo end", () => {
			expect(getStatus(dayjs.utc("2026-03-28 03:59:59")).promoActive).toBe(true)
		})

		it("just after promo end", () => {
			expect(getStatus(dayjs.utc("2026-03-28 04:00:01")).promoEnded).toBe(true)
		})
	})

	describe("input types", () => {
		it("accepts Date objects", () => {
			expect(getStatus(new Date("2026-03-18T20:00:00Z")).is2x).toBe(true)
		})

		it("accepts timestamps", () => {
			expect(getStatus(new Date("2026-03-18T14:00:00Z").getTime()).isPeak).toBe(true)
		})
	})
})

describe("getCountdown", () => {
	it("weekday before peak → counts to peak start", () => {
		const cd = getCountdown(dayjs.utc("2026-03-18 10:00:00"))
		expect(cd.label).toBe("Standard hours begin")
		expect(cd.seconds).toBe(2 * 3600)
	})

	it("weekday during peak → counts to peak end", () => {
		const cd = getCountdown(dayjs.utc("2026-03-18 14:00:00"))
		expect(cd.label).toBe("2x resumes")
		expect(cd.seconds).toBe(4 * 3600)
	})

	it("weekday after peak → counts to next weekday peak", () => {
		// Wednesday 20:00 UTC → Thursday 12:00 UTC = 16h
		const cd = getCountdown(dayjs.utc("2026-03-18 20:00:00"))
		expect(cd.label).toBe("Standard hours begin")
		expect(cd.seconds).toBe(16 * 3600)
	})

	it("Friday after peak → skips weekend to Monday", () => {
		// Friday March 20, 20:00 UTC → Monday March 23, 12:00 UTC
		// = 2 days 16 hours = 64 hours
		const cd = getCountdown(dayjs.utc("2026-03-20 20:00:00"))
		expect(cd.label).toBe("Standard hours begin")
		expect(cd.seconds).toBe(64 * 3600)
	})

	it("Saturday → counts to Monday peak start", () => {
		// Saturday March 21, 10:00 UTC → Monday March 23, 12:00 UTC
		// = 2 days 2 hours = 50 hours
		const cd = getCountdown(dayjs.utc("2026-03-21 10:00:00"))
		expect(cd.label).toBe("Standard hours begin")
		expect(cd.seconds).toBe(50 * 3600)
	})

	it("Sunday → counts to Monday peak start", () => {
		// Sunday March 22, 16:00 UTC → Monday March 23, 12:00 UTC
		// = 20 hours
		const cd = getCountdown(dayjs.utc("2026-03-22 16:00:00"))
		expect(cd.label).toBe("Standard hours begin")
		expect(cd.seconds).toBe(20 * 3600)
	})

	it("late Sunday in ET (early Monday UTC) → counts to Monday peak", () => {
		// Monday March 23, 03:00 UTC = Sunday 11 PM ET → weekend
		// next weekday peak = Monday 12:00 UTC = 9 hours
		const cd = getCountdown(dayjs.utc("2026-03-23 03:00:00"))
		expect(cd.label).toBe("Standard hours begin")
		expect(cd.seconds).toBe(9 * 3600)
	})

	it("promo ended", () => {
		const cd = getCountdown(dayjs.utc("2026-03-29 00:00:00"))
		expect(cd.label).toBe("Promotion has ended")
		expect(cd.seconds).toBe(0)
	})

	it("before promo", () => {
		const cd = getCountdown(dayjs.utc("2026-03-12 04:00:00"))
		expect(cd.label).toBe("Promotion starts")
		expect(cd.seconds).toBeGreaterThan(0)
	})

	it("caps at promo end on last day", () => {
		// Thursday March 27, 20:00 UTC — next peak would be Fri March 28, 12:00 UTC
		// but promo ends March 28, 04:00 UTC
		const now = dayjs.utc("2026-03-27 20:00:00")
		const cd = getCountdown(now)
		expect(cd.label).toBe("Promotion ends")
		expect(cd.seconds).toBe(PROMO_END.diff(now, "second"))
	})
})

describe("formatCountdown", () => {
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
})

describe("getETProgress", () => {
	it("0 at midnight ET (04:00 UTC in EDT)", () => {
		expect(getETProgress(dayjs.utc("2026-03-15 04:00:00"))).toBeCloseTo(0, 2)
	})

	it("0.5 at noon ET (16:00 UTC in EDT)", () => {
		expect(getETProgress(dayjs.utc("2026-03-15 16:00:00"))).toBeCloseTo(0.5, 2)
	})

	it("~0.333 at 8 AM ET / peak start", () => {
		expect(getETProgress(dayjs.utc("2026-03-15 12:00:00"))).toBeCloseTo(8 / 24, 2)
	})
})

describe("formatTimeET", () => {
	it("formats correctly", () => {
		expect(formatTimeET(dayjs.utc("2026-03-15 16:30:00"))).toBe("12:30:00 PM")
	})
})

describe("formatTzName", () => {
	it("extracts city name", () => {
		expect(formatTzName("America/New_York")).toBe("New York")
	})

	it("handles single-part timezone", () => {
		expect(formatTzName("UTC")).toBe("UTC")
	})

	it("handles deep paths", () => {
		expect(formatTzName("America/Indiana/Indianapolis")).toBe("Indianapolis")
	})
})
