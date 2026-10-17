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
<<<<<<< HEAD
├── typing/                    # Standalone typing speed test (can be deployed independently)
│   ├── index.html
│   ├── styles/                # Typing styles plus bundled base styles
│   ├── js/                    # Typing app modules
│   ├── assets/                # Typing app favicon
│   └── backups/               # Archived typing-file backups
=======
>>>>>>> 9c38cb30a1fd9370816253411ac91705f503cf8e
└── assets/
    ├── favicon.svg            # Distinctive architectural brand logo
    └── images/
        ├── brand-logo.svg          # Vector brand logo glyph
        ├── og-cover.png            # High-resolution (1200x630) social preview image
        ├── hero-composition.svg    # Editorial hero architectural artwork
        ├── avatar-shisir.svg       # Geometric monogram & biography emblem
        ├── project-1-apex.svg      # Apex OS UI/UX interface preview
        ├── project-2-katha.svg     # Katha narrative video editing preview
        ├── project-3-typographia.svg # TypoGraphia Swiss poster preview
        ├── project-4-lumina.svg    # Lumina FinTech web app preview
        ├── project-5-chronicle.svg # Chronicle motion reel preview
<<<<<<< HEAD
        ├── project-6-forma.svg     # Forma architectural monograph preview
        └── project-7-typing-test.svg # Typing speed test dashboard preview
=======
        └── project-6-forma.svg     # Forma architectural monograph preview
>>>>>>> 9c38cb30a1fd9370816253411ac91705f503cf8e
```

---

<<<<<<< HEAD
## ✦ Typing Speed Test Project

The typing speed test appears as an interactive web application in the **Selected Work** project gallery and opens `typing/index.html`. Its implementation is self-contained in `typing/`; it can also be served or deployed independently. Settings, theme, and test history are stored locally in the browser.

---

=======
>>>>>>> 9c38cb30a1fd9370816253411ac91705f503cf8e
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
<<<<<<< HEAD
   - Live project search with relevant recommendations and direct links to interactive projects.
   - 6 curated case studies and one interactive web application, with custom SVG previews.
=======
   - 6 curated demonstration projects with custom SVG vector mockups.
>>>>>>> 9c38cb30a1fd9370816253411ac91705f503cf8e
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
