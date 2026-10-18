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
    title: "Typing Speed Test — Practice & Performance",
    discipline: "Web Application",
    category: "ui-ux",
    role: "Product Designer & Developer",
    year: "2026",
    badge: "Interactive Tool",
    headline: "A focused typing practice experience with meaningful performance insights.",
    summary: "A private, browser-based typing test with timed challenges, live WPM and accuracy, detailed result graphs, and personal progress history.",
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
    projectUrl: "typing/index.html"
  },
  {
    id: "neb-gpa-calculator",
    number: "02",
    title: "NEB GPA Calculator — SEE & +2",
    discipline: "Web Application",
    category: "ui-ux",
    role: "Product Designer & Developer",
    year: "2026",
    badge: "Interactive Tool",
    headline: "Nepal-focused GPA calculator for SEE & NEB +2 with accurate grade mapping.",
    summary: "Calculate NEB GPA for SEE (Class 10) and +2 with stream-based subject presets, theory/practical split, credit-hour weighting, and instant letter-grade mapping. Supports bilingual (EN/NE) entry and elective selection.",
    image: "gpa-calculator/images/thumbnail.svg",
    imageAlt: "NEB GPA calculator preview showing subject marks, letter grades, and an indicative GPA",
    searchDescription: "Estimate Nepal NEB GPA for SEE and NEB +2 with credit-hour weighting.",
    searchKeywords: [
      "NEB GPA",
      "Nepal GPA calculator",
      "SEE GPA",
      "NEB +2 GPA",
      "class 10 GPA",
      "class 12 GPA",
      "letter grading NEP",
      "NEB grade calculator",
      "credit hour GPA Nepal"
    ],
    projectUrl: "gpa-calculator/index.html"
  },
  {
    id: "apex-os",
    number: "03",
    title: "Apex OS — Adaptive Workspace Interface",
    discipline: "UI/UX Design",
    category: "ui-ux",
    role: "Lead UI/UX & Systems Designer",
    year: "2025–2026",
    badge: "Concept Exploration",
    headline: "Distraction-free desktop operating canvas & dynamic design system.",
    summary: "A focused desktop interface tailored for digital thinkers. Built around spatial canvas organization, low-latency micro-interactions, and a calm, contrast-engineered palette.",
    image: "assets/images/project-1-apex.svg",
    imageAlt: "Apex OS user interface preview showing canvas latency, spatial layout, and design system tokens",
    demoUrl: "https://figma.com/@shisiracharya/apex-os-prototype",
    repoUrl: "https://github.com/shisiracharya/apex-workspace",
    caseStudy: {
      challenge: "Modern creative productivity tools suffer from heavy cognitive load, toolbars that crowd the viewport, and disjointed typography scales that strain the eye during long working sessions.",
      targetAudience: "Designers, writers, researchers, and multidisciplinary creatives who require a distraction-free, deeply responsive digital workspace.",
      approach: "Engineered a strict 12-column adaptive layout with an obsidian (#141413) base and subtle warm accents. Minimized chrome in favor of spatial keyboard-driven interactions and high optical kerning.",
      interfaceDecisions: [
        "4.2ms canvas compositing thread monitoring for fluid 60fps responsiveness.",
        "Zero-clutter collapsible sidebars with dedicated design token inspect panels.",
        "Precision typography hierarchy utilizing Plus Jakarta Sans paired with mono metadata."
      ],
      deliverables: [
        "Complete Design System in Figma (Typography, Colors, Spatial Tokens)",
        "Desktop Application Interactive Prototype",
        "Responsive Adaptive Layouts (Large Display, Laptop, Compact)",
        "Usability & Optical Kerning Guidelines"
      ],
      tools: ["Figma", "Design Tokens", "Wireframing", "Interaction Prototyping", "Design Systems"]
    }
  },
  {
    id: "katha-documentary",
    number: "04",
    title: "Katha — Documentary Narrative & Pacing",
    discipline: "Video Editing",
    category: "video",
    role: "Editor & Colorist",
    year: "2025",
    badge: "Narrative & Color",
    headline: "Cinematic short-form documentary exploring rural memory, natural light, and acoustic rhythm.",
    summary: "A quiet, intentional short-form narrative cut capturing rural heritage. Uses deliberate pacing, natural acoustic soundscapes, and custom Kodak 2383 film print emulation curves.",
    image: "assets/images/project-2-katha.svg",
    imageAlt: "Katha documentary film frame preview showing 2.39:1 scope anamorphic frame and audio waveform stems",
    demoUrl: "https://vimeo.com/shisiracharya/katha-cut",
    // repoUrl omitted intentionally to demonstrate single-button dynamic rendering
    caseStudy: {
      challenge: "Contemporary video storytelling often relies on hyperactive cuts and sensory overload. The challenge was to hold audience attention while maintaining contemplative pauses and authentic emotional gravity.",
      targetAudience: "Cultural storytellers, documentary audiences, and creative directors looking for sensitive, rhythmically masterminded editing.",
      approach: "Built the edit around the organic rhythm of breath and footsteps. Used ambient sound stems as the primary transition markers rather than abrupt visual wipes.",
      interfaceDecisions: [
        "2.39:1 anamorphic aspect ratio framing for sweeping geographical context.",
        "Kodak 2383 film stock color science with warm golden-hour shadow retention.",
        "Carefully orchestrated multi-stem audio editing (Foley, Ambient, and Acoustic Score)."
      ],
      deliverables: [
        "4K Master Film Cut (DCI Scope)",
        "Sound Design & Foley Synchronized Stems",
        "Color Grading Suite with Look-Up Tables (LUTs)",
        "Editorial Pacing Breakdown & Timecode Script"
      ],
      tools: ["Adobe Premiere Pro", "DaVinci Resolve", "Sound Design", "Color Grading", "Storyboarding"]
    }
  },
  {
    id: "typographia-series",
    number: "05",
    title: "TypoGraphia — Exhibition Identity & Print Series",
    discipline: "Graphic Design",
    category: "graphic",
    role: "Art Director & Typographer",
    year: "2024–2025",
    badge: "Editorial Identity",
    headline: "Contemporary Swiss-inspired poster series exploring micro-typography and structural discipline.",
    summary: "An exhibition identity and limited edition silkscreen poster collection. Explores asymmetric grid alignments, negative space ratios, and high-density ink contrast on cotton stock.",
    image: "assets/images/project-3-typographia.svg",
    imageAlt: "TypoGraphia exhibition poster preview displaying Swiss typography, asymmetric grid lines, and editorial specimen",
    demoUrl: "https://behance.net/gallery/typographia-specimen",
    caseStudy: {
      challenge: "Modern digital posters frequently prioritize decorative trends over functional legibility. The project aimed to strip away ornamental fluff to prove the raw emotional resonance of pure typography.",
      targetAudience: "Typography enthusiasts, exhibition attendees, gallery curators, and graphic design connoisseurs.",
      approach: "Applied Swiss International Typographic principles: asymmetric column axes, mathematical margins, optical kerning, and a restricted palette of warm cotton, deep black, and cinnabar vermilion.",
      interfaceDecisions: [
        "Modular A1/B2 grid systems ensuring rigid structural harmony across formats.",
        "Bold geometric headline contrast paired with delicate editorial serif sub-elements.",
        "Editorial colophons containing precise production metadata and edition numbering."
      ],
      deliverables: [
        "Set of 6 Exhibition Posters (Printed on 350gsm Cotton Paper)",
        "Exhibition Catalog & Editorial Specimen Guide",
        "Social Media Announcement Visuals & Digital Campaign Assets",
        "Brand Identity Manual for Museum of Contemporary Form"
      ],
      tools: ["Adobe Illustrator", "InDesign", "Photoshop", "Swiss Grid Systems", "Print Production"]
    }
  },
  {
    id: "lumina-markets",
    number: "06",
    title: "Lumina — Financial Analytics & Clarity",
    discipline: "UI/UX Design",
    category: "ui-ux",
    role: "UI/UX Designer",
    year: "2025",
    badge: "Web Application",
    headline: "Transforming dense multi-currency asset portfolios into intuitive visual hierarchies.",
    summary: "A clean, high-accessibility web dashboard for quantitative portfolio oversight. Resolves data density through smooth trend surfaces, clean tabular layouts, and instant latency feedback.",
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
    number: "07",
    title: "Chronicle — Brand Manifesto & Motion Reel",
    discipline: "Video Editing",
    category: "video",
    role: "Motion Editor & Sound Designer",
    year: "2025",
    badge: "Brand Film",
    headline: "Kinetic brand anthem combining high-tempo speed ramps and transient-locked typography.",
    summary: "A dynamic 60-second editorial motion reel engineered for modern brand storytelling. Combines kinetic typographic impacts, organic motion blur transitions, and synchronized transient rhythm.",
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
    number: "08",
    title: "Forma — Architectural Monograph & Brand System",
    discipline: "Graphic Design",
    category: "graphic",
    role: "Publication Designer & Art Director",
    year: "2024",
    badge: "Publication Design",
    headline: "Minimalist publication design system featuring custom grid structures and tactile materials.",
    summary: "A hardcover architectural monograph honoring the concept of the architectural void. Features bespoke column grids, tactile negative space, blind debossing, and quiet typography.",
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
