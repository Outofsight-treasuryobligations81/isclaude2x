# isclaude2x.com

Is Claude usage currently 2x? A live status page for [Claude's March 2026 usage promotion](https://support.claude.com/en/articles/14063676-claude-march-2026-usage-promotion).

**Live at [isclaude2x.com](https://isclaude2x.com)**

## What is this?

During March 13–27, 2026, Claude doubles your usage limits during off-peak hours:

- **Weekdays:** 2x usage outside 5–11 AM PT / 8 AM–2 PM ET / 12–6 PM UTC
- **Weekends:** 2x usage all day
- **Plans:** Free, Pro, Max, Team (not Enterprise)

This site tells you whether it's 2x right now, with a live countdown to the next transition.

## API

### `GET /short`

Returns `yes` or `no` as plain text. User timezone from IP in `x-timezone` header.

```
$ curl https://isclaude2x.com/short
yes
```

### `GET /json`

Returns full status as JSON, including time remaining for the current window.

```json
{
	"is2x": true,
	"promoActive": true,
	"isPeak": false,
	"isWeekend": true,
	"peakHours": "8 AM – 2 PM ET (weekdays only)",
	"promoPeriod": "March 13–27, 2026",
	"currentTimeET": "9:50 AM",
	"currentTimeUser": "7:20 PM",
	"currentDay": "Sunday",
	"userTimezone": "Asia/Kolkata",
	"timestamp": "2026-03-15T13:50:46.402Z",
	"2xWindowExpiresInSeconds": 79753,
	"2xWindowExpiresIn": "22h 09m 13s",
	"standardWindowExpiresInSeconds": null,
	"standardWindowExpiresIn": null
}
```

## Tech stack

- **Cloudflare Worker** — fully server-side rendered, no build step, no static assets
- **TypeScript** — shared core logic between worker and tests
- **dayjs** — timezone-aware date handling on the server
- **Vanilla JS** — minimal inline client script for live clock ticking and debug mode
- **IP geolocation** — `request.cf.timezone` for automatic timezone detection

## Debug mode

Enter the Konami code on the homepage (`↑↑↓↓←→←→ B A`) to open a debug panel. Simulate any date, time, and timezone to see what the status would be.

## Development

```bash
pnpm install
pnpm test          # run 150 vitest unit tests
wrangler dev       # local dev server
wrangler deploy    # deploy to Cloudflare
```

## Sources

- [Claude Support: March 2026 usage promotion](https://support.claude.com/en/articles/14063676-claude-march-2026-usage-promotion)
- [@claudeai tweet](https://x.com/claudeai/status/1900397538584891445)

## Author

[@mehulmpt](https://x.com/mehulmpt)
