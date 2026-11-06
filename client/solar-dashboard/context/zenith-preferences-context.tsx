"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// ============================================================================
// 1. REFERENCE SITES, HISTORICAL RUNS & FALLBACK RSS DATA CONTRACT
// ============================================================================

export interface MonthlySeriesPoint {
  m: string;
  irr: number;
  clear: number;
  cloudLoss: number;
  temp: number;
}

/** A documented real-world plant. Every fact cites a source; `documented: false` marks a modelling assumption. */
export interface BenchmarkInfo {
  plantName: string;
  operator: string;
  commissioned: string;
  /** Published yearly output, or null when the operator publishes none. */
  reportedAnnualKwh: number | null;
  reportedLabel: string;
  /** Snapshot of Zenith's estimate from backend/scripts/benchmark_snapshot.py; a live run reproduces it. */
  zenithAnnualKwh: number;
  facts: { label: string; value: string; documented: boolean }[];
  notes: string;
  sources: { label: string; url: string }[];
}

export interface ReferenceSite {
  benchmark: BenchmarkInfo;
  id: string;
  code: string;
  name: string;
  locationLabel: string;
  region: "india" | "usa" | "europe" | "global";
  lat: number;
  lon: number;
  scale: "homeowner" | "small_business" | "industrial";
  goal: "lowest_payback" | "max_offset" | "backup_resilience";
  monthlyBillUsd: number;
  monthlyKwh: number;
  roofAreaM2: number;
  systemCapacityKw: number;
  installationType: "rooftop" | "ground-mounted" | "carport";
  panelTechnology: "monocrystalline" | "polycrystalline" | "thin-film";
  gridConnection: "grid-tied" | "hybrid" | "off-grid";
  batteryCapacityKwh: number;
  tariffUsd: number;
  includeIncentives: boolean;
  performanceRatio: number;
  model:
    | "hist_gradient_boosting"
    | "random_forest"
    | "linear_regression"
    | "svm";
  irradianceDaily: number;
  errorEstimate: number;
  r2Accuracy: number;
  rmse: number;
  oodWarning: boolean;
  tempC: number;
  humidityPct: number;
  windSpeedMs: number;
  clearSkyDaily: number;
  optimalTiltDeg: number;
  azimuthDirection: string;
  daylightHours: number;
  runCount: number;
  monthlySeries: MonthlySeriesPoint[];
}

export const FALLBACK_SOLAR_HEADLINES = [
  {
    title: "UK research org MTC invests GBP 1.3m in on-site solar thermal system",
    link: "https://renewablesnow.com/news/",
    pubDate: "Nov 3, 2026",
    source: "Renewables Now",
    image:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Downing wins planning approval for 42-MW UK solar, storage project",
    link: "https://renewablesnow.com/news/",
    pubDate: "Nov 3, 2026",
    source: "Renewables Now",
    image:
      "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=800&q=80",
  },
  {
    title:
      "China's 1.5-GW Hami project nears grid connection with PV, CSP and molten salt storage",
    link: "https://renewablesnow.com/news/",
    pubDate: "Nov 3, 2026",
    source: "Renewables Now",
    image:
      "https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Italy's installed solar capacity reaches 48.4 GW",
    link: "https://renewablesnow.com/news/",
    pubDate: "Nov 3, 2026",
    source: "Renewables Now",
    image:
      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=800&q=80",
  },
  {
    title:
      "Solar & battery storage additions hit record pace across European commercial rooftops",
    link: "https://renewablesnow.com/news/",
    pubDate: "Nov 2, 2026",
    source: "Renewables Now",
    image:
      "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=800&q=80",
  },
];

export const REFERENCE_SITES: ReferenceSite[] = [
  {
    id: "cial-kochi",
    code: "IN-KL-CIAL",
    name: "Cochin Airport 1 MWp Plant",
    locationLabel: "Kochi · Kerala, India",
    region: "india",
    lat: 10.1533,
    lon: 76.3882,
    scale: "industrial",
    goal: "lowest_payback",
    monthlyBillUsd: 9733,
    monthlyKwh: 121667,
    roofAreaM2: 6400,
    systemCapacityKw: 1000,
    installationType: "ground-mounted",
    panelTechnology: "monocrystalline",
    gridConnection: "grid-tied",
    batteryCapacityKwh: 0,
    tariffUsd: 0.08,
    includeIncentives: true,
    performanceRatio: 0.78,
    model: "hist_gradient_boosting",
    irradianceDaily: 5.08,
    errorEstimate: 1.2248,
    r2Accuracy: 84.6,
    rmse: 0.62,
    oodWarning: true,
    tempC: 27.31,
    humidityPct: 79,
    windSpeedMs: 2.4,
    clearSkyDaily: 6.52,
    optimalTiltDeg: 10.2,
    azimuthDirection: "Due South",
    daylightHours: 12.0,
    runCount: 0,
    monthlySeries: [
      { m: "Jan", irr: 5.45, clear: 5.88, cloudLoss: 7.3, temp: 27.3 },
      { m: "Feb", irr: 6.06, clear: 6.51, cloudLoss: 6.9, temp: 28.6 },
      { m: "Mar", irr: 6.2, clear: 6.88, cloudLoss: 9.9, temp: 29.4 },
      { m: "Apr", irr: 5.89, clear: 6.97, cloudLoss: 15.5, temp: 29.0 },
      { m: "May", irr: 5.3, clear: 6.85, cloudLoss: 22.6, temp: 28.2 },
      { m: "Jun", irr: 4.3, clear: 6.84, cloudLoss: 37.1, temp: 27.0 },
      { m: "Jul", irr: 4.1, clear: 6.83, cloudLoss: 40.0, temp: 26.1 },
      { m: "Aug", irr: 4.42, clear: 6.94, cloudLoss: 36.3, temp: 25.9 },
      { m: "Sep", irr: 4.99, clear: 6.89, cloudLoss: 27.6, temp: 26.2 },
      { m: "Oct", irr: 4.8, clear: 6.33, cloudLoss: 24.2, temp: 26.6 },
      { m: "Nov", irr: 4.71, clear: 5.78, cloudLoss: 18.5, temp: 26.8 },
      { m: "Dec", irr: 4.85, clear: 5.58, cloudLoss: 13.1, temp: 26.7 },
    ],
    benchmark: {
      plantName: "Cochin International Airport (CIAL), 1 MWp plant",
      operator: "Cochin International Airport Ltd.",
      commissioned: "November 2013",
      reportedAnnualKwh: 1460000,
      reportedLabel: "About 4,000 kWh a day reported by CIAL (about 1.46 million kWh a year)",
      zenithAnnualKwh: 1516996,
      facts: [
        { label: "Capacity", value: "1 MWp", documented: true },
        { label: "Modules", value: "4,000 monocrystalline, 250 Wp each", documented: true },
        { label: "Mounting", value: "Part rooftop, part ground (modelled as ground mount)", documented: true },
        { label: "Inverters", value: "33 string inverters, 30 kW each", documented: true },
        { label: "Reported cost", value: "₹7.4 crore (2013)", documented: true },
        { label: "Tilt", value: "Not published (modelled at latitude)", documented: false },
        { label: "Tariff", value: "$0.08/kWh regional default", documented: false },
      ],
      notes: "Kochi's humid monsoon climate is outside the sunlight model's training range, so its estimate carries a warning.",
      sources: [
        { label: "CIAL: Airport solarisation report", url: "https://www.cial.aero/userfiles/CIAL/CIAL_SCMS.pdf" },
        { label: "ICAO Environmental Report 2016, p.177", url: "https://www.icao.int/sites/default/files/sp-files/environmental-protection/Documents/EnvironmentalReports/2016/ENVReport2016_pg177-177.pdf" },
      ],
    },
  },
  {
    id: "vatican-paul-vi",
    code: "VA-ROMA-NERVI",
    name: "Paul VI Audience Hall Roof",
    locationLabel: "Vatican City",
    region: "europe",
    lat: 41.9007,
    lon: 12.4547,
    scale: "industrial",
    goal: "lowest_payback",
    monthlyBillUsd: 6250,
    monthlyKwh: 25000,
    roofAreaM2: 2134,
    systemCapacityKw: 220,
    installationType: "rooftop",
    panelTechnology: "monocrystalline",
    gridConnection: "grid-tied",
    batteryCapacityKwh: 0,
    tariffUsd: 0.25,
    includeIncentives: true,
    performanceRatio: 0.78,
    model: "hist_gradient_boosting",
    irradianceDaily: 4.53,
    errorEstimate: 1.2248,
    r2Accuracy: 84.6,
    rmse: 0.62,
    oodWarning: true,
    tempC: 15.95,
    humidityPct: 70,
    windSpeedMs: 2.3,
    clearSkyDaily: 5.34,
    optimalTiltDeg: 41.9,
    azimuthDirection: "Due South",
    daylightHours: 12.0,
    runCount: 0,
    monthlySeries: [
      { m: "Jan", irr: 1.82, clear: 2.61, cloudLoss: 30.3, temp: 7.0 },
      { m: "Feb", irr: 2.77, clear: 3.72, cloudLoss: 25.5, temp: 7.6 },
      { m: "Mar", irr: 4.05, clear: 5.23, cloudLoss: 22.6, temp: 10.3 },
      { m: "Apr", irr: 5.46, clear: 6.69, cloudLoss: 18.4, temp: 13.9 },
      { m: "May", irr: 6.64, clear: 7.77, cloudLoss: 14.5, temp: 18.0 },
      { m: "Jun", irr: 7.49, clear: 8.21, cloudLoss: 8.8, temp: 22.8 },
      { m: "Jul", irr: 7.59, clear: 7.97, cloudLoss: 4.8, temp: 26.0 },
      { m: "Aug", irr: 6.6, clear: 7.01, cloudLoss: 5.8, temp: 26.1 },
      { m: "Sep", irr: 4.84, clear: 5.59, cloudLoss: 13.4, temp: 21.4 },
      { m: "Oct", irr: 3.34, clear: 4.09, cloudLoss: 18.3, temp: 17.2 },
      { m: "Nov", irr: 2.05, clear: 2.81, cloudLoss: 27.0, temp: 12.4 },
      { m: "Dec", irr: 1.64, clear: 2.27, cloudLoss: 27.8, temp: 8.1 },
    ],
    benchmark: {
      plantName: "Paul VI Audience Hall rooftop array",
      operator: "Vatican City State (donated by SolarWorld, inverters by SMA)",
      commissioned: "November 2008",
      reportedAnnualKwh: 300000,
      reportedLabel: "300,000 kWh a year reported by SMA and the IEA",
      zenithAnnualKwh: 287177,
      facts: [
        { label: "Capacity", value: "About 220 kWp", documented: true },
        { label: "Modules", value: "2,394 SolarWorld modules on 2,134 m² of roof", documented: true },
        { label: "Mounting", value: "Rooftop, on the hall's existing shading supports", documented: true },
        { label: "Panel type", value: "Not published (modelled as monocrystalline)", documented: false },
        { label: "Tilt", value: "Follows the roof supports, not published (modelled at latitude)", documented: false },
        { label: "Tariff", value: "$0.25/kWh regional default", documented: false },
      ],
      notes: "Rome's humidity is outside the sunlight model's training range, so its estimate carries a warning.",
      sources: [
        { label: "SMA: The Vatican inaugurates its first solar power system", url: "https://www.sma.de/newsroom/news-detail/the-vatican-inaugurates-its-first-solar-power-system" },
        { label: "IEA: Vatican installation of PV system", url: "https://www.iea.org/policies/17803-vatican-installation-of-pv-system" },
        { label: "BayWa r.e. case study", url: "https://www.baywa-re.com/en/case-studies/high-tech-meets-historic-solar-energy-in-the-vatican" },
      ],
    },
  },
  {
    id: "yulara-desert-gardens",
    code: "AU-NT-YUL1",
    name: "Yulara Desert Gardens Array",
    locationLabel: "Yulara · Northern Territory, Australia",
    region: "global",
    lat: -25.2069,
    lon: 130.971,
    scale: "industrial",
    goal: "lowest_payback",
    monthlyBillUsd: 19657,
    monthlyKwh: 163806,
    roofAreaM2: 20000,
    systemCapacityKw: 1058.4,
    installationType: "ground-mounted",
    panelTechnology: "polycrystalline",
    gridConnection: "grid-tied",
    batteryCapacityKwh: 0,
    tariffUsd: 0.12,
    includeIncentives: true,
    performanceRatio: 0.78,
    model: "hist_gradient_boosting",
    irradianceDaily: 6.15,
    errorEstimate: 1.2248,
    r2Accuracy: 84.6,
    rmse: 0.62,
    oodWarning: false,
    tempC: 22.89,
    humidityPct: 34,
    windSpeedMs: 3.15,
    clearSkyDaily: 6.9,
    optimalTiltDeg: 25.2,
    azimuthDirection: "Due North",
    daylightHours: 12.0,
    runCount: 0,
    monthlySeries: [
      { m: "Jan", irr: 7.76, clear: 8.85, cloudLoss: 12.3, temp: 31.9 },
      { m: "Feb", irr: 7.33, clear: 8.28, cloudLoss: 11.5, temp: 30.5 },
      { m: "Mar", irr: 6.42, clear: 7.29, cloudLoss: 11.9, temp: 27.3 },
      { m: "Apr", irr: 5.47, clear: 6.05, cloudLoss: 9.6, temp: 23.0 },
      { m: "May", irr: 4.43, clear: 4.93, cloudLoss: 10.1, temp: 17.1 },
      { m: "Jun", irr: 3.96, clear: 4.38, cloudLoss: 9.6, temp: 12.7 },
      { m: "Jul", irr: 4.24, clear: 4.64, cloudLoss: 8.6, temp: 12.9 },
      { m: "Aug", irr: 5.34, clear: 5.62, cloudLoss: 5.0, temp: 15.4 },
      { m: "Sep", irr: 6.42, clear: 6.89, cloudLoss: 6.8, temp: 20.7 },
      { m: "Oct", irr: 7.26, clear: 8.06, cloudLoss: 9.9, temp: 25.2 },
      { m: "Nov", irr: 7.6, clear: 8.79, cloudLoss: 13.5, temp: 28.3 },
      { m: "Dec", irr: 7.68, clear: 9.04, cloudLoss: 15.0, temp: 30.1 },
    ],
    benchmark: {
      plantName: "Yulara Solar System, Desert Gardens array",
      operator: "Voyages Indigenous Tourism Australia, with ARENA support",
      commissioned: "March 2016",
      reportedAnnualKwh: null,
      reportedLabel: "No yearly total is published. DKA Solar Centre publishes measured output for this array.",
      zenithAnnualKwh: 1965673,
      facts: [
        { label: "Capacity", value: "1,058.4 kW", documented: true },
        { label: "Modules", value: "3,360 Jinko JKM315PP poly-Si, 315 W", documented: true },
        { label: "Mounting", value: "Fixed ground mount, about 2 hectares", documented: true },
        { label: "Tilt / direction", value: "15°, facing north", documented: true },
        { label: "Inverters", value: "SMA STP 25000TL-30", documented: true },
        { label: "Tariff", value: "$0.12/kWh default", documented: false },
      ],
      notes: "The planner models tilt at latitude (25°); the real array uses 15°.",
      sources: [
        { label: "DKA Solar Centre: Yulara 1, Desert Gardens", url: "https://dkasolarcentre.com.au/source/yulara/yulara-1-fixed" },
        { label: "ARENA: Yulara Solar Project", url: "https://arena.gov.au/projects/yulara-solar-project/" },
      ],
    },
  },
  {
    id: "gujarat-canal-top",
    code: "IN-GJ-CANAL",
    name: "Gujarat Canal-Top Pilot",
    locationLabel: "Chandrasan · Gujarat, India",
    region: "india",
    lat: 23.0811,
    lon: 72.3011,
    scale: "industrial",
    goal: "lowest_payback",
    monthlyBillUsd: 10667,
    monthlyKwh: 133333,
    roofAreaM2: 5000,
    systemCapacityKw: 1000,
    installationType: "ground-mounted",
    panelTechnology: "polycrystalline",
    gridConnection: "grid-tied",
    batteryCapacityKwh: 0,
    tariffUsd: 0.08,
    includeIncentives: true,
    performanceRatio: 0.78,
    model: "hist_gradient_boosting",
    irradianceDaily: 5.53,
    errorEstimate: 1.2248,
    r2Accuracy: 84.6,
    rmse: 0.62,
    oodWarning: false,
    tempC: 27.57,
    humidityPct: 48,
    windSpeedMs: 2.41,
    clearSkyDaily: 6.19,
    optimalTiltDeg: 23.1,
    azimuthDirection: "Due South",
    daylightHours: 12.0,
    runCount: 0,
    monthlySeries: [
      { m: "Jan", irr: 4.6, clear: 4.76, cloudLoss: 3.4, temp: 19.9 },
      { m: "Feb", irr: 5.57, clear: 5.74, cloudLoss: 3.0, temp: 23.3 },
      { m: "Mar", irr: 6.56, clear: 6.79, cloudLoss: 3.4, temp: 28.1 },
      { m: "Apr", irr: 7.29, clear: 7.46, cloudLoss: 2.3, temp: 32.6 },
      { m: "May", irr: 7.48, clear: 7.65, cloudLoss: 2.2, temp: 35.1 },
      { m: "Jun", irr: 6.29, clear: 7.23, cloudLoss: 13.0, temp: 33.6 },
      { m: "Jul", irr: 4.48, clear: 6.76, cloudLoss: 33.7, temp: 29.8 },
      { m: "Aug", irr: 4.26, clear: 6.61, cloudLoss: 35.6, temp: 28.0 },
      { m: "Sep", irr: 5.22, clear: 6.31, cloudLoss: 17.3, temp: 28.0 },
      { m: "Oct", irr: 5.64, clear: 5.8, cloudLoss: 2.8, temp: 27.2 },
      { m: "Nov", irr: 4.67, clear: 4.79, cloudLoss: 2.5, temp: 24.2 },
      { m: "Dec", irr: 4.3, clear: 4.41, cloudLoss: 2.5, temp: 20.9 },
    ],
    benchmark: {
      plantName: "Narmada canal-top solar pilot, Chandrasan",
      operator: "Gujarat State Electricity Corporation and Sardar Sarovar Narmada Nigam",
      commissioned: "April 2012",
      reportedAnnualKwh: 1600000,
      reportedLabel: "1.6 million kWh a year reported at commissioning",
      zenithAnnualKwh: 1429279,
      facts: [
        { label: "Capacity", value: "1 MW", documented: true },
        { label: "Layout", value: "Panels over a 750 m stretch of the Sanand branch canal", documented: true },
        { label: "Reported cost", value: "About ₹17.5 crore", documented: true },
        { label: "Panel type", value: "Not published (modelled as polycrystalline)", documented: false },
        { label: "Mounting", value: "Canal-top (modelled as ground mount)", documented: false },
        { label: "Tariff", value: "$0.08/kWh regional default", documented: false },
      ],
      notes: "Water under the panels keeps them cooler; operators reported about 15% more output than a land array. Zenith does not model that effect.",
      sources: [
        { label: "The Hindu: Tapping solar power, avoiding water wastage", url: "https://www.thehindu.com/news/national/other-states/tapping-solar-power-avoiding-water-wastage/article3353891.ece" },
        { label: "The Economic Times: canal-top solar facts", url: "https://economictimes.indiatimes.com/infrastructure/gujarats-canal-top-solar-power-plant-10-must-know-facts/slideshow/19472958.cms" },
      ],
    },
  },
];

export const HISTORICAL_RUNS = [
  {
    id: "run-3",
    runNumber: 3,
    label: "Run #3 — Latest",
    timestamp: "04 Nov 2026 · 09:42 IST",
    surveyor: "A. Sharma, P.E.",
    summaryNote:
      "8.0 kW Monocrystalline (20%) + 16 kWh LFP Hybrid with India PM Surya Ghar CFA subsidy",
    config: {
      systemCapacityKw: 8.0,
      installationType: "Rooftop",
      panelTechnology: "Mono 20%",
      panelTechnologyFull: "Monocrystalline (20% eff)",
      gridConnection: "Hybrid + 16 kWh LFP",
      batteryCapacityKwh: 16.0,
      region: "India (Rajasthan)",
      tariffUsd: 0.08,
      includeIncentives: true,
      incentiveSummary: "India PM Surya Ghar CFA",
      performanceRatio: 0.78,
      modelLabel: "Gradient-Boosted Climate Ensemble",
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
      azimuthDirection: "Due South",
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
      batteryReplacementYear: 12 as number | null,
      selfConsumptionPct: 85,
      monthlyYieldKwh: [
        980, 1110, 1340, 1420, 1490, 1280, 1020, 990, 1210, 1240, 1180, 1190,
      ],
    },
  },
  {
    id: "run-2",
    runNumber: 2,
    label: "Run #2 — Mid-Sizing",
    timestamp: "02 Nov 2026 · 16:15 IST",
    surveyor: "A. Sharma, P.E.",
    summaryNote:
      "6.5 kW Monocrystalline (20%) Grid-Tied evaluation without LFP battery bank",
    config: {
      systemCapacityKw: 6.5,
      installationType: "Rooftop",
      panelTechnology: "Mono 20%",
      panelTechnologyFull: "Monocrystalline (20% eff)",
      gridConnection: "Grid-Tied",
      batteryCapacityKwh: 0,
      region: "India (Rajasthan)",
      tariffUsd: 0.08,
      includeIncentives: true,
      incentiveSummary: "India PM Surya Ghar CFA",
      performanceRatio: 0.78,
      modelLabel: "Gradient-Boosted Climate Ensemble",
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
      azimuthDirection: "Due South",
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
      batteryReplacementYear: null as number | null,
      selfConsumptionPct: 62,
      monthlyYieldKwh: [
        752, 851, 1028, 1090, 1143, 982, 783, 760, 928, 951, 905, 916,
      ],
    },
  },
  {
    id: "run-1",
    runNumber: 1,
    label: "Run #1 — Initial Baseline",
    timestamp: "29 Oct 2026 · 11:20 IST",
    surveyor: "R. Verma, Site Engineer",
    summaryNote:
      "5.0 kW Polycrystalline (17%) Grid-Tied baseline prior to CFA subsidy & storage modeling",
    config: {
      systemCapacityKw: 5.0,
      installationType: "Rooftop",
      panelTechnology: "Poly 17%",
      panelTechnologyFull: "Polycrystalline (17% eff)",
      gridConnection: "Grid-Tied",
      batteryCapacityKwh: 0,
      region: "India (Rajasthan)",
      tariffUsd: 0.074,
      includeIncentives: false,
      incentiveSummary: "No subsidy applied",
      performanceRatio: 0.75,
      modelLabel: "Linear Clear-Sky Baseline",
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
      azimuthDirection: "South-East (165°)",
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
      batteryReplacementYear: null as number | null,
      selfConsumptionPct: 58,
      monthlyYieldKwh: [
        598, 678, 818, 867, 910, 782, 623, 605, 739, 757, 721, 732,
      ],
    },
  },
];

export const CITED_GUIDES = [
  {
    id: "cit-1",
    code: "NASA-POWER-38Y",
    title: "NASA Prediction Of Worldwide Energy Resources (POWER) Release 9",
    section:
      "38-Year Satellite Surface Solar Irradiance & Cloud Transmittance Archive",
    year: "2026",
  },
  {
    id: "cit-2",
    code: "NREL-PVW-V8",
    title:
      "NREL PVWatts Version 8 Perez Tilted-Plane & Thermal Derating Reference",
    section:
      "Section 4.2: Cell Temperature Coefficient (-0.38%/°C) & Incidence Angle Modifier",
    year: "2025",
  },
  {
    id: "cit-3",
    code: "MNRE-PMSG-CFA",
    title:
      "Ministry of New & Renewable Energy — PM Surya Ghar Central Financial Assistance",
    section:
      "Schedule B: ₹78,000 ($934) Capex Subsidy & 40% C&I Accelerated Depreciation",
    year: "2025",
  },
  {
    id: "cit-4",
    code: "IEC-61724-1",
    title: "IEC 61724-1 Photovoltaic System Performance & LFP Cycle Life Standard",
    section:
      "Annex C: Performance Ratio (PR) & Year-12 LFP Replacement Reserve",
    year: "2024",
  },
];

// ============================================================================
// 2. DETERMINISTIC PHYSICS, GEOMETRY & 25-YEAR CASHFLOW ENGINE
// ============================================================================

export function computeHeliodonAndFinancials({
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
  performanceRatio,
  irradianceDaily,
  optimalTiltDeg: optimalTiltOverride,
}: {
  site: ReferenceSite;
  setupMode: string;
  planningScale?: string;
  goal: string;
  monthlyBillUsd: number;
  availableRoofAreaM2: number;
  tiltDeg: number;
  systemCapacityKw: number;
  installationType: string;
  panelTechnology: string;
  gridConnection: string;
  batteryCapacityKwh: number;
  region: string;
  tariffUsd: number;
  includeIncentives: boolean;
  performanceRatio: number;
  irradianceDaily?: number;
  optimalTiltDeg?: number;
}) {
  void planningScale;
  const effTariff = tariffUsd || 0.08;
  const monthlyKwhConsumption = Math.round(monthlyBillUsd / effTariff);

  const optTilt = optimalTiltOverride ?? site?.optimalTiltDeg ?? 26.9;
  const tiltDiff = Math.abs((tiltDeg ?? optTilt) - optTilt);
  const tiltFactor = Math.max(
    0.84,
    Number((1 - Math.pow(tiltDiff / 68, 1.65)).toFixed(3)),
  );

  const dailyIrr = irradianceDaily ?? site?.irradianceDaily ?? 5.74;
  const pr = performanceRatio || 0.78;
  const specificYieldPerKw = Math.round(
    dailyIrr * 365 * pr * 0.8138 * tiltFactor,
  );

  const goalFactor =
    goal === "max_offset" ? 1.12 : goal === "backup_resilience" ? 1.22 : 0.96;

  const rawRecommendedKw =
    ((monthlyKwhConsumption * 12) / Math.max(800, specificYieldPerKw)) *
    goalFactor;
  const recommendedCapacityKw = Math.max(
    1.0,
    Math.round(rawRecommendedKw * 2) / 2,
  );

  const activeKw =
    setupMode === "guided"
      ? recommendedCapacityKw
      : Number(systemCapacityKw) || 8.0;

  const panelWattageKw =
    panelTechnology === "monocrystalline"
      ? 0.4
      : panelTechnology === "polycrystalline"
        ? 0.34
        : 0.26;
  const panelEffPct =
    panelTechnology === "monocrystalline"
      ? 20
      : panelTechnology === "polycrystalline"
        ? 17
        : 11;

  const estimatedPanels = Math.ceil(activeKw / panelWattageKw);
  const requiredRoofAreaM2 = Math.round(estimatedPanels * 2.0);
  // Ground and carport arrays need the space too, so the check applies to every mount type.
  const roofAreaConstrained = requiredRoofAreaM2 > availableRoofAreaM2;
  const maxPanelsFitOnRoof = Math.floor(availableRoofAreaM2 / 2.0);

  const effectiveBatteryKwh =
    gridConnection === "grid-tied"
      ? 0
      : Number(batteryCapacityKwh) > 0
        ? Number(batteryCapacityKwh)
        : gridConnection === "hybrid"
          ? Math.round(activeKw * 2.0)
          : Math.round(activeKw * 3.5);

  const annualEnergyKwh = Math.round(activeKw * specificYieldPerKw);
  const capacityFactorPct = Number(
    ((annualEnergyKwh / (activeKw * 8760)) * 100).toFixed(1),
  );

  const solarCostPerKw =
    region === "india"
      ? 380
      : region === "usa"
        ? 1950
        : region === "europe"
          ? 1580
          : 1150;
  const batteryCostPerKwh =
    region === "india" ? 60 : region === "usa" ? 290 : 230;

  const solarCapexUsd = Math.round(activeKw * solarCostPerKw);
  const batteryCostUsd = Math.round(effectiveBatteryKwh * batteryCostPerKwh);
  const totalSystemCostUsd = solarCapexUsd + batteryCostUsd;

  let incentiveAmountUsd = 0;
  let incentiveSummary = "No subsidy applied";
  if (includeIncentives) {
    if (region === "india") {
      incentiveAmountUsd =
        activeKw <= 15 ? 934 : Math.round(totalSystemCostUsd * 0.26);
      incentiveSummary =
        activeKw <= 15
          ? "India PM Surya Ghar CFA (₹78,000)"
          : "India C&I 40% Accelerated Depreciation";
    } else if (region === "usa") {
      incentiveAmountUsd = Math.round(totalSystemCostUsd * 0.3);
      incentiveSummary = "US 30% Federal Clean Energy Credit";
    } else if (region === "europe") {
      incentiveAmountUsd = Math.round(totalSystemCostUsd * 0.22);
      incentiveSummary = "EU 0% VAT & Municipal Solar Grant";
    } else {
      incentiveAmountUsd = Math.round(totalSystemCostUsd * 0.15);
      incentiveSummary = "Regional Clean Infrastructure Rebate (15%)";
    }
  }

  const netSystemCostUsd = Math.max(
    450,
    totalSystemCostUsd - incentiveAmountUsd,
  );
  const annualSavingsUsd = Math.round(annualEnergyKwh * effTariff);
  const monthlySavingsUsd = Math.round(annualSavingsUsd / 12);
  const simplePaybackYears = Number(
    (netSystemCostUsd / Math.max(1, annualSavingsUsd)).toFixed(1),
  );

  const yearlyBreakdown: Array<{
    year: number;
    outputKwh: number;
    savingsUsd: number;
    cumulativeSavingsUsd: number;
  }> = [];
  let cumulative = -netSystemCostUsd;
  let lifetimeKwh = 0;
  for (let yr = 1; yr <= 25; yr++) {
    const deg = Math.pow(0.995, yr - 1);
    const esc = Math.pow(1.022, yr - 1);
    const yrKwh = Math.round(annualEnergyKwh * deg);
    lifetimeKwh += yrKwh;
    const replCost =
      effectiveBatteryKwh > 0 && yr === 12
        ? Math.round(batteryCostUsd * 0.62)
        : 0;
    const yrSav = Math.round(yrKwh * effTariff * esc) - replCost;
    cumulative += yrSav;
    yearlyBreakdown.push({
      year: yr,
      outputKwh: yrKwh,
      savingsUsd: yrSav,
      cumulativeSavingsUsd: cumulative,
    });
  }

  const lifetimeRoiPct = Math.round(
    ((cumulative + netSystemCostUsd) / netSystemCostUsd) * 100,
  );
  const lcoeUsdPerKwh = Number(
    ((netSystemCostUsd + activeKw * 6 * 25) / Math.max(1, lifetimeKwh)).toFixed(
      3,
    ),
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
      gridConnection === "off-grid"
        ? 98
        : gridConnection === "hybrid"
          ? 85
          : 58,
  };
}

// ============================================================================
// 3. LOCKED WARM ALABASTER PALETTE TOKENS
// ============================================================================

export const PALETTE = {
  canvas: "bg-[#FAF8F5] text-[#18181B]",
  plane: "bg-[#FEFDFB] text-[#18181B]",
  well: "bg-[#F3F1EC] text-[#18181B]",
  rule: "border-[#E6E3DC]",
  divide: "divide-[#E6E3DC]",
  ink: "text-[#18181B]",
  subInk: "text-[#71717A]",
  hoverPlane: "hover:bg-[#F3F1EC]",
  chartRule: "#E6E3DC",
  chartInk: "#71717A",
} as const;

// ============================================================================
// 4. ZENITH PREFERENCES & SHARED PLANNER CONTEXT
// ============================================================================

export type ViewMode = "simple" | "engineer";
export type ReadingDepth = "simple" | "detailed";
export type AreaUnit = "m2" | "sqft";
export type TempUnit = "C" | "F";
export type WindUnit = "ms" | "kmh" | "mph";
/** Primary unit preset. Individual units can override via Advanced. */
export type UnitSystem = "metric" | "imperial";

export function unitsFromSystem(system: UnitSystem): {
  areaUnit: AreaUnit;
  tempUnit: TempUnit;
  windUnit: WindUnit;
} {
  if (system === "imperial") {
    return { areaUnit: "sqft", tempUnit: "F", windUnit: "mph" };
  }
  return { areaUnit: "m2", tempUnit: "C", windUnit: "ms" };
}

export function inferUnitSystem(
  areaUnit: AreaUnit,
  tempUnit: TempUnit,
  windUnit: WindUnit,
): UnitSystem {
  const metric = unitsFromSystem("metric");
  if (
    areaUnit === metric.areaUnit &&
    tempUnit === metric.tempUnit &&
    windUnit === metric.windUnit
  ) {
    return "metric";
  }
  const imperial = unitsFromSystem("imperial");
  if (
    areaUnit === imperial.areaUnit &&
    tempUnit === imperial.tempUnit &&
    windUnit === imperial.windUnit
  ) {
    return "imperial";
  }
  // Mixed / advanced override — still report the closer preset for UI.
  return areaUnit === "sqft" || tempUnit === "F" ? "imperial" : "metric";
}

export interface DefaultBaselinePrefs {
  defaultScale: "homeowner" | "small_business" | "industrial";
  defaultRegion: "india" | "usa" | "europe" | "global";
  defaultTariffUsd: number;
  defaultPerformanceRatio: number;
  defaultModel:
    | "hist_gradient_boosting"
    | "random_forest"
    | "linear_regression"
    | "svm";
  autoApplySubsidies: boolean;
}

export interface AssistantContext {
  /** Shown in the chip, e.g. "Thrissur home · Run #2". */
  label: string;
  /** Plain-text facts sent with each question. */
  summary: string;
}

/** One-line facts about a finished run for the Solar Guide (numbers come from the run, not the LLM). */
export function runContextSummary(input: {
  name: string;
  lat: number;
  lon: number;
  capacityKw: number;
  gridConnection: string;
  region: string;
  prediction?: number | null;
  annualOutputKwh?: number | null;
  paybackYears?: number | null;
  netCostUsd?: number | null;
}): string {
  const parts = [
    `site ${input.name} at ${Math.abs(input.lat).toFixed(2)}° ${input.lat >= 0 ? "N" : "S"}, ${Math.abs(input.lon).toFixed(2)}° ${input.lon >= 0 ? "E" : "W"} (${input.region})`,
    `system ${input.capacityKw} kW ${input.gridConnection}`,
  ];
  if (input.prediction != null) parts.push(`predicted sunlight ${input.prediction} kWh/m²/day`);
  if (input.annualOutputKwh != null) parts.push(`annual output ${input.annualOutputKwh} kWh`);
  if (input.paybackYears != null) parts.push(`payback ${input.paybackYears} years`);
  if (input.netCostUsd != null) parts.push(`net cost $${input.netCostUsd}`);
  return parts.join("; ");
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Backend tool results (`tool_calls`), never client estimates. */
  verifiedCalc?: {
    id: string;
    badge: string;
    results: string[];
  };
  sources?: { source: string; sourcePath?: string | null; excerpt?: string }[];
}

export interface ZenithPreferencesContextValue {
  // Progressive disclosure
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  readingDepth: ReadingDepth;
  handleToggleReadingDepth: (mode: ReadingDepth) => void;

  // Global units
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  areaUnit: AreaUnit;
  setAreaUnit: (u: AreaUnit) => void;
  tempUnit: TempUnit;
  setTempUnit: (u: TempUnit) => void;
  windUnit: WindUnit;
  setWindUnit: (u: WindUnit) => void;

  /** True after the user pins a map location or loads a sample into the planner. */
  locationConfirmed: boolean;
  setLocationConfirmed: (v: boolean) => void;

  // Unit conversion helpers
  formatArea: (m2Val: number, includeBoth?: boolean) => string;
  formatTemp: (celsiusVal: number) => string;
  formatWind: (msVal: number) => string;

  // Profile & Defaults
  defaultPrefs: DefaultBaselinePrefs;
  setDefaultPrefs: React.Dispatch<React.SetStateAction<DefaultBaselinePrefs>>;
  showRssFeed: boolean;
  setShowRssFeed: (v: boolean) => void;
  showOodWarnings: boolean;
  setShowOodWarnings: (v: boolean) => void;
  handleApplyDefaultsToPlanner: () => void;

  // Shared Active Site & Solar Planner State
  selectedSiteId: string;
  setSelectedSiteId: (id: string) => void;
  activeSite: ReferenceSite;
  pinCoords: { lat: number; lon: number };
  setPinCoords: React.Dispatch<React.SetStateAction<{ lat: number; lon: number }>>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  tiltDeg: number;
  setTiltDeg: (deg: number) => void;

  setupMode: "guided" | "engineering";
  setSetupMode: (m: "guided" | "engineering") => void;
  planningScale: "homeowner" | "small_business" | "industrial";
  setPlanningScale: (s: "homeowner" | "small_business" | "industrial") => void;
  goal: "lowest_payback" | "max_offset" | "backup_resilience";
  setGoal: (g: "lowest_payback" | "max_offset" | "backup_resilience") => void;
  billInputType: "usd" | "kwh";
  setBillInputType: (t: "usd" | "kwh") => void;
  monthlyBillUsd: number;
  setMonthlyBillUsd: (b: number) => void;
  availableRoofAreaM2: number;
  setAvailableRoofAreaM2: (a: number) => void;

  systemCapacityKw: number;
  setSystemCapacityKw: (kw: number) => void;
  installationType: "rooftop" | "ground-mounted" | "carport";
  setInstallationType: (t: "rooftop" | "ground-mounted" | "carport") => void;
  panelTechnology: "monocrystalline" | "polycrystalline" | "thin-film";
  setPanelTechnology: (
    p: "monocrystalline" | "polycrystalline" | "thin-film",
  ) => void;
  gridConnection: "grid-tied" | "hybrid" | "off-grid";
  setGridConnection: (g: "grid-tied" | "hybrid" | "off-grid") => void;
  batteryCapacityKwh: number;
  setBatteryCapacityKwh: (kwh: number) => void;
  region: "india" | "usa" | "europe" | "global";
  setRegion: (r: "india" | "usa" | "europe" | "global") => void;
  tariffUsd: number;
  setTariffUsd: (t: number) => void;
  includeIncentives: boolean;
  setIncludeIncentives: (inc: boolean) => void;
  performanceRatio: number;
  setPerformanceRatio: (pr: number) => void;
  estimationModel:
    | "hist_gradient_boosting"
    | "random_forest"
    | "linear_regression"
    | "svm";
  setEstimationModel: (
    m:
      | "hist_gradient_boosting"
      | "random_forest"
      | "linear_regression"
      | "svm",
  ) => void;

  workspaceStep: number;
  setWorkspaceStep: (step: number) => void;
  resultsTab: string;
  setResultsTab: (tab: string) => void;
  hoveredMonthIdx: number;
  setHoveredMonthIdx: (idx: number) => void;

  handleSelectSite: (site: ReferenceSite) => void;
  liveCalc: ReturnType<typeof computeHeliodonAndFinancials>;

  // Cited Solar Guide & Engineering Q&A Drawer
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  assistantMessages: AssistantMessage[];
  setAssistantMessages: React.Dispatch<React.SetStateAction<AssistantMessage[]>>;
  /** Run attached to Solar Guide questions; shown as a chip in the drawer and removable there. */
  assistantSiteContext: AssistantContext | null;
  setAssistantSiteContext: (context: AssistantContext | null) => void;
  /** Question to pre-fill (not send) the next time the Solar Guide opens. */
  assistantDraft: string | null;
  setAssistantDraft: (draft: string | null) => void;
}

const STORAGE_KEY = "zenith:preferences:v1";

const ZenithPreferencesContext =
  createContext<ZenithPreferencesContextValue | null>(null);

export function ZenithPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [readingDepth, setReadingDepth] = useState<ReadingDepth>("simple");
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("m2");
  const [tempUnit, setTempUnit] = useState<TempUnit>("C");
  const [windUnit, setWindUnit] = useState<WindUnit>("ms");
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const unitSystem = useMemo(
    () => inferUnitSystem(areaUnit, tempUnit, windUnit),
    [areaUnit, tempUnit, windUnit],
  );

  const setUnitSystem = useCallback((system: UnitSystem) => {
    const next = unitsFromSystem(system);
    setAreaUnit(next.areaUnit);
    setTempUnit(next.tempUnit);
    setWindUnit(next.windUnit);
  }, []);

  const [showRssFeed, setShowRssFeed] = useState(true);
  const [showOodWarnings, setShowOodWarnings] = useState(true);

  const [defaultPrefs, setDefaultPrefs] = useState<DefaultBaselinePrefs>({
    defaultScale: "homeowner",
    defaultRegion: "india",
    defaultTariffUsd: 0.08,
    defaultPerformanceRatio: 0.78,
    defaultModel: "hist_gradient_boosting",
    autoApplySubsidies: true,
  });

  const [selectedSiteId, setSelectedSiteId] = useState("");
  const activeSite = useMemo(
    () =>
      REFERENCE_SITES.find((s) => s.id === selectedSiteId) ||
      REFERENCE_SITES[0],
    [selectedSiteId],
  );

  const [pinCoords, setPinCoords] = useState({ lat: 26.9124, lon: 75.7873 });
  const [searchQuery, setSearchQuery] = useState("Jaipur, Rajasthan");
  const [tiltDeg, setTiltDeg] = useState(26.9);

  const [setupMode, setSetupMode] = useState<"guided" | "engineering">("guided");
  const [planningScale, setPlanningScale] = useState<
    "homeowner" | "small_business" | "industrial"
  >("homeowner");
  const [goal, setGoal] = useState<
    "lowest_payback" | "max_offset" | "backup_resilience"
  >("lowest_payback");
  const [billInputType, setBillInputType] = useState<"usd" | "kwh">("usd");
  const [monthlyBillUsd, setMonthlyBillUsd] = useState(115);
  const [availableRoofAreaM2, setAvailableRoofAreaM2] = useState(52);

  const [systemCapacityKw, setSystemCapacityKw] = useState(8.0);
  const [installationType, setInstallationType] = useState<
    "rooftop" | "ground-mounted" | "carport"
  >("rooftop");
  const [panelTechnology, setPanelTechnology] = useState<
    "monocrystalline" | "polycrystalline" | "thin-film"
  >("monocrystalline");
  const [gridConnection, setGridConnection] = useState<
    "grid-tied" | "hybrid" | "off-grid"
  >("hybrid");
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState(16);
  const [region, setRegion] = useState<"india" | "usa" | "europe" | "global">(
    "india",
  );
  const [tariffUsd, setTariffUsd] = useState(0.08);
  const [includeIncentives, setIncludeIncentives] = useState(true);
  const [performanceRatio, setPerformanceRatio] = useState(0.78);
  const [estimationModel, setEstimationModel] = useState<
    "hist_gradient_boosting" | "random_forest" | "linear_regression" | "svm"
  >("hist_gradient_boosting");

  const [workspaceStep, setWorkspaceStep] = useState(1);
  const [resultsTab, setResultsTab] = useState("sunlight");
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState(4);

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [assistantSiteContext, setAssistantSiteContext] = useState<AssistantContext | null>(null);
  const [assistantDraft, setAssistantDraft] = useState<string | null>(null);

  // Hydrate persisted unit/mode preferences
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.readingDepth === "simple" || parsed.readingDepth === "detailed") {
        setReadingDepth(parsed.readingDepth);
        setSetupMode(parsed.readingDepth === "detailed" ? "engineering" : "guided");
      }
      if (parsed.areaUnit === "m2" || parsed.areaUnit === "sqft") {
        setAreaUnit(parsed.areaUnit);
      }
      if (parsed.tempUnit === "C" || parsed.tempUnit === "F") {
        setTempUnit(parsed.tempUnit);
      }
      if (
        parsed.windUnit === "ms" ||
        parsed.windUnit === "kmh" ||
        parsed.windUnit === "mph"
      ) {
        setWindUnit(parsed.windUnit);
      }
      if (typeof parsed.showRssFeed === "boolean") {
        setShowRssFeed(parsed.showRssFeed);
      }
      if (typeof parsed.showOodWarnings === "boolean") {
        setShowOodWarnings(parsed.showOodWarnings);
      }
      if (parsed.defaultPrefs) {
        setDefaultPrefs((prev) => ({ ...prev, ...parsed.defaultPrefs }));
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  // Persist unit/mode preferences
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          readingDepth,
          areaUnit,
          tempUnit,
          windUnit,
          showRssFeed,
          showOodWarnings,
          defaultPrefs,
        }),
      );
    } catch {
      // Ignore storage write errors
    }
  }, [
    readingDepth,
    areaUnit,
    tempUnit,
    windUnit,
    showRssFeed,
    showOodWarnings,
    defaultPrefs,
  ]);

  const handleToggleReadingDepth = useCallback((mode: ReadingDepth) => {
    setReadingDepth(mode);
    if (mode === "detailed") {
      setSetupMode("engineering");
    } else {
      setSetupMode("guided");
    }
  }, []);

  const viewMode: ViewMode = readingDepth === "detailed" ? "engineer" : "simple";
  const setViewMode = useCallback(
    (mode: ViewMode) => {
      handleToggleReadingDepth(mode === "engineer" ? "detailed" : "simple");
    },
    [handleToggleReadingDepth],
  );

  const formatArea = useCallback(
    (m2Val: number, includeBoth = false) => {
      const m2 = Math.round(Number(m2Val) || 0);
      const sqft = Math.round(m2 * 10.764);
      if (includeBoth) {
        return areaUnit === "m2"
          ? `${m2.toLocaleString()} m² (${sqft.toLocaleString()} sq ft)`
          : `${sqft.toLocaleString()} sq ft (${m2.toLocaleString()} m²)`;
      }
      return areaUnit === "m2"
        ? `${m2.toLocaleString()} m²`
        : `${sqft.toLocaleString()} sq ft`;
    },
    [areaUnit],
  );

  const formatTemp = useCallback(
    (celsiusVal: number) => {
      const c = Number(celsiusVal) || 0;
      if (tempUnit === "F") {
        const f = (c * 9) / 5 + 32;
        return `${f.toFixed(1)}°F`;
      }
      return `${c.toFixed(1)}°C`;
    },
    [tempUnit],
  );

  const formatWind = useCallback(
    (msVal: number) => {
      const ms = Number(msVal) || 0;
      if (windUnit === "kmh") {
        return `${(ms * 3.6).toFixed(1)} km/h`;
      }
      if (windUnit === "mph") {
        return `${(ms * 2.23694).toFixed(1)} mph`;
      }
      return `${ms.toFixed(1)} m/s`;
    },
    [windUnit],
  );

  const handleSelectSite = useCallback((site: ReferenceSite) => {
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
    // Real plants keep their documented size; guided mode would re-size from a bill.
    setSetupMode("engineering");
    setLocationConfirmed(true);
  }, []);

  const handleApplyDefaultsToPlanner = useCallback(() => {
    setPlanningScale(defaultPrefs.defaultScale);
    setRegion(defaultPrefs.defaultRegion);
    setTariffUsd(defaultPrefs.defaultTariffUsd);
    setPerformanceRatio(defaultPrefs.defaultPerformanceRatio);
    setEstimationModel(defaultPrefs.defaultModel);
    setIncludeIncentives(defaultPrefs.autoApplySubsidies);
  }, [defaultPrefs]);

  const pinMatchesSample =
    Math.abs(pinCoords.lat - activeSite.lat) < 0.05 &&
    Math.abs(pinCoords.lon - activeSite.lon) < 0.05;
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
        performanceRatio,
        ...(pinMatchesSample
          ? {}
          : {
              // shortcut: latitude stand-in until NASA climatology returns
              irradianceDaily: Math.max(
                2.2,
                Number((6.2 - Math.abs(pinCoords.lat) * 0.045).toFixed(2)),
              ),
              optimalTiltDeg: Math.round(Math.abs(pinCoords.lat) * 10) / 10,
            }),
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
      performanceRatio,
      pinCoords.lat,
      pinCoords.lon,
      activeSite.lat,
      activeSite.lon,
    ],
  );

  const value = useMemo<ZenithPreferencesContextValue>(
    () => ({
      viewMode,
      setViewMode,
      readingDepth,
      handleToggleReadingDepth,
      unitSystem,
      setUnitSystem,
      areaUnit,
      setAreaUnit,
      tempUnit,
      setTempUnit,
      windUnit,
      setWindUnit,
      locationConfirmed,
      setLocationConfirmed,
      formatArea,
      formatTemp,
      formatWind,
      defaultPrefs,
      setDefaultPrefs,
      showRssFeed,
      setShowRssFeed,
      showOodWarnings,
      setShowOodWarnings,
      handleApplyDefaultsToPlanner,
      selectedSiteId,
      setSelectedSiteId,
      activeSite,
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
      workspaceStep,
      setWorkspaceStep,
      resultsTab,
      setResultsTab,
      hoveredMonthIdx,
      setHoveredMonthIdx,
      handleSelectSite,
      liveCalc,
      assistantOpen,
      setAssistantOpen,
      assistantMessages,
      setAssistantMessages,
      assistantSiteContext,
      setAssistantSiteContext,
      assistantDraft,
      setAssistantDraft,
    }),
    [
      viewMode,
      setViewMode,
      readingDepth,
      handleToggleReadingDepth,
      unitSystem,
      setUnitSystem,
      areaUnit,
      tempUnit,
      windUnit,
      locationConfirmed,
      formatArea,
      formatTemp,
      formatWind,
      defaultPrefs,
      showRssFeed,
      showOodWarnings,
      handleApplyDefaultsToPlanner,
      selectedSiteId,
      activeSite,
      pinCoords,
      searchQuery,
      tiltDeg,
      setupMode,
      planningScale,
      goal,
      billInputType,
      monthlyBillUsd,
      availableRoofAreaM2,
      systemCapacityKw,
      installationType,
      panelTechnology,
      gridConnection,
      batteryCapacityKwh,
      region,
      tariffUsd,
      includeIncentives,
      performanceRatio,
      estimationModel,
      workspaceStep,
      resultsTab,
      hoveredMonthIdx,
      handleSelectSite,
      liveCalc,
      assistantOpen,
      assistantMessages,
      assistantSiteContext,
      assistantDraft,
    ],
  );

  return (
    <ZenithPreferencesContext.Provider value={value}>
      {children}
    </ZenithPreferencesContext.Provider>
  );
}

export function useZenithPreferences(): ZenithPreferencesContextValue {
  const ctx = useContext(ZenithPreferencesContext);
  if (!ctx) {
    throw new Error(
      "useZenithPreferences must be used within ZenithPreferencesProvider",
    );
  }
  return ctx;
}
