# Large-Scale Solar Systems (>100 kW)

## System Scale Classifications

### Residential/Prosumer

- **Capacity**: 1-25 kW
- **Typical**: Rooftop single-phase inverter
- **Setup time**: 1-3 days
- **Cost/kW**: $1.50-2.50/W installed

### Small Commercial/Industrial

- **Capacity**: 25-250 kW
- **Typical**: Ground-mounted, three-phase, string inverters or central inverter
- **Setup time**: 1-4 weeks
- **Cost/kW**: $0.90-1.50/W installed

### Utility-Scale

- **Capacity**: 250 kW - 50+ MW
- **Typical**: Large ground-mounted array, central or multi-string inverters
- **Setup time**: 2-6 months
- **Cost/kW**: $0.60-1.20/W installed (economies of scale)

## >100 kW Design Considerations

### Grid Connection Requirements

- **Interconnection study**: Mandatory for >100 kW in most grids
- **Time**: 2-4 weeks to approval
- **Cost**: $500-3000
- **Compliance**: Grid code adherence, anti-islanding, voltage support

### Inverter Selection

- **String inverters**: Up to 50 kW per unit, multiple units for scaling
- **Central inverters**: 100 kW to 1 MW single units
- **Hybrid inverters** (battery-ready): 50-250 kW capacity

### Performance Ratio Scaling

- Residential (10 kW): 75-80% PR typical
- Commercial (100 kW): 78-82% PR (better O&M access, professional monitoring)
- Utility-scale (1+ MW): 80-85% PR (optimized design, redundancy)

## System Architecture for >100 kW

### DC Architecture

- **String configuration**: Multiple strings in parallel
- **Voltage**: 600-1000 VDC typical (higher voltage = lower losses)
- **Combiner boxes**: Consolidate multiple strings with fusing/monitoring
- **String length**: 12-20 modules per string (DC voltage ~600V)

### AC Architecture

- **Three-phase**: Essential for >100 kW (single-phase inefficient)
- **Transformer**: Step-up from inverter voltage (400V) to grid voltage (11-33 kV for commercial)
- **Distribution**: Multiple inverters on different strings for redundancy

### Battery Integration (Hybrid Systems)

- **Li-ion batteries**: 5-20 kWh per 100 kW capacity for daily cycle
- **Hybrid inverter**: DC coupling more efficient than AC coupling
- **Control strategy**: Charge from excess solar, discharge during peak tariff hours
- **Cost adder**: $400-600/kWh battery cost

## Large System Financial Analysis

### CAPEX Breakdown (100 kW)

- Panels (30%): $0.30-0.50/W = $3000-5000
- Inverter (15%): $150-250/kW = $15000-25000
- Balance-of-system (35%): $0.35-0.70/W = $3500-7000
  - Racking, wiring, combiner, transformer, disconnects
- Installation labor (15%): $0.15-0.30/W = $1500-3000
- Soft costs (5%): $5000-10000
  - Engineering, permitting, grid studies

**Total**: $0.80-1.50/W = $80000-150000 for 100 kW

### OPEX (Annual, 100 kW)

- O&M: $12-20/kW/year = $1200-2000
- Insurance: $1-2/kW/year = $100-200
- Monitoring system: $50-100/month = $600-1200
- Contingency reserve: ~$500-1000/year

**Total annual**: $2400-4400 = 3-4% of capex

### ROI & Payback (India Scenario)

- **Irradiance**: 5.5 kWh/m²/day average
- **System output**: 100 kW × 5.5 × 0.80 = 440 kWh/day
- **Annual energy**: 160 MWh/year
- **Tariff**: $0.08/kWh (commercial India rate)
- **Revenue**: $12800/year

**Payback**: $100000 / $12800 = 7.8 years
**25-year NPV** (8% discount): $130000-150000

## Efficiency & Loss Factors for Large Systems

### Losses Breakdown (Large System)

- DC wiring losses: 1-2% (optimized large systems vs 2-3% residential)
- Transformer losses: 0.5-1.5% (centralized vs multi-string)
- Inverter efficiency: 97-98.5% (high-quality industrial inverters)
- Soiling: 3-8% annual average (routine cleaning)
- Temperature derating: 8-12% annual average (same as residential)
- String mismatch/shading: 1-3% (better with microinverters or power optimizers)

**Overall system PR**: 77-83% for commercial systems (vs 73-78% residential)

## Grid Services & Demand Response

### Grid Support Capabilities (>100 kW)

- **Voltage support**: Reactive power injection (modern inverters)
- **Frequency response**: Active power curtailment during overvoltage
- **Ramping**: Ramp-rate constraints (e.g., 10% per minute)
- **Forecasting**: Day-ahead and 4-hour forecasts for utility planning

### Virtual Power Plant Integration

- Aggregation of multiple sites for coordinated control
- Real-time monitoring and command protocols
- Potential revenue: $50-200/kW/year depending on contract

## Seasonal & Climate Considerations

### Performance Curves

- **Summer (high irradiance, high temp)**: 95-100% nameplate (temperature loss offset by high irradiance)
- **Winter (low irradiance, low temp)**: 85-95% nameplate (lower irradiance dominates, but temp favorable)
- **Monsoon**: 50-70% nameplate (cloud cover, high humidity, soiling)

### Monsoon (Jul-Sep) Impact

- Average GHI: 50-60% of clear-sky values
- Soiling acceleration: Dust + moisture = faster degradation
- Cleaning frequency: Every 1-2 weeks recommended
- Energy loss: 40-50% vs dry season

## >500 kW Systems (Utility-Scale Lite)

### Additional Design Complexity

- **Land requirements**: ~5-8 acres per 1 MW
- **Environmental assessment**: Mandatory in most regions
- **Substation**: Dedicated transformer and switchgear required
- **SCADA system**: Industrial-grade monitoring & control

### Bifacial & Tracking Options

- **Bifacial panels**: +10-20% energy gain (captures ground reflection)
- **Single-axis tracking**: +25-35% energy gain, but +30% cost increase
- **Dual-axis tracking**: +40-50% gain, rarely cost-justified in India

## Scaling Considerations for ML Predictions

### Model Accuracy at Scale

- **<25 kW**: Irradiance prediction ±5-8%
- **25-250 kW**: ±4-7% (more stable, less micro-site variation)
- **>250 kW**: ±3-6% (larger footprint averages variability)
- **>1 MW**: ±2-5% (ensemble methods help)

### Data Requirements

- **Hourly data**: Minimum for >100 kW systems
- **Granular**: String-level monitoring for >250 kW
- **Forecasting**: 15-minute resolution for grid management
