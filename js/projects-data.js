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
    caseStudy: {
      challenge: "Typing practice tools often bury the numbers that matter — speed, accuracy and error patterns — behind accounts, ads and clutter.",
      targetAudience: "Students, job seekers and anyone practising English typing who wants a private, focused test.",
      approach: "Kept everything in the browser: timed and word-count modes, live WPM and accuracy, result graphs, error analysis and a local history — no account, no upload.",
      interfaceDecisions: [
        "Live WPM and accuracy readings update as you type.",
        "Result graphs and error analysis make progress visible after every test.",
        "Test history stays in the browser, so results are private by default."
      ],
      deliverables: [
        "Timed and word-count typing test",
        "Live WPM, accuracy and error analysis",
        "Result graphs and local test history"
      ],
      tools: ["JavaScript", "Canvas Charts", "Local Storage"]
    },
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
    caseStudy: {
      challenge: "Nepal's NEB grading — SEE and +2, theory and practical splits, credit-hour weighting — is hard to estimate by hand, and most calculators online are not built for it.",
      targetAudience: "SEE and +2 students in Nepal estimating their GPA from subject marks or letter grades.",
      approach: "Built a bilingual calculator around the NEB subject catalogue, with theory and practical splits and credit-hour weighting. Results are clearly labelled as indicative estimates, not official results.",
      interfaceDecisions: [
        "Subject marks or letter-grade entry, with theory and practical splits.",
        "Bilingual entry for Nepali students.",
        "Credit-hour weighting for +2, with sources and known limitations documented."
      ],
      deliverables: [
        "SEE and +2 GPA estimator",
        "Bilingual subject entry with theory and practical splits",
        "Documented source list and limitations (AUDIT.md)"
      ],
      tools: ["JavaScript", "NEB Grade Catalogue", "Bilingual UI"]
    },
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
    caseStudy: {
      challenge: "Speed tests often report a single number with no context — no ping, jitter or history, and no way to share the result.",
      targetAudience: "Anyone checking whether their connection is actually performing, before a call, a class or a deadline.",
      approach: "Measured download, upload, ping and jitter against a nearby Cloudflare edge, with a live gauge and graph, local history and a shareable result image — all in the browser.",
      interfaceDecisions: [
        "Live gauge and graph show speed as it is measured, not just at the end.",
        "Ping and jitter reported alongside download and upload.",
        "Results can be shared as an image, with history kept locally."
      ],
      deliverables: [
        "Download, upload, ping and jitter measurement",
        "Live gauge, graph and local history",
        "Shareable result image"
      ],
      tools: ["JavaScript", "Web Worker", "Cloudflare Edge", "Canvas Gauges"]
    },
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
    badge: "Concept — Case Study",
    headline: "Transforming dense multi-currency asset portfolios into intuitive visual hierarchies.",
    summary: "A clean, high-accessibility web dashboard for quantitative portfolio oversight, resolving data density through smooth trend surfaces, clean tables, and instant latency feedback.",
    image: "assets/images/project-4-lumina.svg",
    imageAlt: "Lumina analytics web application interface displaying asset curves and risk indicators",
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
    badge: "Concept — Case Study",
    headline: "Kinetic brand anthem combining high-tempo speed ramps and transient-locked typography.",
    summary: "A dynamic 60-second editorial motion reel for modern brand storytelling, combining kinetic typographic impacts, organic motion blur transitions, and a synchronized transient rhythm.",
    image: "assets/images/project-5-chronicle.svg",
    imageAlt: "Chronicle motion reel frame preview showcasing kinetic title cuts and speed ramp contact sheet",
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
    badge: "Concept — Case Study",
    headline: "Minimalist publication design system featuring custom grid structures and tactile materials.",
    summary: "A hardcover architectural monograph honoring the architectural void, featuring bespoke column grids, tactile negative space, blind debossing, and quietly confident typography.",
    image: "assets/images/project-6-forma.svg",
    imageAlt: "Forma architectural book cover and page spread preview showing structure and negative space",
    
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
