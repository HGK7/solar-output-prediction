# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Homeowners**: Individuals evaluating rooftop solar for their residences, starting from their monthly electricity bill, available roof area, and desire for lower payback or backup battery resilience during outages.
- **Small Business & Community Planners**: Operators planning 10 kW to 100 kW rooftop or carport solar arrays for schools, offices, apartment associations (RWAs/GHS), and retail sites.
- **Commercial & Industrial (C&I) Site Evaluators**: Engineers and facility managers screening 100 kW to 5 MW+ ground-mounted or industrial shed installations, evaluating demand-charge savings, 3-phase tie-in, accelerated depreciation, and multi-site portfolios.

## Product Purpose

Zenith (Solar Intelligence Dashboard) enables anyone from a common homeowner to a commercial site planner to plan solar infrastructure with numbers they can defend. It turns a geographic coordinate and a practical user profile (monthly bill/load, roof area, grid & battery mode, subsidy jurisdiction) into climatology-grounded irradiance Predictions, deterministic physics and 25-year financial models, inline multi-run comparisons, and cited scientific/policy explanations.

## Positioning

Unlike opaque solar lead-generation calculators that hide assumptions or naive AI wrappers that let an LLM hallucinate kWh outputs and payback figures, Zenith enforces a strict **ML / Deterministic / Agentic-LLM boundary (ADR-0001 & ADR-0004)**:
1. **Predictions** are strictly ML-driven from 38-year NASA POWER satellite climatology.
2. **Engineering, sizing, storage, and subsidy math** are 100% deterministic and auditable step-by-step.
3. **LLMs and Agentic Tool-Calling** explain results, cite peer-reviewed & regulatory documents (IRENA, NREL, IEC 61724-1, PM Surya Ghar, US IRA ITC, EU VAT/FiT), and invoke deterministic Python tools to answer "what-if" optimization questions without ever inventing a number.

## Operating Context

- Users start by setting a **Planning Profile** (Scale Tier, Subsidy Jurisdiction, Optimization Goal) and selecting a **Location** on an interactive satellite/street map or via coordinates.
- Users size their system either directly in kW or via the **Bill & Roof Sizing Assistant** (monthly electricity bill/usage + available roof area).
- Users run streaming **Analyses**, save **Sites** with stacked **Saved Runs** in **Guest Mode**, inspect full run dashboards on `/location/[id]`, and toggle **Compare Mode** to inspect **Inline Diffs** between a Base Run and a Compared Run.
- Users can toggle between the rate-limited **System Key** and **Bring Your Own Key (BYOK)** for Gemini AI features, and between Cloud Lite (CPU) and Local GPU (CUDA) compute profiles.

## Capabilities and Constraints

- **ML-only Predictions (`/predict`)**: Trained regression/ensemble models with Out-of-Distribution (OOD) feature guards and prediction intervals.
- **Deterministic Financial, Storage & Subsidy Engine**: Models `grid-tied`, `hybrid` (LFP battery storage), and `off-grid` systems, plus regional subsidies (India PM Surya Ghar CFA / 40% AD, US 30% IRA ITC + MACRS, EU 0% VAT + FiT).
- **Deliberate Agentic Advisor (`/ask`)**: Tool-calling over deterministic sizing/what-if engines + RAG retrieval over a lightweight SQLite/NumPy vector index (`LiteVectorStore`) that runs comfortably in <512 MB RAM on cloud free tiers or locally via Docker Compose.
- **Guest Mode Persistence**: Browser `localStorage` (`v3` schema) stores Sites, stacked Runs with stamped `systemConfig`, preferences, and optional BYOK configuration. No server-side user accounts yet.

## Brand Commitments

- **Product Name**: **Zenith** (subtitle: *Solar Intelligence Dashboard*).
- **Voice & Tone**: Client-facing, factual, concise, non-developer. Describe only what exists today; never include roadmap promises or developer jargon in UI copy.
- **Visual Direction**: Calm utility + evidence. High-contrast zinc neutral surfaces (`--tile`, `--tile-elevated`, `--tile-inset`) with purposeful solar amber (`--solar-amber`), sky (`--solar-sky`), and semantic status (`--status-ok`, `--status-warn`, `--status-error`) tokens. Zero decorative AI shimmer debt or nested scroll prisons.

## Evidence on Hand

- **Climatology**: Live NASA POWER Climatology API (`ALLSKY_SFC_SW_DWN`, `CLRSKY_SFC_SW_DWN`, `T2M`, `RH2M`, `WS2M`, 1984–2022 satellite record).
- **Knowledge Base (`backend/rag/documents/`)**: Curated markdown & PDF corpus citing IRENA Renewable Power Generation Costs 2024, NREL PV System Cost Benchmarks, NREL SAM Technical Reference, IEC 61724-1, Duffie & Beckman, MNRE PM Surya Ghar guidelines, US IRC Sec. 25D/48E, and EU EEG/VAT directives.
- **Absence of Fabrication**: No invented customer testimonials, fake certifications, or unverified financial guarantees. All outputs carry clear engineering & financial disclaimers (`/disclaimer`, `/privacy`, `/terms`).

## Product Principles

1. **Numbers First, Language Second**: Deterministic code owns every watt, dollar, and payback year; AI exists to explain, retrieve citations, and orchestrate deterministic tools.
2. **Homeowner Accessible, Engineer Defensible**: Frame headline numbers in human terms (`~$X/mo saved`, panel count, roof area in `m²`/`sq ft`, net cost after subsidy) while keeping full LCOE, PR loss breakdown, and methodology traces one click away.
3. **Honest Comparison**: Every saved run stamps its exact configuration and assumptions so comparing Run A vs Run B shows truthful inline diffs across configuration, energy, and 25-year cashflow.
4. **Graceful Degradation & User Ownership**: Core ML and financial workflows succeed even when LLM quota or RAG is offline; users can bring their own API key or run the entire stack locally in Docker.

## Accessibility & Inclusion

- WCAG 2.1 AA compliance across both Light and Dark themes.
- Full keyboard navigation and screen-reader semantics (proper Radix `Tabs` pairing, `aria-live` status regions, `<figure>` + data-table fallbacks for charts, minimum 44×44px touch targets on mobile, `prefers-reduced-motion` respected everywhere).
- Dual unit support (`metric` `°C / m²` and `imperial` `°F / sq ft`).
