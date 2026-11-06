import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Compass,
  MapPin,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Download,
  GitCompare,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Play,
  ShieldCheck,
  Settings2,
  X,
  ExternalLink,
  Crosshair,
  Sun,
  HelpCircle,
  LayoutGrid,
  Table2,
  BarChart3,
  User,
  Sliders,
  RotateCcw,
  Check
} from 'lucide-react';

// ============================================================================
// 1. PLAIN-ENGLISH TECHNICAL GLOSSARY FOR RICH TOOLTIPS (<RichTooltip>)
// ============================================================================

const GLOSSARY = {
  irradiance: {
    plainTitle: 'Daily Sunlight Intensity (kWh/m²/day)',
    plainExplanation:
      'Think of this as the average "hours of full peak sunshine" hitting each square meter of your roof every day across a 38-year NASA satellite record.',
    impactOnYou:
      'Higher sunlight means fewer solar panels are needed to wipe out the same monthly electric bill.',
    benchmark: '4.5+ is good · 5.5+ is excellent (sunny belt)'
  },
  clear_sky: {
    plainTitle: 'Clear-Sky Ceiling (kWh/m²/day)',
    plainExplanation:
      'The maximum sunlight your roof would receive if there were zero clouds or haze all year.',
    impactOnYou:
      'Comparing actual sunlight to the clear-sky ceiling shows how much monsoon or winter cloud cover affects your roof.',
    benchmark: 'Typically 10%–25% above actual daily sunlight'
  },
  capacity_kw: {
    plainTitle: 'System Size in Kilowatts (kW)',
    plainExplanation:
      'The total power rating of all your solar panels combined under bright sun. One 400-watt residential panel equals 0.4 kW.',
    impactOnYou:
      'A typical home uses 5 kW to 10 kW; a small business typically uses 20 kW to 100 kW.',
    benchmark: '1 kW = ~2.5 panels (~5 m² / 54 sq ft of roof)'
  },
  specific_yield: {
    plainTitle: 'Productivity per Kilowatt (kWh/kWp/yr)',
    plainExplanation:
      'How many kilowatt-hours of electricity every 1 kW of solar panels produces in a full year at your location.',
    impactOnYou:
      'Lets you compare solar quality across different cities regardless of how big or small the roof is.',
    benchmark: '1,100–1,400 (Europe) · 1,600–1,900 (India / US Southwest)'
  },
  performance_ratio: {
    plainTitle: 'Real-World Efficiency Factor (Performance Ratio)',
    plainExplanation:
      'The percentage of theoretical sunlight that survives real-world heat, dust, wiring, and inverter conversion to become usable AC power in your outlets.',
    impactOnYou:
      'Keeping panels clean and ventilated raises this number and directly boosts your annual savings.',
    benchmark: '0.75 to 0.85 (75%–85%) is standard for modern installations'
  },
  lfp_battery: {
    plainTitle: 'LFP Battery Backup (Lithium Iron Phosphate)',
    plainExplanation:
      'Safe, long-life home or commercial battery storage that saves midday solar power so you can run lights, A/C, and machinery at night or during grid outages.',
    impactOnYou:
      'Increases the share of solar power you use yourself from ~58% up to 85%+, and provides instant blackout protection.',
    benchmark: '10–20 kWh for homes · 12–15 year typical cell lifespan'
  },
  lcoe: {
    plainTitle: 'Cost per Unit of Solar Electricity (LCOE $/kWh)',
    plainExplanation:
      'Your true locked-in cost for every kWh of electricity your solar panels produce over 25 years, after dividing net cost by lifetime output.',
    impactOnYou:
      'If your solar LCOE is $0.039/kWh and your utility charges $0.08–$0.26/kWh, every unit of solar power is half to one-fifth the price of grid power.',
    benchmark: '$0.03 to $0.06/kWh for rooftop solar after incentives'
  },
  payback: {
    plainTitle: 'Payback Crossover (Years)',
    plainExplanation:
      'The exact point when your cumulative monthly electric bill savings completely pay off your net upfront solar cost.',
    impactOnYou:
      'Every year after payback crossover is pure net cash savings in your pocket for the remaining 25+ year panel life.',
    benchmark: '3.5 to 6.5 years is strong for residential & commercial solar'
  },
  tilt_azimuth: {
    plainTitle: 'Optimal Panel Tilt & Compass Direction',
    plainExplanation:
      'The angle your panels are propped up (Tilt) and the compass direction they face (Azimuth—Due South in the Northern Hemisphere).',
    impactOnYou:
      'Tilting panels near your latitude angle catches significantly more winter sun and helps rain wash off dust.',
    benchmark: 'Tilt roughly equal to your latitude (°N) facing Due South (180°)'
  },
  bos_soft: {
    plainTitle: 'BOS (Balance of System) & Soft Costs',
    plainExplanation:
      'BOS covers mounting rails, wiring, breakers, and safety switches. Soft costs cover engineering permits, installation labor, and grid inspection.',
    impactOnYou:
      'Shows the full turnkey price so you are never surprised by hidden installation hardware or permitting fees.',
    benchmark: 'Typically 20%–30% of total turnkey installation cost'
  },
  r2_confidence: {
    plainTitle: 'Satellite Forecast Confidence (R² Accuracy)',
    plainExplanation:
      'Measures how closely our climate model matches 38 years of historical NASA satellite weather measurements at this exact coordinate grid.',
    impactOnYou:
      'A score above 90% means seasonal sunshine patterns at your location are highly predictable year after year.',
    benchmark: '92%–97% across verified regions'
  }
};

function RichTooltip({ termKey, children, showUnderline = true }) {
  const [open, setOpen] = useState(false);
  const info = GLOSSARY[termKey];
  if (!info) return <span>{children}</span>;

  return (
    <span
      className="relative inline-flex items-center gap-1 group"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`text-left inline-flex items-center gap-1 focus:outline-none ${
          showUnderline
            ? 'underline decoration-dotted decoration-[#F59E0B] underline-offset-4 cursor-help'
            : 'cursor-help'
        }`}
      >
        <span>{children}</span>
        <HelpCircle className="w-3.5 h-3.5 text-[#F59E0B] opacity-85 shrink-0 inline" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 p-4 bg-[#18181B] text-[#FAF8F5] border border-[#F59E0B]/50 shadow-xl z-50 text-left rounded-sm font-sans normal-case tracking-normal"
        >
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/10">
            <span className="font-semibold text-xs text-[#F59E0B]">
              {info.plainTitle}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[#71717A] hover:text-white text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-[#FAF8F5]/90 leading-relaxed mt-2">
            {info.plainExplanation}
          </p>
          <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] space-y-1">
            <div>
              <span className="text-[#F59E0B] font-medium">What it means for you: </span>
              <span className="text-[#FAF8F5]/85">{info.impactOnYou}</span>
            </div>
            <div className="font-mono-tech text-[10px] text-[#0EA5E9] pt-0.5">
              Typical benchmark: {info.benchmark}
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

function IconButtonTooltip({ label, active, onClick, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`p-2 transition-colors focus:outline-none ${
          active
            ? 'bg-[#F59E0B] text-[#18181B]'
            : 'text-[#A1A1AA] hover:text-[#FAF8F5]'
        }`}
      >
        {children}
      </button>
      {hovered && (
        <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1 bg-[#18181B] text-[#FAF8F5] border border-white/20 text-[11px] font-sans whitespace-nowrap rounded-xs shadow-lg z-50 pointer-events-none">
          {label}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. SOLAR INDUSTRY HEADLINES RSS FEED CONTRACT & FALLBACK DATA
// ============================================================================

const RSS_FEED_URL = 'https://renewablesnow.com/news/news_feed/?source=solar';

const FALLBACK_SOLAR_HEADLINES = [
  {
    title: 'UK research org MTC invests GBP 1.3m in on-site solar thermal system',
    link: 'https://renewablesnow.com/news/',
    pubDate: 'Nov 3, 2026',
    source: 'Renewables Now',
    image:
      'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Downing wins planning approval for 42-MW UK solar, storage project',
    link: 'https://renewablesnow.com/news/',
    pubDate: 'Nov 3, 2026',
    source: 'Renewables Now',
    image:
      'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=800&q=80'
  },
  {
    title:
      "China's 1.5-GW Hami project nears grid connection with PV, CSP and molten salt storage",
    link: 'https://renewablesnow.com/news/',
    pubDate: 'Nov 3, 2026',
    source: 'Renewables Now',
    image:
      'https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: "Italy's installed solar capacity reaches 48.4 GW",
    link: 'https://renewablesnow.com/news/',
    pubDate: 'Nov 3, 2026',
    source: 'Renewables Now',
    image:
      'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=800&q=80'
  },
  {
    title:
      'Solar & battery storage additions hit record pace across European commercial rooftops',
    link: 'https://renewablesnow.com/news/',
    pubDate: 'Nov 2, 2026',
    source: 'Renewables Now',
    image:
      'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=800&q=80'
  }
];

// ============================================================================
// 3. REFERENCE SITES & HISTORICAL RUNS DATA CONTRACT
// ============================================================================

const REFERENCE_SITES = [
  {
    id: 'site-jaipur',
    code: 'IN-RJ-04',
    name: 'Jaipur Residential Villa',
    locationLabel: 'Jaipur · Rajasthan, India',
    region: 'india',
    lat: 26.9124,
    lon: 75.7873,
    scale: 'homeowner',
    goal: 'lowest_payback',
    monthlyBillUsd: 115,
    monthlyKwh: 1438,
    roofAreaM2: 52,
    systemCapacityKw: 8.0,
    installationType: 'rooftop',
    panelTechnology: 'monocrystalline',
    gridConnection: 'hybrid',
    batteryCapacityKwh: 16,
    tariffUsd: 0.08,
    includeIncentives: true,
    performanceRatio: 0.78,
    model: 'hist_gradient_boosting',
    irradianceDaily: 5.74,
    errorEstimate: 0.22,
    r2Accuracy: 95.0,
    rmse: 0.11,
    oodWarning: false,
    tempC: 28.4,
    humidityPct: 34,
    windSpeedMs: 3.8,
    clearSkyDaily: 6.48,
    optimalTiltDeg: 26.9,
    azimuthDirection: 'Due South (180°)',
    daylightHours: 12.1,
    runCount: 3,
    monthlySeries: [
      { m: 'Jan', irr: 4.62, clear: 5.20, cloudLoss: 11.2, temp: 18.2 },
      { m: 'Feb', irr: 5.38, clear: 5.95, cloudLoss: 9.6, temp: 21.5 },
      { m: 'Mar', irr: 6.32, clear: 6.85, cloudLoss: 7.7, temp: 27.1 },
      { m: 'Apr', irr: 6.94, clear: 7.42, cloudLoss: 6.5, temp: 33.0 },
      { m: 'May', irr: 7.25, clear: 7.75, cloudLoss: 6.4, temp: 36.8 },
      { m: 'Jun', irr: 6.45, clear: 7.60, cloudLoss: 15.1, temp: 35.4 },
      { m: 'Jul', irr: 5.12, clear: 7.25, cloudLoss: 29.4, temp: 31.8 },
      { m: 'Aug', irr: 4.98, clear: 6.90, cloudLoss: 27.8, temp: 30.2 },
      { m: 'Sep', irr: 5.86, clear: 6.55, cloudLoss: 10.5, temp: 30.5 },
      { m: 'Oct', irr: 5.72, clear: 6.10, cloudLoss: 6.2, temp: 28.1 },
      { m: 'Nov', irr: 4.90, clear: 5.42, cloudLoss: 9.6, temp: 23.0 },
      { m: 'Dec', irr: 4.34, clear: 4.85, cloudLoss: 10.5, temp: 19.1 }
    ]
  },
  {
    id: 'site-phoenix',
    code: 'US-AZ-11',
    name: 'Phoenix Commercial Cold-Storage',
    locationLabel: 'Phoenix · Arizona, USA',
    region: 'usa',
    lat: 33.4484,
    lon: -112.0740,
    scale: 'small_business',
    goal: 'max_offset',
    monthlyBillUsd: 680,
    monthlyKwh: 4850,
    roofAreaM2: 210,
    systemCapacityKw: 28.0,
    installationType: 'rooftop',
    panelTechnology: 'monocrystalline',
    gridConnection: 'grid-tied',
    batteryCapacityKwh: 0,
    tariffUsd: 0.14,
    includeIncentives: true,
    performanceRatio: 0.81,
    model: 'hist_gradient_boosting',
    irradianceDaily: 6.12,
    errorEstimate: 0.18,
    r2Accuracy: 96.4,
    rmse: 0.09,
    oodWarning: false,
    tempC: 24.6,
    humidityPct: 24,
    windSpeedMs: 3.1,
    clearSkyDaily: 6.72,
    optimalTiltDeg: 31.2,
    azimuthDirection: 'Due South (180°)',
    daylightHours: 12.3,
    runCount: 5,
    monthlySeries: [
      { m: 'Jan', irr: 3.85, clear: 4.40, cloudLoss: 12.5, temp: 13.8 },
      { m: 'Feb', irr: 4.78, clear: 5.35, cloudLoss: 10.6, temp: 15.9 },
      { m: 'Mar', irr: 5.95, clear: 6.55, cloudLoss: 9.1, temp: 19.4 },
      { m: 'Apr', irr: 7.18, clear: 7.65, cloudLoss: 6.1, temp: 23.8 },
      { m: 'May', irr: 7.88, clear: 8.25, cloudLoss: 4.5, temp: 28.9 },
      { m: 'Jun', irr: 8.15, clear: 8.45, cloudLoss: 3.5, temp: 34.2 },
      { m: 'Jul', irr: 7.42, clear: 8.20, cloudLoss: 9.5, temp: 36.1 },
      { m: 'Aug', irr: 6.95, clear: 7.65, cloudLoss: 9.1, temp: 35.2 },
      { m: 'Sep', irr: 6.32, clear: 6.80, cloudLoss: 7.0, temp: 31.8 },
      { m: 'Oct', irr: 5.25, clear: 5.70, cloudLoss: 7.9, temp: 25.1 },
      { m: 'Nov', irr: 4.12, clear: 4.60, cloudLoss: 10.4, temp: 18.0 },
      { m: 'Dec', irr: 3.59, clear: 4.10, cloudLoss: 12.4, temp: 13.2 }
    ]
  },
  {
    id: 'site-munich',
    code: 'EU-BY-08',
    name: 'Munich Hybrid Logistics Hub',
    locationLabel: 'Munich · Bavaria, Germany',
    region: 'europe',
    lat: 48.1351,
    lon: 11.5820,
    scale: 'small_business',
    goal: 'backup_resilience',
    monthlyBillUsd: 1120,
    monthlyKwh: 4300,
    roofAreaM2: 260,
    systemCapacityKw: 36.0,
    installationType: 'rooftop',
    panelTechnology: 'monocrystalline',
    gridConnection: 'hybrid',
    batteryCapacityKwh: 72,
    tariffUsd: 0.26,
    includeIncentives: true,
    performanceRatio: 0.83,
    model: 'random_forest',
    irradianceDaily: 3.64,
    errorEstimate: 0.19,
    r2Accuracy: 94.1,
    rmse: 0.12,
    oodWarning: false,
    tempC: 10.4,
    humidityPct: 68,
    windSpeedMs: 4.1,
    clearSkyDaily: 4.55,
    optimalTiltDeg: 38.5,
    azimuthDirection: 'Due South (180°)',
    daylightHours: 11.8,
    runCount: 4,
    monthlySeries: [
      { m: 'Jan', irr: 1.15, clear: 1.65, cloudLoss: 30.3, temp: -0.4 },
      { m: 'Feb', irr: 1.95, clear: 2.60, cloudLoss: 25.0, temp: 1.2 },
      { m: 'Mar', irr: 3.25, clear: 4.10, cloudLoss: 20.7, temp: 5.4 },
      { m: 'Apr', irr: 4.65, clear: 5.65, cloudLoss: 17.7, temp: 9.8 },
      { m: 'May', irr: 5.45, clear: 6.60, cloudLoss: 17.4, temp: 14.3 },
      { m: 'Jun', irr: 5.85, clear: 6.95, cloudLoss: 15.8, temp: 17.8 },
      { m: 'Jul', irr: 5.75, clear: 6.75, cloudLoss: 14.8, temp: 19.6 },
      { m: 'Aug', irr: 4.95, clear: 5.85, cloudLoss: 15.4, temp: 19.1 },
      { m: 'Sep', irr: 3.65, clear: 4.45, cloudLoss: 18.0, temp: 14.8 },
      { m: 'Oct', irr: 2.25, clear: 2.95, cloudLoss: 23.7, temp: 9.6 },
      { m: 'Nov', irr: 1.25, clear: 1.80, cloudLoss: 30.5, temp: 4.1 },
      { m: 'Dec', irr: 0.95, clear: 1.40, cloudLoss: 32.1, temp: 0.8 }
    ]
  },
  {
    id: 'site-gujarat',
    code: 'IN-GJ-19',
    name: 'Gujarat Industrial Spinning Mill',
    locationLabel: 'Ahmedabad · Gujarat, India',
    region: 'india',
    lat: 23.0225,
    lon: 72.5714,
    scale: 'industrial',
    goal: 'lowest_payback',
    monthlyBillUsd: 2250,
    monthlyKwh: 28125,
    roofAreaM2: 520,
    systemCapacityKw: 95.0,
    installationType: 'ground-mounted',
    panelTechnology: 'monocrystalline',
    gridConnection: 'hybrid',
    batteryCapacityKwh: 190,
    tariffUsd: 0.08,
    includeIncentives: true,
    performanceRatio: 0.79,
    model: 'hist_gradient_boosting',
    irradianceDaily: 5.92,
    errorEstimate: 0.17,
    r2Accuracy: 96.2,
    rmse: 0.09,
    oodWarning: false,
    tempC: 29.2,
    humidityPct: 41,
    windSpeedMs: 3.9,
    clearSkyDaily: 6.62,
    optimalTiltDeg: 23.5,
    azimuthDirection: 'Due South (180°)',
    daylightHours: 12.2,
    runCount: 6,
    monthlySeries: [
      { m: 'Jan', irr: 4.85, clear: 5.35, cloudLoss: 9.3, temp: 20.5 },
      { m: 'Feb', irr: 5.55, clear: 6.05, cloudLoss: 8.3, temp: 23.2 },
      { m: 'Mar', irr: 6.45, clear: 6.95, cloudLoss: 7.2, temp: 28.4 },
      { m: 'Apr', irr: 7.05, clear: 7.55, cloudLoss: 6.6, temp: 33.2 },
      { m: 'May', irr: 7.35, clear: 7.85, cloudLoss: 6.4, temp: 36.1 },
      { m: 'Jun', irr: 6.15, clear: 7.45, cloudLoss: 17.4, temp: 34.0 },
      { m: 'Jul', irr: 4.65, clear: 7.05, cloudLoss: 34.0, temp: 30.4 },
      { m: 'Aug', irr: 4.55, clear: 6.75, cloudLoss: 32.6, temp: 29.5 },
      { m: 'Sep', irr: 5.75, clear: 6.55, cloudLoss: 12.2, temp: 30.2 },
      { m: 'Oct', irr: 5.85, clear: 6.25, cloudLoss: 6.4, temp: 28.8 },
      { m: 'Nov', irr: 5.05, clear: 5.55, cloudLoss: 9.0, temp: 24.6 },
      { m: 'Dec', irr: 4.55, clear: 5.05, cloudLoss: 9.9, temp: 21.1 }
    ]
  }
];

const HISTORICAL_RUNS = [
  {
    id: 'run-3',
    runNumber: 3,
    label: 'Run #3 — Latest',
    timestamp: '04 Nov 2026 · 09:42 IST',
    surveyor: 'A. Sharma, P.E.',
    summaryNote:
      '8.0 kW Monocrystalline (20%) + 16 kWh LFP Hybrid with India PM Surya Ghar CFA subsidy',
    config: {
      systemCapacityKw: 8.0,
      installationType: 'Rooftop',
      panelTechnology: 'Mono 20%',
      panelTechnologyFull: 'Monocrystalline (20% eff)',
      gridConnection: 'Hybrid + 16 kWh LFP',
      batteryCapacityKwh: 16.0,
      region: 'India (Rajasthan)',
      tariffUsd: 0.08,
      includeIncentives: true,
      incentiveSummary: 'India PM Surya Ghar CFA',
      performanceRatio: 0.78,
      modelLabel: 'Gradient-Boosted Climate Ensemble'
    },
    result: {
      predictionIrradiance: 5.74,
      errorEstimate: 0.22,
      r2Accuracy: 95.0,
      rmse: 0.11,
      oodWarning: false,
      tempC: 28.4,
      humidityPct: 34,
      windSpeedMs: 3.8,
      clearSkyDaily: 6.48,
      annualEnergyKwh: 14450,
      specificYieldKwhPerKw: 1706,
      capacityFactorPct: 19.5,
      numPanels: 20,
      totalPanelAreaM2: 40,
      totalPanelAreaSqFt: 430,
      optimalTiltDeg: 26.9,
      azimuthDirection: 'Due South',
      daylightHours: 12.1,
      monthlySavingsUsd: 96,
      annualSavingsUsd: 1156,
      simplePaybackYears: 5.3,
      lifetimeRoiPct: 338,
      lcoeUsdPerKwh: 0.039,
      totalSystemCostUsd: 4000,
      incentiveAmountUsd: 934,
      netSystemCostUsd: 3066,
      moduleCostUsd: 1760,
      inverterCostUsd: 520,
      bosCostUsd: 440,
      softCostUsd: 320,
      batteryCostUsd: 960,
      annualMaintenanceUsd: 48,
      batteryReplacementYear: 12,
      selfConsumptionPct: 85,
      monthlyYieldKwh: [980, 1110, 1340, 1420, 1490, 1280, 1020, 990, 1210, 1240, 1180, 1190]
    }
  },
  {
    id: 'run-2',
    runNumber: 2,
    label: 'Run #2 — Mid-Sizing',
    timestamp: '02 Nov 2026 · 16:15 IST',
    surveyor: 'A. Sharma, P.E.',
    summaryNote: '6.5 kW Monocrystalline (20%) Grid-Tied evaluation without LFP battery bank',
    config: {
      systemCapacityKw: 6.5,
      installationType: 'Rooftop',
      panelTechnology: 'Mono 20%',
      panelTechnologyFull: 'Monocrystalline (20% eff)',
      gridConnection: 'Grid-Tied',
      batteryCapacityKwh: 0,
      region: 'India (Rajasthan)',
      tariffUsd: 0.08,
      includeIncentives: true,
      incentiveSummary: 'India PM Surya Ghar CFA',
      performanceRatio: 0.78,
      modelLabel: 'Gradient-Boosted Climate Ensemble'
    },
    result: {
      predictionIrradiance: 5.74,
      errorEstimate: 0.22,
      r2Accuracy: 95.0,
      rmse: 0.11,
      oodWarning: false,
      tempC: 28.4,
      humidityPct: 34,
      windSpeedMs: 3.8,
      clearSkyDaily: 6.48,
      annualEnergyKwh: 11089,
      specificYieldKwhPerKw: 1706,
      capacityFactorPct: 19.5,
      numPanels: 17,
      totalPanelAreaM2: 34,
      totalPanelAreaSqFt: 366,
      optimalTiltDeg: 26.9,
      azimuthDirection: 'Due South',
      daylightHours: 12.1,
      monthlySavingsUsd: 74,
      annualSavingsUsd: 887,
      simplePaybackYears: 4.4,
      lifetimeRoiPct: 374,
      lcoeUsdPerKwh: 0.034,
      totalSystemCostUsd: 2950,
      incentiveAmountUsd: 934,
      netSystemCostUsd: 2016,
      moduleCostUsd: 1510,
      inverterCostUsd: 460,
      bosCostUsd: 590,
      softCostUsd: 390,
      batteryCostUsd: 0,
      annualMaintenanceUsd: 38,
      batteryReplacementYear: null,
      selfConsumptionPct: 62,
      monthlyYieldKwh: [752, 851, 1028, 1090, 1143, 982, 783, 760, 928, 951, 905, 916]
    }
  },
  {
    id: 'run-1',
    runNumber: 1,
    label: 'Run #1 — Initial Baseline',
    timestamp: '29 Oct 2026 · 11:20 IST',
    surveyor: 'R. Verma, Site Engineer',
    summaryNote:
      '5.0 kW Polycrystalline (17%) Grid-Tied baseline prior to CFA subsidy & storage modeling',
    config: {
      systemCapacityKw: 5.0,
      installationType: 'Rooftop',
      panelTechnology: 'Poly 17%',
      panelTechnologyFull: 'Polocrystalline (17% eff)',
      gridConnection: 'Grid-Tied',
      batteryCapacityKwh: 0,
      region: 'India (Rajasthan)',
      tariffUsd: 0.074,
      includeIncentives: false,
      incentiveSummary: 'No subsidy applied',
      performanceRatio: 0.75,
      modelLabel: 'Linear Clear-Sky Baseline'
    },
    result: {
      predictionIrradiance: 5.74,
      errorEstimate: 0.26,
      r2Accuracy: 92.4,
      rmse: 0.15,
      oodWarning: false,
      tempC: 28.4,
      humidityPct: 34,
      windSpeedMs: 3.8,
      clearSkyDaily: 6.48,
      annualEnergyKwh: 8830,
      specificYieldKwhPerKw: 1766,
      capacityFactorPct: 18.8,
      numPanels: 15,
      totalPanelAreaM2: 34,
      totalPanelAreaSqFt: 366,
      optimalTiltDeg: 25.0,
      azimuthDirection: 'South-East (165°)',
      daylightHours: 12.1,
      monthlySavingsUsd: 54,
      annualSavingsUsd: 649,
      simplePaybackYears: 6.7,
      lifetimeRoiPct: 215,
      lcoeUsdPerKwh: 0.048,
      totalSystemCostUsd: 3476,
      incentiveAmountUsd: 0,
      netSystemCostUsd: 3476,
      moduleCostUsd: 1850,
      inverterCostUsd: 540,
      bosCostUsd: 646,
      softCostUsd: 440,
      batteryCostUsd: 0,
      annualMaintenanceUsd: 35,
      batteryReplacementYear: null,
      selfConsumptionPct: 58,
      monthlyYieldKwh: [598, 678, 818, 867, 910, 782, 623, 605, 739, 757, 721, 732]
    }
  }
];

const CITED_GUIDES = [
  {
    id: 'cit-1',
    code: 'NASA-POWER-38Y',
    title: 'NASA Prediction Of Worldwide Energy Resources (POWER) Release 9',
    section: '38-Year Satellite Surface Solar Irradiance & Cloud Transmittance Archive',
    year: '2026'
  },
  {
    id: 'cit-2',
    code: 'NREL-PVW-V8',
    title: 'NREL PVWatts Version 8 Perez Tilted-Plane & Thermal Derating Reference',
    section: 'Section 4.2: Cell Temperature Coefficient (-0.38%/°C) & Incidence Angle Modifier',
    year: '2025'
  },
  {
    id: 'cit-3',
    code: 'MNRE-PMSG-CFA',
    title: 'Ministry of New & Renewable Energy — PM Surya Ghar Central Financial Assistance',
    section: 'Schedule B: ₹78,000 ($934) Capex Subsidy & 40% C&I Accelerated Depreciation',
    year: '2025'
  },
  {
    id: 'cit-4',
    code: 'IEC-61724-1',
    title: 'IEC 61724-1 Photovoltaic System Performance & LFP Cycle Life Standard',
    section: 'Annex C: Performance Ratio (PR) & Year-12 LFP Replacement Reserve',
    year: '2024'
  }
];

// ============================================================================
// 4. DETERMINISTIC PHYSICS, GEOMETRY & 25-YEAR CASHFLOW ENGINE
// ============================================================================

function computeHeliodonAndFinancials({
  site,
  setupMode,
  planningScale,
  goal,
  monthlyBillUsd,
  availableRoofAreaM2,
  tiltDeg,
  systemCapacityKw,
  installationType,
  panelTechnology,
  gridConnection,
  batteryCapacityKwh,
  region,
  tariffUsd,
  includeIncentives,
  performanceRatio
}) {
  const effTariff = tariffUsd || 0.08;
  const monthlyKwhConsumption = Math.round(monthlyBillUsd / effTariff);

  const optTilt = site?.optimalTiltDeg || 26.9;
  const tiltDiff = Math.abs((tiltDeg ?? optTilt) - optTilt);
  const tiltFactor = Math.max(0.84, Number((1 - Math.pow(tiltDiff / 68, 1.65)).toFixed(3)));

  const dailyIrr = site?.irradianceDaily || 5.74;
  const pr = performanceRatio || 0.78;
  const specificYieldPerKw = Math.round(dailyIrr * 365 * pr * 0.8138 * tiltFactor);

  const goalFactor =
    goal === 'max_offset' ? 1.12 : goal === 'backup_resilience' ? 1.22 : 0.96;

  const rawRecommendedKw =
    ((monthlyKwhConsumption * 12) / Math.max(800, specificYieldPerKw)) * goalFactor;
  const recommendedCapacityKw = Math.max(1.0, Math.round(rawRecommendedKw * 2) / 2);

  const activeKw =
    setupMode === 'guided' ? recommendedCapacityKw : Number(systemCapacityKw) || 8.0;

  const panelWattageKw =
    panelTechnology === 'monocrystalline'
      ? 0.4
      : panelTechnology === 'polycrystalline'
      ? 0.34
      : 0.26;
  const panelEffPct =
    panelTechnology === 'monocrystalline'
      ? 20
      : panelTechnology === 'polycrystalline'
      ? 17
      : 11;

  const estimatedPanels = Math.ceil(activeKw / panelWattageKw);
  const requiredRoofAreaM2 = Math.round(estimatedPanels * 2.0);
  const roofAreaConstrained =
    installationType === 'rooftop' && requiredRoofAreaM2 > availableRoofAreaM2;
  const maxPanelsFitOnRoof = Math.floor(availableRoofAreaM2 / 2.0);

  const effectiveBatteryKwh =
    gridConnection === 'grid-tied'
      ? 0
      : Number(batteryCapacityKwh) > 0
      ? Number(batteryCapacityKwh)
      : gridConnection === 'hybrid'
      ? Math.round(activeKw * 2.0)
      : Math.round(activeKw * 3.5);

  const annualEnergyKwh = Math.round(activeKw * specificYieldPerKw);
  const capacityFactorPct = Number(
    ((annualEnergyKwh / (activeKw * 8760)) * 100).toFixed(1)
  );

  const solarCostPerKw =
    region === 'india'
      ? 380
      : region === 'usa'
      ? 1950
      : region === 'europe'
      ? 1580
      : 1150;
  const batteryCostPerKwh =
    region === 'india' ? 60 : region === 'usa' ? 290 : 230;

  const solarCapexUsd = Math.round(activeKw * solarCostPerKw);
  const batteryCostUsd = Math.round(effectiveBatteryKwh * batteryCostPerKwh);
  const totalSystemCostUsd = solarCapexUsd + batteryCostUsd;

  let incentiveAmountUsd = 0;
  let incentiveSummary = 'No subsidy applied';
  if (includeIncentives) {
    if (region === 'india') {
      incentiveAmountUsd =
        activeKw <= 15 ? 934 : Math.round(totalSystemCostUsd * 0.26);
      incentiveSummary =
        activeKw <= 15
          ? 'India PM Surya Ghar CFA (₹78,000)'
          : 'India C&I 40% Accelerated Depreciation';
    } else if (region === 'usa') {
      incentiveAmountUsd = Math.round(totalSystemCostUsd * 0.3);
      incentiveSummary = 'US 30% Federal Clean Energy Credit';
    } else if (region === 'europe') {
      incentiveAmountUsd = Math.round(totalSystemCostUsd * 0.22);
      incentiveSummary = 'EU 0% VAT & Municipal Solar Grant';
    } else {
      incentiveAmountUsd = Math.round(totalSystemCostUsd * 0.15);
      incentiveSummary = 'Regional Clean Infrastructure Rebate (15%)';
    }
  }

  const netSystemCostUsd = Math.max(450, totalSystemCostUsd - incentiveAmountUsd);
  const annualSavingsUsd = Math.round(annualEnergyKwh * effTariff);
  const monthlySavingsUsd = Math.round(annualSavingsUsd / 12);
  const simplePaybackYears = Number(
    (netSystemCostUsd / Math.max(1, annualSavingsUsd)).toFixed(1)
  );

  const yearlyBreakdown = [];
  let cumulative = -netSystemCostUsd;
  let lifetimeKwh = 0;
  for (let yr = 1; yr <= 25; yr++) {
    const deg = Math.pow(0.995, yr - 1);
    const esc = Math.pow(1.022, yr - 1);
    const yrKwh = Math.round(annualEnergyKwh * deg);
    lifetimeKwh += yrKwh;
    const replCost =
      effectiveBatteryKwh > 0 && yr === 12 ? Math.round(batteryCostUsd * 0.62) : 0;
    const yrSav = Math.round(yrKwh * effTariff * esc) - replCost;
    cumulative += yrSav;
    yearlyBreakdown.push({
      year: yr,
      outputKwh: yrKwh,
      savingsUsd: yrSav,
      cumulativeSavingsUsd: cumulative
    });
  }

  const lifetimeRoiPct = Math.round(
    ((cumulative + netSystemCostUsd) / netSystemCostUsd) * 100
  );
  const lcoeUsdPerKwh = Number(
    ((netSystemCostUsd + activeKw * 6 * 25) / Math.max(1, lifetimeKwh)).toFixed(3)
  );

  return {
    activeKw,
    recommendedCapacityKw,
    monthlyKwhConsumption,
    estimatedPanels,
    requiredRoofAreaM2,
    roofAreaConstrained,
    maxPanelsFitOnRoof,
    effectiveBatteryKwh,
    annualEnergyKwh,
    specificYieldPerKw,
    capacityFactorPct,
    tiltFactorPct: Math.round(tiltFactor * 100),
    totalSystemCostUsd,
    incentiveAmountUsd,
    incentiveSummary,
    netSystemCostUsd,
    batteryCostUsd,
    moduleCostUsd: Math.round(solarCapexUsd * 0.58),
    inverterCostUsd: Math.round(solarCapexUsd * 0.17),
    bosCostUsd: Math.round(solarCapexUsd * 0.14),
    softCostUsd: Math.round(solarCapexUsd * 0.11),
    annualMaintenanceUsd: Math.round(activeKw * 6),
    annualSavingsUsd,
    monthlySavingsUsd,
    simplePaybackYears,
    lifetimeRoiPct,
    lcoeUsdPerKwh,
    yearlyBreakdown,
    panelEffPct,
    selfConsumptionPct:
      gridConnection === 'off-grid' ? 98 : gridConnection === 'hybrid' ? 85 : 58
  };
}

// ============================================================================
// 5. LOCKED WARM ALABASTER PALETTE (DARK MODE REMOVED COMPLETELY)
// ============================================================================

const PALETTE = {
  canvas: 'bg-[#FAF8F5] text-[#18181B]',
  plane: 'bg-[#FEFDFB] text-[#18181B]',
  well: 'bg-[#F3F1EC] text-[#18181B]',
  rule: 'border-[#E6E3DC]',
  divide: 'divide-[#E6E3DC]',
  ink: 'text-[#18181B]',
  subInk: 'text-[#71717A]',
  hoverPlane: 'hover:bg-[#F3F1EC]',
  chartRule: '#E6E3DC',
  chartInk: '#71717A'
};

// ============================================================================
// 6. MAIN APPLICATION — PRODUCTION BETA STAGE
// ============================================================================

export default function App() {
  // 'simple' | 'detailed' — actively transforms Overview, Solar Planner, Site Analysis, and Portfolio
  const [readingDepth, setReadingDepth] = useState('simple');

  // 'landing' (Overview) | 'dashboard' (Solar Planner) | 'location_detail' (Site Analysis) | 'portfolio' (Portfolio) | 'profile' (Profile & Preferences)
  const [activeSurface, setActiveSurface] = useState('landing');

  // Global Measurement & Telemetry Units (Configurable in Profile & Preferences and synced everywhere)
  const [areaUnit, setAreaUnit] = useState('m2'); // 'm2' | 'sqft'
  const [tempUnit, setTempUnit] = useState('C'); // 'C' | 'F'
  const [windUnit, setWindUnit] = useState('ms'); // 'ms' | 'kmh' | 'mph'

  // Account & Organization Profile State
  const [userProfile, setUserProfile] = useState({
    fullName: 'Aarav Sharma, P.E.',
    initials: 'AS',
    roleTitle: 'Lead Solar Infrastructure Planner',
    organization: 'Zenith Solar Advisory Group',
    email: 'a.sharma@zenithsolar.io'
  });

  // Feed & Notification Preferences
  const [showRssFeed, setShowRssFeed] = useState(true);
  const [showOodWarnings, setShowOodWarnings] = useState(true);

  // Saved Default Baseline Preferences (Can be applied to active planner at any time)
  const [defaultPrefs, setDefaultPrefs] = useState({
    defaultScale: 'homeowner',
    defaultRegion: 'india',
    defaultTariffUsd: 0.08,
    defaultPerformanceRatio: 0.78,
    defaultModel: 'hist_gradient_boosting',
    autoApplySubsidies: true
  });

  // Active Site & Interactive Heliodon State
  const [selectedSiteId, setSelectedSiteId] = useState('site-jaipur');
  const activeSite = useMemo(
    () => REFERENCE_SITES.find((s) => s.id === selectedSiteId) || REFERENCE_SITES[0],
    [selectedSiteId]
  );

  const [pinCoords, setPinCoords] = useState({ lat: 26.9124, lon: 75.7873 });
  const [searchQuery, setSearchQuery] = useState('Jaipur, Rajasthan');
  const [tiltDeg, setTiltDeg] = useState(26.9);
  const [solarHour, setSolarHour] = useState(13.0);

  // Setup Mode & Sizing Inputs
  const [setupMode, setSetupMode] = useState('guided'); // 'guided' | 'engineering'
  const [planningScale, setPlanningScale] = useState('homeowner');
  const [goal, setGoal] = useState('lowest_payback');
  const [billInputType, setBillInputType] = useState('usd');
  const [monthlyBillUsd, setMonthlyBillUsd] = useState(115);
  const [availableRoofAreaM2, setAvailableRoofAreaM2] = useState(52);

  // Ad-Hoc Engineering Setup Fields
  const [systemCapacityKw, setSystemCapacityKw] = useState(8.0);
  const [installationType, setInstallationType] = useState('rooftop');
  const [panelTechnology, setPanelTechnology] = useState('monocrystalline');
  const [gridConnection, setGridConnection] = useState('hybrid');
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState(16);
  const [region, setRegion] = useState('india');
  const [tariffUsd, setTariffUsd] = useState(0.08);
  const [includeIncentives, setIncludeIncentives] = useState(true);
  const [performanceRatio, setPerformanceRatio] = useState(0.78);
  const [estimationModel, setEstimationModel] = useState('hist_gradient_boosting');

  const [workspaceStep, setWorkspaceStep] = useState(2);
  const [resultsTab, setResultsTab] = useState('sunlight');
  const [isSimulating, setIsSimulating] = useState(false);

  // Site Analysis State
  const [compareMode, setCompareMode] = useState(true);
  const [singleRunId, setSingleRunId] = useState('run-3');
  const [baseRunId, setBaseRunId] = useState('run-3');
  const [compareRunId, setCompareRunId] = useState('run-1');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [siteTitle, setSiteTitle] = useState('Jaipur Sector-7 Commercial Rooftop');

  // Portfolio Sub-View: 'cards' | 'ledger' | 'benchmark'
  const [portfolioView, setPortfolioView] = useState('ledger');

  // RSS Feed State
  const [rssItems, setRssItems] = useState(FALLBACK_SOLAR_HEADLINES);

  useEffect(() => {
    let isMounted = true;
    fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_FEED_URL)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted || !data?.contents) return;
        const parser = new DOMParser();
        const xml = parser.parseFromString(data.contents, 'text/xml');
        const nodes = Array.from(xml.querySelectorAll('item')).slice(0, 6);
        if (nodes.length > 0) {
          const parsed = nodes.map((node, i) => {
            const title =
              node.querySelector('title')?.textContent ||
              FALLBACK_SOLAR_HEADLINES[i % FALLBACK_SOLAR_HEADLINES.length].title;
            const link =
              node.querySelector('link')?.textContent ||
              'https://renewablesnow.com/news/';
            const rawDate = node.querySelector('pubDate')?.textContent;
            const pubDate = rawDate
              ? new Date(rawDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Nov 3, 2026';
            const enclosure = node.querySelector('enclosure')?.getAttribute('url');
            return {
              title,
              link,
              pubDate,
              source: 'Renewables Now',
              image:
                enclosure ||
                FALLBACK_SOLAR_HEADLINES[i % FALLBACK_SOLAR_HEADLINES.length].image
            };
          });
          setRssItems(parsed);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronize Simple vs. Engineer Mode with Planner Setup Mode immediately
  const handleToggleReadingDepth = (mode) => {
    setReadingDepth(mode);
    if (mode === 'detailed') {
      setSetupMode('engineering');
    } else {
      setSetupMode('guided');
    }
  };

  // Global Unit Formatting Helpers (Driven by Profile & Preferences)
  const formatArea = (m2Val, includeBoth = false) => {
    const m2 = Math.round(Number(m2Val) || 0);
    const sqft = Math.round(m2 * 10.764);
    if (includeBoth) {
      return areaUnit === 'm2'
        ? `${m2.toLocaleString()} m² (${sqft.toLocaleString()} sq ft)`
        : `${sqft.toLocaleString()} sq ft (${m2.toLocaleString()} m²)`;
    }
    return areaUnit === 'm2'
      ? `${m2.toLocaleString()} m²`
      : `${sqft.toLocaleString()} sq ft`;
  };

  const formatTemp = (celsiusVal) => {
    const c = Number(celsiusVal) || 0;
    if (tempUnit === 'F') {
      const f = (c * 9) / 5 + 32;
      return `${f.toFixed(1)}°F`;
    }
    return `${c.toFixed(1)}°C`;
  };

  const formatWind = (msVal) => {
    const ms = Number(msVal) || 0;
    if (windUnit === 'kmh') {
      return `${(ms * 3.6).toFixed(1)} km/h`;
    }
    if (windUnit === 'mph') {
      return `${(ms * 2.23694).toFixed(1)} mph`;
    }
    return `${ms.toFixed(1)} m/s`;
  };

  // Ask Engineering Assistant Slide-Over Drawer State
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [expandedCalcId, setExpandedCalcId] = useState('calc-1');
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState([
    {
      id: 'msg-init',
      role: 'assistant',
      text: 'Upgrading from the 5.0 kW polycrystalline baseline (Run #1) to an 8.0 kW monocrystalline hybrid array with 16 kWh LFP storage (Run #3) increases annual output by +5,620 kWh (+63.6%) and reduces simple payback by -1.4 years once the ₹78,000 ($934) PM Surya Ghar subsidy is deducted.',
      verifiedCalc: {
        id: 'calc-1',
        badge: 'Verified Calculation · Tilted-Plane Yield & CFA Subsidy Delta',
        formula:
          'Net_Capex = $4,000 Gross - $934 CFA = $3,066 | Annual_Savings = 14,450 kWh × $0.08/kWh = $1,156/yr',
        result:
          'Simple Payback = 5.3 yrs [-1.4 yrs vs Run #1] · LCOE = $0.039/kWh',
        citation: 'MNRE-PMSG-CFA'
      }
    }
  ]);

  const [hoveredMonthIdx, setHoveredMonthIdx] = useState(4);

  const handleSelectSite = (site, targetSurface = null) => {
    setSelectedSiteId(site.id);
    setPinCoords({ lat: site.lat, lon: site.lon });
    setSearchQuery(site.locationLabel);
    setTiltDeg(site.optimalTiltDeg);
    setPlanningScale(site.scale);
    setGoal(site.goal);
    setMonthlyBillUsd(site.monthlyBillUsd);
    setAvailableRoofAreaM2(site.roofAreaM2);
    setSystemCapacityKw(site.systemCapacityKw);
    setInstallationType(site.installationType);
    setPanelTechnology(site.panelTechnology);
    setGridConnection(site.gridConnection);
    setBatteryCapacityKwh(site.batteryCapacityKwh);
    setRegion(site.region);
    setTariffUsd(site.tariffUsd);
    setIncludeIncentives(site.includeIncentives);
    setPerformanceRatio(site.performanceRatio);
    setEstimationModel(site.model);
    if (targetSurface) {
      setActiveSurface(targetSurface);
    }
  };

  const handleExecuteSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setWorkspaceStep(3);
    }, 450);
  };

  const handleApplyDefaultsToPlanner = () => {
    setPlanningScale(defaultPrefs.defaultScale);
    setRegion(defaultPrefs.defaultRegion);
    setTariffUsd(defaultPrefs.defaultTariffUsd);
    setPerformanceRatio(defaultPrefs.defaultPerformanceRatio);
    setEstimationModel(defaultPrefs.defaultModel);
    setIncludeIncentives(defaultPrefs.autoApplySubsidies);
  };

  const liveCalc = useMemo(
    () =>
      computeHeliodonAndFinancials({
        site: activeSite,
        setupMode,
        planningScale,
        goal,
        monthlyBillUsd,
        availableRoofAreaM2,
        tiltDeg,
        systemCapacityKw,
        installationType,
        panelTechnology,
        gridConnection,
        batteryCapacityKwh,
        region,
        tariffUsd,
        includeIncentives,
        performanceRatio
      }),
    [
      activeSite,
      setupMode,
      planningScale,
      goal,
      monthlyBillUsd,
      availableRoofAreaM2,
      tiltDeg,
      systemCapacityKw,
      installationType,
      panelTechnology,
      gridConnection,
      batteryCapacityKwh,
      region,
      tariffUsd,
      includeIncentives,
      performanceRatio
    ]
  );

  const handleExportCsv = () => {
    const headers = [
      `Site Code,Site Name,Planner,Region,Latitude,Longitude,System Capacity (kW),Grid Mode,Daily Sunlight (kWh/m2/day),Specific Yield (kWh/kWp),Monthly Savings ($/mo),Net Cost ($),Simple Payback (yrs)`
    ];
    const rows = REFERENCE_SITES.map((s) => {
      const c = computeHeliodonAndFinancials({
        site: s,
        setupMode: 'engineering',
        planningScale: s.scale,
        goal: s.goal,
        monthlyBillUsd: s.monthlyBillUsd,
        availableRoofAreaM2: s.roofAreaM2,
        tiltDeg: s.optimalTiltDeg,
        systemCapacityKw: s.systemCapacityKw,
        installationType: s.installationType,
        panelTechnology: s.panelTechnology,
        gridConnection: s.gridConnection,
        batteryCapacityKwh: s.batteryCapacityKwh,
        region: s.region,
        tariffUsd: s.tariffUsd,
        includeIncentives: s.includeIncentives,
        performanceRatio: s.performanceRatio
      });
      return `${s.code},"${s.name}","${userProfile.fullName}",${s.region.toUpperCase()},${s.lat},${s.lon},${s.systemCapacityKw},${s.gridConnection},${s.irradianceDaily},${c.specificYieldPerKw},${c.monthlySavingsUsd},${c.netSystemCostUsd},${c.simplePaybackYears}`;
    });
    const blob = new Blob([[headers, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zenith_solar_portfolio.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAskSubmit = (e) => {
    e.preventDefault();
    if (!assistantInput.trim()) return;
    const q = assistantInput.trim();
    setAssistantInput('');
    const calcId = 'calc-' + Date.now();
    setAssistantMessages((prev) => [
      ...prev,
      { id: 'u-' + Date.now(), role: 'user', text: q },
      {
        id: 'a-' + Date.now(),
        role: 'assistant',
        text: `For ${activeSite.name} (${pinCoords.lat.toFixed(4)}° N, ${pinCoords.lon.toFixed(4)}° E) at a ${tiltDeg.toFixed(1)}° array tilt, your ${liveCalc.activeKw} kW ${panelTechnology} configuration generates ${liveCalc.annualEnergyKwh.toLocaleString()} kWh/yr (${liveCalc.specificYieldPerKw} kWh/kWp). After deducting ${liveCalc.incentiveSummary} (-$${liveCalc.incentiveAmountUsd.toLocaleString()}), net capital cost is $${liveCalc.netSystemCostUsd.toLocaleString()} with a ${liveCalc.simplePaybackYears}-year payback crossover.`,
        verifiedCalc: {
          id: calcId,
          badge: 'Verified Calculation · Tilted-Plane Transposition & 25-Yr LCOE',
          formula: `${liveCalc.activeKw} kW × ${liveCalc.specificYieldPerKw} kWh/kWp = ${liveCalc.annualEnergyKwh.toLocaleString()} kWh/yr | Net Cost $${liveCalc.netSystemCostUsd.toLocaleString()}`,
          result: `Monthly Savings: ~$${liveCalc.monthlySavingsUsd}/mo ($${liveCalc.annualSavingsUsd.toLocaleString()}/yr) · LCOE: $${liveCalc.lcoeUsdPerKwh}/kWh`,
          citation: 'NREL-PVW-V8'
        }
      }
    ]);
    setExpandedCalcId(calcId);
  };

  const unitSummaryBadge = `${areaUnit === 'm2' ? 'm²' : 'sq ft'} · °${tempUnit}`;

  return (
    <div
      className={`min-h-screen ${PALETTE.canvas} selection:bg-[#F59E0B] selection:text-[#18181B]`}
      style={{
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      {/* Editorial & Technical Tabular Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap');
        .font-editorial { font-family: 'Newsreader', Georgia, serif; }
        .font-mono-tech { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        input[type="range"].zenith-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          background: rgba(245, 158, 11, 0.25);
          border-radius: 2px;
          outline: none;
        }
        input[type="range"].zenith-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 20px;
          background: #F59E0B;
          border: 2px solid #18181B;
          border-radius: 2px;
          cursor: ew-resize;
        }
      `}</style>

      {/* =====================================================================
          TOP APPLICATION HEADER (LOCKED WARM ALABASTER + PROFILE CHIP)
         ===================================================================== */}
      <header className={`sticky top-0 z-40 ${PALETTE.plane} border-b ${PALETTE.rule}`}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between min-h-[60px] py-2 gap-3">
            {/* Brand Identity */}
            <button
              onClick={() => setActiveSurface('landing')}
              className="flex items-center gap-3 text-left focus:outline-none group"
            >
              <div className="w-8 h-8 bg-[#18181B] border border-[#18181B] flex items-center justify-center text-[#F59E0B]">
                <Compass className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-editorial text-xl font-semibold tracking-tight">
                  Zenith
                </span>
                <span className={`text-xs ${PALETTE.subInk} hidden sm:inline`}>
                  Solar Intelligence
                </span>
              </div>
            </button>

            {/* Primary Navigation */}
            <nav className="flex items-center overflow-x-auto">
              <div className={`inline-flex border ${PALETTE.rule} ${PALETTE.well} p-0.5`}>
                {[
                  { id: 'landing', label: 'Overview' },
                  { id: 'dashboard', label: 'Solar Planner' },
                  { id: 'location_detail', label: 'Site Analysis' },
                  { id: 'portfolio', label: 'Portfolio' },
                  { id: 'profile', label: 'Preferences' }
                ].map((item) => {
                  const isActive = activeSurface === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSurface(item.id)}
                      className={`px-3.5 py-1.5 text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                        isActive
                          ? 'bg-[#F59E0B] text-[#18181B] font-semibold'
                          : `${PALETTE.subInk} hover:text-[#18181B]`
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Right Controls: Simple / Engineer Toggle + Profile & Units Chip + Solar Guide */}
            <div className="flex items-center gap-2">
              {/* Simple vs. Engineer Mode Toggle */}
              <div
                className={`inline-flex border ${PALETTE.rule} ${PALETTE.well} p-0.5 text-xs`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleReadingDepth('simple')}
                  className={`px-2.5 py-1 transition-colors flex items-center gap-1 ${
                    readingDepth === 'simple'
                      ? 'bg-[#18181B] text-[#FAF8F5] font-medium'
                      : PALETTE.subInk
                  }`}
                >
                  <span>Simple</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleReadingDepth('detailed')}
                  className={`px-2.5 py-1 transition-colors flex items-center gap-1 ${
                    readingDepth === 'detailed'
                      ? 'bg-[#18181B] text-[#FAF8F5] font-medium'
                      : PALETTE.subInk
                  }`}
                >
                  <Sliders className="w-3 h-3 text-[#F59E0B]" />
                  <span>Engineer</span>
                </button>
              </div>

              {/* User Profile & Units Button (Replaces Dark Mode Toggle) */}
              <button
                type="button"
                onClick={() => setActiveSurface('profile')}
                className={`px-2.5 py-1 border transition-colors flex items-center gap-2 text-xs ${
                  activeSurface === 'profile'
                    ? 'bg-[#18181B] text-[#FAF8F5] border-[#18181B]'
                    : `${PALETTE.well} ${PALETTE.rule} hover:border-[#F59E0B]`
                }`}
                title="Open Profile, Measurement Units & Planner Defaults"
              >
                <span className="w-5 h-5 rounded-xs bg-[#F59E0B] text-[#18181B] font-mono-tech font-bold text-[10px] flex items-center justify-center">
                  {userProfile.initials}
                </span>
                <span className="hidden md:inline font-medium">
                  {userProfile.fullName.split(',')[0]}
                </span>
                <span
                  className={`font-mono-tech text-[10px] px-1.5 py-0.5 ${
                    activeSurface === 'profile'
                      ? 'bg-white/15 text-[#F59E0B]'
                      : 'bg-[#FEFDFB] text-[#71717A] border border-[#E6E3DC]'
                  }`}
                >
                  {unitSummaryBadge}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAssistantOpen(true)}
                className="px-3 py-1.5 text-xs font-medium bg-[#F59E0B] text-[#18181B] hover:bg-[#f59e0b]/90 flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Solar Guide</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN VIEWPORT ROUTER
         ===================================================================== */}
      <main className={`max-w-[1440px] mx-auto border-x ${PALETTE.rule}`}>
        {activeSurface === 'landing' && (
          <SurfaceHeroLanding
            palette={PALETTE}
            readingDepth={readingDepth}
            activeSite={activeSite}
            monthlyBillUsd={monthlyBillUsd}
            setMonthlyBillUsd={setMonthlyBillUsd}
            availableRoofAreaM2={availableRoofAreaM2}
            setAvailableRoofAreaM2={setAvailableRoofAreaM2}
            areaUnit={areaUnit}
            formatArea={formatArea}
            formatTemp={formatTemp}
            solarHour={solarHour}
            setSolarHour={setSolarHour}
            liveCalc={liveCalc}
            rssItems={rssItems}
            showRssFeed={showRssFeed}
            onSelectReferenceSite={(site) => handleSelectSite(site, 'dashboard')}
            onStartGuidedPlan={() => {
              setWorkspaceStep(2);
              setActiveSurface('dashboard');
            }}
            onInspectSavedSiteDiff={() => setActiveSurface('location_detail')}
          />
        )}

        {activeSurface === 'dashboard' && (
          <SurfaceCalmWorkspace
            palette={PALETTE}
            readingDepth={readingDepth}
            onToggleReadingDepth={handleToggleReadingDepth}
            workspaceStep={workspaceStep}
            setWorkspaceStep={setWorkspaceStep}
            resultsTab={resultsTab}
            setResultsTab={setResultsTab}
            activeSite={activeSite}
            onSelectSite={(s) => handleSelectSite(s, null)}
            pinCoords={pinCoords}
            setPinCoords={setPinCoords}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            tiltDeg={tiltDeg}
            setTiltDeg={setTiltDeg}
            setupMode={setupMode}
            setSetupMode={setSetupMode}
            planningScale={planningScale}
            setPlanningScale={setPlanningScale}
            goal={goal}
            setGoal={setGoal}
            billInputType={billInputType}
            setBillInputType={setBillInputType}
            monthlyBillUsd={monthlyBillUsd}
            setMonthlyBillUsd={setMonthlyBillUsd}
            availableRoofAreaM2={availableRoofAreaM2}
            setAvailableRoofAreaM2={setAvailableRoofAreaM2}
            areaUnit={areaUnit}
            setAreaUnit={setAreaUnit}
            formatArea={formatArea}
            formatTemp={formatTemp}
            formatWind={formatWind}
            systemCapacityKw={systemCapacityKw}
            setSystemCapacityKw={setSystemCapacityKw}
            installationType={installationType}
            setInstallationType={setInstallationType}
            panelTechnology={panelTechnology}
            setPanelTechnology={setPanelTechnology}
            gridConnection={gridConnection}
            setGridConnection={setGridConnection}
            batteryCapacityKwh={batteryCapacityKwh}
            setBatteryCapacityKwh={setBatteryCapacityKwh}
            region={region}
            setRegion={setRegion}
            tariffUsd={tariffUsd}
            setTariffUsd={setTariffUsd}
            includeIncentives={includeIncentives}
            setIncludeIncentives={setIncludeIncentives}
            performanceRatio={performanceRatio}
            setPerformanceRatio={setPerformanceRatio}
            estimationModel={estimationModel}
            setEstimationModel={setEstimationModel}
            liveCalc={liveCalc}
            isSimulating={isSimulating}
            onExecuteSimulation={handleExecuteSimulation}
            hoveredMonthIdx={hoveredMonthIdx}
            setHoveredMonthIdx={setHoveredMonthIdx}
            onOpenSavedSiteDiff={() => setActiveSurface('location_detail')}
            onOpenAssistant={() => setAssistantOpen(true)}
          />
        )}

        {activeSurface === 'location_detail' && (
          <SurfaceLocationDetail
            palette={PALETTE}
            readingDepth={readingDepth}
            siteTitle={siteTitle}
            setSiteTitle={setSiteTitle}
            userProfile={userProfile}
            formatArea={formatArea}
            formatTemp={formatTemp}
            formatWind={formatWind}
            compareMode={compareMode}
            setCompareMode={setCompareMode}
            singleRunId={singleRunId}
            setSingleRunId={setSingleRunId}
            baseRunId={baseRunId}
            setBaseRunId={setBaseRunId}
            compareRunId={compareRunId}
            setCompareRunId={setCompareRunId}
            editDrawerOpen={editDrawerOpen}
            setEditDrawerOpen={setEditDrawerOpen}
            onLaunchNewRunInWorkspace={() => {
              setWorkspaceStep(2);
              setActiveSurface('dashboard');
            }}
          />
        )}

        {activeSurface === 'portfolio' && (
          <SurfacePortfolio
            palette={PALETTE}
            readingDepth={readingDepth}
            formatArea={formatArea}
            portfolioView={portfolioView}
            setPortfolioView={setPortfolioView}
            onSelectSiteForDiff={(site) => handleSelectSite(site, 'location_detail')}
            onReanalyseSite={(site) => {
              handleSelectSite(site, 'dashboard');
              setWorkspaceStep(2);
            }}
            onExportCsv={handleExportCsv}
          />
        )}

        {activeSurface === 'profile' && (
          <SurfaceProfilePreferences
            palette={PALETTE}
            readingDepth={readingDepth}
            onToggleReadingDepth={handleToggleReadingDepth}
            areaUnit={areaUnit}
            setAreaUnit={setAreaUnit}
            tempUnit={tempUnit}
            setTempUnit={setTempUnit}
            windUnit={windUnit}
            setWindUnit={setWindUnit}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            defaultPrefs={defaultPrefs}
            setDefaultPrefs={setDefaultPrefs}
            showRssFeed={showRssFeed}
            setShowRssFeed={setShowRssFeed}
            showOodWarnings={showOodWarnings}
            setShowOodWarnings={setShowOodWarnings}
            onApplyDefaultsToPlanner={handleApplyDefaultsToPlanner}
            onNavigateToPlanner={() => setActiveSurface('dashboard')}
          />
        )}
      </main>

      {/* =====================================================================
          SLIDE-OVER DRAWER: CITED SOLAR GUIDE & ENGINEERING Q&A
         ===================================================================== */}
      {assistantOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#18181B]/60 backdrop-blur-[1px]">
          <div
            className={`w-full max-w-lg h-full ${PALETTE.plane} border-l ${PALETTE.rule} flex flex-col justify-between`}
          >
            <div className="p-5 bg-[#18181B] text-[#FAF8F5] border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="font-editorial text-xl font-medium">
                  Solar Guide &amp; Cited Engineering Q&amp;A
                </h2>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Plain-English answers backed by NASA satellite records &amp; NREL engineering guides.
                </p>
              </div>
              <button
                onClick={() => setAssistantOpen(false)}
                className="p-1.5 border border-white/15 text-[#A1A1AA] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto divide-y ${PALETTE.divide}`}>
              {assistantMessages.map((m) => (
                <div key={m.id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between font-mono-tech text-[11px]">
                    <span className="font-semibold text-[#D97706]">
                      {m.role === 'assistant' ? 'ZENITH SOLAR GUIDE' : 'YOUR QUESTION'}
                    </span>
                    <span className={PALETTE.subInk}>
                      {activeSite.name.split(' ')[0]} · {pinCoords.lat.toFixed(2)}°N
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{m.text}</p>

                  {m.verifiedCalc && (
                    <div className={`border-y ${PALETTE.rule} ${PALETTE.well} py-2.5 px-3`}>
                      <button
                        onClick={() =>
                          setExpandedCalcId(
                            expandedCalcId === m.verifiedCalc.id
                              ? null
                              : m.verifiedCalc.id
                          )
                        }
                        className="w-full flex items-center justify-between text-left font-mono-tech text-xs"
                      >
                        <span className="flex items-center gap-1.5 text-[#16A34A] font-semibold">
                          <ShieldCheck className="w-4 h-4" />
                          {m.verifiedCalc.badge}
                        </span>
                        {expandedCalcId === m.verifiedCalc.id ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {expandedCalcId === m.verifiedCalc.id && (
                        <div
                          className={`mt-2.5 pt-2.5 border-t ${PALETTE.rule} space-y-1.5 font-mono-tech text-xs`}
                        >
                          <div className={PALETTE.subInk}>{m.verifiedCalc.formula}</div>
                          <div className="text-[#16A34A] font-semibold">
                            → {m.verifiedCalc.result}
                          </div>
                          <div className="pt-1">
                            <span className="px-2 py-0.5 bg-[#18181B] text-[#0EA5E9] text-[10px]">
                              Cited Manual: {m.verifiedCalc.citation}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="p-5 space-y-2">
                <div className={`text-xs font-medium ${PALETTE.subInk}`}>
                  Suggested Questions:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Is my roof large enough to cover 100% of my bill?',
                    'How does adding an LFP battery affect payback years?',
                    'How much does monsoon cloud cover reduce July output?'
                  ].map((promptText) => (
                    <button
                      key={promptText}
                      onClick={() => setAssistantInput(promptText)}
                      className={`text-left text-xs px-2.5 py-1.5 border ${PALETTE.rule} ${PALETTE.well} ${PALETTE.hoverPlane}`}
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form
              onSubmit={handleAskSubmit}
              className={`p-4 border-t ${PALETTE.rule} ${PALETTE.well}`}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  placeholder="Ask about your solar plan, roof fit, or savings..."
                  className={`flex-1 px-3 py-2 text-xs ${PALETTE.plane} border ${PALETTE.rule} focus:outline-none focus:border-[#F59E0B]`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#F59E0B] text-[#18181B] text-xs font-semibold"
                >
                  Ask
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SURFACE 1: OVERVIEW HERO PAGE + SOLAR INDUSTRY HEADLINES RSS FEED
// ============================================================================

function SurfaceHeroLanding({
  palette,
  readingDepth,
  activeSite,
  monthlyBillUsd,
  setMonthlyBillUsd,
  availableRoofAreaM2,
  setAvailableRoofAreaM2,
  areaUnit,
  formatArea,
  formatTemp,
  solarHour,
  setSolarHour,
  liveCalc,
  rssItems,
  showRssFeed,
  onSelectReferenceSite,
  onStartGuidedPlan,
  onInspectSavedSiteDiff
}) {
  const newsScrollRef = useRef(null);

  const scrollNews = (dir) => {
    if (!newsScrollRef.current) return;
    newsScrollRef.current.scrollBy({
      left: dir * 360,
      behavior: 'smooth'
    });
  };

  const hourNorm = (solarHour - 6) / 12;
  const sunX = 48 + hourNorm * 284;
  const parabola = 1 - 4 * Math.pow(hourNorm - 0.5, 2);
  const sunY = 122 - parabola * 84;

  return (
    <div>
      {/* 1. EDITORIAL HERO SECTION */}
      <section className={`border-b ${palette.rule} ${palette.plane}`}>
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${palette.divide}`}
        >
          {/* Left 7 Cols: Editorial Value Proposition & Actions */}
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
            <div className="space-y-6 max-w-2xl">
              <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[54px] font-medium tracking-tight leading-[1.08]">
                Know what your roof will generate before you talk to an installer.
              </h1>

              <p className={`text-base sm:text-lg ${palette.subInk} leading-relaxed`}>
                Pin any home, small business, or industrial facility. Zenith combines 38 years of NASA satellite sunlight records with local electricity tariffs and subsidies to calculate your true monthly savings and payback crossover.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={onStartGuidedPlan}
                  className="px-6 py-3.5 bg-[#F59E0B] text-[#18181B] font-semibold text-sm flex items-center gap-2.5 hover:bg-[#f59e0b]/90 transition-colors"
                >
                  <span>Start Your Roof &amp; Bill Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onInspectSavedSiteDiff}
                  className={`px-5 py-3.5 border ${palette.rule} ${palette.well} text-sm font-medium flex items-center gap-2 ${palette.hoverPlane} transition-colors`}
                >
                  <GitCompare className="w-4 h-4 text-[#F59E0B]" />
                  <span>Compare Saved Site Runs</span>
                </button>
              </div>
            </div>

            {/* Bottom Trust Bar with Rich Tooltips */}
            <div
              className={`mt-12 pt-6 border-t ${palette.rule} grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs`}
            >
              <div>
                <div className="font-semibold">
                  <RichTooltip termKey="irradiance">
                    38-Year NASA Sunlight Archive
                  </RichTooltip>
                </div>
                <p className={`${palette.subInk} mt-1`}>
                  Verified daily sunshine &amp; seasonal cloud cover for any coordinate.
                </p>
              </div>

              <div>
                <div className="font-semibold">
                  <RichTooltip termKey="payback">
                    Defensible 25-Year Cashflow
                  </RichTooltip>
                </div>
                <p className={`${palette.subInk} mt-1`}>
                  Models India PM Surya Ghar, US 30% ITC, and European VAT grants.
                </p>
              </div>

              <div>
                <div className="font-semibold">
                  <RichTooltip termKey="lfp_battery">
                    Stacked Runs &amp; Inline Diffs
                  </RichTooltip>
                </div>
                <p className={`${palette.subInk} mt-1`}>
                  Compare Grid-Tied vs. Hybrid LFP battery setups side-by-side.
                </p>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Interactive Daylight & Bill-to-Solar Preview */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="bg-[#18181B] text-[#FAF8F5] p-6 border-b border-white/10">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-medium text-[#F59E0B] flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Daylight Trajectory · {activeSite.name.split(' ')[0]}</span>
                </span>
                <span className="font-mono-tech text-[#A1A1AA]">
                  <RichTooltip termKey="irradiance" showUnderline={false}>
                    <span className="underline decoration-dotted decoration-[#F59E0B]">
                      {activeSite.irradianceDaily} kWh/m²/day
                    </span>
                  </RichTooltip>
                </span>
              </div>

              <svg className="w-full h-32" viewBox="0 0 380 135">
                <line
                  x1="30"
                  y1="122"
                  x2="350"
                  y2="122"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="1"
                />
                <path
                  d="M 40 122 Q 190 14, 340 122"
                  fill="none"
                  stroke="#0EA5E9"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  opacity="0.7"
                />
                <path
                  d="M 48 122 Q 190 36, 332 122"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                />
                <circle cx={sunX} cy={sunY} r="9" fill="rgba(245, 158, 11, 0.22)" />
                <circle
                  cx={sunX}
                  cy={sunY}
                  r="4.5"
                  fill="#F59E0B"
                  stroke="#FAF8F5"
                  strokeWidth="1.5"
                />
                <text
                  x="38"
                  y="114"
                  fill="#A1A1AA"
                  fontSize="9"
                  fontFamily="IBM Plex Mono"
                >
                  EAST 06:00
                </text>
                <text
                  x="292"
                  y="114"
                  fill="#A1A1AA"
                  fontSize="9"
                  fontFamily="IBM Plex Mono"
                >
                  WEST 18:00
                </text>
              </svg>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                <span className="text-[#A1A1AA]">Solar time:</span>
                <input
                  type="range"
                  min={6.5}
                  max={17.5}
                  step={0.25}
                  value={solarHour}
                  onChange={(e) => setSolarHour(Number(e.target.value))}
                  className="w-36 accent-[#F59E0B] cursor-ew-resize"
                />
                <span className="font-mono-tech text-[#F59E0B] font-semibold">
                  {Math.floor(solarHour).toString().padStart(2, '0')}:
                  {Math.round((solarHour % 1) * 60)
                    .toString()
                    .padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Quick Bill-to-Solar Estimator */}
            <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-editorial text-xl font-medium">
                    Quick Bill-to-Solar Estimator
                  </h2>
                  <span className={`font-mono-tech text-[11px] ${palette.subInk}`}>
                    {readingDepth === 'detailed'
                      ? `PR ${activeSite.performanceRatio} · Tilt ${activeSite.optimalTiltDeg}°`
                      : `${activeSite.locationLabel.split('·')[0]}`}
                  </span>
                </div>

                {/* Slider 1: Monthly Electric Bill */}
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs font-medium">Monthly electric bill</span>
                    <span className="font-mono-tech text-xl font-bold">
                      ${monthlyBillUsd.toLocaleString()}/mo
                    </span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={1500}
                    step={10}
                    value={monthlyBillUsd}
                    onChange={(e) => setMonthlyBillUsd(Number(e.target.value))}
                    className="w-full zenith-slider"
                  />
                  <div
                    className={`flex justify-between font-mono-tech text-[10px] ${palette.subInk} mt-1`}
                  >
                    <span>$40/mo</span>
                    <span>~{liveCalc.monthlyKwhConsumption.toLocaleString()} kWh/mo</span>
                    <span>$1,500/mo</span>
                  </div>
                </div>

                {/* Slider 2: Usable Roof Space (Automatically reflects global areaUnit!) */}
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs font-medium">Usable roof space</span>
                    <span className="font-mono-tech text-xl font-bold">
                      {formatArea(availableRoofAreaM2, true)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={400}
                    step={5}
                    value={availableRoofAreaM2}
                    onChange={(e) => setAvailableRoofAreaM2(Number(e.target.value))}
                    className="w-full zenith-slider"
                  />
                </div>
              </div>

              {/* 3 Instant Outcomes */}
              <div
                className={`grid grid-cols-3 divide-x ${palette.divide} border-y ${palette.rule} py-4 my-2`}
              >
                <div className="pr-3">
                  <div className={`text-[11px] ${palette.subInk}`}>Monthly savings</div>
                  <div className="font-mono-tech text-xl font-bold text-[#16A34A] mt-1">
                    ~${liveCalc.monthlySavingsUsd}/mo
                  </div>
                  <div className={`font-mono-tech text-[10px] ${palette.subInk}`}>
                    ${liveCalc.annualSavingsUsd.toLocaleString()}/yr
                  </div>
                </div>

                <div className="px-3">
                  <div className={`text-[11px] ${palette.subInk}`}>
                    <RichTooltip termKey="capacity_kw">Recommended size</RichTooltip>
                  </div>
                  <div className="font-mono-tech text-xl font-bold mt-1">
                    {liveCalc.recommendedCapacityKw} kW
                  </div>
                  <div className={`font-mono-tech text-[10px] ${palette.subInk}`}>
                    {liveCalc.estimatedPanels} panels ({formatArea(liveCalc.requiredRoofAreaM2)})
                  </div>
                </div>

                <div className="pl-3">
                  <div className={`text-[11px] ${palette.subInk}`}>
                    <RichTooltip termKey="payback">Payback</RichTooltip>
                  </div>
                  <div className="font-mono-tech text-xl font-bold mt-1">
                    {liveCalc.simplePaybackYears} yrs
                  </div>
                  <div className={`font-mono-tech text-[10px] ${palette.subInk}`}>
                    Net ${liveCalc.netSystemCostUsd.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Engineer Mode Extra Telemetry Strip on Hero */}
              {readingDepth === 'detailed' && (
                <div
                  className={`px-3 py-2 ${palette.well} border ${palette.rule} font-mono-tech text-[11px] flex items-center justify-between`}
                >
                  <span>
                    Yield: <strong>{liveCalc.specificYieldPerKw} kWh/kWp</strong>
                  </span>
                  <span>
                    LCOE: <strong>${liveCalc.lcoeUsdPerKwh}/kWh</strong>
                  </span>
                  <span>
                    CF: <strong>{liveCalc.capacityFactorPct}%</strong>
                  </span>
                </div>
              )}

              <button
                onClick={onStartGuidedPlan}
                className="w-full py-3 px-4 bg-[#18181B] text-[#FAF8F5] hover:bg-[#18181B]/90 text-xs font-mono-tech font-semibold uppercase tracking-wider flex items-center justify-between transition-colors"
              >
                <span>Open Full Plan in Solar Planner ({liveCalc.recommendedCapacityKw} kW)</span>
                <ArrowRight className="w-4 h-4 text-[#F59E0B]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. "SOLAR INDUSTRY HEADLINES" RSS FEED SECTION (Can be toggled in Preferences) */}
      {showRssFeed && (
        <section className={`p-8 sm:p-12 border-b ${palette.rule} ${palette.canvas}`}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Solar industry headlines
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollNews(-1)}
                className={`p-2 border ${palette.rule} ${palette.plane} ${palette.hoverPlane}`}
                aria-label="Previous headlines"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollNews(1)}
                className={`p-2 border ${palette.rule} ${palette.plane} ${palette.hoverPlane}`}
                aria-label="Next headlines"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={newsScrollRef}
            className="flex gap-5 overflow-x-auto pb-3 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'thin' }}
          >
            {rssItems.map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`snap-start shrink-0 w-[290px] sm:w-[310px] rounded-xl overflow-hidden border ${palette.rule} ${palette.plane} hover:border-[#F59E0B] transition-all flex flex-col justify-between group shadow-xs`}
              >
                <div>
                  <div className="h-44 w-full overflow-hidden bg-[#18181B] relative">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#F59E0B]">
                        <Sun className="w-10 h-10" />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-3 group-hover:text-[#D97706] transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <div
                  className={`px-4 pb-4 pt-1 flex items-center justify-between text-xs ${palette.subInk}`}
                >
                  <span>
                    {item.pubDate}
                    {item.source ? ` · ${item.source}` : ''}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#F59E0B] transition-opacity" />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 3. EXPLORE CALIBRATED REFERENCE SITES */}
      <section className="p-8 sm:p-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
          <div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-medium">
              Reference Solar Installations
            </h2>
            <p className={`text-sm ${palette.subInk} mt-1`}>
              Select a verified residential, commercial, or industrial site to inspect its 38-year satellite irradiance and tariff model.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {REFERENCE_SITES.map((site) => (
            <button
              key={site.id}
              onClick={() => onSelectReferenceSite(site)}
              className={`text-left p-5 rounded-lg border ${palette.rule} ${palette.plane} hover:border-[#F59E0B] transition-all flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-center justify-between font-mono-tech text-xs mb-2">
                  <span className="text-[#D97706] font-semibold">{site.code}</span>
                  <span className={palette.subInk}>
                    {site.lat.toFixed(1)}°N, {Math.abs(site.lon).toFixed(1)}°
                    {site.lon >= 0 ? 'E' : 'W'}
                  </span>
                </div>
                <h3 className="font-editorial text-xl font-medium group-hover:text-[#D97706] transition-colors">
                  {site.name}
                </h3>
                <p className={`text-xs ${palette.subInk} mt-1`}>{site.locationLabel}</p>
              </div>

              <div
                className={`my-4 pt-3 border-t ${palette.rule} font-mono-tech text-xs space-y-1.5`}
              >
                <div className="flex justify-between">
                  <span className={palette.subInk}>Sunlight:</span>
                  <span className="font-semibold">
                    {site.irradianceDaily} kWh/m²/day
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={palette.subInk}>Configuration:</span>
                  <span>
                    {site.systemCapacityKw} kW ({site.gridConnection})
                  </span>
                </div>
                {readingDepth === 'detailed' && (
                  <div className="flex justify-between text-[11px] pt-1 border-t border-dashed border-current/10">
                    <span className={palette.subInk}>Tilt / Temp:</span>
                    <span>
                      {site.optimalTiltDeg}° · {formatTemp(site.tempC)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Open in Solar Planner</span>
                <ArrowUpRight className="w-4 h-4 text-[#F59E0B]" />
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// SURFACE 2: SOLAR PLANNER WORKSPACE
// ============================================================================

function SurfaceCalmWorkspace({
  palette,
  readingDepth,
  onToggleReadingDepth,
  workspaceStep,
  setWorkspaceStep,
  resultsTab,
  setResultsTab,
  activeSite,
  onSelectSite,
  pinCoords,
  setPinCoords,
  searchQuery,
  setSearchQuery,
  tiltDeg,
  setTiltDeg,
  setupMode,
  setSetupMode,
  planningScale,
  setPlanningScale,
  goal,
  setGoal,
  billInputType,
  setBillInputType,
  monthlyBillUsd,
  setMonthlyBillUsd,
  availableRoofAreaM2,
  setAvailableRoofAreaM2,
  areaUnit,
  setAreaUnit,
  formatArea,
  formatTemp,
  formatWind,
  systemCapacityKw,
  setSystemCapacityKw,
  installationType,
  setInstallationType,
  panelTechnology,
  setPanelTechnology,
  gridConnection,
  setGridConnection,
  batteryCapacityKwh,
  setBatteryCapacityKwh,
  region,
  setRegion,
  tariffUsd,
  setTariffUsd,
  includeIncentives,
  setIncludeIncentives,
  performanceRatio,
  setPerformanceRatio,
  estimationModel,
  setEstimationModel,
  liveCalc,
  isSimulating,
  onExecuteSimulation,
  hoveredMonthIdx,
  setHoveredMonthIdx,
  onOpenSavedSiteDiff,
  onOpenAssistant
}) {
  const hoveredMonth =
    activeSite.monthlySeries[hoveredMonthIdx] || activeSite.monthlySeries[4];

  return (
    <div>
      {/* TOP STEPPER BAR */}
      <div className={`border-b ${palette.rule} ${palette.plane} px-6 py-4`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {[
              {
                step: 1,
                title: '1. Location & Sunlight',
                sub: `${activeSite.name.split(' ')[0]} (${activeSite.irradianceDaily} kWh/m²/d)`
              },
              {
                step: 2,
                title: '2. System Sizing',
                sub: `${liveCalc.activeKw} kW · ${liveCalc.estimatedPanels} panels`
              },
              {
                step: 3,
                title: '3. Savings & Cashflow Plan',
                sub: `~$${liveCalc.monthlySavingsUsd}/mo saved · ${liveCalc.simplePaybackYears} yr payback`
              }
            ].map((item) => {
              const isCurrent = workspaceStep === item.step;
              return (
                <button
                  key={item.step}
                  onClick={() => setWorkspaceStep(item.step)}
                  className={`px-4 py-2.5 text-left border transition-colors ${
                    isCurrent
                      ? 'bg-[#18181B] text-[#FAF8F5] border-[#18181B]'
                      : `${palette.well} ${palette.rule} ${palette.hoverPlane}`
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center gap-2">
                    <span>{item.title}</span>
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    )}
                  </div>
                  <div
                    className={`font-mono-tech text-[11px] mt-0.5 ${
                      isCurrent ? 'text-[#F59E0B]' : palette.subInk
                    }`}
                  >
                    {item.sub}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExecuteSimulation}
              className="px-5 py-2.5 bg-[#F59E0B] text-[#18181B] font-semibold text-xs flex items-center gap-2 hover:bg-[#f59e0b]/90"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSimulating ? 'Calculating...' : 'Run Solar Analysis'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* STEP 1: LOCATION & SUNLIGHT */}
      {workspaceStep === 1 && (
        <div className="bg-[#18181B] text-[#FAF8F5] p-6 lg:p-8 border-b border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="font-editorial text-2xl sm:text-3xl font-medium">
                Pin Your Location &amp; Inspect Local Sunlight
              </h1>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Search a city, select a reference site, or click on the coordinate grid to position your array.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-white/5 border border-white/15 px-3 py-1.5">
                <MapPin className="w-4 h-4 text-[#F59E0B] mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs font-mono-tech text-white focus:outline-none w-56"
                  placeholder="Search city or coordinates..."
                />
              </div>
              {REFERENCE_SITES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSite(s)}
                  className={`px-3 py-1.5 text-xs font-mono-tech border transition-colors ${
                    s.id === activeSite.id
                      ? 'bg-[#F59E0B] text-[#18181B] border-[#F59E0B] font-semibold'
                      : 'bg-white/5 text-[#A1A1AA] border-white/15 hover:text-white'
                  }`}
                >
                  {s.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const xRatio = (e.clientX - rect.left) / rect.width;
              const yRatio = (e.clientY - rect.top) / rect.height;
              setPinCoords({
                lat: Number((activeSite.lat + (0.5 - yRatio) * 0.08).toFixed(4)),
                lon: Number((activeSite.lon + (xRatio - 0.5) * 0.08).toFixed(4))
              });
            }}
            className="relative h-72 w-full bg-[#121215] border border-white/15 cursor-crosshair overflow-hidden flex items-center justify-center"
          >
            <svg className="w-full h-full" viewBox="0 0 900 280">
              <defs>
                <pattern
                  id="zinc-survey-grid"
                  width="36"
                  height="36"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 36 0 L 0 0 0 36"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="900" height="280" fill="url(#zinc-survey-grid)" />
              <circle
                cx="450"
                cy="140"
                r="115"
                fill="none"
                stroke="rgba(245,158,11,0.25)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <circle
                cx="450"
                cy="140"
                r="70"
                fill="none"
                stroke="rgba(14,165,233,0.3)"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="140"
                x2="900"
                y2="140"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
              <line
                x1="450"
                y1="0"
                x2="450"
                y2="280"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
              <circle cx="450" cy="140" r="16" fill="rgba(245,158,11,0.2)" />
              <circle
                cx="450"
                cy="140"
                r="6"
                fill="#F59E0B"
                stroke="#FAF8F5"
                strokeWidth="2"
              />
              <text
                x="468"
                y="135"
                fill="#F59E0B"
                fontSize="12"
                fontFamily="IBM Plex Mono"
                fontWeight="bold"
              >
                {pinCoords.lat.toFixed(4)}° N, {pinCoords.lon.toFixed(4)}° E
              </text>
              <text
                x="468"
                y="153"
                fill="#FAF8F5"
                fontSize="11"
                fontFamily="IBM Plex Sans"
              >
                {activeSite.name} · {activeSite.irradianceDaily} kWh/m²/day
              </text>
            </svg>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-xs">
              <div>
                <span className="text-[#A1A1AA]">Average Daily Sunlight: </span>
                <span className="font-mono-tech font-bold text-[#F59E0B]">
                  {activeSite.irradianceDaily} kWh/m²/day
                </span>
              </div>
              <div>
                <span className="text-[#A1A1AA]">Optimal Panel Tilt: </span>
                <span className="font-mono-tech font-bold">
                  {activeSite.optimalTiltDeg}° {activeSite.azimuthDirection}
                </span>
              </div>
              <div>
                <span className="text-[#A1A1AA]">Ambient Temp / Wind: </span>
                <span className="font-mono-tech font-bold">
                  {formatTemp(activeSite.tempC)} · {formatWind(activeSite.windSpeedMs)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setWorkspaceStep(2)}
              className="px-6 py-2.5 bg-[#F59E0B] text-[#18181B] font-semibold text-xs flex items-center gap-2"
            >
              <span>Continue to System Sizing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SIZE YOUR SYSTEM */}
      {workspaceStep === 2 && (
        <div className={palette.plane}>
          <div
            className={`px-6 lg:px-8 py-5 ${palette.well} border-b ${palette.rule} flex flex-wrap items-center justify-between gap-4`}
          >
            <div>
              <h1 className="font-editorial text-2xl sm:text-3xl font-medium">
                Configure Your Solar System
              </h1>
              <p className={`text-xs ${palette.subInk} mt-0.5`}>
                Size automatically from your monthly bill and roof area, or configure custom engineering specifications.
              </p>
            </div>

            <div className={`inline-flex border ${palette.rule} ${palette.plane} p-0.5`}>
              <button
                onClick={() => {
                  setSetupMode('guided');
                  onToggleReadingDepth('simple');
                }}
                className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  setupMode === 'guided'
                    ? 'bg-[#18181B] text-[#FAF8F5]'
                    : palette.subInk
                }`}
              >
                Guided Bill &amp; Roof Sizer
              </button>
              <button
                onClick={() => {
                  setSetupMode('engineering');
                  onToggleReadingDepth('detailed');
                }}
                className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  setupMode === 'engineering'
                    ? 'bg-[#18181B] text-[#FAF8F5]'
                    : palette.subInk
                }`}
              >
                Engineering Setup
              </button>
            </div>
          </div>

          {setupMode === 'guided' ? (
            <div
              className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${palette.divide}`}
            >
              <div className="lg:col-span-7 p-6 lg:p-8 space-y-6">
                {/* 1. Property Scale */}
                <div>
                  <label className="block text-xs font-semibold mb-2">
                    Property Scale
                  </label>
                  <div
                    className={`grid grid-cols-3 border ${palette.rule} divide-x ${palette.divide} text-xs`}
                  >
                    {[
                      {
                        id: 'homeowner',
                        label: 'Homeowner',
                        desc: '1–15 kW rooftop',
                        bill: 115,
                        roof: 52
                      },
                      {
                        id: 'small_business',
                        label: 'Small Business',
                        desc: '15–100 kW commercial',
                        bill: 680,
                        roof: 210
                      },
                      {
                        id: 'industrial',
                        label: 'Industrial Site',
                        desc: '100 kW–5 MW array',
                        bill: 2250,
                        roof: 520
                      }
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setPlanningScale(s.id);
                          setMonthlyBillUsd(s.bill);
                          setAvailableRoofAreaM2(s.roof);
                        }}
                        className={`p-3.5 text-left transition-colors ${
                          planningScale === s.id
                            ? 'bg-[#18181B] text-[#FAF8F5] font-semibold'
                            : palette.hoverPlane
                        }`}
                      >
                        <div>{s.label}</div>
                        <div
                          className={`font-mono-tech text-[11px] mt-0.5 ${
                            planningScale === s.id ? 'text-[#F59E0B]' : palette.subInk
                          }`}
                        >
                          {s.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Primary Goal */}
                <div>
                  <label className="block text-xs font-semibold mb-2">
                    Optimization Goal
                  </label>
                  <div
                    className={`grid grid-cols-3 border ${palette.rule} divide-x ${palette.divide} text-xs`}
                  >
                    {[
                      {
                        id: 'lowest_payback',
                        label: 'Fastest Payback',
                        sub: 'Highest ROI per dollar'
                      },
                      {
                        id: 'max_offset',
                        label: 'Wipe Out Full Bill',
                        sub: 'Target ~100% offset'
                      },
                      {
                        id: 'backup_resilience',
                        label: 'Outage + Night Backup',
                        sub: 'Includes LFP storage'
                      }
                    ].map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setGoal(g.id)}
                        className={`p-3.5 text-left transition-colors ${
                          goal === g.id
                            ? 'bg-[#F59E0B] text-[#18181B] font-semibold'
                            : palette.hoverPlane
                        }`}
                      >
                        <div>{g.label}</div>
                        <div className="text-[11px] opacity-80 mt-0.5">{g.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Monthly Electric Bill */}
                <div className={`pt-4 border-t ${palette.rule}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold">
                      Average monthly electricity bill or usage
                    </span>
                    <div
                      className={`inline-flex border ${palette.rule} font-mono-tech text-[11px]`}
                    >
                      <button
                        onClick={() => setBillInputType('usd')}
                        className={`px-2.5 py-0.5 ${
                          billInputType === 'usd' ? 'bg-[#18181B] text-[#FAF8F5]' : ''
                        }`}
                      >
                        $/mo Bill
                      </button>
                      <button
                        onClick={() => setBillInputType('kwh')}
                        className={`px-2.5 py-0.5 ${
                          billInputType === 'kwh' ? 'bg-[#18181B] text-[#FAF8F5]' : ''
                        }`}
                      >
                        kWh/mo Usage
                      </button>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between font-mono-tech mb-2">
                    <span className="text-2xl font-bold">
                      {billInputType === 'usd'
                        ? `$${monthlyBillUsd.toLocaleString()}/mo`
                        : `${liveCalc.monthlyKwhConsumption.toLocaleString()} kWh/mo`}
                    </span>
                    <span className={`text-xs ${palette.subInk}`}>
                      Est. {liveCalc.monthlyKwhConsumption.toLocaleString()} kWh/mo @ $
                      {tariffUsd}/kWh
                    </span>
                  </div>

                  <input
                    type="range"
                    min={30}
                    max={
                      planningScale === 'homeowner'
                        ? 600
                        : planningScale === 'small_business'
                        ? 2500
                        : 5000
                    }
                    step={10}
                    value={monthlyBillUsd}
                    onChange={(e) => setMonthlyBillUsd(Number(e.target.value))}
                    className="w-full zenith-slider"
                  />
                </div>

                {/* 4. Usable Roof Space (Synced with Global Area Unit Preference) */}
                <div className={`pt-4 border-t ${palette.rule}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold">
                      Usable unshaded roof space
                    </span>
                    <div
                      className={`inline-flex border ${palette.rule} font-mono-tech text-[11px]`}
                    >
                      <button
                        onClick={() => setAreaUnit('m2')}
                        className={`px-2.5 py-0.5 ${
                          areaUnit === 'm2' ? 'bg-[#18181B] text-[#FAF8F5]' : ''
                        }`}
                      >
                        m²
                      </button>
                      <button
                        onClick={() => setAreaUnit('sqft')}
                        className={`px-2.5 py-0.5 ${
                          areaUnit === 'sqft' ? 'bg-[#18181B] text-[#FAF8F5]' : ''
                        }`}
                      >
                        sq ft
                      </button>
                    </div>
                  </div>

                  <div className="font-mono-tech text-2xl font-bold mb-2">
                    {formatArea(availableRoofAreaM2, true)}
                  </div>

                  <input
                    type="range"
                    min={15}
                    max={planningScale === 'homeowner' ? 250 : 1200}
                    step={5}
                    value={availableRoofAreaM2}
                    onChange={(e) => setAvailableRoofAreaM2(Number(e.target.value))}
                    className="w-full zenith-slider"
                  />
                </div>
              </div>

              {/* Right 5 Cols: Live Recommendation Summary + Visual Roof Fit */}
              <div
                className={`lg:col-span-5 p-6 lg:p-8 ${palette.well} flex flex-col justify-between space-y-6`}
              >
                <div className="space-y-4">
                  <h2 className="font-editorial text-2xl font-medium">
                    Recommended System Sizing
                  </h2>

                  <div
                    className={`grid grid-cols-2 gap-4 py-4 border-y ${palette.rule}`}
                  >
                    <div>
                      <div className={`text-xs ${palette.subInk}`}>
                        <RichTooltip termKey="capacity_kw">
                          Recommended size
                        </RichTooltip>
                      </div>
                      <div className="font-mono-tech text-2xl font-bold mt-1">
                        {liveCalc.recommendedCapacityKw} kW
                      </div>
                    </div>

                    <div>
                      <div className={`text-xs ${palette.subInk}`}>Estimated panels</div>
                      <div className="font-mono-tech text-2xl font-bold mt-1">
                        {liveCalc.estimatedPanels} panels
                      </div>
                    </div>

                    <div>
                      <div className={`text-xs ${palette.subInk}`}>
                        Required roof space
                      </div>
                      <div
                        className={`font-mono-tech text-xl font-bold mt-1 ${
                          liveCalc.roofAreaConstrained
                            ? 'text-[#D97706]'
                            : 'text-[#16A34A]'
                        }`}
                      >
                        {formatArea(liveCalc.requiredRoofAreaM2)}{' '}
                        <span className="text-xs font-normal">
                          / {formatArea(availableRoofAreaM2)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className={`text-xs ${palette.subInk}`}>
                        Est. monthly savings
                      </div>
                      <div className="font-mono-tech text-xl font-bold text-[#16A34A] mt-1">
                        ~${liveCalc.monthlySavingsUsd}/mo
                      </div>
                    </div>
                  </div>

                  {/* Clean Visual Roof Fit Grid */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-medium">Roof Packing Footprint</span>
                      <span className={`font-mono-tech text-[11px] ${palette.subInk}`}>
                        1 panel = {areaUnit === 'm2' ? '2 m²' : '21.5 sq ft'}
                      </span>
                    </div>
                    <div className="p-3 bg-[#18181B] border border-[#18181B]">
                      <div className="grid grid-cols-6 gap-1.5">
                        {Array.from({
                          length: Math.min(
                            24,
                            Math.max(12, liveCalc.estimatedPanels)
                          )
                        }).map((_, idx) => {
                          const isNeeded = idx < liveCalc.estimatedPanels;
                          const fits = idx < liveCalc.maxPanelsFitOnRoof;
                          const isOverflow = isNeeded && !fits;
                          return (
                            <div
                              key={idx}
                              className={`h-6 flex items-center justify-center font-mono-tech text-[9px] border ${
                                isOverflow
                                  ? 'bg-[#D97706]/30 border-[#D97706] text-white'
                                  : isNeeded
                                  ? 'bg-[#F59E0B] border-[#F59E0B] text-[#18181B] font-semibold'
                                  : 'bg-white/5 border-white/10 text-white/30'
                              }`}
                            >
                              {isNeeded ? `P${idx + 1}` : '·'}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {liveCalc.roofAreaConstrained ? (
                      <div className="mt-3 p-3 bg-[#D97706]/15 border border-[#D97706] text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                        <span>
                          <strong>Roof space alert:</strong> {liveCalc.estimatedPanels}{' '}
                          panels require {formatArea(liveCalc.requiredRoofAreaM2)}, which exceeds your{' '}
                          {formatArea(availableRoofAreaM2)} roof area.
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-[#16A34A] flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          All {liveCalc.estimatedPanels} panels fit comfortably inside
                          your {formatArea(availableRoofAreaM2)} roof footprint.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={onExecuteSimulation}
                  className="w-full py-3.5 px-5 bg-[#F59E0B] text-[#18181B] font-semibold text-sm flex items-center justify-between hover:bg-[#f59e0b]/90"
                >
                  <span>Calculate Full Savings &amp; 25-Year Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* MODE 2: CUSTOM ENGINEERING SETUP */
            <div className="p-6 lg:p-8 space-y-6">
              <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-6 border-b ${palette.rule}`}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      <RichTooltip termKey="capacity_kw">
                        System capacity (kW)
                      </RichTooltip>
                    </label>
                    <input
                      type="number"
                      min={0.5}
                      max={100000}
                      step={0.5}
                      value={systemCapacityKw}
                      onChange={(e) => setSystemCapacityKw(Number(e.target.value))}
                      className={`w-full px-3 py-2 font-mono-tech text-sm border ${palette.rule} ${palette.well}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Installation mounting
                    </label>
                    <div
                      className={`grid grid-cols-3 border ${palette.rule} divide-x ${palette.divide} text-xs`}
                    >
                      {['rooftop', 'ground-mounted', 'carport'].map((m) => (
                        <button
                          key={m}
                          onClick={() => setInstallationType(m)}
                          className={`py-2 px-1 capitalize ${
                            installationType === m
                              ? 'bg-[#18181B] text-[#FAF8F5] font-semibold'
                              : ''
                          }`}
                        >
                          {m.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Panel technology
                    </label>
                    <div
                      className={`grid grid-cols-3 border ${palette.rule} divide-x ${palette.divide} text-xs`}
                    >
                      {[
                        { id: 'monocrystalline', label: 'Mono 20%' },
                        { id: 'polycrystalline', label: 'Poly 17%' },
                        { id: 'thin-film', label: 'Thin 11%' }
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPanelTechnology(p.id)}
                          className={`py-2 px-1 ${
                            panelTechnology === p.id
                              ? 'bg-[#F59E0B] text-[#18181B] font-semibold'
                              : ''
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      <RichTooltip termKey="lfp_battery">
                        Grid &amp; battery setup
                      </RichTooltip>
                    </label>
                    <div
                      className={`grid grid-cols-3 border ${palette.rule} divide-x ${palette.divide} text-xs`}
                    >
                      {[
                        { id: 'grid-tied', label: 'Grid-Tied' },
                        { id: 'hybrid', label: 'Hybrid LFP' },
                        { id: 'off-grid', label: 'Off-Grid' }
                      ].map((g) => (
                        <button
                          key={g.id}
                          onClick={() => {
                            setGridConnection(g.id);
                            if (g.id === 'grid-tied') setBatteryCapacityKwh(0);
                            if (g.id === 'hybrid')
                              setBatteryCapacityKwh(Math.round(systemCapacityKw * 2.0));
                            if (g.id === 'off-grid')
                              setBatteryCapacityKwh(Math.round(systemCapacityKw * 3.5));
                          }}
                          className={`py-2 px-1 ${
                            gridConnection === g.id
                              ? 'bg-[#18181B] text-[#FAF8F5] font-semibold'
                              : ''
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      LFP battery size (kWh)
                    </label>
                    <input
                      type="number"
                      disabled={gridConnection === 'grid-tied'}
                      min={0}
                      max={25000}
                      step={2}
                      value={batteryCapacityKwh}
                      onChange={(e) => setBatteryCapacityKwh(Number(e.target.value))}
                      className={`w-full px-3 py-2 font-mono-tech text-sm border ${palette.rule} ${palette.well} disabled:opacity-40`}
                    />
                    <p className={`text-[11px] ${palette.subInk} mt-1`}>
                      Auto-sizes to 2.0× kW for Hybrid or 3.5× kW for Off-Grid
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Region &amp; subsidy rule
                    </label>
                    <div
                      className={`grid grid-cols-4 border ${palette.rule} divide-x ${palette.divide} text-xs uppercase`}
                    >
                      {['india', 'usa', 'europe', 'global'].map((r) => (
                        <button
                          key={r}
                          onClick={() => setRegion(r)}
                          className={`py-2 ${
                            region === r
                              ? 'bg-[#18181B] text-[#FAF8F5] font-semibold'
                              : ''
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Electricity tariff ($/kWh)
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      max={5.0}
                      step={0.01}
                      value={tariffUsd}
                      onChange={(e) => setTariffUsd(Number(e.target.value))}
                      className={`w-full px-3 py-2 font-mono-tech text-sm border ${palette.rule} ${palette.well}`}
                    />
                  </div>

                  <label className="flex items-center justify-between pt-2 cursor-pointer">
                    <span className="text-xs font-medium">
                      Include government subsidy
                    </span>
                    <input
                      type="checkbox"
                      checked={includeIncentives}
                      onChange={(e) => setIncludeIncentives(e.target.checked)}
                      className="w-4 h-4 accent-[#F59E0B]"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <RichTooltip termKey="performance_ratio">
                        Performance ratio
                      </RichTooltip>
                      <span className="font-mono-tech font-bold">
                        {performanceRatio.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={0.95}
                      step={0.01}
                      value={performanceRatio}
                      onChange={(e) => setPerformanceRatio(Number(e.target.value))}
                      className="w-full zenith-slider"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Prediction model
                    </label>
                    <select
                      value={estimationModel}
                      onChange={(e) => setEstimationModel(e.target.value)}
                      className={`w-full px-3 py-2 text-xs font-mono-tech border ${palette.rule} ${palette.well}`}
                    >
                      <option value="hist_gradient_boosting">
                        Gradient-Boosted Climate Ensemble
                      </option>
                      <option value="random_forest">Multi-Tree Weather Ensemble</option>
                      <option value="linear_regression">Linear Clear-Sky Baseline</option>
                      <option value="svm">Kernel Climate Estimator</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onExecuteSimulation}
                  className="px-6 py-3 bg-[#F59E0B] text-[#18181B] font-semibold text-xs uppercase tracking-wider flex items-center gap-2"
                >
                  <span>Run Engineering Simulation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: SAVINGS & CASHFLOW PLAN */}
      {workspaceStep === 3 && (
        <div>
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x ${palette.divide} border-b ${palette.rule} ${palette.plane}`}
          >
            <div className="p-6">
              <div className={`text-xs ${palette.subInk}`}>
                Estimated monthly savings
              </div>
              <div className="font-mono-tech text-3xl font-bold text-[#16A34A] mt-1.5">
                ~${liveCalc.monthlySavingsUsd.toLocaleString()}/mo
              </div>
              <div className={`font-mono-tech text-xs ${palette.subInk} mt-1`}>
                ${liveCalc.annualSavingsUsd.toLocaleString()}/yr saved on electric bills
              </div>
            </div>

            <div className="p-6">
              <div className={`text-xs ${palette.subInk}`}>
                Net cost after subsidy
              </div>
              <div className="font-mono-tech text-3xl font-bold mt-1.5">
                ${liveCalc.netSystemCostUsd.toLocaleString()}
              </div>
              <div className="font-mono-tech text-xs text-[#16A34A] mt-1">
                Includes -${liveCalc.incentiveAmountUsd.toLocaleString()} (
                {liveCalc.incentiveSummary})
              </div>
            </div>

            <div className="p-6">
              <div className={`text-xs ${palette.subInk}`}>
                <RichTooltip termKey="payback">Simple payback crossover</RichTooltip>
              </div>
              <div className="font-mono-tech text-3xl font-bold mt-1.5">
                {liveCalc.simplePaybackYears} yrs
              </div>
              <div className={`font-mono-tech text-xs ${palette.subInk} mt-1`}>
                {liveCalc.lifetimeRoiPct}% 25-year return ·{' '}
                <RichTooltip termKey="lcoe">
                  ${liveCalc.lcoeUsdPerKwh}/kWh LCOE
                </RichTooltip>
              </div>
            </div>

            <div className="p-6">
              <div className={`text-xs ${palette.subInk}`}>
                <RichTooltip termKey="capacity_kw">
                  System size &amp; roof fit
                </RichTooltip>
              </div>
              <div className="font-mono-tech text-3xl font-bold mt-1.5">
                {liveCalc.activeKw} kW{' '}
                <span className="text-lg font-normal">
                  ({liveCalc.estimatedPanels} panels)
                </span>
              </div>
              <div className={`font-mono-tech text-xs ${palette.subInk} mt-1`}>
                Generates {liveCalc.annualEnergyKwh.toLocaleString()} kWh/yr (
                {formatArea(liveCalc.requiredRoofAreaM2)} roof)
              </div>
            </div>
          </div>

          <div
            className={`px-6 py-3 ${palette.well} border-b ${palette.rule} flex flex-wrap items-center justify-between gap-4`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {[
                {
                  id: 'sunlight',
                  label: '1. Sunlight, Tilt & Roof Fit'
                },
                {
                  id: 'financials',
                  label: '2. Cost, Subsidy & 25-Year Cashflow'
                },
                {
                  id: 'explanation',
                  label: '3. Drivers & Recommendations'
                }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setResultsTab(t.id)}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${
                    resultsTab === t.id
                      ? 'bg-[#18181B] text-[#FAF8F5] font-semibold'
                      : `${palette.plane} border ${palette.rule} ${palette.subInk} hover:text-current`
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={onOpenSavedSiteDiff}
              className="text-xs font-mono-tech font-semibold text-[#D97706] flex items-center gap-1.5 hover:underline"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare Historical Runs</span>
            </button>
          </div>

          {resultsTab === 'sunlight' && (
            <div
              className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${palette.divide} ${palette.plane}`}
            >
              <div className="lg:col-span-8 p-6 lg:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-editorial text-2xl font-medium">
                      12-Month Sunlight Forecast vs.{' '}
                      <RichTooltip termKey="clear_sky">
                        Clear-Sky Ceiling
                      </RichTooltip>
                    </h2>
                    <p className={`text-xs ${palette.subInk} mt-0.5`}>
                      Hover any month bar to inspect daily irradiance, cloud loss, and temperature ({tempUnit === 'F' ? '°F' : '°C'}).
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1.5 ${palette.well} border ${palette.rule} font-mono-tech text-xs`}
                  >
                    <strong>{hoveredMonth.m}:</strong>{' '}
                    <span className="text-[#D97706] font-bold">
                      {hoveredMonth.irr} kWh/m²/d
                    </span>{' '}
                    · Ceiling {hoveredMonth.clear} · Cloud loss{' '}
                    {hoveredMonth.cloudLoss}% · {formatTemp(hoveredMonth.temp)}
                  </div>
                </div>

                <div className="h-60">
                  <DirectorMonthlyIrradianceChart
                    series={activeSite.monthlySeries}
                    hoveredIdx={hoveredMonthIdx}
                    onHoverIdx={setHoveredMonthIdx}
                    palette={palette}
                  />
                </div>
              </div>

              <div className="lg:col-span-4 p-6 lg:p-8 space-y-5">
                <h3 className="font-editorial text-xl font-medium">
                  Panel Angle &amp; Weather Summary
                </h3>

                <div className={`p-4 ${palette.well} border ${palette.rule}`}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <RichTooltip termKey="tilt_azimuth">
                      Panel Tilt Angle
                    </RichTooltip>
                    <span className="font-mono-tech font-bold text-[#D97706]">
                      {tiltDeg.toFixed(1)}° (Optimal: {activeSite.optimalTiltDeg}°)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={45}
                    step={0.5}
                    value={tiltDeg}
                    onChange={(e) => setTiltDeg(Number(e.target.value))}
                    className="w-full zenith-slider"
                  />
                  <div className="flex justify-between items-center text-[11px] mt-2">
                    <span className={palette.subInk}>
                      Compass: {activeSite.azimuthDirection}
                    </span>
                    <button
                      onClick={() => setTiltDeg(activeSite.optimalTiltDeg)}
                      className="text-[#D97706] font-medium underline"
                    >
                      Reset to {activeSite.optimalTiltDeg}°
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs font-mono-tech">
                  <div className="flex justify-between">
                    <span className={palette.subInk}>
                      <RichTooltip termKey="irradiance">
                        Daily sunlight
                      </RichTooltip>
                    </span>
                    <span className="font-bold">
                      {activeSite.irradianceDaily} ± {activeSite.errorEstimate} kWh/m²/d
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={palette.subInk}>
                      <RichTooltip termKey="specific_yield">
                        Specific yield
                      </RichTooltip>
                    </span>
                    <span className="font-bold">
                      {liveCalc.specificYieldPerKw.toLocaleString()} kWh/kWp/yr
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={palette.subInk}>Average temperature</span>
                    <span className="font-bold">{formatTemp(activeSite.tempC)}</span>
                  </div>

                  {readingDepth === 'detailed' && (
                    <div
                      className={`pt-3 mt-3 border-t ${palette.rule} space-y-2`}
                    >
                      <div className="text-[11px] font-semibold text-[#D97706]">
                        Engineer Telemetry
                      </div>
                      <div className="flex justify-between">
                        <span className={palette.subInk}>
                          <RichTooltip termKey="r2_confidence">
                            Model R² / RMSE
                          </RichTooltip>
                        </span>
                        <span>
                          {activeSite.r2Accuracy}% · RMSE {activeSite.rmse}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={palette.subInk}>Capacity factor</span>
                        <span>{liveCalc.capacityFactorPct}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={palette.subInk}>Humidity / Wind</span>
                        <span>
                          {activeSite.humidityPct}% · {formatWind(activeSite.windSpeedMs)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {resultsTab === 'financials' && (
            <div
              className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${palette.divide} ${palette.plane}`}
            >
              <div className="lg:col-span-6 p-6 lg:p-8">
                <h2 className="font-editorial text-2xl font-medium mb-1">
                  25-Year Cumulative Savings &amp;{' '}
                  <RichTooltip termKey="payback">Payback Crossover</RichTooltip>
                </h2>
                <p className={`text-xs ${palette.subInk} mb-4`}>
                  Amber bars show initial capital recovery; green bars show cumulative net savings after year {liveCalc.simplePaybackYears}.
                </p>
                <div className="h-60">
                  <DirectorCashflowCrossoverChart
                    yearlyBreakdown={liveCalc.yearlyBreakdown}
                    palette={palette}
                  />
                </div>
              </div>

              <div className="lg:col-span-6 p-6 lg:p-8 space-y-5">
                <h2 className="font-editorial text-2xl font-medium">
                  Itemized Capex, Subsidy &amp; LFP Storage Ledger
                </h2>

                <div className="h-4 w-full flex overflow-hidden rounded-xs border border-black/10">
                  <div
                    style={{ width: '44%' }}
                    className="bg-[#18181B]"
                    title="Solar Panels"
                  />
                  <div
                    style={{ width: '13%' }}
                    className="bg-[#0EA5E9]"
                    title="Inverter"
                  />
                  <div
                    style={{ width: '11%' }}
                    className="bg-[#38BDF8]"
                    title="Mounting & Wiring (BOS)"
                  />
                  <div
                    style={{ width: '8%' }}
                    className="bg-[#71717A]"
                    title="Permits & Labor (Soft Costs)"
                  />
                  <div
                    style={{ width: '24%' }}
                    className="bg-[#F59E0B]"
                    title="LFP Battery Backup"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono-tech text-xs">
                  <div>
                    <span className="inline-block w-2.5 h-2.5 bg-[#18181B] mr-1.5" />
                    <span className={palette.subInk}>Solar panels: </span>
                    <span className="font-bold">
                      ${liveCalc.moduleCostUsd.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 bg-[#0EA5E9] mr-1.5" />
                    <span className={palette.subInk}>Inverter: </span>
                    <span className="font-bold">
                      ${liveCalc.inverterCostUsd.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 bg-[#38BDF8] mr-1.5" />
                    <span className={palette.subInk}>
                      <RichTooltip termKey="bos_soft">BOS &amp; Racking</RichTooltip>:{' '}
                    </span>
                    <span className="font-bold">
                      ${liveCalc.bosCostUsd.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 bg-[#71717A] mr-1.5" />
                    <span className={palette.subInk}>Permits &amp; labor: </span>
                    <span className="font-bold">
                      ${liveCalc.softCostUsd.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 bg-[#F59E0B] mr-1.5" />
                    <span className={palette.subInk}>
                      <RichTooltip termKey="lfp_battery">LFP Battery</RichTooltip>:{' '}
                    </span>
                    <span className="font-bold">
                      ${liveCalc.batteryCostUsd.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className={palette.subInk}>Annual O&amp;M: </span>
                    <span className="font-bold">
                      ${liveCalc.annualMaintenanceUsd}/yr
                    </span>
                  </div>
                </div>

                <div
                  className={`pt-4 border-t ${palette.rule} grid grid-cols-3 gap-4 font-mono-tech text-xs`}
                >
                  <div>
                    <div className={palette.subInk}>Gross System Cost</div>
                    <div className="text-lg font-bold mt-0.5">
                      ${liveCalc.totalSystemCostUsd.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className={palette.subInk}>{liveCalc.incentiveSummary}</div>
                    <div className="text-lg font-bold text-[#16A34A] mt-0.5">
                      -${liveCalc.incentiveAmountUsd.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className={palette.subInk}>Net Cost After Subsidy</div>
                    <div className="text-lg font-bold text-[#D97706] mt-0.5">
                      ${liveCalc.netSystemCostUsd.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {resultsTab === 'explanation' && (
            <div
              className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${palette.divide} ${palette.plane}`}
            >
              <div className="lg:col-span-6 p-6 lg:p-8 space-y-5">
                <h2 className="font-editorial text-2xl font-medium">
                  Analysis Summary &amp; Key Weather Drivers
                </h2>
                <p className="text-sm leading-relaxed">
                  Your location receives{' '}
                  <strong>{activeSite.irradianceDaily} kWh/m²/day</strong> of
                  sunlight across the year. A{' '}
                  <strong>{liveCalc.activeKw} kW</strong> array ({liveCalc.estimatedPanels}{' '}
                  panels covering {formatArea(liveCalc.requiredRoofAreaM2)}) produces{' '}
                  <strong>{liveCalc.annualEnergyKwh.toLocaleString()} kWh/yr</strong>,
                  cutting your electric bill by{' '}
                  <strong>~${liveCalc.monthlySavingsUsd}/mo</strong> and paying for
                  itself in <strong>{liveCalc.simplePaybackYears} years</strong>.
                </p>

                <div className="space-y-3 text-xs pt-2">
                  {[
                    {
                      label: 'Strong Year-Round Sunshine Ceiling',
                      impact: '+48% Positive Impact',
                      pct: 85,
                      color: 'bg-[#16A34A]'
                    },
                    {
                      label: 'Seasonal Monsoon / Winter Cloud Cover',
                      impact: '-14% Seasonal Dip',
                      pct: 40,
                      color: 'bg-[#F59E0B]'
                    },
                    {
                      label: 'Summer Afternoon Panel Heat',
                      impact: '-5% Warm-Weather Effect',
                      pct: 22,
                      color: 'bg-[#0EA5E9]'
                    }
                  ].map((d) => (
                    <div key={d.label} className="space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>{d.label}</span>
                        <span className="font-mono-tech">{d.impact}</span>
                      </div>
                      <div className={`w-full h-2 ${palette.well}`}>
                        <div
                          className={`h-full ${d.color}`}
                          style={{ width: `${d.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 p-6 lg:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-editorial text-2xl font-medium">
                    Actionable Recommendations
                  </h2>
                  <button
                    onClick={onOpenAssistant}
                    className="text-xs font-semibold text-[#D97706] hover:underline"
                  >
                    Ask Solar Guide →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    {
                      title: 'Panel Orientation',
                      metric: `${activeSite.optimalTiltDeg}° Tilt · Due South`,
                      detail:
                        'Catches +6.4% more winter sunlight compared to flat mounting.'
                    },
                    {
                      title: 'Grid Parity Advantage',
                      metric: `$${liveCalc.lcoeUsdPerKwh}/kWh vs $${tariffUsd}/kWh Grid`,
                      detail:
                        'Produces electricity at less than half the price of utility power.'
                    },
                    {
                      title: 'Maintenance Upside',
                      metric: '+4.5% Extra Output',
                      detail:
                        'Quarterly panel rinsing recovers ~650 kWh/yr from dust loss.'
                    },
                    {
                      title: 'Tariff Sensitivity',
                      metric: 'Faster Payback if Rates Rise',
                      detail:
                        'Every 10% utility rate hike shortens payback by ~6 months.'
                    }
                  ].map((rec) => (
                    <button
                      key={rec.title}
                      onClick={onOpenAssistant}
                      className={`text-left p-4 border ${palette.rule} ${palette.plane} hover:border-[#F59E0B] transition-colors flex flex-col justify-between group`}
                    >
                      <div>
                        <div className="font-semibold text-sm group-hover:text-[#D97706]">
                          {rec.title}
                        </div>
                        <div className="font-mono-tech text-xs font-bold text-[#16A34A] mt-1">
                          {rec.metric}
                        </div>
                        <p className={`text-xs ${palette.subInk} mt-1.5 leading-relaxed`}>
                          {rec.detail}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SURFACE 3: SITE ANALYSIS & INLINE RUN COMPARISON
// ============================================================================

function SurfaceLocationDetail({
  palette,
  readingDepth,
  siteTitle,
  setSiteTitle,
  userProfile,
  formatArea,
  formatTemp,
  formatWind,
  compareMode,
  setCompareMode,
  singleRunId,
  setSingleRunId,
  baseRunId,
  setBaseRunId,
  compareRunId,
  setCompareRunId,
  editDrawerOpen,
  setEditDrawerOpen,
  onLaunchNewRunInWorkspace
}) {
  const singleRun =
    HISTORICAL_RUNS.find((r) => r.id === singleRunId) || HISTORICAL_RUNS[0];
  const baseRun =
    HISTORICAL_RUNS.find((r) => r.id === baseRunId) || HISTORICAL_RUNS[0];
  const comparedRun =
    HISTORICAL_RUNS.find((r) => r.id === compareRunId) || HISTORICAL_RUNS[2];

  const activeRun = compareMode ? baseRun : singleRun;

  const renderDiffBadge = (
    baseVal,
    compVal,
    unit = '',
    prefix = '',
    lowerIsBetter = false,
    showPct = false
  ) => {
    if (!compareMode) return null;
    const delta = baseVal - compVal;
    if (Math.abs(delta) < 0.0001) {
      return (
        <span
          className={`ml-2 px-1.5 py-0.5 text-[11px] font-mono-tech ${palette.well} ${palette.subInk}`}
        >
          [No change vs Run #{comparedRun.runNumber}]
        </span>
      );
    }

    const isPositive = delta > 0;
    const isFavorable = lowerIsBetter ? !isPositive : isPositive;
    const sign = isPositive ? '+' : '-';
    const absVal = Math.abs(delta);
    const numStr =
      absVal % 1 === 0 ? absVal.toLocaleString() : absVal.toFixed(absVal < 1 ? 3 : 1);
    const pctStr =
      showPct && compVal !== 0
        ? ` / ${isPositive ? '+' : ''}${(((baseVal - compVal) / compVal) * 100).toFixed(1)}%`
        : '';

    return (
      <span
        className={`ml-2 px-2 py-0.5 text-[11px] font-mono-tech font-semibold inline-block ${
          isFavorable
            ? 'bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30'
            : 'bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30'
        }`}
      >
        [{sign}
        {prefix}
        {numStr}
        {unit}
        {pctStr} vs Run #{comparedRun.runNumber}]
      </span>
    );
  };

  return (
    <div>
      {/* 1. SAVED SITE HEADER & COMPARE MODE SWITCHER */}
      <div className="bg-[#18181B] text-[#FAF8F5] p-6 lg:p-8 border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-medium">
              {siteTitle}
            </h1>
            <p className="font-mono-tech text-xs text-[#A1A1AA] mt-1.5">
              IN-RJ-04 · 26.9124° N, 75.7873° E · {activeRun.label} (
              {activeRun.timestamp}) · Lead: {userProfile.fullName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex border border-white/15 bg-[#09090B] p-0.5 text-xs">
              <button
                onClick={() => setCompareMode(false)}
                className={`px-3 py-1.5 transition-colors ${
                  !compareMode
                    ? 'bg-[#F59E0B] text-[#18181B] font-semibold'
                    : 'text-[#A1A1AA]'
                }`}
              >
                Single Run View
              </button>
              <button
                onClick={() => setCompareMode(true)}
                className={`px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
                  compareMode
                    ? 'bg-[#F59E0B] text-[#18181B] font-semibold'
                    : 'text-[#A1A1AA]'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Compare Runs</span>
              </button>
            </div>

            <button
              onClick={() => setEditDrawerOpen(true)}
              className="px-3 py-2 text-xs border border-white/15 bg-white/5 text-[#FAF8F5] hover:border-[#F59E0B] flex items-center gap-1.5"
            >
              <Settings2 className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Edit Site</span>
            </button>

            <button
              onClick={onLaunchNewRunInWorkspace}
              className="px-4 py-2 bg-[#F59E0B] text-[#18181B] text-xs font-semibold"
            >
              + New Run
            </button>
          </div>
        </div>

        {/* Run Selector Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 font-mono-tech text-xs">
          {!compareMode ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[#A1A1AA]">Select Historical Run:</span>
              <select
                value={singleRunId}
                onChange={(e) => setSingleRunId(e.target.value)}
                className="px-3 py-1.5 bg-[#121215] text-[#FAF8F5] border border-white/20 font-semibold"
              >
                {HISTORICAL_RUNS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} — {r.config.systemCapacityKw} kW ·{' '}
                    {r.config.gridConnection} ({r.timestamp})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[#F59E0B] font-semibold">
                  Base Run:
                </span>
                <select
                  value={baseRunId}
                  onChange={(e) => setBaseRunId(e.target.value)}
                  className="px-3 py-1.5 bg-[#121215] text-[#FAF8F5] border border-[#F59E0B] font-semibold"
                >
                  {HISTORICAL_RUNS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label} ({r.config.systemCapacityKw} kW{' '}
                      {r.config.gridConnection})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-[#A1A1AA]">vs.</span>

              <div className="flex items-center gap-2">
                <span className="text-[#0EA5E9]">Compared Run:</span>
                <select
                  value={compareRunId}
                  onChange={(e) => setCompareRunId(e.target.value)}
                  className="px-3 py-1.5 bg-[#121215] text-[#FAF8F5] border border-[#0EA5E9]"
                >
                  {HISTORICAL_RUNS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label} ({r.config.systemCapacityKw} kW{' '}
                      {r.config.gridConnection})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="text-[#A1A1AA] font-sans">{activeRun.summaryNote}</div>
        </div>
      </div>

      {/* 2. CONFIGURATION DIFF STRIP */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x ${palette.divide} border-b ${palette.rule} ${palette.well} font-mono-tech text-xs`}
      >
        <div className="p-4">
          <div className={palette.subInk}>System capacity</div>
          {compareMode ? (
            <div className="mt-1 font-bold text-sm">
              <span className={palette.subInk}>
                {comparedRun.config.systemCapacityKw.toFixed(1)} kW
              </span>
              <span className="mx-2 text-[#D97706]">→</span>
              <span>{baseRun.config.systemCapacityKw.toFixed(1)} kW</span>
            </div>
          ) : (
            <div className="mt-1 font-bold text-sm">
              {activeRun.config.systemCapacityKw.toFixed(1)} kW (
              {activeRun.config.installationType})
            </div>
          )}
        </div>

        <div className="p-4">
          <div className={palette.subInk}>Grid &amp; storage topology</div>
          {compareMode ? (
            <div className="mt-1 font-bold text-sm">
              <span className={palette.subInk}>
                {comparedRun.config.gridConnection}
              </span>
              <span className="mx-2 text-[#D97706]">→</span>
              <span>{baseRun.config.gridConnection}</span>
            </div>
          ) : (
            <div className="mt-1 font-bold text-sm">
              {activeRun.config.gridConnection}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className={palette.subInk}>Panel efficiency</div>
          {compareMode ? (
            <div className="mt-1 font-bold text-sm">
              <span className={palette.subInk}>
                {comparedRun.config.panelTechnology}
              </span>
              <span className="mx-2 text-[#D97706]">→</span>
              <span>
                {baseRun.config.panelTechnology} (PR{' '}
                {baseRun.config.performanceRatio})
              </span>
            </div>
          ) : (
            <div className="mt-1 font-bold text-sm">
              {activeRun.config.panelTechnologyFull}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className={palette.subInk}>Subsidy applied</div>
          {compareMode ? (
            <div className="mt-1 font-bold text-sm">
              <span className={palette.subInk}>
                {comparedRun.config.incentiveSummary}
              </span>
              <span className="mx-2 text-[#D97706]">→</span>
              <span className="text-[#16A34A]">
                {baseRun.config.incentiveSummary} (-$
                {baseRun.result.incentiveAmountUsd})
              </span>
            </div>
          ) : (
            <div className="mt-1 font-bold text-sm text-[#16A34A]">
              {activeRun.config.incentiveSummary}
            </div>
          )}
        </div>
      </div>

      {/* 3. PRIMARY KPI LEDGER WITH INLINE SEMANTIC DIFF BADGES */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-x ${palette.divide} border-b ${palette.rule} ${palette.plane}`}
      >
        <div className="p-6">
          <div className={`text-xs ${palette.subInk}`}>
            Annual &amp; monthly bill savings
          </div>
          <div className="mt-2 flex flex-wrap items-baseline">
            <span className="font-mono-tech text-3xl font-bold text-[#16A34A]">
              ${activeRun.result.annualSavingsUsd.toLocaleString()}/yr
            </span>
            {renderDiffBadge(
              baseRun.result.annualSavingsUsd,
              comparedRun.result.annualSavingsUsd,
              '/yr',
              '$',
              false,
              true
            )}
          </div>
          <div className={`font-mono-tech text-xs ${palette.subInk} mt-1.5`}>
            ~${activeRun.result.monthlySavingsUsd}/mo saved · Tariff $
            {activeRun.config.tariffUsd}/kWh
          </div>
        </div>

        <div className="p-6">
          <div className={`text-xs ${palette.subInk}`}>
            <RichTooltip termKey="payback">Simple payback crossover</RichTooltip>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline">
            <span className="font-mono-tech text-3xl font-bold">
              {activeRun.result.simplePaybackYears} yrs
            </span>
            {renderDiffBadge(
              baseRun.result.simplePaybackYears,
              comparedRun.result.simplePaybackYears,
              ' yrs',
              '',
              true,
              false
            )}
          </div>
          <div className={`font-mono-tech text-xs ${palette.subInk} mt-1.5`}>
            25-Yr ROI: {activeRun.result.lifetimeRoiPct}%
            {renderDiffBadge(
              baseRun.result.lifetimeRoiPct,
              comparedRun.result.lifetimeRoiPct,
              '%',
              '',
              false,
              false
            )}
          </div>
        </div>

        <div className="p-6">
          <div className={`text-xs ${palette.subInk}`}>
            Net cost after subsidy
          </div>
          <div className="mt-2 flex flex-wrap items-baseline">
            <span className="font-mono-tech text-3xl font-bold">
              ${activeRun.result.netSystemCostUsd.toLocaleString()}
            </span>
            {renderDiffBadge(
              baseRun.result.netSystemCostUsd,
              comparedRun.result.netSystemCostUsd,
              '',
              '$',
              true,
              false
            )}
          </div>
          <div className={`font-mono-tech text-xs ${palette.subInk} mt-1.5`}>
            Gross ${activeRun.result.totalSystemCostUsd.toLocaleString()} ·
            Subsidy -${activeRun.result.incentiveAmountUsd.toLocaleString()}
          </div>
        </div>

        <div className={`p-6 border-t ${palette.rule}`}>
          <div className={`text-xs ${palette.subInk}`}>
            Annual solar electricity generated
          </div>
          <div className="mt-2 flex flex-wrap items-baseline">
            <span className="font-mono-tech text-3xl font-bold">
              {activeRun.result.annualEnergyKwh.toLocaleString()} kWh/yr
            </span>
            {renderDiffBadge(
              baseRun.result.annualEnergyKwh,
              comparedRun.result.annualEnergyKwh,
              ' kWh',
              '',
              false,
              true
            )}
          </div>
          <div className={`font-mono-tech text-xs ${palette.subInk} mt-1.5`}>
            <RichTooltip termKey="specific_yield">
              {activeRun.result.specificYieldKwhPerKw} kWh/kWp
            </RichTooltip>{' '}
            · Capacity factor {activeRun.result.capacityFactorPct}%
          </div>
        </div>

        <div className={`p-6 border-t ${palette.rule}`}>
          <div className={`text-xs ${palette.subInk}`}>
            <RichTooltip termKey="lcoe">
              Levelized cost of energy (25-yr LCOE)
            </RichTooltip>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline">
            <span className="font-mono-tech text-3xl font-bold text-[#0EA5E9]">
              ${activeRun.result.lcoeUsdPerKwh}/kWh
            </span>
            {renderDiffBadge(
              baseRun.result.lcoeUsdPerKwh,
              comparedRun.result.lcoeUsdPerKwh,
              '/kWh',
              '$',
              true,
              false
            )}
          </div>
          <div className={`font-mono-tech text-xs ${palette.subInk} mt-1.5`}>
            Solar self-consumption: {activeRun.result.selfConsumptionPct}%
            {renderDiffBadge(
              baseRun.result.selfConsumptionPct,
              comparedRun.result.selfConsumptionPct,
              '%',
              '',
              false,
              false
            )}
          </div>
        </div>

        <div className={`p-6 border-t ${palette.rule}`}>
          <div className={`text-xs ${palette.subInk}`}>
            Panels &amp; roof area needed
          </div>
          <div className="mt-2 flex flex-wrap items-baseline">
            <span className="font-mono-tech text-3xl font-bold">
              {activeRun.result.numPanels} panels
            </span>
            {renderDiffBadge(
              baseRun.result.numPanels,
              comparedRun.result.numPanels,
              ' panels',
              '',
              false,
              false
            )}
          </div>
          <div className={`font-mono-tech text-xs ${palette.subInk} mt-1.5`}>
            {formatArea(activeRun.result.totalPanelAreaM2, true)} ·{' '}
            {activeRun.result.optimalTiltDeg}° {activeRun.result.azimuthDirection}
          </div>
        </div>
      </div>

      {/* 4. OVERLAID 12-MONTH & 25-YEAR COMPARISON CHARTS */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${palette.divide} border-b ${palette.rule} ${palette.plane}`}
      >
        <div className="lg:col-span-6 p-6 lg:p-8">
          <h2 className="font-editorial text-2xl font-medium">
            12-Month Solar Generation Overlay (kWh/mo)
          </h2>
          <p className={`text-xs ${palette.subInk} mb-4`}>
            {compareMode
              ? `Solid Solar Amber = ${baseRun.label} · Dashed Sky Blue = ${comparedRun.label}`
              : 'Monthly electricity generated across the year'}
          </p>
          <div className="h-56">
            <DirectorRunCompareMonthlyChart
              baseSeries={activeRun.result.monthlyYieldKwh}
              compareSeries={
                compareMode ? comparedRun.result.monthlyYieldKwh : null
              }
              palette={palette}
            />
          </div>
        </div>

        <div className="lg:col-span-6 p-6 lg:p-8">
          <h2 className="font-editorial text-2xl font-medium">
            25-Year Payback Crossover Overlay ($)
          </h2>
          <p className={`text-xs ${palette.subInk} mb-4`}>
            {compareMode
              ? `Solid Emerald = ${baseRun.label} (${baseRun.result.simplePaybackYears}y) · Dashed Amber = ${comparedRun.label} (${comparedRun.result.simplePaybackYears}y)`
              : 'Cumulative net cashflow over 25 years'}
          </p>
          <div className="h-56">
            <DirectorRunCompareCashflowChart
              baseRun={activeRun}
              comparedRun={compareMode ? comparedRun : null}
              palette={palette}
            />
          </div>
        </div>
      </div>

      {/* 5. ITEMIZED CAPEX, SUBSIDY & LFP STORAGE LEDGER */}
      <div className={`p-6 lg:p-8 border-b ${palette.rule} ${palette.plane}`}>
        <h2 className="font-editorial text-2xl font-medium mb-4">
          Itemized Capex, Subsidy &amp; LFP Storage Ledger
        </h2>
        <div className="h-4 w-full flex overflow-hidden rounded-xs border border-black/10 mb-4">
          <div style={{ width: '44%' }} className="bg-[#18181B]" />
          <div style={{ width: '13%' }} className="bg-[#0EA5E9]" />
          <div style={{ width: '11%' }} className="bg-[#38BDF8]" />
          <div style={{ width: '8%' }} className="bg-[#71717A]" />
          <div style={{ width: '24%' }} className="bg-[#F59E0B]" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 font-mono-tech text-xs">
          <div>
            <span className="inline-block w-2.5 h-2.5 bg-[#18181B] mr-1.5" />
            <span className={palette.subInk}>Modules: </span>
            <span className="font-bold">
              ${activeRun.result.moduleCostUsd.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="inline-block w-2.5 h-2.5 bg-[#0EA5E9] mr-1.5" />
            <span className={palette.subInk}>Inverter: </span>
            <span className="font-bold">
              ${activeRun.result.inverterCostUsd.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="inline-block w-2.5 h-2.5 bg-[#38BDF8] mr-1.5" />
            <span className={palette.subInk}>BOS &amp; Racking: </span>
            <span className="font-bold">
              ${activeRun.result.bosCostUsd.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="inline-block w-2.5 h-2.5 bg-[#71717A] mr-1.5" />
            <span className={palette.subInk}>Permits/Soft: </span>
            <span className="font-bold">
              ${activeRun.result.softCostUsd.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="inline-block w-2.5 h-2.5 bg-[#F59E0B] mr-1.5" />
            <span className={palette.subInk}>LFP Storage: </span>
            <span className="font-bold">
              ${activeRun.result.batteryCostUsd.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 6. ENGINEER VIEW: WEATHER TELEMETRY, CALCULATION TRACE & CITED GUIDES */}
      {readingDepth === 'detailed' && (
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${palette.divide} ${palette.well}`}
        >
          <div className="lg:col-span-6 p-6 lg:p-8 space-y-4">
            <h3 className="font-editorial text-xl font-medium">
              Satellite Weather Telemetry &amp; Calculation Trace
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-tech text-xs">
              <div>
                <div className={palette.subInk}>Ambient Temp</div>
                <div className="font-bold mt-0.5">
                  {formatTemp(activeRun.result.tempC)}
                </div>
              </div>
              <div>
                <div className={palette.subInk}>Wind Velocity</div>
                <div className="font-bold mt-0.5">
                  {formatWind(activeRun.result.windSpeedMs)}
                </div>
              </div>
              <div>
                <div className={palette.subInk}>Relative Humidity</div>
                <div className="font-bold mt-0.5">{activeRun.result.humidityPct}%</div>
              </div>
              <div>
                <div className={palette.subInk}>R² / RMSE</div>
                <div className="font-bold mt-0.5">
                  {activeRun.result.r2Accuracy}% · {activeRun.result.rmse}
                </div>
              </div>
            </div>
            <div
              className={`p-3 ${palette.plane} border ${palette.rule} font-mono-tech text-xs space-y-1`}
            >
              <div>
                1. E_annual = {activeRun.config.systemCapacityKw} kW ×{' '}
                {activeRun.result.predictionIrradiance} kWh/m²/d × 365 × PR{' '}
                {activeRun.config.performanceRatio} ={' '}
                <strong>
                  {activeRun.result.annualEnergyKwh.toLocaleString()} kWh/yr
                </strong>
              </div>
              <div>
                2. Net_Capex = ${activeRun.result.totalSystemCostUsd.toLocaleString()}{' '}
                - ${activeRun.result.incentiveAmountUsd.toLocaleString()} ={' '}
                <strong>
                  ${activeRun.result.netSystemCostUsd.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-6 lg:p-8 space-y-3">
            <h3 className="font-editorial text-xl font-medium">
              Cited Engineering Guides
            </h3>
            <div className={`divide-y ${palette.divide} text-xs`}>
              {CITED_GUIDES.map((g) => (
                <div
                  key={g.id}
                  className="py-2 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="font-mono-tech font-bold text-[#D97706] mr-2">
                      [{g.code}]
                    </span>
                    <span className="font-medium">{g.title}</span>
                    <div className={`text-[11px] ${palette.subInk}`}>
                      {g.section}
                    </div>
                  </div>
                  <span className="font-mono-tech text-[11px] shrink-0">
                    {g.year}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Site Defaults Drawer */}
      {editDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#18181B]/60">
          <div
            className={`w-full max-w-md h-full ${palette.plane} border-l ${palette.rule} p-6 flex flex-col justify-between`}
          >
            <div>
              <div
                className={`flex items-center justify-between pb-4 border-b ${palette.rule}`}
              >
                <h3 className="font-editorial text-xl font-medium">
                  Edit Saved Site Defaults
                </h3>
                <button onClick={() => setEditDrawerOpen(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4 mt-6 text-xs">
                <div>
                  <label className={`block ${palette.subInk} mb-1`}>
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    className={`w-full px-3 py-2 border ${palette.rule} ${palette.well}`}
                  />
                </div>
                <div>
                  <label className={`block ${palette.subInk} mb-1`}>
                    Default Electricity Tariff ($/kWh)
                  </label>
                  <input
                    type="number"
                    defaultValue={0.08}
                    step={0.01}
                    className={`w-full px-3 py-2 font-mono-tech border ${palette.rule} ${palette.well}`}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => setEditDrawerOpen(false)}
              className="w-full py-3 bg-[#F59E0B] text-[#18181B] font-semibold text-xs uppercase tracking-wider"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SURFACE 4: SAVED SITES & PORTFOLIO ANALYTICS (WITH ICON BUTTON TOOLTIPS)
// ============================================================================

function SurfacePortfolio({
  palette,
  readingDepth,
  formatArea,
  portfolioView,
  setPortfolioView,
  onSelectSiteForDiff,
  onReanalyseSite,
  onExportCsv
}) {
  return (
    <div>
      <div className="bg-[#18181B] text-[#FAF8F5] p-6 lg:p-8 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-3xl font-medium">
            Saved Solar Sites &amp; Portfolio Benchmark
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Compare saved locations, launch new runs, or export your portfolio to CSV.
          </p>
        </div>

        {/* Icon Buttons with Hover Tooltips */}
        <div className="flex items-center gap-3">
          <div className="inline-flex border border-white/15 bg-[#09090B] p-0.5">
            <IconButtonTooltip
              label="Table View"
              active={portfolioView === 'ledger'}
              onClick={() => setPortfolioView('ledger')}
            >
              <Table2 className="w-4 h-4" />
            </IconButtonTooltip>

            <IconButtonTooltip
              label="Site Cards"
              active={portfolioView === 'cards'}
              onClick={() => setPortfolioView('cards')}
            >
              <LayoutGrid className="w-4 h-4" />
            </IconButtonTooltip>

            <IconButtonTooltip
              label="Yield Benchmark"
              active={portfolioView === 'benchmark'}
              onClick={() => setPortfolioView('benchmark')}
            >
              <BarChart3 className="w-4 h-4" />
            </IconButtonTooltip>
          </div>

          <button
            onClick={onExportCsv}
            className="px-3.5 py-2 bg-white/10 text-[#FAF8F5] border border-white/15 hover:border-[#F59E0B] text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {portfolioView === 'ledger' && (
        <div className="overflow-x-auto">
          <table
            className={`w-full text-left border-collapse text-xs divide-y ${palette.divide}`}
          >
            <thead className={`${palette.well} uppercase text-[11px] ${palette.subInk}`}>
              <tr>
                <th className="py-3.5 px-6">Saved Site</th>
                <th className="py-3.5 px-4">Coordinates</th>
                <th className="py-3.5 px-4">System Size</th>
                <th className="py-3.5 px-4">Roof Area</th>
                <th className="py-3.5 px-4">Sunlight</th>
                {readingDepth === 'detailed' && (
                  <th className="py-3.5 px-4">Specific Yield</th>
                )}
                <th className="py-3.5 px-4">Monthly Savings</th>
                <th className="py-3.5 px-4">Payback</th>
                <th className="py-3.5 px-4">Runs</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${palette.divide} ${palette.plane} font-mono-tech`}>
              {REFERENCE_SITES.map((s) => {
                const c = computeHeliodonAndFinancials({
                  site: s,
                  setupMode: 'engineering',
                  planningScale: s.scale,
                  goal: s.goal,
                  monthlyBillUsd: s.monthlyBillUsd,
                  availableRoofAreaM2: s.roofAreaM2,
                  tiltDeg: s.optimalTiltDeg,
                  systemCapacityKw: s.systemCapacityKw,
                  installationType: s.installationType,
                  panelTechnology: s.panelTechnology,
                  gridConnection: s.gridConnection,
                  batteryCapacityKwh: s.batteryCapacityKwh,
                  region: s.region,
                  tariffUsd: s.tariffUsd,
                  includeIncentives: s.includeIncentives,
                  performanceRatio: s.performanceRatio
                });

                return (
                  <tr key={s.id} className={`${palette.hoverPlane} transition-colors`}>
                    <td className="py-4 px-6 font-sans">
                      <div className="font-editorial text-base font-medium">
                        {s.name}
                      </div>
                      <div className={`text-xs ${palette.subInk}`}>
                        {s.locationLabel}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {s.lat.toFixed(2)}°N, {Math.abs(s.lon).toFixed(2)}°
                      {s.lon >= 0 ? 'E' : 'W'}
                    </td>
                    <td className="py-4 px-4 font-bold">{s.systemCapacityKw} kW</td>
                    <td className="py-4 px-4">{formatArea(s.roofAreaM2)}</td>
                    <td className="py-4 px-4 font-semibold text-[#D97706]">
                      {s.irradianceDaily} kWh/m²/d
                    </td>
                    {readingDepth === 'detailed' && (
                      <td className="py-4 px-4">
                        {c.specificYieldPerKw.toLocaleString()} kWh/kWp
                      </td>
                    )}
                    <td className="py-4 px-4 font-bold text-[#16A34A]">
                      ~${c.monthlySavingsUsd.toLocaleString()}/mo
                    </td>
                    <td className="py-4 px-4">{c.simplePaybackYears} yrs</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 ${palette.well}`}>
                        {s.runCount} runs
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap font-sans">
                      <button
                        onClick={() => onReanalyseSite(s)}
                        className={`px-2.5 py-1.5 border ${palette.rule} ${palette.well}`}
                      >
                        Re-analyse
                      </button>
                      <button
                        onClick={() => onSelectSiteForDiff(s)}
                        className="px-3 py-1.5 bg-[#F59E0B] text-[#18181B] font-semibold"
                      >
                        Open Site →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {portfolioView === 'cards' && (
        <div className="p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {REFERENCE_SITES.map((s) => {
            const c = computeHeliodonAndFinancials({
              site: s,
              setupMode: 'engineering',
              planningScale: s.scale,
              goal: s.goal,
              monthlyBillUsd: s.monthlyBillUsd,
              availableRoofAreaM2: s.roofAreaM2,
              tiltDeg: s.optimalTiltDeg,
              systemCapacityKw: s.systemCapacityKw,
              installationType: s.installationType,
              panelTechnology: s.panelTechnology,
              gridConnection: s.gridConnection,
              batteryCapacityKwh: s.batteryCapacityKwh,
              region: s.region,
              tariffUsd: s.tariffUsd,
              includeIncentives: s.includeIncentives,
              performanceRatio: s.performanceRatio
            });

            return (
              <div
                key={s.id}
                onClick={() => onSelectSiteForDiff(s)}
                role="button"
                tabIndex={0}
                className={`p-6 border ${palette.rule} ${palette.plane} hover:border-[#F59E0B] transition-colors cursor-pointer flex flex-col justify-between group`}
              >
                <div>
                  <div className="flex items-center justify-between font-mono-tech text-xs mb-2">
                    <span className="text-[#D97706] font-semibold">
                      {s.code} · {s.lat.toFixed(2)}°N, {Math.abs(s.lon).toFixed(2)}°
                      {s.lon >= 0 ? 'E' : 'W'}
                    </span>
                    <span className={`px-2 py-0.5 ${palette.well}`}>
                      {s.runCount} Historical Runs
                    </span>
                  </div>
                  <h2 className="font-editorial text-2xl font-medium group-hover:text-[#D97706]">
                    {s.name}
                  </h2>
                  <p className={`text-xs ${palette.subInk} mt-0.5`}>
                    {s.locationLabel}
                  </p>
                </div>

                <div
                  className={`my-5 py-4 border-y ${palette.rule} grid grid-cols-4 gap-3 font-mono-tech text-xs`}
                >
                  <div>
                    <div className={palette.subInk}>System</div>
                    <div className="font-bold mt-0.5">{s.systemCapacityKw} kW</div>
                  </div>
                  <div>
                    <div className={palette.subInk}>Roof Footprint</div>
                    <div className="font-bold mt-0.5">
                      {formatArea(s.roofAreaM2)}
                    </div>
                  </div>
                  <div>
                    <div className={palette.subInk}>Savings</div>
                    <div className="font-bold text-[#16A34A] mt-0.5">
                      ~${c.monthlySavingsUsd.toLocaleString()}/mo
                    </div>
                  </div>
                  <div>
                    <div className={palette.subInk}>Payback</div>
                    <div className="font-bold mt-0.5">
                      {c.simplePaybackYears} yrs
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReanalyseSite(s);
                    }}
                    className={`px-3 py-1.5 border ${palette.rule} ${palette.well} hover:border-[#F59E0B]`}
                  >
                    Re-analyse in Planner
                  </button>
                  <span className="font-semibold text-[#D97706] flex items-center gap-1">
                    <span>Open Site Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {portfolioView === 'benchmark' && (
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${palette.divide} ${palette.plane}`}
        >
          <div className="lg:col-span-7 p-6 lg:p-8 space-y-5">
            <h2 className="font-editorial text-2xl font-medium">
              Specific Yield Benchmark (
              <RichTooltip termKey="specific_yield">kWh/kWp/yr</RichTooltip>)
            </h2>
            <div className="space-y-4 font-mono-tech text-xs">
              {REFERENCE_SITES.map((s) => {
                const c = computeHeliodonAndFinancials({
                  site: s,
                  setupMode: 'engineering',
                  planningScale: s.scale,
                  goal: s.goal,
                  monthlyBillUsd: s.monthlyBillUsd,
                  availableRoofAreaM2: s.roofAreaM2,
                  tiltDeg: s.optimalTiltDeg,
                  systemCapacityKw: s.systemCapacityKw,
                  installationType: s.installationType,
                  panelTechnology: s.panelTechnology,
                  gridConnection: s.gridConnection,
                  batteryCapacityKwh: s.batteryCapacityKwh,
                  region: s.region,
                  tariffUsd: s.tariffUsd,
                  includeIncentives: s.includeIncentives,
                  performanceRatio: s.performanceRatio
                });
                const barWidth = Math.min(
                  100,
                  Math.round((c.specificYieldPerKw / 2000) * 100)
                );

                return (
                  <div key={s.id} className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-semibold">
                        {s.name} ({s.code})
                      </span>
                      <span className="font-bold text-[#D97706]">
                        {c.specificYieldPerKw.toLocaleString()} kWh/kWp ·{' '}
                        {s.irradianceDaily} kWh/m²/d
                      </span>
                    </div>
                    <div className={`w-full h-3.5 ${palette.well} border ${palette.rule}`}>
                      <div
                        className="h-full bg-[#F59E0B]"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 p-6 lg:p-8 space-y-4">
            <h2 className="font-editorial text-2xl font-medium">
              Portfolio Insights
            </h2>
            <p className="text-sm leading-relaxed">
              Phoenix (1,829 kWh/kWp) and Gujarat (1,771 kWh/kWp) generate the highest annual output per installed kilowatt due to consistent clear-sky irradiance.
            </p>
            <p className="text-sm leading-relaxed">
              Munich (1,115 kWh/kWp) and Jaipur (1,706 kWh/kWp) achieve rapid payback crossover thanks to higher retail electricity tariffs ($0.26/kWh in Bavaria) and India’s direct PM Surya Ghar capital subsidy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SURFACE 5: PROFILE, UNITS & PLANNER PREFERENCES (ZERO NESTED CARDS)
// ============================================================================

function SurfaceProfilePreferences({
  palette,
  readingDepth,
  onToggleReadingDepth,
  areaUnit,
  setAreaUnit,
  tempUnit,
  setTempUnit,
  windUnit,
  setWindUnit,
  userProfile,
  setUserProfile,
  defaultPrefs,
  setDefaultPrefs,
  showRssFeed,
  setShowRssFeed,
  showOodWarnings,
  setShowOodWarnings,
  onApplyDefaultsToPlanner,
  onNavigateToPlanner
}) {
  const [savedNotice, setSavedNotice] = useState('');

  const triggerNotice = (msg) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(''), 3000);
  };

  const handleResetPreferences = () => {
    setAreaUnit('m2');
    setTempUnit('C');
    setWindUnit('ms');
    onToggleReadingDepth('simple');
    setDefaultPrefs({
      defaultScale: 'homeowner',
      defaultRegion: 'india',
      defaultTariffUsd: 0.08,
      defaultPerformanceRatio: 0.78,
      defaultModel: 'hist_gradient_boosting',
      autoApplySubsidies: true
    });
    setShowRssFeed(true);
    setShowOodWarnings(true);
    triggerNotice('All measurement units and planner defaults reset to factory baseline.');
  };

  return (
    <div>
      {/* 1. ARCHITECTURAL HEADER BANNER */}
      <div className="bg-[#18181B] text-[#FAF8F5] p-6 lg:p-8 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#F59E0B] text-[#18181B] font-mono-tech font-bold text-lg flex items-center justify-center">
            {userProfile.initials}
          </div>
          <div>
            <h1 className="font-editorial text-3xl font-medium">
              Profile, Measurement Units &amp; Planner Defaults
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-1">
              {userProfile.fullName} · {userProfile.roleTitle} ·{' '}
              {userProfile.organization}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {savedNotice && (
            <span className="px-3 py-1.5 bg-[#16A34A]/20 border border-[#16A34A] text-[#16A34A] text-xs font-mono-tech flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>{savedNotice}</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleResetPreferences}
            className="px-3.5 py-2 border border-white/15 bg-white/5 text-[#A1A1AA] hover:text-white text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Preferences</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onApplyDefaultsToPlanner();
              triggerNotice('Defaults applied to active Solar Planner session.');
            }}
            className="px-4 py-2 bg-[#F59E0B] text-[#18181B] font-semibold text-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Apply Defaults to Active Planner</span>
          </button>
        </div>
      </div>

      {/* 2. SECTION A: MEASUREMENT & TELEMETRY UNITS (LIVE GLOBAL CONVERSION) */}
      <div className={`border-b ${palette.rule} ${palette.plane}`}>
        <div className={`px-6 lg:px-8 py-4 ${palette.well} border-b ${palette.rule} flex items-center justify-between`}>
          <div>
            <h2 className="font-editorial text-xl font-medium">
              Measurement &amp; Telemetry Units
            </h2>
            <p className={`text-xs ${palette.subInk}`}>
              Changes immediately convert roof footprints, ambient temperatures, and wind speeds across all screens.
            </p>
          </div>
          <span className="font-mono-tech text-xs px-2.5 py-1 bg-[#18181B] text-[#F59E0B]">
            Active: {areaUnit === 'm2' ? 'm²' : 'sq ft'} · °{tempUnit} ·{' '}
            {windUnit === 'ms' ? 'm/s' : windUnit === 'kmh' ? 'km/h' : 'mph'}
          </span>
        </div>

        <div
          className={`grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x ${palette.divide}`}
        >
          {/* Surface Area Unit */}
          <div className="p-6 lg:p-8 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Roof &amp; Array Surface Area</span>
              <span className={`font-mono-tech text-[11px] ${palette.subInk}`}>
                1 m² = 10.764 sq ft
              </span>
            </div>
            <div
              className={`grid grid-cols-2 border ${palette.rule} divide-x ${palette.divide} text-xs`}
            >
              <button
                type="button"
                onClick={() => {
                  setAreaUnit('m2');
                  triggerNotice('Surface area unit set to Square Meters (m²).');
                }}
                className={`py-2.5 px-3 font-mono-tech transition-colors ${
                  areaUnit === 'm2'
                    ? 'bg-[#18181B] text-[#FAF8F5] font-semibold'
                    : palette.hoverPlane
                }`}
              >
                Square Meters (m²)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAreaUnit('sqft');
                  triggerNotice('Surface area unit set to Square Feet (sq ft).');
                }}
                className={`py-2.5 px-3 font-mono-tech transition-colors ${
                  areaUnit === 'sqft'
                    ? 'bg-[#18181B] text-[#FAF8F5] font-semibold'
                    : palette.hoverPlane
                }`}
              >
                Square Feet (sq ft)
              </button>
            </div>
            <p className={`text-xs ${palette.subInk}`}>
              Controls roof sliders on Overview, Solar Planner, and Site Analysis geometry ledgers.
            </p>
          </div>

          {/* Ambient Temperature Unit */}
          <div className="p-6 lg:p-8 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Ambient &amp; Cell Temperature</span>
              <span className={`font-mono-tech text-[11px] ${palette.subInk}`}>
                °F = (°C × 9/5) + 32
              </span>
            </div>
            <div
              className={`grid grid-cols-2 border ${palette.rule} divide-x ${palette.divide} text-xs`}
            >
              <button
                type="button"
                onClick={() => {
                  setTempUnit('C');
                  triggerNotice('Temperature unit set to Celsius (°C).');
                }}
                className={`py-2.5 px-3 font-mono-tech transition-colors ${
                  tempUnit === 'C'
                    ? 'bg-[#18181B] text-[#FAF8F5] font-semibold'
                    : palette.hoverPlane
                }`}
              >
                Celsius (°C)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTempUnit('F');
                  triggerNotice('Temperature unit set to Fahrenheit (°F).');
                }}
                className={`py-2.5 px-3 font-mono-tech transition-colors ${
                  tempUnit === 'F'
                    ? 'bg-[#18181B] text-[#FAF8F5] font-semibold'
                    : palette.hoverPlane
                }`}
              >
                Fahrenheit (°F)
              </button>
            </div>
            <p className={`text-xs ${palette.subInk}`}>
              Updates 12-month climate series and thermal derating readouts.
            </p>
          </div>

          {/* Wind Speed Unit */}
          <div className="p-6 lg:p-8 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Wind Velocity Telemetry</span>
              <span className={`font-mono-tech text-[11px] ${palette.subInk}`}>
                Convective cooling
              </span>
            </div>
            <div
              className={`grid grid-cols-3 border ${palette.rule} divide-x ${palette.divide} text-xs`}
            >
              {[
                { id: 'ms', label: 'm/s' },
                { id: 'kmh', label: 'km/h' },
                { id: 'mph', label: 'mph' }
              ].map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setWindUnit(w.id);
                    triggerNotice(`Wind speed unit set to ${w.label}.`);
                  }}
                  className={`py-2.5 px-2 font-mono-tech transition-colors ${
                    windUnit === w.id
                      ? 'bg-[#18181B] text-[#FAF8F5] font-semibold'
                      : palette.hoverPlane
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <p className={`text-xs ${palette.subInk}`}>
              Used in NASA POWER surface wind speed telemetry and panel cooling calculations.
            </p>
          </div>
        </div>
      </div>

      {/* 3. SECTION B: PLANNER DEFAULTS & SIMULATION BASELINE */}
      <div className={`border-b ${palette.rule} ${palette.plane}`}>
        <div className={`px-6 lg:px-8 py-4 ${palette.well} border-b ${palette.rule} flex items-center justify-between`}>
          <div>
            <h2 className="font-editorial text-xl font-medium">
              Planner Defaults &amp; Simulation Baseline
            </h2>
            <p className={`text-xs ${palette.subInk}`}>
              Configure your default experience depth, regional subsidy framework, and engineering assumptions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onApplyDefaultsToPlanner();
              onNavigateToPlanner();
            }}
            className="text-xs font-mono-tech font-semibold text-[#D97706] hover:underline flex items-center gap-1"
          >
            <span>Push Defaults &amp; Open Planner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-x ${palette.divide}`}
        >
          {/* Default Experience Depth */}
          <div className="p-6 lg:p-8 space-y-3">
            <label className="block text-xs font-semibold">
              Default Interface Complexity
            </label>
            <div
              className={`grid grid-cols-2 border ${palette.rule} divide-x ${palette.divide} text-xs`}
            >
              <button
                type="button"
                onClick={() => onToggleReadingDepth('simple')}
                className={`py-2.5 px-3 transition-colors ${
                  readingDepth === 'simple'
                    ? 'bg-[#F59E0B] text-[#18181B] font-semibold'
                    : palette.hoverPlane
                }`}
              >
                Simple (Homeowner)
              </button>
              <button
                type="button"
                onClick={() => onToggleReadingDepth('detailed')}
                className={`py-2.5 px-3 transition-colors ${
                  readingDepth === 'detailed'
                    ? 'bg-[#F59E0B] text-[#18181B] font-semibold'
                    : palette.hoverPlane
                }`}
              >
                Engineer (Detailed)
              </button>
            </div>
            <p className={`text-xs ${palette.subInk}`}>
              Simple mode focuses on bill savings and roof fit; Engineer mode unlocks R², RMSE, LCOE, and custom hardware controls.
            </p>
          </div>

          {/* Default Planning Scale */}
          <div className="p-6 lg:p-8 space-y-3">
            <label className="block text-xs font-semibold">
              Default Property Scale Tier
            </label>
            <div
              className={`grid grid-cols-3 border ${palette.rule} divide-x ${palette.divide} text-xs`}
            >
              {[
                { id: 'homeowner', label: 'Home' },
                { id: 'small_business', label: 'Business' },
                { id: 'industrial', label: 'Industrial' }
              ].map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() =>
                    setDefaultPrefs((p) => ({ ...p, defaultScale: sc.id }))
                  }
                  className={`py-2.5 px-2 transition-colors ${
                    defaultPrefs.defaultScale === sc.id
                      ? 'bg-[#18181B] text-[#FAF8F5] font-semibold'
                      : palette.hoverPlane
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
            <p className={`text-xs ${palette.subInk}`}>
              Pre-selects system sizing range (1–15 kW, 15–100 kW, or 100 kW–5 MW).
            </p>
          </div>

          {/* Default Region & Subsidy Framework */}
          <div className="p-6 lg:p-8 space-y-3">
            <label className="block text-xs font-semibold">
              Default Region &amp; Subsidy Framework
            </label>
            <div
              className={`grid grid-cols-4 border ${palette.rule} divide-x ${palette.divide} text-xs uppercase font-mono-tech`}
            >
              {['india', 'usa', 'europe', 'global'].map((reg) => (
                <button
                  key={reg}
                  type="button"
                  onClick={() =>
                    setDefaultPrefs((p) => ({ ...p, defaultRegion: reg }))
                  }
                  className={`py-2.5 transition-colors ${
                    defaultPrefs.defaultRegion === reg
                      ? 'bg-[#18181B] text-[#FAF8F5] font-semibold'
                      : palette.hoverPlane
                  }`}
                >
                  {reg}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between pt-2 cursor-pointer text-xs">
              <span>Auto-apply regional government subsidies</span>
              <input
                type="checkbox"
                checked={defaultPrefs.autoApplySubsidies}
                onChange={(e) =>
                  setDefaultPrefs((p) => ({
                    ...p,
                    autoApplySubsidies: e.target.checked
                  }))
                }
                className="w-4 h-4 accent-[#F59E0B]"
              />
            </label>
          </div>

          {/* Default Electricity Tariff */}
          <div className={`p-6 lg:p-8 space-y-3 border-t ${palette.rule}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Default Electricity Tariff ($/kWh)</span>
              <span className="font-mono-tech font-bold text-sm">
                ${defaultPrefs.defaultTariffUsd.toFixed(2)}/kWh
              </span>
            </div>
            <input
              type="range"
              min={0.03}
              max={0.5}
              step={0.01}
              value={defaultPrefs.defaultTariffUsd}
              onChange={(e) =>
                setDefaultPrefs((p) => ({
                  ...p,
                  defaultTariffUsd: Number(e.target.value)
                }))
              }
              className="w-full zenith-slider"
            />
            <div className={`flex justify-between font-mono-tech text-[10px] ${palette.subInk}`}>
              <span>$0.03/kWh</span>
              <span>$0.15/kWh</span>
              <span>$0.50/kWh</span>
            </div>
          </div>

          {/* Default Performance Ratio */}
          <div className={`p-6 lg:p-8 space-y-3 border-t ${palette.rule}`}>
            <div className="flex items-center justify-between text-xs">
              <RichTooltip termKey="performance_ratio">
                <span className="font-semibold">Default Performance Ratio</span>
              </RichTooltip>
              <span className="font-mono-tech font-bold text-sm">
                {defaultPrefs.defaultPerformanceRatio.toFixed(2)} (
                {Math.round(defaultPrefs.defaultPerformanceRatio * 100)}%)
              </span>
            </div>
            <input
              type="range"
              min={0.65}
              max={0.9}
              step={0.01}
              value={defaultPrefs.defaultPerformanceRatio}
              onChange={(e) =>
                setDefaultPrefs((p) => ({
                  ...p,
                  defaultPerformanceRatio: Number(e.target.value)
                }))
              }
              className="w-full zenith-slider"
            />
            <div className={`flex justify-between font-mono-tech text-[10px] ${palette.subInk}`}>
              <span>0.65 (High Dust/Heat)</span>
              <span>0.78 (Standard)</span>
              <span>0.90 (Optimal)</span>
            </div>
          </div>

          {/* Default Estimator Model */}
          <div className={`p-6 lg:p-8 space-y-3 border-t ${palette.rule}`}>
            <label className="block text-xs font-semibold">
              Default Climate Estimator Model
            </label>
            <select
              value={defaultPrefs.defaultModel}
              onChange={(e) =>
                setDefaultPrefs((p) => ({ ...p, defaultModel: e.target.value }))
              }
              className={`w-full px-3 py-2.5 text-xs font-mono-tech border ${palette.rule} ${palette.well}`}
            >
              <option value="hist_gradient_boosting">
                Gradient-Boosted Climate Ensemble (Default)
              </option>
              <option value="random_forest">Multi-Tree Weather Ensemble</option>
              <option value="linear_regression">Linear Clear-Sky Baseline</option>
              <option value="svm">Kernel Climate Estimator</option>
            </select>
            <p className={`text-xs ${palette.subInk}`}>
              Selects the statistical estimator paired with NASA 38-year satellite records.
            </p>
          </div>
        </div>
      </div>

      {/* 4. SECTION C & D: ACCOUNT PROFILE & FEED PREFERENCES */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${palette.divide} ${palette.plane}`}
      >
        {/* Account & Surveyor Stamp Details */}
        <div className="lg:col-span-7 p-6 lg:p-8 space-y-5">
          <div>
            <h2 className="font-editorial text-xl font-medium">
              Planner Identity &amp; Export Stamp
            </h2>
            <p className={`text-xs ${palette.subInk} mt-0.5`}>
              Appears on Site Analysis run headers and exported portfolio CSV ledgers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className={`block ${palette.subInk} mb-1`}>
                Planner Full Name
              </label>
              <input
                type="text"
                value={userProfile.fullName}
                onChange={(e) => {
                  const name = e.target.value;
                  const parts = name.trim().split(' ');
                  const init =
                    parts.length >= 2
                      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                      : name.slice(0, 2).toUpperCase();
                  setUserProfile((p) => ({
                    ...p,
                    fullName: name,
                    initials: init || 'ZS'
                  }));
                }}
                className={`w-full px-3 py-2 border ${palette.rule} ${palette.well}`}
              />
            </div>

            <div>
              <label className={`block ${palette.subInk} mb-1`}>
                Role / Engineering Title
              </label>
              <input
                type="text"
                value={userProfile.roleTitle}
                onChange={(e) =>
                  setUserProfile((p) => ({ ...p, roleTitle: e.target.value }))
                }
                className={`w-full px-3 py-2 border ${palette.rule} ${palette.well}`}
              />
            </div>

            <div>
              <label className={`block ${palette.subInk} mb-1`}>
                Organization / Firm
              </label>
              <input
                type="text"
                value={userProfile.organization}
                onChange={(e) =>
                  setUserProfile((p) => ({
                    ...p,
                    organization: e.target.value
                  }))
                }
                className={`w-full px-3 py-2 border ${palette.rule} ${palette.well}`}
              />
            </div>

            <div>
              <label className={`block ${palette.subInk} mb-1`}>
                Contact Email
              </label>
              <input
                type="email"
                value={userProfile.email}
                onChange={(e) =>
                  setUserProfile((p) => ({ ...p, email: e.target.value }))
                }
                className={`w-full px-3 py-2 font-mono-tech border ${palette.rule} ${palette.well}`}
              />
            </div>
          </div>
        </div>

        {/* Feed & Alert Preferences */}
        <div className="lg:col-span-5 p-6 lg:p-8 space-y-5">
          <div>
            <h2 className="font-editorial text-xl font-medium">
              Overview Feed &amp; Climate Alerts
            </h2>
            <p className={`text-xs ${palette.subInk} mt-0.5`}>
              Control live industry news and out-of-distribution climate notifications.
            </p>
          </div>

          <div className={`divide-y ${palette.divide} border-y ${palette.rule} text-xs`}>
            <label className="py-3.5 flex items-center justify-between cursor-pointer gap-4">
              <div>
                <div className="font-semibold">
                  Show &ldquo;Solar industry headlines&rdquo; RSS Feed
                </div>
                <div className={`${palette.subInk} mt-0.5`}>
                  Displays live Renewables Now solar news cards on the Overview page.
                </div>
              </div>
              <input
                type="checkbox"
                checked={showRssFeed}
                onChange={(e) => setShowRssFeed(e.target.checked)}
                className="w-4 h-4 accent-[#F59E0B] shrink-0"
              />
            </label>

            <label className="py-3.5 flex items-center justify-between cursor-pointer gap-4">
              <div>
                <div className="font-semibold">
                  Climate Extrapolation Warnings
                </div>
                <div className={`${palette.subInk} mt-0.5`}>
                  Alert when pinned coordinates fall in extreme microclimates outside standard training bounds.
                </div>
              </div>
              <input
                type="checkbox"
                checked={showOodWarnings}
                onChange={(e) => setShowOodWarnings(e.target.checked)}
                className="w-4 h-4 accent-[#F59E0B] shrink-0"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PRECISION SVG CHARTS (SOLAR AMBER + SKY BLUE + EMERALD SEMANTICS)
// ============================================================================

function DirectorMonthlyIrradianceChart({
  series,
  hoveredIdx,
  onHoverIdx,
  palette
}) {
  const maxVal = 9.0;
  return (
    <svg className="w-full h-full overflow-visible" viewBox="0 0 660 210">
      {[2, 4, 6, 8].map((val) => {
        const y = 175 - (val / maxVal) * 145;
        return (
          <g key={val}>
            <line
              x1="34"
              y1={y}
              x2="645"
              y2={y}
              stroke={palette.chartRule}
              strokeDasharray="2 2"
            />
            <text
              x="28"
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fontFamily="IBM Plex Mono"
              fill={palette.chartInk}
            >
              {val}.0
            </text>
          </g>
        );
      })}

      {/* Clear Sky Ceiling Polyline */}
      <polyline
        fill="none"
        stroke="#0EA5E9"
        strokeWidth="1.75"
        strokeDasharray="4 3"
        points={series
          .map((d, i) => {
            const x = 58 + i * 50;
            const y = 175 - (d.clear / maxVal) * 145;
            return `${x},${y}`;
          })
          .join(' ')}
      />

      {series.map((d, i) => {
        const x = 44 + i * 50;
        const barH = (d.irr / maxVal) * 145;
        const y = 175 - barH;
        const clearY = 175 - (d.clear / maxVal) * 145;
        const isHovered = i === hoveredIdx;

        return (
          <g
            key={d.m}
            className="cursor-pointer"
            onMouseEnter={() => onHoverIdx && onHoverIdx(i)}
          >
            <rect
              x={x}
              y={clearY}
              width="28"
              height={Math.max(0, y - clearY)}
              fill="#0EA5E9"
              opacity="0.16"
            />
            <rect
              x={x}
              y={y}
              width="28"
              height={barH}
              fill={isHovered ? '#D97706' : '#F59E0B'}
            />
            <circle cx={x + 14} cy={clearY} r="2.5" fill="#0EA5E9" />
            <text
              x={x + 14}
              y="194"
              textAnchor="middle"
              fontSize="10"
              fontFamily="IBM Plex Mono"
              fontWeight={isHovered ? '700' : '400'}
              fill={palette.chartInk}
            >
              {d.m}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DirectorCashflowCrossoverChart({ yearlyBreakdown, palette }) {
  const values = yearlyBreakdown.map((d) => d.cumulativeSavingsUsd);
  const minVal = Math.min(...values, -4000);
  const maxVal = Math.max(...values, 15000);
  const range = Math.max(1, maxVal - minVal);
  const zeroY = 20 + (maxVal / range) * 145;

  return (
    <svg className="w-full h-full overflow-visible" viewBox="0 0 660 205">
      <line
        x1="36"
        y1={zeroY}
        x2="645"
        y2={zeroY}
        stroke="#18181B"
        strokeWidth="1.2"
      />
      <text
        x="30"
        y={zeroY + 3}
        textAnchor="end"
        fontSize="9"
        fontFamily="IBM Plex Mono"
        fill={palette.chartInk}
      >
        $0
      </text>

      {yearlyBreakdown.map((d, i) => {
        const x = 44 + i * 24;
        const val = d.cumulativeSavingsUsd;
        const barH = (Math.abs(val) / range) * 145;
        const y = val >= 0 ? zeroY - barH : zeroY;

        return (
          <g key={d.year}>
            <rect
              x={x}
              y={y}
              width="16"
              height={Math.max(2, barH)}
              fill={val >= 0 ? '#16A34A' : '#F59E0B'}
              opacity={val >= 0 ? '0.9' : '0.75'}
            />
            {(d.year === 1 || d.year % 5 === 0) && (
              <text
                x={x + 8}
                y="192"
                textAnchor="middle"
                fontSize="9"
                fontFamily="IBM Plex Mono"
                fill={palette.chartInk}
              >
                Y{d.year}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function DirectorRunCompareMonthlyChart({
  baseSeries,
  compareSeries,
  palette
}) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];
  const maxVal = Math.max(...baseSeries, ...(compareSeries || [1600]), 1600);

  return (
    <svg className="w-full h-full overflow-visible" viewBox="0 0 600 185">
      {[400, 800, 1200, 1600].map((v) => {
        const y = 155 - (v / maxVal) * 130;
        return (
          <g key={v}>
            <line
              x1="36"
              y1={y}
              x2="585"
              y2={y}
              stroke={palette.chartRule}
              strokeDasharray="2 2"
            />
            <text
              x="30"
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fontFamily="IBM Plex Mono"
              fill={palette.chartInk}
            >
              {v}
            </text>
          </g>
        );
      })}

      {months.map((m, i) => {
        const x = 46 + i * 45;
        const h = (baseSeries[i] / maxVal) * 130;
        const y = 155 - h;
        return (
          <g key={m}>
            <rect x={x} y={y} width="24" height={h} fill="#F59E0B" />
            <text
              x={x + 12}
              y="174"
              textAnchor="middle"
              fontSize="9"
              fontFamily="IBM Plex Mono"
              fill={palette.chartInk}
            >
              {m}
            </text>
          </g>
        );
      })}

      {compareSeries && (
        <>
          <polyline
            fill="none"
            stroke="#0EA5E9"
            strokeWidth="2.25"
            strokeDasharray="5 3"
            points={compareSeries
              .map((v, i) => {
                const x = 58 + i * 45;
                const y = 155 - (v / maxVal) * 130;
                return `${x},${y}`;
              })
              .join(' ')}
          />
          {compareSeries.map((v, i) => {
            const x = 58 + i * 45;
            const y = 155 - (v / maxVal) * 130;
            return <circle key={i} cx={x} cy={y} r="3" fill="#0EA5E9" />;
          })}
        </>
      )}
    </svg>
  );
}

function DirectorRunCompareCashflowChart({ baseRun, comparedRun, palette }) {
  const buildCurve = (run) => {
    const pts = [];
    let cum = -run.result.netSystemCostUsd;
    for (let yr = 1; yr <= 25; yr++) {
      cum += run.result.annualSavingsUsd * Math.pow(1.018, yr - 1);
      pts.push({ yr, cum });
    }
    return pts;
  };

  const basePts = buildCurve(baseRun);
  const compPts = comparedRun ? buildCurve(comparedRun) : null;

  const allVals = [
    ...basePts.map((p) => p.cum),
    ...(compPts ? compPts.map((p) => p.cum) : []),
    -4000
  ];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals, 20000);
  const range = Math.max(1, maxVal - minVal);
  const zeroY = 18 + (maxVal / range) * 135;

  const toCoords = (pts) =>
    pts
      .map((p, i) => {
        const x = 44 + i * 22;
        const y = 18 + ((maxVal - p.cum) / range) * 135;
        return `${x},${y}`;
      })
      .join(' ');

  return (
    <svg className="w-full h-full overflow-visible" viewBox="0 0 600 185">
      <line
        x1="36"
        y1={zeroY}
        x2="585"
        y2={zeroY}
        stroke={palette.chartInk}
        strokeWidth="1"
      />
      <text
        x="30"
        y={zeroY + 3}
        textAnchor="end"
        fontSize="9"
        fontFamily="IBM Plex Mono"
        fill={palette.chartInk}
      >
        $0
      </text>

      {compPts && (
        <polyline
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeDasharray="5 3"
          points={toCoords(compPts)}
        />
      )}

      <polyline
        fill="none"
        stroke="#16A34A"
        strokeWidth="2.5"
        points={toCoords(basePts)}
      />

      {[1, 5, 10, 15, 20, 25].map((yr) => {
        const x = 44 + (yr - 1) * 22;
        return (
          <text
            key={yr}
            x={x}
            y="174"
            textAnchor="middle"
            fontSize="9"
            fontFamily="IBM Plex Mono"
            fill={palette.chartInk}
          >
            Y{yr}
          </text>
        );
      })}
    </svg>
  );
}