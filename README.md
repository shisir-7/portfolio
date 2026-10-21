# Shisir Acharya — Personal Creative Portfolio

A production-quality personal portfolio website designed for **Shisir Acharya**, a multidisciplinary creative from **Kapilvastu, Nepal** specializing in **UI/UX Design**, **Video Editing**, and **Graphic Design**.

---

## ✦ Art Direction & Design Philosophy

- **Minimalist, Editorial & Swiss Graphic Design**: Monochromatic palette with warm ivory linen surfaces (`#F7F5F0`), obsidian charcoal text (`#121211`), and a restrained cinnabar terracotta accent (`#BD3A1B`).
- **Typography**: Editorial contrast combining Google Fonts:
  - `Newsreader` (Editorial serif italic accents)
  - `Plus Jakarta Sans` (Contemporary geometric sans-serif)
  - `JetBrains Mono` (Technical colophons, project index numerals, timestamps, and metadata tags)
- **Zero Vibe-Coding**: No excessive glowing cards, no random floating blobs, no fake testimonials, and no artificial hype. Every element has an intentional typographic and compositional purpose.

---

## ✦ Project Structure

```
shisir-acharya-portfolio/
├── index.html                 # Main semantic HTML5 document
├── 404.html                   # Editorial 404 error page
├── styles/
│   ├── typography.css         # Fluid typography scale, fonts & line heights
│   ├── main.css               # Design tokens, CSS variables, reset & layout
│   └── components.css         # Navigation, hero, case study modal, disciplines, about, contact & footer
├── js/
│   ├── projects-data.js       # Structured project dataset with case studies, demoUrl & repoUrl
│   └── app.js                 # Theme switcher, live clock, modal engine, clipboard, inquiry composer
├── gpa calculator/            # Standalone, bilingual NEB GPA calculator
│   ├── index.html
│   ├── css/styles.css
│   ├── js/                    # Source-aware catalogue, estimates, and accessible interactions
│   ├── images/thumbnail.svg
│   ├── tests/                 # Grade-band, component, catalogue, and weighted-GPA tests
│   └── AUDIT.md               # Source list, catalogue counts, and known limitations
├── typing/                    # Standalone typing speed test (can be deployed independently)
│   ├── index.html
│   ├── styles/                # Typing styles plus bundled base styles
│   ├── js/                    # Typing app modules
│   ├── assets/                # Typing app favicon
│   └── backups/               # Archived typing-file backups
├── speed-test/                # Standalone internet speed test (SpeedPulse)
│   ├── index.html
│   ├── styles.css
│   ├── app.js                 # Gauge, live graph, results, history, sharing
│   ├── engine.js              # Pure measurement logic (no DOM)
│   ├── speedtest.worker.js    # Runs ping + download off the main thread
│   ├── share.js               # Lazy-loaded 1200x630 result image renderer
│   ├── fonts/                 # Subset self-hosted WOFF2 fonts
│   └── tools/                 # Font subsetting scripts
└── assets/
    ├── favicon.svg            # Distinctive architectural brand logo
    └── images/
        ├── brand-logo.svg          # Vector brand logo glyph
        ├── og-cover.png            # High-resolution (1200x630) social preview image
        ├── hero-composition.svg    # Editorial hero architectural artwork
        ├── avatar-shisir.svg       # Geometric monogram & biography emblem
        ├── project-4-lumina.svg    # Lumina FinTech web app preview
        ├── project-5-chronicle.svg # Chronicle motion reel preview
        ├── project-6-forma.svg     # Forma architectural monograph preview
        ├── project-7-typing-test.svg # Typing speed test dashboard preview
        └── project-8-speed-test.svg # Internet speed test dashboard preview
```

---

## ✦ Typing Speed Test Project

The typing speed test appears in the **Selected Work** project gallery and is served at [`/typing/`](https://shisiracharya7.com.np/typing/). The legacy `/typing.html` URL forwards visitors to this canonical page. Its assets remain in `typing/`; settings, theme, and test history are stored locally in the browser.

## ✦ NEB GPA Calculator

The NEB GPA calculator is served at [`/gpa-calculator/`](https://shisiracharya7.com.np/gpa-calculator/) and is linked from the **Selected Work** project gallery. It supports SEE and Grades XI–XII with subject selection, bilingual UI, and exact-mark or transcript-letter-grade entry. The SEE estimate weights subjects by configured total marks; +2 uses catalogue credit-hour weights, some of which are historical or incomplete. Treat either result as an estimate, not an official NEB GPA. Marks remain in the current browser session; custom subject configurations are stored locally. See [`gpa-calculator/AUDIT.md`](gpa-calculator/AUDIT.md) for sources and unresolved policy gaps.

Run its unit tests with `node --test "gpa-calculator/tests/calculator.test.mjs"`.

## ✦ Internet Speed Test (SpeedPulse)

The internet speed test appears in the **Selected Work** project gallery and is served at [`/speed-test/`](https://shisiracharya7.com.np/speed-test/). It measures download, upload, ping, and jitter against a nearby Cloudflare edge using a live animated gauge, a rolling throughput graph, and a plain-language verdict. Test history, theme, and unit preferences are stored locally in the browser; results are never uploaded. Its own implementation notes live in [`speed-test/README.md`](speed-test/README.md).

---

## ✦ Features Included

1. **Refined Navigation & Wordmark**:
   - Monogram "Shisir Acharya" + "Independent Creative".
   - Live real-time clock synced to **Kapilvastu, Nepal (UTC+5:45 / NPT)**.
   - Studio availability indicator pill.
   - Dark / Light editorial theme switch (persisted in `localStorage`).
   - Accessible mobile drawer menu.

2. **Editorial Hero Section**:
   - Typographic composition featuring Shisir's creative statement:
     *“I design digital experiences, shape visual identities, and edit stories into something worth remembering.”*
   - Immediate CTAs: **Explore Selected Work** and **Get in Touch**.
   - Custom tri-disciplinary architectural SVG graphic.

3. **Selected Work & Deep Case Studies**:
   - Filter tabs: `All Works`, `UI/UX Design`, `Video Editing`, `Graphic Design`.
   - Live project search with relevant recommendations and direct links to interactive projects.
   - 3 curated case studies and three interactive web applications, with custom SVG previews.
   - Interactive slide-in Case Study Drawer providing:
     - Design Challenge
     - Target Audience
     - Approach & Architecture
     - Core Interface Decisions
     - Key Deliverables
     - Software & Methodology tags

4. **Disciplines & Creative Services (The 3 Pillars)**:
   - 01 UI/UX Design (Design Systems, Prototyping, Usability)
   - 02 Video Editing (Pacing, Narrative, Color Grading, Foley Sync)
   - 03 Graphic Design (Swiss Posters, Editorial Layouts, Visual Identity)

5. **Creative Philosophy & Motivational Quote**:
   - *“Great design is not just about how things look, but how they make people feel.”*

6. **About Shisir Acharya**:
   - Natural biography detailing the intersection of logic (+2 Management with Computer Science) with visual storytelling.
   - Kapilvastu, Nepal geographical coordinates and origin stamp.

7. **Creative Process**:
   - 4-stage disciplined methodology: `01 Discover` → `02 Define` → `03 Create` → `04 Deliver`.

8. **Contact & Genuine Inquiries**:
   - Direct email link: `acharyashiru939@gmail.com`.
   - One-click "Copy Email" button with instant feedback.
   - Direct inquiry composer that pre-fills and opens a genuine email in the visitor's mail client.
   - Editable social channel links (Instagram, Behance, Dribbble, LinkedIn, GitHub).

9. **Accessibility & Interactions**:
   - Subdued custom cursor on desktop (automatically disabled on touch screens and when `prefers-reduced-motion` is active).
   - Full keyboard navigation (focus rings, `Escape` key closes modal, `Enter`/`Space` activates cards).
   - 100% responsive across mobile, tablet, laptop, and 4K displays.

---

## ✦ How to Run and Preview

Since this project uses pure standard HTML5, CSS3, and JavaScript with zero build steps:

1. Double-click **`index.html`** to open it directly in any modern browser (Google Chrome, Microsoft Edge, Safari, Firefox).
2. Or use any static file server, for example:
   - VS Code "Live Server" extension
   - Or deploy directly to **GitHub Pages**, **Vercel**, **Netlify**, or **Cloudflare Pages** (no build command needed, publish directory is root `.`).

---

## ✦ How to Customize Your Work

- To edit, add, or replace projects: open `js/projects-data.js`. Each project has clean fields for `title`, `discipline`, `summary`, `image`, `caseStudy.challenge`, `approach`, etc.
- To update your social profile links: open `index.html` and search for `social-tags`. Replace the URLs with your actual profile handles.
- To replace SVG images with your actual screenshots: place your PNG/JPG/WebP files into `assets/images/` and update the `image` path in `js/projects-data.js`.
