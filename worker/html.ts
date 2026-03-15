export interface PageData {
	is2x: boolean
	promoActive: boolean
	promoNotStarted: boolean
	promoEnded: boolean
	isPeak: boolean
	isWeekend: boolean
	countdownSeconds: number
	countdownLabel: string
	countdownFormatted: string
	userTz: string
	userTzDisplay: string
	userTime: string
	etTime: string
	etDay: string
	etProgress: number
}

function esc(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
}

const TIMEZONES = [
	"America/New_York",
	"America/Chicago",
	"America/Denver",
	"America/Los_Angeles",
	"America/Anchorage",
	"Pacific/Honolulu",
	"Europe/London",
	"Europe/Paris",
	"Europe/Berlin",
	"Asia/Dubai",
	"Asia/Kolkata",
	"Asia/Shanghai",
	"Asia/Tokyo",
	"Australia/Sydney",
	"Pacific/Auckland",
	"UTC",
]

function formatTzNameInline(tz: string): string {
	const parts = tz.split("/")
	return (parts[parts.length - 1] ?? tz).replace(/_/g, " ")
}

export function renderPage(data: PageData): string {
	const isInactive = data.promoNotStarted || data.promoEnded
	const statusAttr = isInactive ? "inactive" : data.is2x ? "yes" : "no"

	const heroText = isInactive ? "NO" : data.is2x ? "YES" : "NO"

	let subtitle: string
	if (data.promoNotStarted) {
		subtitle = "The 2x promotion hasn\u2019t started yet"
	} else if (data.promoEnded) {
		subtitle = "The 2x promotion has ended"
	} else if (data.is2x) {
		subtitle = "Claude usage is 2x right now"
	} else {
		subtitle = "Standard usage right now"
	}

	let reason = ""
	if (data.promoActive) {
		if (data.isWeekend) {
			reason = "2x all day on weekends"
		} else if (data.is2x) {
			reason = "Off-peak hours (outside 8\u202fAM\u20132\u202fPM ET)"
		} else {
			reason = "Peak hours (8\u202fAM\u20132\u202fPM ET on weekdays)"
		}
	}

	const hideCountdown =
		(isInactive && !data.promoNotStarted) || (!isInactive && false) ? "hidden" : ""
	const hideTimes = isInactive ? "hidden" : ""
	const hideTimeline = isInactive ? "hidden" : ""
	const showPromoPeriod = isInactive ? "" : "hidden"

	const timelineTitle = data.isWeekend
		? `${esc(data.etDay)} (weekend)`
		: `${esc(data.etDay)} \u2014 peak: 8\u202fAM\u20132\u202fPM ET`

	const tzOptions = TIMEZONES.map(
		(tz) => `<option value="${esc(tz)}">${esc(formatTzNameInline(tz))} (${esc(tz)})</option>`,
	).join("")

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Is Claude 2x? | isclaude2x.com</title>
<meta name="description" content="Check if Claude usage is currently doubled. Live status for the March 2026 2x usage promotion.">
<meta property="og:title" content="Is Claude 2x right now?">
<meta property="og:description" content="Live status for the Claude March 2026 2x usage promotion.">
<meta name="theme-color" content="#080b16">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
--bg:#080b16;--surface:#111627;--border:#1c2240;
--text:#e2e8f0;--text-muted:#64748b;
--green:#10b981;--green-dim:rgba(16,185,129,0.12);--green-glow:rgba(16,185,129,0.35);
--amber:#f59e0b;--amber-dim:rgba(245,158,11,0.12);--amber-glow:rgba(245,158,11,0.35);
--gray:#475569;
font-family:"Sora",system-ui,-apple-system,sans-serif;
color:var(--text);background:var(--bg);
-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
}
html,body{height:100%}
body{background:linear-gradient(170deg,#080b16 0%,#0c1024 50%,#0a0e1e 100%);min-height:100vh}
code{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:0.85em;background:var(--surface);padding:0.15em 0.4em;border-radius:4px;border:1px solid var(--border)}
a{color:var(--text-muted);text-decoration:none;transition:color 0.2s}
a:hover{color:var(--text)}

.app{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem 1.5rem}
.container{max-width:520px;width:100%;text-align:center}

.site-title{font-size:0.85rem;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:3rem}

.hero{margin-bottom:1rem}
.hero-answer{font-size:clamp(5rem,18vw,9rem);font-weight:800;line-height:1;letter-spacing:-0.03em;display:inline-block;transition:color 0.4s,text-shadow 0.4s}

[data-status="yes"] .hero-answer{color:var(--green);text-shadow:0 0 40px var(--green-glow),0 0 80px var(--green-dim);animation:pulse-green 3s ease-in-out infinite}
[data-status="no"] .hero-answer{color:var(--amber);text-shadow:0 0 40px var(--amber-glow),0 0 80px var(--amber-dim);animation:pulse-amber 3s ease-in-out infinite}
[data-status="inactive"] .hero-answer{color:var(--gray);text-shadow:none}

@keyframes pulse-green{
0%,100%{text-shadow:0 0 40px var(--green-glow),0 0 80px var(--green-dim)}
50%{text-shadow:0 0 60px var(--green-glow),0 0 120px var(--green-dim)}
}
@keyframes pulse-amber{
0%,100%{text-shadow:0 0 40px var(--amber-glow),0 0 80px var(--amber-dim)}
50%{text-shadow:0 0 60px var(--amber-glow),0 0 120px var(--amber-dim)}
}

.hero-subtitle{font-size:1.1rem;font-weight:400;color:var(--text-muted);margin-bottom:0.5rem}
.hero-reason{font-size:0.8rem;font-weight:400;color:var(--text-muted);opacity:0.7;margin-bottom:2.5rem}

.countdown-block{margin-bottom:2.5rem}
.countdown-label{font-size:0.8rem;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:0.4rem}
.countdown-value{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:2rem;font-weight:600;letter-spacing:0.02em;font-variant-numeric:tabular-nums}

[data-status="yes"] .countdown-value{color:var(--green)}
[data-status="no"] .countdown-value{color:var(--amber)}
[data-status="inactive"] .countdown-value{color:var(--gray)}

.times{display:flex;gap:1rem;margin-bottom:2.5rem}
.time-card{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1rem;display:flex;flex-direction:column;gap:0.35rem}
.time-label{font-size:0.7rem;font-weight:500;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted)}
.time-value{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:1.05rem;font-weight:500;font-variant-numeric:tabular-nums}

.timeline-section{margin-bottom:2.5rem}
.timeline-title{font-size:0.8rem;font-weight:500;color:var(--text-muted);margin-bottom:1rem}
.timeline{position:relative;padding-bottom:2rem}
.timeline-bar{display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--surface)}
[hidden]{display:none!important}
.timeline-segment{height:100%}
.segment-2x{background:var(--green);opacity:0.7}
.segment-peak{background:var(--amber);opacity:0.5}

.timeline-marker{position:absolute;top:-4px;transform:translateX(-50%);z-index:2}
.timeline-marker-dot{width:10px;height:18px;border-radius:3px;background:var(--text);box-shadow:0 0 8px rgba(255,255,255,0.3)}

.timeline-labels{position:relative;height:1.6rem;margin-top:0.5rem}
.timeline-labels span{position:absolute;transform:translateX(-50%);font-size:0.65rem;font-weight:400;color:var(--text-muted);white-space:nowrap}

.timeline-legend{display:flex;justify-content:center;gap:1.2rem;margin-top:0.2rem}
.legend-item{display:flex;align-items:center;gap:0.35rem;font-size:0.7rem;color:var(--text-muted)}
.legend-dot{width:8px;height:8px;border-radius:2px}
.legend-dot-2x{background:var(--green);opacity:0.7}
.legend-dot-peak{background:var(--amber);opacity:0.5}

.timeline-note{font-size:0.75rem;color:var(--green);margin-top:0.6rem;font-weight:500}

.promo-period{font-size:0.8rem;color:var(--text-muted);margin-bottom:2.5rem}

.footer{padding-top:1.5rem;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:0.6rem}
.footer a{font-size:0.75rem}
.footer-sources{font-size:0.75rem;color:var(--text-muted)}
.api-links{font-size:0.7rem;color:var(--text-muted)}
.api-links a{font-size:0.7rem}
.konami-hint{font-size:0.65rem;color:var(--text-muted);opacity:0.4;letter-spacing:0.15em;font-family:"IBM Plex Mono",ui-monospace,monospace}
.konami-hint:hover{opacity:0.7}

.sim-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--amber);margin-left:0.5rem;vertical-align:middle;animation:sim-pulse 1.5s ease-in-out infinite}
@keyframes sim-pulse{0%,100%{opacity:1}50%{opacity:0.3}}

.debug-panel{position:fixed;bottom:0;left:0;right:0;background:rgba(14,18,33,0.95);backdrop-filter:blur(16px);border-top:1px solid var(--border);padding:1rem 1.5rem 1.25rem;z-index:100;animation:slide-up 0.25s ease-out}
@keyframes slide-up{from{transform:translateY(100%)}to{transform:translateY(0)}}
.debug-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem}
.debug-header-actions{display:flex;align-items:center;gap:0.5rem}
.debug-badge{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:0.65rem;font-weight:600;letter-spacing:0.1em;color:var(--amber);background:var(--amber-dim);padding:0.2rem 0.5rem;border-radius:4px;border:1px solid rgba(245,158,11,0.25)}
.debug-close{background:none;border:none;color:var(--text-muted);font-size:1.4rem;cursor:pointer;padding:0 0.25rem;line-height:1;transition:color 0.15s}
.debug-close:hover{color:var(--text)}
.debug-controls{display:flex;gap:0.75rem;align-items:flex-end;flex-wrap:wrap}
.debug-field{display:flex;flex-direction:column;gap:0.3rem;flex:1;min-width:160px}
.debug-label{font-size:0.65rem;font-weight:500;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted)}
.debug-input{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:0.8rem;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:0.45rem 0.6rem;outline:none;transition:border-color 0.15s}
.debug-input:focus{border-color:var(--amber)}
.debug-input::-webkit-calendar-picker-indicator{filter:invert(0.7)}
.debug-actions{display:flex;gap:0.5rem;align-items:flex-end}
.debug-btn{font-family:"Sora",system-ui,sans-serif;font-size:0.75rem;font-weight:600;padding:0.5rem 1rem;border-radius:6px;border:1px solid transparent;cursor:pointer;transition:background 0.15s,opacity 0.15s;white-space:nowrap}
.debug-btn-simulate{background:var(--amber);color:#080b16}
.debug-btn-simulate:hover{background:#fbbf24}
.debug-btn-live{background:transparent;border-color:var(--border);color:var(--text-muted)}
.debug-btn-live:hover:not(:disabled){border-color:var(--green);color:var(--green)}
.debug-btn-live:disabled{opacity:0.35;cursor:not-allowed}

@media(max-width:480px){
.hero-answer{font-size:clamp(4rem,20vw,6rem)}
.countdown-value{font-size:1.5rem}
.times{flex-direction:column;gap:0.75rem}
.debug-controls{flex-direction:column;align-items:stretch}
.debug-actions{justify-content:stretch}
.debug-btn{flex:1}
}
</style>
</head>
<body>
<div id="app" class="app" data-status="${statusAttr}">
<main class="container">
<h1 class="site-title">isclaude2x.com<span id="sim-dot" class="sim-dot" hidden></span></h1>
<div class="hero"><span id="hero-answer" class="hero-answer">${esc(heroText)}</span></div>
<p id="hero-subtitle" class="hero-subtitle">${esc(subtitle)}</p>
<p id="hero-reason" class="hero-reason">${esc(reason)}</p>
<div id="countdown-block" class="countdown-block" ${hideCountdown && data.promoEnded ? "hidden" : ""}>
<p id="countdown-label" class="countdown-label">${esc(data.countdownLabel)} in</p>
<p id="countdown-value" class="countdown-value">${esc(data.countdownFormatted)}</p>
</div>
<div id="times-section" class="times" ${hideTimes}>
<div class="time-card">
<span id="tz-label" class="time-label">${esc(data.userTzDisplay)}</span>
<span id="time-user" class="time-value">${esc(data.userTime)}</span>
</div>
<div class="time-card">
<span class="time-label">Eastern</span>
<span id="time-et" class="time-value">${esc(data.etTime)}</span>
</div>
</div>
<div id="timeline-section" class="timeline-section" ${hideTimeline}>
<p id="timeline-title" class="timeline-title">${timelineTitle}</p>
<div class="timeline">
<div id="timeline-weekday" class="timeline-bar" ${data.isWeekend ? "hidden" : ""}>
<div class="timeline-segment segment-2x" style="width:33.33%"></div>
<div class="timeline-segment segment-peak" style="width:25%"></div>
<div class="timeline-segment segment-2x" style="width:41.67%"></div>
</div>
<div id="timeline-weekend" class="timeline-bar" ${data.isWeekend ? "" : "hidden"}>
<div class="timeline-segment segment-2x" style="width:100%"></div>
</div>
<div id="timeline-marker" class="timeline-marker" style="left:${(data.etProgress * 100).toFixed(2)}%">
<div class="timeline-marker-dot"></div>
</div>
<div id="timeline-labels-weekday" class="timeline-labels" ${data.isWeekend ? "hidden" : ""}>
<span style="left:0%">12 AM</span><span style="left:33.33%">8 AM</span>
<span style="left:58.33%">2 PM</span><span style="left:100%">12 AM</span>
</div>
<div id="timeline-labels-weekend" class="timeline-labels" ${data.isWeekend ? "" : "hidden"}>
<span style="left:0%">12 AM</span><span style="left:50%">12 PM</span>
<span style="left:100%">12 AM</span>
</div>
<div id="timeline-legend" class="timeline-legend" ${data.isWeekend ? "hidden" : ""}>
<span class="legend-item"><span class="legend-dot legend-dot-2x"></span> 2x usage</span>
<span class="legend-item"><span class="legend-dot legend-dot-peak"></span> Standard</span>
</div>
<p id="timeline-note" class="timeline-note" ${data.isWeekend ? "" : "hidden"}>2x all day on weekends</p>
</div>
</div>
<p id="promo-period" class="promo-period" ${showPromoPeriod}>Promotion: March 13\u201327, 2026</p>
<footer class="footer">
<div class="footer-sources">Sources: <a href="https://support.claude.com/en/articles/14063676-claude-march-2026-usage-promotion" target="_blank" rel="noopener noreferrer">Claude Support</a> \u00b7 <a href="https://x.com/claudeai/status/1900397538584891445" target="_blank" rel="noopener noreferrer">@claudeai tweet</a></div>
<div class="api-links">API: <a href="/short"><code>/short</code></a> \u00b7 <a href="/json"><code>/json</code></a></div>
<div class="konami-hint">\u2191\u2191\u2193\u2193\u2190\u2192\u2190\u2192 B A</div>
<div class="api-links">Liked it? Follow: <a href="https://x.com/mehulmpt" target="_blank" rel="noopener noreferrer">@mehulmpt</a></div>
</footer>
</main>
</div>
<div id="debug-panel" class="debug-panel" hidden>
<div class="debug-header">
<span class="debug-badge">DEBUG MODE</span>
<div class="debug-header-actions">
<button id="debug-live" class="debug-btn debug-btn-live" disabled>Resume Live</button>
<button id="debug-close" class="debug-close">&times;</button>
</div>
</div>
<div class="debug-controls">
<div class="debug-field">
<label class="debug-label">Date &amp; Time</label>
<input id="debug-date" type="datetime-local" class="debug-input" value="2026-03-18T14:00">
</div>
<div class="debug-field">
<label class="debug-label">Timezone</label>
<select id="debug-tz" class="debug-input">${tzOptions}</select>
</div>
</div>
</div>
<script>
;(function(){
var PROMO_START=1773554400000
var PROMO_END=1774850400000
var PEAK_START_UTC=12
var PEAK_END_UTC=18
var USER_TZ=decodeURIComponent("${encodeURIComponent(data.userTz)}")
var USER_TZ_DISPLAY=decodeURIComponent("${encodeURIComponent(data.userTzDisplay)}")

function isWeekendET(ts){
var d=new Date(ts)
var day=d.toLocaleDateString("en-US",{timeZone:"America/New_York",weekday:"short"})
return day==="Sat"||day==="Sun"
}

function getStatus(ts){
var promoActive=ts>PROMO_START&&ts<PROMO_END
var promoNotStarted=ts<=PROMO_START
var promoEnded=!promoActive&&!promoNotStarted
var utcH=new Date(ts).getUTCHours()
var isPeakHour=utcH>=PEAK_START_UTC&&utcH<PEAK_END_UTC
var isWeekend=isWeekendET(ts)
var isPeak=!isWeekend&&isPeakHour
var is2x=promoActive&&(isWeekend||!isPeakHour)
return{is2x:is2x,promoActive:promoActive,promoNotStarted:promoNotStarted,promoEnded:promoEnded,isPeak:isPeak,isWeekend:isWeekend}
}

function findNextWeekdayPeakStart(ts){
var d=new Date(ts)
var base=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),PEAK_START_UTC,0,0)
for(var i=0;i<8;i++){
var candidate=base+i*86400000
if(candidate>ts&&!isWeekendET(candidate)){return candidate}
}
return base+7*86400000
}

function getCountdown(ts){
var st=getStatus(ts)
if(st.promoEnded)return{seconds:0,label:"Promotion has ended"}
if(st.promoNotStarted)return{seconds:Math.max(0,Math.floor((PROMO_START-ts)/1000)),label:"Promotion starts"}
var nextChange,nextLabel
if(st.is2x){
nextChange=findNextWeekdayPeakStart(ts)
nextLabel="Standard hours begin"
}else{
var d=new Date(ts)
nextChange=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),PEAK_END_UTC,0,0)
nextLabel="2x resumes"
}
if(nextChange>PROMO_END){nextChange=PROMO_END;nextLabel="Promotion ends"}
return{seconds:Math.max(0,Math.floor((nextChange-ts)/1000)),label:nextLabel}
}

function formatCountdown(totalSeconds){
if(totalSeconds<=0)return"\\u2014"
var h=Math.floor(totalSeconds/3600)
var m=Math.floor((totalSeconds%3600)/60)
var s=totalSeconds%60
var pad=function(n){return n<10?"0"+n:""+n}
if(h>24){var days=Math.floor(h/24);var rh=h%24;return days+"d "+rh+"h "+pad(m)+"m"}
if(h>0)return h+"h "+pad(m)+"m "+pad(s)+"s"
if(m>0)return m+"m "+pad(s)+"s"
return s+"s"
}

function formatTime(ts,tz){
try{
return new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true}).format(new Date(ts))
}catch(e){
return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true}).format(new Date(ts))
}
}

function getETDayName(ts){
return new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"long"}).format(new Date(ts))
}

function getETProgress(ts){
var parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hourCycle:"h23",hour:"2-digit",minute:"2-digit"}).formatToParts(new Date(ts))
var h=0,mi=0
for(var i=0;i<parts.length;i++){
if(parts[i].type==="hour")h=parseInt(parts[i].value,10)
if(parts[i].type==="minute")mi=parseInt(parts[i].value,10)
}
return(h*60+mi)/(24*60)
}

function formatTzName(tz){
var p=tz.split("/")
return(p[p.length-1]||tz).replace(/_/g," ")
}

var simTime=null
var simTz=null
var debugOpen=false

var $=function(id){return document.getElementById(id)}

function update(){
var ts=simTime!==null?simTime:Date.now()
var tz=simTz!==null?simTz:USER_TZ
var tzDisplay=simTz!==null?formatTzName(simTz):USER_TZ_DISPLAY

var st=getStatus(ts)
var cd=getCountdown(ts)
var progress=getETProgress(ts)
var etDay=getETDayName(ts)
var isInactive=st.promoNotStarted||st.promoEnded
var statusAttr=isInactive?"inactive":st.is2x?"yes":"no"

var app=$("app")
app.dataset.status=statusAttr

$("sim-dot").hidden=simTime===null

if(isInactive){
$("hero-answer").textContent="NO"
$("hero-subtitle").textContent=st.promoNotStarted?"The 2x promotion hasn\\u2019t started yet":"The 2x promotion has ended"
$("hero-reason").textContent=""
$("countdown-block").hidden=st.promoEnded
$("countdown-label").textContent=cd.label+" in"
$("countdown-value").textContent=formatCountdown(cd.seconds)
$("times-section").hidden=true
$("timeline-section").hidden=true
$("promo-period").hidden=false
}else{
$("hero-answer").textContent=st.is2x?"YES":"NO"
$("hero-subtitle").textContent=st.is2x?"Claude usage is 2x right now":"Standard usage right now"
if(st.isWeekend){
$("hero-reason").textContent="2x all day on weekends"
}else if(st.is2x){
$("hero-reason").textContent="Off-peak hours (outside 8\\u202fAM\\u20132\\u202fPM ET)"
}else{
$("hero-reason").textContent="Peak hours (8\\u202fAM\\u20132\\u202fPM ET on weekdays)"
}
$("countdown-block").hidden=false
$("countdown-label").textContent=cd.label+" in"
$("countdown-value").textContent=formatCountdown(cd.seconds)
$("times-section").hidden=false
$("tz-label").textContent=tzDisplay
$("time-user").textContent=formatTime(ts,tz)
$("time-et").textContent=formatTime(ts,"America/New_York")
$("timeline-section").hidden=false
$("timeline-title").textContent=st.isWeekend?etDay+" (weekend)":etDay+" \\u2014 peak: 8\\u202fAM\\u20132\\u202fPM ET"
$("timeline-marker").style.left=(progress*100).toFixed(2)+"%"
$("timeline-weekday").hidden=st.isWeekend
$("timeline-weekend").hidden=!st.isWeekend
$("timeline-labels-weekday").hidden=st.isWeekend
$("timeline-labels-weekend").hidden=!st.isWeekend
$("timeline-legend").hidden=st.isWeekend
$("timeline-note").hidden=!st.isWeekend
$("promo-period").hidden=true
}
}

// Konami code
var KONAMI=["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"]
var kPos=0
document.addEventListener("keydown",function(e){
if(e.key===KONAMI[kPos]){
kPos++
if(kPos===KONAMI.length){
debugOpen=!debugOpen
$("debug-panel").hidden=!debugOpen
if(!debugOpen){simTime=null;simTz=null;$("debug-live").disabled=true;update()}
kPos=0
}
}else{
kPos=e.key===KONAMI[0]?1:0
}
})

// Debug panel handlers
$("debug-close").addEventListener("click",function(){
debugOpen=false
$("debug-panel").hidden=true
simTime=null
simTz=null
$("debug-live").disabled=true
update()
})

$("debug-live").addEventListener("click",function(){
simTime=null
simTz=null
$("debug-live").disabled=true
update()
})

function parseDateInTz(dateStr,tz){
if(!dateStr)return null
var parts=dateStr.match(/^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2})/)
if(!parts)return null
var y=parseInt(parts[1],10),mo=parseInt(parts[2],10)-1,d=parseInt(parts[3],10)
var h=parseInt(parts[4],10),mi=parseInt(parts[5],10)
// Create a UTC date with those wall-clock values
var guessUTC=Date.UTC(y,mo,d,h,mi,0)
// Format that UTC instant in the target tz to find the offset
var fmt=new Intl.DateTimeFormat("en-US",{timeZone:tz,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})
var p=fmt.formatToParts(new Date(guessUTC))
var tzY,tzMo,tzD,tzH,tzMi
for(var i=0;i<p.length;i++){
if(p[i].type==="year")tzY=parseInt(p[i].value,10)
if(p[i].type==="month")tzMo=parseInt(p[i].value,10)-1
if(p[i].type==="day")tzD=parseInt(p[i].value,10)
if(p[i].type==="hour")tzH=parseInt(p[i].value,10)
if(p[i].type==="minute")tzMi=parseInt(p[i].value,10)
}
var tzRendered=Date.UTC(tzY,tzMo,tzD,tzH,tzMi,0)
var offset=tzRendered-guessUTC
return guessUTC-offset
}

$("debug-date").addEventListener("input",function(){
var tz=$("debug-tz").value
var ts=parseDateInTz(this.value,tz)
if(ts!==null){simTime=ts;simTz=tz;$("debug-live").disabled=false;update()}
})

$("debug-tz").addEventListener("change",function(){
var tz=this.value
var dateStr=$("debug-date").value
var ts=parseDateInTz(dateStr,tz)
if(ts!==null){simTime=ts;simTz=tz;$("debug-live").disabled=false;update()}
})

update()
setInterval(function(){if(simTime===null)update()},1000)
})()
</script>
</body>
</html>`
}
