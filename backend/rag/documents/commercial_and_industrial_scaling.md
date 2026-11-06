# Commercial & Industrial (C&I) Solar Scaling Guide (10 kW to 5 MW+)

## C&I Tariff Structure: Energy Charges vs Demand Charges (`kVA` / `kW`)

Unlike residential consumers who pay a flat volumetric rate per `kWh`, Commercial and Industrial (C&I) facilities face a **two-part electricity tariff**:

1. **Volumetric Energy Charge (`$/kWh` or `₹/kWh`)**: Billed on total monthly energy consumed, often structured in **Time-of-Day (ToD) / Time-of-Use (TOU)** bands where daytime industrial tariffs are $0.10–$0.18/kWh and evening peak tariffs carry a **+20–35% surcharge**.
2. **Maximum Demand / Fixed Capacity Charge (`$/kVA/month` or `$/kW/month`)**: Billed on the highest 15-minute or 30-minute average power draw recorded during the billing cycle (typically **$8–$25/kW/month** in the US/EU and **₹250–₹600/kVA/month** in India).
   - **Solar-Only Peak Shaving**: Reduces daytime HVAC and manufacturing peaks by **15–30%**, but a single cloudy afternoon during the month can reset the 15-minute peak demand ratchet.
   - **Solar + LFP Battery Peak Shaving**: A hybrid C&I battery (`0.5–1.0 C` discharge rate) actively dispatches during 15-minute load spikes and cloudy transients, guaranteeing **80–95% demand-charge capture** and cutting payback by **1.0–1.8 years**.

## Power Factor (`cos φ`) & Reactive Power Compliance

Industrial inductive loads (motors, compressors, chillers, welding lines) draw reactive power (`kVAr`) alongside active power (`kW`). When a rooftop solar plant offsets daytime active power (`kW`) without offsetting reactive power (`kVAr`), the apparent power ratio at the utility meter shifts and **measured power factor (`cos φ = kW / kVA`) can drop below utility thresholds (`0.90–0.95`)**, triggering utility power-factor penalties.

- **Mitigation 1 — Automatic Power Factor Correction (APFC) Capacitor Banks**: Ensure the facility's APFC relay uses **4-quadrant bidirectional sensing** so capacitor stages switch accurately when solar back-feeds or reduces net active import.
- **Mitigation 2 — Smart Inverter `Q(U)` / Fixed `cos φ` Mode**: Configure three-phase string/central inverters (under IEEE 1547-2018 / VDE-AR-N 4110 / CEA grid codes) to operate at a leading/lagging power factor (`0.90–0.95`) or dynamic reactive power support (`cos φ >= 0.95`).

## Electrical Tie-In: Three-Phase LT vs High-Tension (HT) Interconnection

| System Capacity | Typical Interconnection Voltage | Transformer & Switchgear Requirement |
|-----------------|----------------------------------|--------------------------------------|
| **10–100 kW** | **Low-Tension (LT) 3-Phase** (`400V` EU / `415V` India / `480V` US) | Ties directly into facility Main LT Distribution Board (MLTDB) via MCCB/ACB with anti-islanding relay |
| **100 kW–1 MW** | **LT 415V/480V or HT 11 kV** | Requires dedicated LT solar feeder panel or **step-up transformer (`0.415/11 kV`)** with Vacuum Circuit Breaker (VCB) |
| **1 MW–5 MW+** | **High-Tension (HT) 11 kV / 22 kV / 33 kV** | Dedicated unit auxiliary/step-up transformer, HT VCB switchgear, directional overcurrent & earth-fault protection, SCADA telemetry |

## Distribution Transformer Hosting Capacity Rule (`80–100%`)

Most DISCOMs and municipal utilities cap behind-the-meter C&I solar capacity at **80% to 100% of the site's sanctioned contract demand (`kVA` / `kW`) or distribution transformer rating**:

- Example: A factory with a **500 kVA** transformer (`0.415/11 kV`) is typically permitted **400 kW to 500 kW AC** maximum solar interconnection without upgrading the transformer and HT bay.
- **DC-to-AC Oversizing Ratio (ILR)**: C&I arrays commonly size DC module capacity at **1.15–1.25× AC inverter rating** (e.g., **600 kWp DC on 500 kW AC inverters**) to maximize morning and late-afternoon shoulder generation within the transformer's AC hosting limit.

## Mounting Structures & Balance of System (BOS) Multipliers

- **Industrial Metal Shed Roof (`Trapezoidal / Standing Seam`)**: Lowest structural BOS cost (**0.95–1.00× baseline BOS**); short aluminum rail clamps attach directly to purlins or standing seams (`4.8–5.5 m²/kW` footprint).
- **Flat Concrete Commercial Roof (`Ballasted East-West or South Tilt`)**: **1.00–1.05× BOS**; East-West `10°` dual-tilt racking achieves high power density (**5.5–6.5 m²/kW**) with broad, flat daytime generation curves ideal for factory self-consumption.
- **Ground-Mounted C&I Array**: **+5% BOS multiplier (`1.05×`)** for driven galvanized steel piles, perimeter fencing, and underground DC/AC cable trenching (**7.5–9.0 m²/kW** land footprint).
- **Solar Carport Canopy**: **+15% BOS multiplier (`1.15×`)** for elevated hot-dip galvanized structural steel columns, foundations, and waterproof decking, turning employee or retail parking lots into dual-use power plants without consuming roof space.
