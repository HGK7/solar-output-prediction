/* ──────────────────────────────────────────────────────────────
   Solar Dashboard — Shared TypeScript interfaces
   ────────────────────────────────────────────────────────────── */

// ── Location ──

export interface Coordinates {
  lat: number;
  lon: number;
}

// ── Prediction ──

export interface FeatureDetail {
  value: number;
  unit: string;
}

export interface TrainingDataInfo {
  dataset: string;
  records: string;
  features_used: string[];
  target_variable: string;
  source: string;
}

export interface PredictionContext {
  what_is_predicted: string;
  prediction_represents: string;
  data_source: string;
  data_source_detail: string;
  training_data: TrainingDataInfo;
  methodology: string;
}

export interface PredictionResult {
  prediction: number;
  unit: string;
  model_used: string;
  input_features: Record<string, FeatureDetail>;
  error_estimate: number;
  metrics: {
    rmse: number;
    r2: number;
  };
  feature_importance: Record<string, number>;
  prediction_context?: PredictionContext;
}

// ── Financial ──

export interface YearlyBreakdown {
  year: number;
  output_kwh: number;
  savings_usd: number;
  cumulative_savings_usd: number;
}

export interface SystemParameters {
  capacity_kw: number;
  panel_efficiency: number;
  performance_ratio: number;
  lifetime_years: number;
  degradation_rate_pct: number;
  electricity_tariff_usd_kwh: number;
  region: string;
}

export interface CostBreakdown {
  module_cost_usd: number;
  inverter_cost_usd: number;
  bos_cost_usd: number;
  soft_cost_usd: number;
  annual_maintenance_usd: number;
  sources: Record<string, string>;
}

export interface OutputCalculation {
  formula: string;
  peak_sun_hours: number;
  system_capacity_kw: number;
  performance_ratio: number;
  performance_ratio_components: {
    inverter_efficiency: string;
    wiring_losses: string;
    soiling_losses: string;
    temperature_losses: string;
    mismatch_losses: string;
    combined_ratio: number;
    source: string;
  };
  steps: string[];
}

export interface FinancialSummary {
  annual_output_kwh: number;
  total_system_cost_usd: number;
  annual_savings_usd: number;
  annual_maintenance_usd: number;
  net_annual_savings_usd: number;
  simple_payback_years: number;
  lifetime_savings_usd: number;
  lifetime_roi_pct: number;
  lcoe_usd_per_kwh: number;
  cost_breakdown?: CostBreakdown;
  output_calculation?: OutputCalculation;
  system_parameters: SystemParameters;
  yearly_breakdown: YearlyBreakdown[];
  sources: string[];
  disclaimer: string;
}

// ── Solar Geometry ──

export interface PanelSpec {
  length_m: number;
  width_m: number;
  area_per_panel_m2: number;
  watt_peak: number;
  source: string;
}

export interface Orientation {
  optimal_tilt_deg: number;
  optimal_azimuth_deg: number;
  azimuth_direction: string;
  tilt_rationale: string;
}

export interface SystemLayout {
  system_capacity_kw: number;
  num_panels: number;
  total_panel_area_m2: number;
  panel_arrangement: string;
}

export interface MonthlySunPath {
  sunrise: string;
  sunset: string;
  daylight_hours: number;
  solar_noon_altitude_deg: number;
  declination_deg: number;
}

export interface DawnToDusk {
  monthly: Record<string, MonthlySunPath>;
  annual_avg_daylight_hours: number;
  annual_avg_solar_noon_altitude_deg: number;
}

export interface GeometryResult {
  panel_spec: PanelSpec;
  orientation: Orientation;
  system_layout: SystemLayout;
  dawn_to_dusk: DawnToDusk;
  effective_irradiance_factor: number;
  methodology: string[];
}

// ── Data Provenance ──

export interface NASAParameterInfo {
  name: string;
  unit: string;
  description: string;
}

export interface DataProvenance {
  source: string;
  api_endpoint: string;
  temporal_type: string;
  date_range: string;
  spatial_resolution: string;
  data_origin: string;
  community: string;
  parameters_fetched: Record<string, NASAParameterInfo>;
  citation: string;
  limitations: string[];
}

// ── Explanation ──

export interface KeyDriver {
  feature: string;
  value: number;
  unit: string;
  coefficient?: number;
  impact: string;
}

export interface MethodologyTraceItem {
  step: string;
  how: string;
  why: string;
}

export interface InputTraceItem {
  name: string;
  value: string;
  source: "user" | "nasa" | "default" | "derived" | string;
  impact: string;
}

export interface CalculationTraceItem {
  step: string;
  formula: string;
  result: string;
  why: string;
}

export interface ExplanationResponse {
  explanation_summary: string;
  key_drivers: KeyDriver[];
  physical_interpretation: string;
  uncertainty_notes: string;
  risk_factors: string[];
  confidence_assessment: "low" | "medium" | "high";
  financial_insight: string | null;
  methodology_trace?: MethodologyTraceItem[];
  input_trace?: InputTraceItem[];
  calculation_trace?: CalculationTraceItem[];
  assumptions_used?: string[];
  grounded_context?: string;
  citations?: RAGCitation[];
  rag_pipeline?: RAGPipelineMeta;
  raw_response?: boolean;
  error?: string;
}

// ── Full Analysis ──

export interface MonthlyData {
  Temperature: number;
  Humidity: number;
  "Wind Speed": number;
  "Clear Sky Irradiance": number;
  "Solar Irradiance": number;
}

export interface AnalysisResult {
  prediction: PredictionResult;
  physics_simulation?: PhysicsSimulationResult;
  ml_vs_physics_delta?: MLPhysicsDelta;
  financial: FinancialSummary;
  explanation: ExplanationResponse;
  geometry?: GeometryResult;
  location?: Coordinates;
  monthly?: Record<string, MonthlyData>;
  annual_ghi?: number;
  data_provenance?: DataProvenance;
}

// ── RAG Chatbot ──

export interface RAGCitation {
  source: string;
  section?: string;
  chunk?: string;
  source_path?: string | null;
  link?: string | null;
}

export interface RAGRetrievedDocument {
  source: string;
  section?: string;
  source_path?: string | null;
  link?: string | null;
  snippet: string;
}

export interface RAGPipelineMeta {
  query: string;
  answer: string;
  confidence: "none" | "low" | "medium" | "high";
  is_refusal: boolean;
  refusal_reason?: string | null;
  retrieval_count: number;
  retrieved_documents: RAGRetrievedDocument[];
}

export interface RAGResponse {
  answer: string;
  citations: RAGCitation[];
  confidence: "none" | "low" | "medium" | "high";
  query?: string;
  retrieval_count?: number;
  retrieved_documents?: RAGRetrievedDocument[];
  refusal?: boolean;
  is_refusal?: boolean;
  refusal_reason?: string | null;
  raw_response?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: RAGCitation[];
  timestamp: Date;
}

// ── UI State ──

export type LoadingStage = "idle" | "location" | "prediction" | "physics" | "financial" | "explanation" | "complete" | "error";

// ── Saved Locations & Runs (Guest Mode) ──

export type SavedInstallationType = "rooftop" | "ground-mounted" | "carport";
export type SavedPanelTechnology = "monocrystalline" | "polycrystalline" | "thin-film";
export type SavedGridConnection = "grid-tied" | "hybrid" | "off-grid";
export type SavedRegionType = "india" | "usa" | "europe" | "global";

export interface SavedSystemConfig {
  installationType: SavedInstallationType;
  panelTechnology: SavedPanelTechnology;
  gridConnection: SavedGridConnection;
  region: SavedRegionType;
  systemCapacityKw: number;
  electricityTariffUsd: number;
  performanceRatio: number;
}

export interface SavedRunSummary {
  annualOutputKwh: number;
  annualSavingsUsd: number;
  paybackYears: number;
  confidence: "low" | "medium" | "high";
  modelUsed: string;
}

export interface SavedAnalysisRun {
  id: string;
  createdAt: string;
  summary: SavedRunSummary;
  result: AnalysisResult;
}

export interface SavedLocationMetadata {
  ownerName: string;
  installationDate: string | null;
  notes: string;
  tags: string[];
}

export interface SavedLocationRecord {
  id: string;
  name: string;
  coordinates: Coordinates;
  systemConfig: SavedSystemConfig;
  metadata: SavedLocationMetadata;
  createdAt: string;
  updatedAt: string;
  latestRun: SavedAnalysisRun | null;
}

export interface SavedLocationsStoreState {
  version: number;
  locations: SavedLocationRecord[];
}

// ── SSE ──

export type SSEStage = "location" | "prediction" | "physics" | "financial" | "explanation" | "done" | "error";

export interface PhysicsSimulationResult {
  status: "ok" | "error" | "skipped";
  model?: string;
  annual_energy_kwh?: number;
  specific_yield_kwh_per_kw?: number;
  capacity_factor_pct?: number;
  monthly_energy_kwh?: Array<{ month: string; energy_kwh: number }>;
  assumptions?: {
    system_capacity_kw: number;
    panel_technology: string;
    installation_type: string;
    performance_ratio: number;
    losses_pct: number;
    panel_efficiency: number;
    tilt_deg: number;
    azimuth_deg: number;
  };
  reason?: string;
  error?: string;
}

export interface MLPhysicsDelta {
  ml_annual_output_kwh: number;
  physics_annual_output_kwh: number;
  delta_kwh: number;
  delta_pct: number | null;
}

export interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

// ── API Error ──

export interface APIError {
  error: string;
  field?: string;
  source?: string;
}
