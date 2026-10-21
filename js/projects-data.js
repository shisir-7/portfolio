/**
 * Shisir Acharya — Creative Portfolio Projects Data
 * Multidisciplinary Creative: UI/UX Design · Video Editing · Graphic Design
 * Based in Kapilvastu, Nepal
 *
 * This file contains structured project metadata, case study details, and visual references.
 * Supports optional demoUrl (Live Prototype / Project) and repoUrl (Source Code).
 */

window.PORTFOLIO_PROJECTS = [
  {
    id: "typing-speed-test",
    number: "01",
    title: "Typing Speed Test — WPM & Accuracy",
    discipline: "Web Application",
    category: "ui-ux",
    role: "Product Designer & Developer",
    year: "2026",
    badge: "Interactive Tool",
    headline: "A focused typing practice experience with meaningful performance insights.",
    summary: "A private browser-based typing test with timed and word-count challenges, live WPM and accuracy readings, detailed result graphs, error analysis, and personal progress history.",
    image: "assets/images/project-7-typing-test.svg",
    imageAlt: "Typing test dashboard showing an 84 WPM result, 98 percent accuracy, a typing passage, progress chart, and keyboard",
    searchDescription: "Test your typing speed, accuracy, and WPM.",
    searchKeywords: [
      "typing",
      "typing test",
      "typing speed test",
      "monkeytype alternative",
      "test my typing speed",
      "wpm test",
      "words per minute",
      "typing practice",
      "typing accuracy test"
    ],
    projectUrl: "/typing/"
  },
  {
    id: "neb-gpa-calculator",
    number: "02",
    title: "NEB GPA Calculator — SEE & +2 Marks",
    discipline: "Web Application",
    category: "ui-ux",
    role: "Product Designer & Developer",
    year: "2026",
    badge: "Interactive Tool",
    headline: "Nepal-focused GPA calculator for SEE & NEB +2 with indicative grade-point estimates.",
    summary: "Estimate NEB GPA for SEE and +2 from subject marks or letter grades, with theory and practical splits, bilingual entry, and credit-hour weighting. Indicative only, not an official result.",
    image: "gpa-calculator/images/thumbnail.svg",
    imageAlt: "NEB GPA calculator preview showing subject marks, letter grades, and an indicative GPA",
    searchDescription: "Estimate Nepal NEB GPA for SEE and NEB +2 using subject marks or letter grades.",
    searchKeywords: [
      "NEB GPA",
      "Nepal GPA calculator",
      "SEE GPA",
      "NEB +2 GPA",
      "class 10 GPA",
      "class 12 GPA",
      "letter grading NEP",
      "NEB grade calculator",
    ],
    projectUrl: "/gpa-calculator/"
  },
  {
    id: "speed-pulse-test",
    number: "03",
    title: "SpeedPulse — Internet Speed Test",
    discipline: "Web Application",
    category: "ui-ux",
    role: "Product Designer & Developer",
    year: "2026",
    badge: "Interactive Tool",
    headline: "An honest connection measurement with a live gauge, graph, and shareable result card.",
    summary: "A private browser-based internet speed test measuring download, upload, ping, and jitter against a nearby Cloudflare edge, with a live gauge, local history, and a shareable result image.",
    image: "assets/images/project-8-speed-test.svg",
    imageAlt: "Speed test dashboard showing a 248 Mbps download result, upload, ping, jitter, and a live speed graph",
    searchDescription: "Check your internet speed — download, upload, ping, and jitter.",
    searchKeywords: [
      "speed test",
      "internet speed test",
      "speedpulse",
      "test my internet speed",
      "download speed",
      "upload speed",
      "bandwidth test",
      "ping test",
      "jitter test",
      "connection test"
    ],
    projectUrl: "/speed-test/"
  },
  {
    id: "lumina-markets",
    number: "04",
    title: "Lumina — Financial Analytics Dashboard",
    discipline: "UI/UX Design",
    category: "ui-ux",
    role: "UI/UX Designer",
    year: "2025",
    badge: "Web Application",
    headline: "Transforming dense multi-currency asset portfolios into intuitive visual hierarchies.",
    summary: "A clean, high-accessibility web dashboard for quantitative portfolio oversight, resolving data density through smooth trend surfaces, clean tables, and instant latency feedback.",
    image: "assets/images/project-4-lumina.svg",
    imageAlt: "Lumina analytics web application interface displaying asset curves and risk indicators",
    demoUrl: "https://lumina-markets.preview.shisir.design",
    repoUrl: "https://github.com/shisiracharya/lumina-markets",
    caseStudy: {
      challenge: "Traders and capital allocators navigate excessive numbers and flashing indicators that lead to visual fatigue and costly oversight errors.",
      targetAudience: "FinTech operators, fund analysts, and individual investors demanding speed, clarity, and zero ambiguity.",
      approach: "Synthesized multi-tab financial reports into an immediate 3-tier visual hierarchy: Macro health metrics on top, fluid trajectory curves in center, and accessible data tables below.",
      interfaceDecisions: [
        "WCAG AAA contrast ratings throughout dark interface backgrounds.",
        "Dynamic SVG area curves with interactive tooltips for rapid inspection.",
        "Real-time WebSocket connection state indicator with micro-pulse animations."
      ],
      deliverables: [
        "Comprehensive UI Architecture & Wireframes",
        "Interactive High-Fidelity Prototype (Figma)",
        "Modular Metric & Data Visualization Component Set",
        "Design Handoff Specifications for Frontend Engineers"
      ],
      tools: ["Figma", "Data Visualization", "User Flows", "UX Research", "Information Architecture"]
    }
  },
  {
    id: "chronicle-reel",
    number: "05",
    title: "Chronicle — Brand Motion Reel",
    discipline: "Video Editing",
    category: "video",
    role: "Motion Editor & Sound Designer",
    year: "2025",
    badge: "Brand Film",
    headline: "Kinetic brand anthem combining high-tempo speed ramps and transient-locked typography.",
    summary: "A dynamic 60-second editorial motion reel for modern brand storytelling, combining kinetic typographic impacts, organic motion blur transitions, and a synchronized transient rhythm.",
    image: "assets/images/project-5-chronicle.svg",
    imageAlt: "Chronicle motion reel frame preview showcasing kinetic title cuts and speed ramp contact sheet",
    demoUrl: "https://youtube.com/watch?v=chronicle-reel",
    caseStudy: {
      challenge: "Capturing instant engagement in the first three seconds while communicating a substantive brand identity that doesn't feel like a cookie-cutter corporate promo.",
      targetAudience: "Creative agencies, lifestyle brands, and audiences who consume high-impact short-form and widescreen content.",
      approach: "Mapped speed ramps (300% to 100%) to musical transient peaks at 128 BPM. Alternated high-energy kinetic typography cuts with stark moments of silence to command viewer focus.",
      interfaceDecisions: [
        "3-frame impact cuts synchronized to custom transient sound cues.",
        "Dual aspect deliverables: 16:9 for widescreen theater & 9:16 for vertical reels.",
        "Restrained color grade accentuating cinematic tungsten and rich shadow detail."
      ],
      deliverables: [
        "60-Second Brand Master Cut (ProRes 422 HQ)",
        "3 Segmented Social Media Cuts (9:16 Vertical format)",
        "Kinetic Typography Title Templates",
        "Master Audio & Foley Mix"
      ],
      tools: ["Premiere Pro", "After Effects", "Sound Mixing", "Pacing Architecture", "Social Adaptation"]
    }
  },
  {
    id: "forma-monograph",
    number: "06",
    title: "Forma — Architectural Monograph",
    discipline: "Graphic Design",
    category: "graphic",
    role: "Publication Designer & Art Director",
    year: "2024",
    badge: "Publication Design",
    headline: "Minimalist publication design system featuring custom grid structures and tactile materials.",
    summary: "A hardcover architectural monograph honoring the architectural void, featuring bespoke column grids, tactile negative space, blind debossing, and quietly confident typography.",
    image: "assets/images/project-6-forma.svg",
    imageAlt: "Forma architectural book cover and page spread preview showing structure and negative space",
    // Neither demoUrl nor repoUrl provided: verifies that zero empty CTA area or placeholder buttons appear!
    caseStudy: {
      challenge: "Architectural publications often crowd pages with excessive commentary, compromising the spatial serenity of the architectural photography itself.",
      targetAudience: "Architects, spatial designers, collectors, and design book enthusiasts.",
      approach: "Used generous negative space as an active compositional material. Allowed the white space of the paper to emulate the physical air of the buildings.",
      interfaceDecisions: [
        "6-column asymmetric grid with deliberate bleed margins.",
        "Tactile linen hardcover with subtle blind deboss and foil-stamped colophon.",
        "Pairing of crisp Grotesk structural titles with evocative editorial serifs."
      ],
      deliverables: [
        "180-Page Editorial Book Layout & Pre-press Files",
        "Hardcover Binding & Emboss Foil Specifications",
        "Slipcase Box Packaging Design",
        "Digital Editorial Flipbook Experience"
      ],
      tools: ["Adobe InDesign", "Photoshop", "Editorial Curation", "Print Finishing", "Grid Systems"]
    }
  },
];
