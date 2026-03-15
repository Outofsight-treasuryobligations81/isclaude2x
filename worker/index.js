const PROMO_START = new Date("2026-03-13T04:00:00Z").getTime()
const PROMO_END = new Date("2026-03-28T04:00:00Z").getTime()

const PEAK_START_UTC = 12
const PEAK_END_UTC = 18

function isWeekendInET(ts) {
	const day = new Date(ts).toLocaleDateString("en-US", {
		timeZone: "America/New_York",
		weekday: "short",
	})
	return day === "Sat" || day === "Sun"
}

function getStatus(ts) {
	const promoActive = ts >= PROMO_START && ts < PROMO_END
	const utcHour = new Date(ts).getUTCHours()
	const isPeakHour = utcHour >= PEAK_START_UTC && utcHour < PEAK_END_UTC
	const isWeekend = isWeekendInET(ts)
	const isPeak = !isWeekend && isPeakHour
	const is2x = promoActive && (isWeekend || !isPeakHour)

	return { is2x, promoActive, isPeak, isWeekend }
}

function formatInTz(ts, tz) {
	try {
		return new Date(ts).toLocaleString("en-US", {
			timeZone: tz,
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		})
	} catch {
		return null
	}
}

function formatET(ts) {
	return formatInTz(ts, "America/New_York")
}

function etDayName(ts) {
	return new Date(ts).toLocaleDateString("en-US", {
		timeZone: "America/New_York",
		weekday: "long",
	})
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url)
		const now = Date.now()
		const { is2x, promoActive, isPeak, isWeekend } = getStatus(now)
		const timezone = request.cf?.timezone || "UTC"

		if (url.pathname === "/short") {
			return new Response(is2x ? "yes" : "no", {
				headers: {
					"content-type": "text/plain",
					"x-timezone": timezone,
					"access-control-allow-origin": "*",
				},
			})
		}

		if (url.pathname === "/json") {
			const body = {
				is2x,
				promoActive,
				isPeak,
				isWeekend,
				peakHours: "8 AM \u2013 2 PM ET (weekdays only)",
				promoPeriod: "March 13\u201327, 2026",
				currentTimeET: formatET(now),
				currentTimeUser: formatInTz(now, timezone),
				currentDay: etDayName(now),
				userTimezone: timezone,
				timestamp: new Date(now).toISOString(),
			}
			return new Response(JSON.stringify(body, null, 2), {
				headers: {
					"content-type": "application/json",
					"access-control-allow-origin": "*",
				},
			})
		}

		return env.ASSETS.fetch(request)
	},
}
