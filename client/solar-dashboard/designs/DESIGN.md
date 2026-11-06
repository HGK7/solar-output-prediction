---
name: "Zenith"
description: "Swiss photogrammetric solar intelligence workbench and 25-year financial ledger for residential, commercial, and utility-scale solar planning."
colors:
  canvas-bg: "oklch(0.98 0.008 95)"
  surface-tile: "oklch(0.995 0.004 95)"
  surface-inset: "oklch(0.96 0.006 95)"
  border-hairline: "oklch(0.92 0.008 95)"
  ink-primary: "oklch(0.141 0.005 285)"
  ink-muted: "oklch(0.552 0.016 285)"
  solar-amber: "oklch(0.828 0.189 84.429)"
  solar-sky: "oklch(0.685 0.169 237.323)"
  instrument-stage: "#0B2236"
  status-ok: "oklch(0.62 0.17 145)"
  status-warn: "oklch(0.75 0.16 75)"
  status-error: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "'Newsreader', Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: "500"
    lineHeight: "1.08"
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Newsreader', Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: "500"
    lineHeight: "1.15"
    letterSpacing: "-0.015em"
  title:
    fontFamily: "'IBM Plex Sans', -apple-system, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: "600"
    lineHeight: "1.35"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'IBM Plex Sans', -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: "400"
    lineHeight: "1.55"
    letterSpacing: "0em"
  label:
    fontFamily: "'IBM Plex Sans', -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: "600"
    lineHeight: "1.2"
    letterSpacing: "0.02em"
  mono:
    fontFamily: "'IBM Plex Mono', 'Geist Mono', monospace"
    fontSize: "0.8125rem"
    fontWeight: "500"
    lineHeight: "1.4"
    letterSpacing: "-0.01em"
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
  xl: "8px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
  2xl: "4rem"
components:
  button-primary:
    backgroundColor: "oklch(0.828 0.189 84.429)"
    textColor: "oklch(0.141 0.005 285)"
    typography: "label"
    rounded: "sm"
    padding: "0.625rem 1.125rem"
    height: "2.375rem"
  button-secondary:
    backgroundColor: "oklch(0.995 0.004 95)"
    textColor: "oklch(0.141 0.005 285)"
    typography: "label"
    rounded: "sm"
    padding: "0.625rem 1rem"
    height: "2.375rem"
  input-field:
    backgroundColor: "oklch(0.96 0.006 95)"
    textColor: "oklch(0.141 0.005 285)"
    typography: "mono"
    rounded: "sm"
    padding: "0.5rem 0.75rem"
    height: "2.25rem"
  action-card:
    backgroundColor: "oklch(0.995 0.004 95)"
    textColor: "oklch(0.141 0.005 285)"
    typography: "body"
    rounded: "md"
    padding: "1.25rem"
    height: "auto"
  ledger-row:
    backgroundColor: "oklch(0.995 0.004 95)"
    textColor: "oklch(0.141 0.005 285)"
    typography: "mono"
    rounded: "sm"
    padding: "0.875rem 1.25rem"
    height: "3.25rem"
---

## Overview

**Creative North Star: "Swiss Photogrammetric Survey Plates Meets Approachable Financial Ledger"**

Zenith rejects both clichés of climate software: sterile corporate SaaS bento grids plastered with green eco-badges, and dark-mode sci-fi HUDs with glowing neon borders. Instead, Zenith belongs to the physical tradition of architectural daylighting blueprints, heliodon sun-path instruments, and Swiss hydrographic tables—translated into a calm, warm, human-first web application that both a first-time homeowner and a senior commercial solar engineer can trust with a 25-year capital decision.

**Key Characteristics:**
- **Core Tri-Color Brand Discipline:** The entire interface is anchored by three primary brand pigments—**Warm Alabaster (`#FAF8F5`)**, **Deep Zinc (`#18181B`)**, and **Solar Amber (`#F59E0B`)**—with **Prussian Cyanotype (`#0B2236`)** reserved strictly for optical heliodon/satellite instrument stages and semantic accents reserved for charts, capex ledgers, and inline diffs.
- **Architectural Ledger Topology (Zero Nested Cards):** Metrics, forms, and financial tables live on flat architectural planes separated by crisp 1px horizontal and vertical hairline rules (`#E6E3DC`). Bordered cards are strictly reserved for clickable, actionable entities.
- **Progressive Disclosure (`Simple` vs. `Engineer` Mode):** A global header switch dynamically adjusts interface density—presenting a calm, plain-English 3-step guide for homeowners while unlocking full NASA POWER telemetry, performance ratio calibration, and estimator selection for engineers.
- **Self-Explaining Technical Literacy:** Every domain term (`Daily Sunlight Intensity`, `Simple Payback`, `LCOE`, `Specific Yield`, `Performance Ratio`) carries an interactive `<RichTooltip>` explaining what the metric means in plain English, how it impacts the monthly bill, and what a healthy benchmark looks like.

## Colors

### Primary Brand Triad (Core Identity)
- **Warm Alabaster Canvas (`canvas-bg` / `#FAF8F5` / `oklch(0.98 0.008 95)`):** Primary page ground in Light Mode. Evokes archival survey paper and warm daylight rather than sterile clinical white.
- **Deep Zinc Ink (`ink-primary` / `#18181B` / `oklch(0.141 0.005 285)`):** Primary typographic ink, active navigation indicators, high-contrast button surfaces, and structural rules.
- **Solar Amber (`solar-amber` / `#F59E0B` / `oklch(0.828 0.189 84.429)`):** Primary brand accent, active sun-path trajectory, slider thumbs, and primary conversion triggers (paired exclusively with `#18181B` dark ink for maximum legibility).

### Secondary & Analytical Pigments (Charts, Ledgers & Instrument Stages Only)
- **Solar Sky Blue (`solar-sky` / `#0EA5E9` / `oklch(0.685 0.169 237.323)`):** Used strictly for theoretical Clear-Sky irradiance ceiling curves, atmospheric watermarks, and capex ledger breakdowns.
- **Prussian Cyanotype Stage (`instrument-stage` / `#0B2236`):** Dedicated dark optical well used exclusively inside interactive satellite/heliodon canvas stages so amber sun-paths and sky-blue clear-sky envelopes read with instrument-grade contrast.
- **Semantic Delta & Ledger Accents:**
  - **Favorable / Positive Delta (`status-ok` / `#16A34A` / `oklch(0.62 0.17 145)`):** Used for subsidy deductions, positive energy yield gains, and *reduced* payback periods in inline run comparisons.
  - **Warning / Constraint (`status-warn` / `#D97706` / `oklch(0.75 0.16 75)`):** Used for roof footprint constraint alerts and out-of-distribution climate extrapolation warnings.
  - **Unfavorable / Negative Delta (`status-error` / `#DC2626` / `oklch(0.577 0.245 27.325)`):** Used when a compared run increases net capex, lengthens payback crossover, or reduces annual generation.

### Neutral Surfaces & Mode Mapping
- **Light Mode (Production Default):**
  - `surface-tile`: `#FEFDFB` (`oklch(0.995 0.004 95)`) — Elevated architectural plane for ledgers and active panels.
  - `surface-inset`: `#F3F1EC` (`oklch(0.96 0.006 95)`) — Recessed well for form inputs, toggle tracks, and table headers.
  - `border-hairline`: `#E6E3DC` (`oklch(0.92 0.008 95)`) — 1px structural grid divider.
  - `ink-muted`: `#71717A` (`oklch(0.552 0.016 285)`) — Secondary captions, axis ticks, and unit suffixes.
- **Dark Mode Token Mapping (`.dark` CSS Scope Support):**
  - `canvas-bg`: `#09090B` (`oklch(0.12 0.01 285)`)
  - `surface-tile`: `#121215` (`oklch(0.16 0.008 285)`)
  - `surface-inset`: `#0D0D10` (`oklch(0.13 0.008 285)`)
  - `border-hairline`: `rgba(255, 255, 255, 0.12)`
  - `ink-primary`: `#F4F4F5`
  - `ink-muted`: `#A1A1AA`

### Named Color Rules
- **The Three-Pigment Identity Rule:** 85%+ of every viewport must be composed strictly of Warm Alabaster (`#FAF8F5`/`#FEFDFB`), Deep Zinc (`#18181B`), and Solar Amber (`#F59E0B`). Never scatter green, blue, or purple decorative badges across general navigation or page chrome.
- **The One Voice Rule:** Never put white text on Solar Amber (`#F59E0B`). Solar Amber surfaces always carry Deep Zinc (`#18181B`) ink and icons.
- **The Semantic Polarity Rule:** In inline run comparisons (`/location/[id]`), semantic green (`#16A34A`) represents *financial or physical improvement*, not merely a positive sign (`+`). A payback change of `-1.4 yrs` or net cost change of `-$410` MUST render in emerald green (`#16A34A`).

## Typography

### Font Pairing
- **Display & Editorial Voice (`--font-serif`):** `'Newsreader', Georgia, serif`. Brings authoritative editorial gravitas to page titles and section headings without feeling archaic.
- **UI & Technical Grotesque (`--font-sans`):** `'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif`. Crisp, neutral, and engineered for dense form labels, plain-English explanations, and tooltips.
- **Precision Telemetry & Ledger Numerals (`--font-mono`):** `'IBM Plex Mono', 'Geist Mono', monospace` with mandatory `font-variant-numeric: tabular-nums`. Used for all coordinates, kW capacities, currency values, percentages, and inline diff badges.

### Typographic Hierarchy
- **Display (`2.75rem` / `44px`, line-height `1.08`, weight `500`):** Used exclusively for the Root Hero statement on `/`.
- **Headline (`1.875rem` / `30px`, line-height `1.15`, weight `500`):** Primary view titles (`Solar Planner`, `Site Analysis`, `Saved Sites & Portfolio`, `Profile & System Preferences`).
- **Title (`1.0625rem` / `17px`, line-height `1.35`, weight `600`):** Architectural ledger section headers and actionable card titles.
- **Body (`0.875rem` / `14px`, line-height `1.55`, weight `400`):** Explanations, cited engineering summaries, and tooltip copy.
- **Label (`0.75rem` / `12px`, line-height `1.2`, weight `600`):** Table column headers, segmented controls, and form field labels.
- **Mono Metric Large (`1.75rem` / `28px`, `IBM Plex Mono`, weight `600`, `tabular-nums`):** Primary KPI readouts inside horizontal metric strips.

### Named Typography Rules
- **The No-Eyebrow Rule:** Never stack tiny uppercase kicker labels above section headings. Let the `Newsreader` serif heading carry its own hierarchy cleanly.
- **The Tabular Alignment Law:** Every numerical value, coordinate (`26.9124° N`), currency figure (`$1,156/yr`), and diff badge (`[+$507/yr]`) must enforce `tabular-nums` so vertical columns and live slider scrubs never jitter horizontally.
- **The Plain-Language Label Rule:** Never render backend enum identifiers or ML jargon (`hist_gradient_boosting`, `ADR-0001`, `RAG`, `ood_warning`) as raw UI text. Always translate to client-facing terminology (*"Gradient Boosting (Default)"*, *"Cited Engineering Guides"*, *"Climate Extrapolation Alert"*).

## Layout

### Global Chrome & Navigation Bar
- Single top architectural bar (`height: 60px`, `bg: #FEFDFB`, `border-b: 1px solid #E6E3DC`) containing:
  1. **Brand Mark:** `Zenith` (`Newsreader` 20px) + subtle divider + `Solar Intelligence` subtitle.
  2. **Primary Surface Links:** `Overview`, `Solar Planner`, `Site Analysis`, `Portfolio`, `Preferences`.
  3. **Global Controls:** `Simple / Engineer` progressive disclosure toggle + clickable User & Unit Profile Pill (`AS · Aarav Sharma · m² · °C`).

### Surface 1: Root Landing Page (`/`)
- **Breathable Editorial Hero (2-Column Architectural Split, `7:5` ratio):**
  - **Left Column:** High-contrast `Newsreader` Display thesis (*"Solar infrastructure sized from satellite physics, not sales estimates"*), plain-English value proposition, primary CTA (`Open Solar Planner`), secondary CTA (`Explore Saved Sites`), and a 3-column horizontal trust strip separated by `1px` vertical dividers (`38-Year NASA Satellite Record`, `Regional Subsidy & Tariff Engine`, `Cited Engineering Trace`).
  - **Right Column (30-Second Bill-to-Solar Preview Workbench):** An interactive flat ledger panel with two tactile sliders (**Monthly Electric Bill** and **Usable Roof Area**), an interactive **Prussian Cyanotype Sun-Path & Daylight Preview bar**, and a 4-cell live output grid (`Recommended Size`, `Monthly Savings`, `Net Cost After Subsidy`, `Payback Crossover`) with a full-width action bar that transfers those exact inputs into `/dashboard`.
- **Solar Industry Headlines RSS Strip:**
  - Directly below the hero sits the live horizontal news feed (`https://renewablesnow.com/news/news_feed/?source=solar`) displaying 4–5 actionable article cards (`image`, `title`, `pubDate · source`) that open the external article in a new tab[cite: 1].
- **Clickable Reference Site Presets:**
  - A 4-column grid of real-world benchmark sites (Jaipur Residential `8 kW`, Phoenix Commercial `85 kW`, Munich Hybrid `12 kW`, Gujarat Industrial `1.2 MW`) that load directly into the workspace on click.

### Surface 2: Analysis Workspace (`/dashboard`)
- **Strict Anti-Cliché Spatial Rule:** **NEVER put the Map and Configuration Form side-by-side in a 50/50 split.**
- **Guided 3-Step Horizontal Stepper Flow:**
  - A sticky top stepper bar (`Step 1: Location & Sunlight` → `Step 2: System Sizing & Setup` → `Step 3: Savings & Engineering Plan`) paired with a live summary telemetry strip (`Pin · Capacity kW · Panel Count · Grid Topology · Run Analysis CTA`).
  - **Step 1 (Full-Bleed Location & Heliodon Stage):** Full-width interactive coordinate pin and Prussian Cyanotype Heliodon sun-path stage above a 4-column NASA POWER climate ledger (`Daily Sunlight Intensity`, `Clear-Sky Ceiling`, `Ambient Temp`, `38-Yr Model Confidence`).
  - **Step 2 (Dual-Mode Sizing Workbench):**
    - *Guided Bill & Roof Sizer (`Simple` default):* Property Scale selector (`Homeowner`, `Small Business`, `Industrial`), Planning Goal selector (`Fastest Payback`, `Maximum Bill Offset`, `Outage Backup`), Monthly Bill/Consumption slider, Usable Roof Area slider, and a **Live Orthographic Roof Array Packing visualizer** that triggers an amber warning banner if required panel area exceeds available roof footprint.
    - *Ad-Hoc Engineering Setup (`Engineer` mode):* Unlocks custom kW capacity (`0.5–100,000 kW`), Mount Type (`Rooftop`, `Ground`, `Carport`), Panel Technology (`Monocrystalline 20%`, `Polycrystalline 17%`, `Thin-Film 11%`), Grid Topology (`Grid-Tied`, `Hybrid + LFP Battery`, `Off-Grid`), custom LFP kWh override, Regional Subsidy rules (`India`, `USA`, `Europe`, `Global`), Tariff slider, Performance Ratio (`0.50–0.95`), and Estimator Model.
  - **Step 3 (Tabbed Results Ledger):** Clean horizontal tabs (`Financial & 25-Yr Payback`, `12-Month Sunlight & Physics`, `Cited Engineering & Q&A`) preventing vertical scroll overload.

### Surface 3: Site Dashboard & Inline Run Comparison (`/location/[id]`)
- **Header Control Strip:** Displays site title, coordinates, **Mode Switcher (`Single Run View` vs. `Compare Two Runs`)**, historical **Run Selector dropdown** (`Run #3 Latest`, `Run #2`, `Run #1`), and `Edit Site / New Run` drawer trigger.
- **Compare Mode Architecture (Base Run + Inline Semantic Diffs):**
  - Selecting `Compare Two Runs` reveals a `Base Run` vs. `Compared Run` selector bar and a full-width **Configuration Diff Strip** highlighting hardware changes (e.g., `Capacity: 5.0 kW → 8.0 kW`, `Grid Mode: Grid-Tied → Hybrid + 16 kWh LFP`, `Panel Tech: Poly 17% → Mono 20%`).
  - The **Base Run** owns the primary dashboard layout, while the **Compared Run** renders as **inline semantic diff badges** immediately beside every primary KPI (e.g., `$1,156/yr` with `[+$507/yr (+78.1%) vs Run #1]` in emerald green; `5.3 yrs` with `[-1.4 yrs vs Run #1]` in emerald green).
  - Both the **12-Month Sunlight Curve** and the **25-Year Cumulative Cashflow Crossover Chart** overlay the Compared Run as a dashed reference trajectory against the solid Base Run curve.

### Surface 4: Portfolio (`/locations` & `/analytics`) & Preferences (`/preferences`)
- **Portfolio Header View Switcher:** Uses compact **icon-only toggle buttons with on-hover tooltips** (`Saved Site Cards`, `Architectural Ledger Table`, `Specific Yield Benchmark & CSV Export`).
- **Profile & System Preferences (`/preferences`):** Flat 2-column architectural form governing global measurement units (`m²` vs `sq ft`, `°C` vs `°F`, `m/s` vs `km/h` vs `mph`), default planning scale, regional subsidy defaults, and Overview RSS news feed visibility.

## Elevation & Depth

- **Tonal Plane Layering Over Drop Shadows:** Zenith achieves hierarchy through subtle surface luminance shifts (`#FAF8F5` canvas → `#FEFDFB` active ledger plane → `#F3F1EC` recessed input well) bounded by `1px solid #E6E3DC` hairlines.
- **Zero Ambient Card Shadows:** Standard dashboard views use `box-shadow: none`.
- **Floating Overlays Only:** Subtle elevation (`0 12px 32px -8px rgba(24, 24, 27, 0.14)`) is permitted strictly on transient floating layers: `<RichTooltip>` popovers, the Slide-Over Site Configuration Drawer, and the Cited Engineering Q&A Drawer.

## Shapes

- **Crisp Architectural Radii:**
  - Buttons, inputs, badges, and segmented toggles: `2px` (`rounded-sm`) to `4px` (`rounded`).
  - Actionable site cards and RSS news cards: `6px` (`rounded-md`).
  - Pill geometry (`9999px`) is restricted strictly to the top-right user profile chip and live status dots.
- **The Zero Nested Cards Law:** Never place a bordered box inside another bordered box. Inside any bordered ledger container, subdivide space exclusively using full-bleed `1px` horizontal (`border-t`, `border-b`) and vertical (`divide-x`) hairline rules.
- **The Functional-Only Card Law:** A visual card (an enclosed box with all four borders and hover state) may ONLY be used when the entire container is an interactive click target (Saved Site cards, Reference Site presets, RSS News cards, and Actionable Recommendation cards).

## Components

- **Primary & Secondary Buttons:**
  - `button-primary`: Solar Amber `#F59E0B` background, Deep Zinc `#18181B` 600-weight text, `2px` radius, hover darken to `#D97706`.
  - `button-secondary`: Surface Tile `#FEFDFB` background, `1px solid #E6E3DC` border, Deep Zinc `#18181B` text, hover background `#F3F1EC`.
- **Segmented ToggleGroups & Icon View Switchers:**
  - Recessed `#F3F1EC` track (`padding: 2px`, `border: 1px solid #E6E3DC`) with active item in `#18181B` text on `#FEFDFB` (or `#18181B` fill with `#FAF8F5` text for primary mode switches). Icon-only view toggles in `/locations` must display a crisp top/bottom tooltip on hover.
- **Rich Plain-English Tooltips (`<RichTooltip>`):**
  - Triggered by hovering or focusing any technical label underlined with a dotted `#71717A` rule and `?` micro-icon.
  - Renders a `280px` `#18181B` dark zinc popover with three structured rows:
    1. **Plain-English Definition** (white body text)
    2. **Why It Matters to Your Bill** (`#F59E0B` amber callout)
    3. **Typical Benchmark** (`IBM Plex Mono` muted footer)
- **Inline Semantic Diff Badges (`<DiffBadge>`):**
  - Compact `IBM Plex Mono` `11px` pill (`padding: 2px 6px`, `rounded: 2px`) placed inline beside KPI numerals in Compare Mode.
  - Favorable delta: `bg: rgba(22, 163, 74, 0.12)`, `text: #15803D`, `border: 1px solid rgba(22, 163, 74, 0.28)`.
  - Unfavorable delta: `bg: rgba(220, 38, 38, 0.10)`, `text: #B91C1C`, `border: 1px solid rgba(220, 38, 38, 0.25)`.
- **Dual-Series SVG Charts (12-Month Sunlight & 25-Year Cashflow):**
  - Built with crisp `1px` dashed horizontal gridlines (`#E6E3DC`), `IBM Plex Mono` axis labels, Solar Amber (`#F59E0B`) primary series, Solar Sky Blue (`#0EA5E9`) clear-sky ceiling, and dashed reference trajectories when Compare Mode is active.
- **Solar Industry Headlines RSS Card:**
  - Aspect-ratio `16:10` top thumbnail with subtle zoom-on-hover, `2-line` clamped `IBM Plex Sans` 600-weight headline, and bottom metadata row (`Nov 3, 2026 · Renewables Now`)[cite: 1].

## Do's and Don'ts

### Do
- **Do** keep 85%+ of the interface anchored in Warm Alabaster (`#FAF8F5`), Deep Zinc (`#18181B`), and Solar Amber (`#F59E0B`).
- **Do** use `1px solid #E6E3DC` horizontal and vertical hairline dividers (`divide-x`, `divide-y`) to organize multi-column KPI strips and capex breakdowns without nested boxes.
- **Do** attach `<RichTooltip>` explanations to technical metrics so non-technical homeowners never feel intimidated.
- **Do** ensure the `Simple / Engineer` header toggle dynamically simplifies or expands parameters across every screen.
- **Do** render reductions in payback period (`-1.4 yrs`) and reductions in net cost (`-$410`) in emerald green (`#16A34A`) inside Compare Mode.

### Don't
- **Don't** put a card inside a card or wrap individual read-only metrics in separate bordered boxes.
- **Don't** place the satellite/heliodon map and the system configuration form side-by-side in a 50/50 split layout on `/dashboard`.
- **Don't** place small uppercase eyebrow/kicker labels above `Newsreader` headings.
- **Don't** expose internal developer or ML terms (`ADR-0001`, `RAG`, `sklearn`, `hist_gradient_boosting`, `localStorage`) anywhere in the UI.
- **Don't** use decorative neon glows, glassmorphism blur cards, or multi-stop background gradients.