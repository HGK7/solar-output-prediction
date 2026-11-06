# Homeowner Solar Sizing & Roof Planning Guide

## Bill-to-kW System Sizing Methodology

Homeowners typically begin solar planning from their monthly electricity bill or monthly consumption in kilowatt-hours (`kWh`). Sizing a residential photovoltaic (PV) array follows a three-step deterministic sequence:

1. **Infer Monthly Consumption (`kWh/month`)**:
   - `Monthly_kWh = Monthly_Bill_USD / Electricity_Tariff_USD_per_kWh`
   - Example: A **$120/month** electricity bill at **$0.15/kWh** corresponds to **800 kWh/month** (`26.7 kWh/day`).
2. **Convert Peak Sun Hours (PSH) to Specific Daily Yield**:
   - `Daily_Yield_per_kW = Peak_Sun_Hours (kWh/m²/day) × Performance_Ratio (PR)`
   - With `PSH = 5.0 kWh/m²/day` and `PR = 0.78`, each `1 kW` of installed solar generates **3.90 kWh/day** (`1,423.5 kWh/year`).
3. **Compute Recommended Array Capacity (`kW`)**:
   - `Recommended_kW = (Monthly_kWh / 30) × Target_Offset_Ratio / (PSH × PR)`
   - Using the 800 kWh/month example at 100% offset (`1.0`): `26.67 / 3.90 = 6.84 kW` (typically rounded to a standard **7.0 kW** residential system).

## Roof Area, Panel Count, and Structural Setbacks

Modern residential installations use high-efficiency monocrystalline PERC or TOPCon modules rated at **400 Wp to 440 Wp** per panel (net module footprint ~`1.95–2.05 m²`).

### Net vs Gross Roof Area Requirements

- **Net Module Area**: **4.6–5.0 m²/kW** (`50–54 sq ft/kW`) for 20–22% efficient monocrystalline modules.
- **Pitched / Flush-Mount Rooftop Gross Area**: **6.5 m²/kW** (`~70 sq ft/kW`, Ground Coverage Ratio `GCR ≈ 0.77`), accounting for fire-code perimeter pathways (typically `0.9 m / 3 ft` ridge and edge setbacks under IFC/NFPA standards), vents, and skylights.
- **Flat Concrete Roof (Ballasted / Tilted Racking)**: **8.5–10.0 m²/kW** (`90–108 sq ft/kW`, `GCR ≈ 0.50–0.60`), required to prevent winter inter-row self-shading between tilted rows.

### Structural & Roof Age Checklist

- **Dead-Load Reserve**: Flush-mounted PV adds **12–15 kg/m²** (`2.5–3.0 lbs/sq ft`); ballasted flat-roof systems add **25–45 kg/m²** (`5–9 lbs/sq ft`).
- **Roof Lifespan Alignment**: Because solar arrays operate for **25–30 years**, asphalt shingle or membrane roofs older than **12–15 years** should be reroofed before mounting racking hardware to avoid costly mid-life removal and reinstallation ($1,500–$3,500).

## Inverter Topologies: String vs Microinverters vs Hybrid

### Central / Residential String Inverter

- **Cost**: Lowest hardware cost (**$0.08–0.14/W**).
- **Best For**: Unshaded, single-plane south- or west-facing roofs.
- **Limitation**: Without DC power optimizers, partial shading on one module can bottleneck the current of the entire series string (unless bypassed by module diodes).

### Module-Level Power Electronics (Microinverters / DC Optimizers)

- **Cost**: **+$0.12–0.20/W** premium over standard string inverters.
- **Best For**: Complex multi-gable roofs, chimneys, tree shading, or split east-west orientations.
- **Advantage**: Panel-level MPPT tracking, rapid-shutdown compliance (NEC 690.12), and 25-year microinverter warranties matching module lifetimes.

### Hybrid (Bimodal) Storage-Ready Inverter

- **Cost**: **+$100–$150/kW** hardware and automatic transfer switch (ATS) premium.
- **Best For**: Homeowners pairing LFP battery storage for evening Time-of-Use (TOU) tariff arbitrage or backup power during grid outages.

## Utility Metering Regimes: Net Metering vs Net Billing vs Zero-Export

- **1:1 Retail Net Energy Metering (NEM 1.0 / 2.0 & India State Rooftop Net Metering)**: Excess daytime kWh exported to the grid credits the homeowner at the full retail tariff (`1:1`). The grid acts as a free seasonal battery; standalone battery storage is needed only for outage backup.
- **Net Billing / Avoided-Cost Export (California NEM 3.0, parts of Europe)**: Exported daytime solar is credited at wholesale avoided-cost rates (**25–40% of retail tariff**, e.g., $0.05–0.08/kWh vs $0.30/kWh retail). Pairing a **hybrid LFP battery** increases self-consumption from **~35–40% to 80–90%**, restoring fast payback.
- **Zero-Export / Non-Export CT Clamp**: Used where local distribution transformers are saturated; a current-transformer (CT) meter throttles inverter output to match instantaneous household load.
