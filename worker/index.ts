import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import {
	getStatus,
	getCountdown,
	formatCountdown,
	formatTime,
	formatTimeET,
	getETProgress,
	formatTzName,
} from "../src/lib/claude2x"
import { renderPage } from "./html"

dayjs.extend(utc)
dayjs.extend(timezone)

const SECURITY_HEADERS = {
	"x-content-type-options": "nosniff" as const,
}

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#080b16"/><text x="32" y="44" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="28" fill="#10b981">2x</text></svg>`

function etDayName(d: dayjs.Dayjs): string {
	return d.tz("America/New_York").format("dddd")
}

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url)
		const now = dayjs()
		const status = getStatus(now)
		const countdown = getCountdown(now)
		const userTz = (request.cf?.timezone as string) || "UTC"

		if (url.pathname === "/favicon.svg") {
			return new Response(FAVICON_SVG, {
				headers: { "content-type": "image/svg+xml", ...SECURITY_HEADERS },
			})
		}

		if (url.pathname === "/short") {
			return new Response(status.is2x ? "yes" : "no", {
				headers: {
					"content-type": "text/plain",
					"x-timezone": userTz,
					"access-control-allow-origin": "*",
					...SECURITY_HEADERS,
				},
			})
		}

		if (url.pathname === "/json") {
			const body = {
				is2x: status.is2x,
				promoActive: status.promoActive,
				isPeak: status.isPeak,
				isWeekend: status.isWeekend,
				peakHours: "8 AM \u2013 2 PM ET (weekdays only)",
				promoPeriod: "March 13\u201327, 2026",
				currentTimeET: formatTimeET(now),
				currentTimeUser: formatTime(now, userTz),
				currentDay: etDayName(now),
				userTimezone: userTz,
				timestamp: now.toISOString(),
				"2xWindowExpiresInSeconds": status.is2x ? countdown.seconds : null,
				"2xWindowExpiresIn": status.is2x ? formatCountdown(countdown.seconds) : null,
				standardWindowExpiresInSeconds: status.isPeak ? countdown.seconds : null,
				standardWindowExpiresIn: status.isPeak ? formatCountdown(countdown.seconds) : null,
			}
			return new Response(JSON.stringify(body, null, 2), {
				headers: {
					"content-type": "application/json",
					"access-control-allow-origin": "*",
					...SECURITY_HEADERS,
				},
			})
		}

		if (url.pathname === "/") {
			const html = renderPage({
				is2x: status.is2x,
				promoActive: status.promoActive,
				promoNotStarted: status.promoNotStarted,
				promoEnded: status.promoEnded,
				isPeak: status.isPeak,
				isWeekend: status.isWeekend,
				countdownSeconds: countdown.seconds,
				countdownLabel: countdown.label,
				countdownFormatted: formatCountdown(countdown.seconds),
				userTz,
				userTzDisplay: formatTzName(userTz),
				userTime: formatTime(now, userTz),
				etTime: formatTimeET(now),
				etDay: etDayName(now),
				etProgress: getETProgress(now),
			})
			return new Response(html, {
				headers: { "content-type": "text/html; charset=utf-8", ...SECURITY_HEADERS },
			})
		}

		return new Response("Not found", {
			status: 404,
			headers: { "content-type": "text/plain", ...SECURITY_HEADERS },
		})
	},
} satisfies ExportedHandler
