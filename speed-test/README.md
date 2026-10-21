# SpeedPulse

A fast, beautiful, trustworthy internet speed test — single-page app, no build step, deployable to any static host.

Built by Shisir Acharya. It lives in the `speed-test/` folder of the portfolio repository and is published at [`/speed-test/`](https://shisiracharya7.com.np/speed-test/), where it is linked from the **Selected Work** gallery as project `[03]`.

## What it measures

- **Ping** (latency): 20 sequential requests to the nearest Cloudflare edge, discarding the warm-up, reporting the median.
- **Jitter**: the mean absolute difference between consecutive pings, trimmed to exclude outlier stalls (TCP retransmits, router hiccups) so the number reflects link stability rather than the worst moment.
- **Download**: 5 parallel streams pulling progressively larger files (~12 s). The first ~1.8 s are dropped to ignore TCP slow start. Uses the public `speed.cloudflare.com/__down` endpoint.
- **Upload**: 3 parallel `XMLHttpRequest` streams with progressive payloads (~10 s). Uses `speed.cloudflare.com/__up`.
- **IP / ISP / server / distance**: read from the `cf-meta-*` response headers on the download endpoint (no extra request) with `/cdn-cgi/trace` as a fallback and `/meta` as a secondary source.

## Architecture

- `engine.js` — pure measurement logic (fetch, timing, statistics). No DOM.
- `speedtest.worker.js` — runs ping + download in a worker so the UI stays smooth.
- `app.js` — UI layer: SVG gradient ring gauge (CSS vars + rAF), Canvas graph, results, localStorage history, share/download, theme toggle, tooltip system.
- `share.js` — lazy-loaded module that renders a 1200x630 result image.

The upload phase stays on the main thread because it needs `XMLHttpRequest` upload-progress events, which workers do not support. If a worker fails entirely, the engine falls back to the main thread transparently.

The test handles failures gracefully:
- Per-request timeout is a stall guard, not a fatal abort.
- A phase has its own deadline; hitting it ends the phase and keeps the data collected so far.
- Blocked primary endpoints fall back to secondary sources (`httpbingo`, `jsdelivr`, `httpbin`).
- A blocked endpoint produces a friendly error banner with a Retry button.

## Design

- Minimal, premium look: large whitespace, rounded cards (22 px), glass cards with `backdrop-filter`, subtle ambient gradient.
- The gauge is a gradient ring with a glowing progress cap and an auto-scaling legend — no dated needle. The scale ceiling steps through 25 / 50 / 100 / 250 / 500 / 1000 / 2500 / 5000 / 10000 Mbps so the arc always stays informative.
- Dark default, light mode that respects `prefers-color-scheme` and saves the user's choice.
- Responsive from 320 px to 1920 px; touch targets are 44 px minimum; keyboard focus visible; screen-reader announcements for phase changes and final results.
- Micro-interactions: button hover/press, smooth ring fill, number count-up, tooltip bubbles, card hover lift.
- Every text colour clears WCAG AA (4.5:1) in both themes, verified by an automated contrast audit.

## Size budget

Measured as over-the-wire (gzip) initial page load:

| Asset      | Size (gzip) |
|------------|-------------|
| index.html | ~7 KB       |
| styles.css | ~6 KB       |
| app.js     | ~16 KB      |
| engine.js  | (lazy-loaded with worker) |
| share.js   | (lazy-loaded on first share) |
| fonts (2)  | ~34 KB      |
| favicon    | ~0.3 KB     |
| **Total**  | **~61.5 KB** |

Raw source files total ~113 KB, including the requested clean, well-commented code.

## Design

- Minimal, premium look: large whitespace, rounded cards (22 px), glass cards with `backdrop-filter`, subtle ambient gradient.
- Dark default, light mode that respects `prefers-color-scheme` and saves the user's choice.
- Responsive from 320 px to 1920 px; touch targets are 44 px minimum; keyboard focus visible; screen-reader announcements for phase changes and final results.
- Micro-interactions: button hover/press, smooth needle rotation, number count-up, tooltip bubbles.

## Font subsetting

Fonts are served from `fonts/` as variable WOFF2 files subset to the 121 unique characters used by the interface (English, numbers, punctuation, arrows, math, copyright symbols). See `tools/build_fonts.py`. This replaces six separate Google Font files (~80 KB) with two subset files (~34 KB).

## Deployment

### GitHub Pages

```bash
git clone <repo-url>
cd <repo>
# Files are ready as-is; no build needed.
git add . && git commit -m "deploy speedpulse"
git push origin main
# Configure the repo -> Settings -> Pages -> Source: main / root.
```

### Cloudflare Pages

```bash
# CLI (recommended)
npx wrangler pages deploy . --project-name speedpulse --branch main
# Or: connect the GitHub repo through the Cloudflare dashboard; Pages builds from the root automatically.
```

The site is a pure static single-page app with zero server-side code, zero database, and zero external backend dependency.

## Known limitations

- Browser-based tests cannot fully saturate a gigabit+ connection; TCP slow-start, browser overhead, and parallel stream limits mean results are consistently slightly lower than the line's maximum — this is expected, not a bug.
- The `XMLHttpRequest` upload-progress events only work on the main thread, so the upload phase does not run inside the worker. The latency and download phases still get full smoothness.
- Results depend on the nearest Cloudflare edge (`speed.cloudflare.com`). Results will vary with time of day and network congestion.

## Future improvements

- Compare results against the user's ISP-advertised speed (entered manually or via traceroute).
- Add a multi-server benchmark (measure against multiple edges simultaneously).
- Add packet loss measurement (currently only latency and jitter).
- Add a full progressive download ladder (run more sizes for very fast links).
- Offer a self-hosted native binary / CLI wrapper for gigabit validation.
