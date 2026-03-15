import { useState, useEffect } from "react"
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
	getUserTimezone,
	formatTzName,
	PEAK_START_ET_FRAC,
	PEAK_END_ET_FRAC,
} from "./lib/claude2x"
import "./App.css"

dayjs.extend(utc)
dayjs.extend(timezone)

function Timeline({ progress, isWeekend }: { progress: number; isWeekend: boolean }) {
	const markerLeft = `${progress * 100}%`

	if (isWeekend) {
		return (
			<div className="timeline">
				<div className="timeline-bar">
					<div className="timeline-segment segment-2x" style={{ width: "100%" }} />
				</div>
				<div className="timeline-marker" style={{ left: markerLeft }}>
					<div className="timeline-marker-dot" />
				</div>
				<div className="timeline-labels">
					<span style={{ left: "0%" }}>12 AM</span>
					<span style={{ left: "50%" }}>12 PM</span>
					<span style={{ left: "100%" }}>12 AM</span>
				</div>
				<p className="timeline-note">2x all day on weekends</p>
			</div>
		)
	}

	const peakStart = PEAK_START_ET_FRAC * 100
	const peakEnd = PEAK_END_ET_FRAC * 100
	const peakWidth = peakEnd - peakStart

	return (
		<div className="timeline">
			<div className="timeline-bar">
				<div className="timeline-segment segment-2x" style={{ width: `${peakStart}%` }} />
				<div className="timeline-segment segment-peak" style={{ width: `${peakWidth}%` }} />
				<div
					className="timeline-segment segment-2x"
					style={{ width: `${100 - peakEnd}%` }}
				/>
			</div>
			<div className="timeline-marker" style={{ left: markerLeft }}>
				<div className="timeline-marker-dot" />
			</div>
			<div className="timeline-labels">
				<span style={{ left: "0%" }}>12 AM</span>
				<span style={{ left: `${peakStart}%` }}>8 AM</span>
				<span style={{ left: `${peakEnd}%` }}>2 PM</span>
				<span style={{ left: "100%" }}>12 AM</span>
			</div>
			<div className="timeline-legend">
				<span className="legend-item">
					<span className="legend-dot legend-dot-2x" /> 2x usage
				</span>
				<span className="legend-item">
					<span className="legend-dot legend-dot-peak" /> Standard
				</span>
			</div>
		</div>
	)
}

export default function App() {
	const [now, setNow] = useState(dayjs())
	const tz = getUserTimezone()

	useEffect(() => {
		const id = setInterval(() => setNow(dayjs()), 1000)
		return () => clearInterval(id)
	}, [])

	const status = getStatus(now)
	const countdown = getCountdown(now)
	const progress = getETProgress(now)
	const etDay = now.tz("America/New_York").format("dddd")

	// Promo not active states
	if (status.promoNotStarted || status.promoEnded) {
		return (
			<div className="app" data-status="inactive">
				<main className="container">
					<h1 className="site-title">isclaude2x.com</h1>
					<div className="hero">
						<span className="hero-answer">NO</span>
					</div>
					<p className="hero-subtitle">
						{status.promoNotStarted
							? "The 2x promotion hasn't started yet"
							: "The 2x promotion has ended"}
					</p>
					{status.promoNotStarted && (
						<div className="countdown-block">
							<p className="countdown-label">{countdown.label} in</p>
							<p className="countdown-value">{formatCountdown(countdown.seconds)}</p>
						</div>
					)}
					<p className="promo-period">Promotion: March 13\u201327, 2026</p>
					<footer className="footer">
						<a
							href="https://support.claude.com/en/articles/14063676-claude-march-2026-usage-promotion"
							target="_blank"
							rel="noopener noreferrer"
						>
							Based on Claude&apos;s March 2026 usage promotion
						</a>
						<div className="api-links">
							API: <code>/short</code> &middot; <code>/json</code>
						</div>
					</footer>
				</main>
			</div>
		)
	}

	return (
		<div className="app" data-status={status.is2x ? "yes" : "no"}>
			<main className="container">
				<h1 className="site-title">isclaude2x.com</h1>

				<div className="hero">
					<span className="hero-answer">{status.is2x ? "YES" : "NO"}</span>
				</div>

				<p className="hero-subtitle">
					{status.is2x ? "Claude usage is 2x right now" : "Standard usage right now"}
				</p>

				<div className="countdown-block">
					<p className="countdown-label">{countdown.label} in</p>
					<p className="countdown-value">{formatCountdown(countdown.seconds)}</p>
				</div>

				<div className="times">
					<div className="time-card">
						<span className="time-label">{formatTzName(tz)}</span>
						<span className="time-value">{formatTime(now, tz)}</span>
					</div>
					<div className="time-card">
						<span className="time-label">Eastern</span>
						<span className="time-value">{formatTimeET(now)}</span>
					</div>
				</div>

				<div className="timeline-section">
					<p className="timeline-title">
						{etDay}
						{status.isWeekend ? " (weekend)" : " \u2014 peak: 8 AM\u20132 PM ET"}
					</p>
					<Timeline progress={progress} isWeekend={status.isWeekend} />
				</div>

				<footer className="footer">
					<a
						href="https://support.claude.com/en/articles/14063676-claude-march-2026-usage-promotion"
						target="_blank"
						rel="noopener noreferrer"
					>
						Based on Claude&apos;s March 2026 usage promotion
					</a>
					<div className="api-links">
						API: <code>/short</code> &middot; <code>/json</code>
					</div>
				</footer>
			</main>
		</div>
	)
}
