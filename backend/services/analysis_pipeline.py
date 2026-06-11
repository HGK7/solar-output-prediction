"""
Analysis pipeline — serial orchestration for /analyze and /stream-plan.

Single interface: run_stages(ctx) -> iterator[StageResult].
Flask routes are thin adapters over this module.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterator, Optional

from config import Config
from services.physics_simulation_service import PhysicsInput, PhysicsSimulationError
from services.nasa_service import NASAServiceError
from utils.logging import logger
from utils.validation import ValidationError, validate_coordinates


STAGE_DOCUMENTS: dict[str, list[str]] = {
    "location": ["data_provenance", "regional_guide_india.md"],
    "prediction": ["solar_fundamentals.md"],
    "physics": ["solar_panel_efficiency.md", "large_scale_systems.md"],
    "financial": ["solar_costs.md"],
    "explanation": [
        "bhadla_solar_park.md",
        "weather_impact.md",
        "solar_fundamentals.md",
        "operations_maintenance.md",
    ],
}


@dataclass
class AnalysisContext:
    """Input for a full or partial analysis run."""

    lat: Optional[float] = None
    lon: Optional[float] = None
    features: Optional[dict[str, Any]] = None
    model: str = "linear_regression"
    financial_overrides: dict[str, Any] = field(default_factory=dict)
    panel_technology: str = "monocrystalline"
    installation_type: str = "rooftop"
    grid_connection: str = "grid-tied"
    data_source: str = "nasa_api"

    @property
    def has_coords(self) -> bool:
        return self.lat is not None and self.lon is not None

    @classmethod
    def from_json(cls, payload: dict) -> AnalysisContext:
        has_coords = payload.get("lat") is not None and payload.get("lon") is not None
        manual_features = payload.get("features")
        if has_coords:
            lat, lon = validate_coordinates(payload["lat"], payload["lon"])
            return cls(
                lat=lat,
                lon=lon,
                model=payload.get("model", "linear_regression"),
                financial_overrides=dict(payload.get("financial_overrides", {})),
                panel_technology=payload.get("panel_technology", "monocrystalline"),
                installation_type=payload.get("installation_type", "rooftop"),
                grid_connection=payload.get(
                    "grid_connection",
                    payload.get("financial_overrides", {}).get(
                        "grid_connection", "grid-tied"
                    ),
                ),
                data_source="nasa_api",
            )
        if manual_features and isinstance(manual_features, dict):
            return cls(
                features=manual_features,
                model=payload.get("model", "linear_regression"),
                financial_overrides=dict(payload.get("financial_overrides", {})),
                panel_technology=payload.get("panel_technology", "monocrystalline"),
                installation_type=payload.get("installation_type", "rooftop"),
                grid_connection=payload.get(
                    "grid_connection",
                    payload.get("financial_overrides", {}).get(
                        "grid_connection", "grid-tied"
                    ),
                ),
                data_source="manual",
            )
        raise ValidationError(
            "Provide either (lat, lon) coordinates or a 'features' dict.",
            field="lat",
        )

    @classmethod
    def from_query(cls, args: dict[str, Any]) -> AnalysisContext:
        lat, lon = validate_coordinates(args.get("lat"), args.get("lon"))
        region = args.get("region", "global")
        financial_overrides: dict[str, Any] = {"region": region}
        if region == "global":
            inferred = infer_region_from_coordinates(lat, lon)
            if inferred != "global":
                financial_overrides["region"] = inferred
        for key in (
            "system_capacity_kw",
            "panel_efficiency",
            "performance_ratio",
            "electricity_tariff_usd",
        ):
            if args.get(key) is not None:
                financial_overrides[key] = args[key]
        return cls(
            lat=lat,
            lon=lon,
            model=args.get("model", "linear_regression"),
            financial_overrides=financial_overrides,
            panel_technology=args.get("panel_technology", "monocrystalline"),
            installation_type=args.get("installation_type", "rooftop"),
            data_source="nasa_api",
        )


@dataclass
class StageResult:
    """One event from run_stages — maps 1:1 to SSE event types."""

    kind: str
    payload: dict[str, Any]


def infer_region_from_coordinates(lat: float, lon: float) -> str:
    """Infer coarse financial region from coordinates when region unset."""
    if 5.0 <= lat <= 38.5 and 68.0 <= lon <= 97.5:
        return "india"
    if 24.0 <= lat <= 49.5 and -125.0 <= lon <= -66.0:
        return "usa"
    if 35.0 <= lat <= 71.0 and -10.0 <= lon <= 40.0:
        return "europe"
    return "global"


def documents_for_stage(stage: str) -> list[str]:
    return STAGE_DOCUMENTS.get(stage, [])


class AnalysisPipeline:
    """Serial analysis stages: location → prediction → physics → financial → explanation."""

    def __init__(
        self,
        nasa_service,
        prediction_service,
        physics_service,
        financial_service,
        geometry_service,
        explanation_service,
        rag_service,
    ):
        self._nasa = nasa_service
        self._prediction = prediction_service
        self._physics = physics_service
        self._financial = financial_service
        self._geometry = geometry_service
        self._explanation = explanation_service
        self._rag = rag_service

    def run_stages(self, ctx: AnalysisContext) -> Iterator[StageResult]:
        """Yield stage results in order. Serial execution — peak memory = max stage."""
        try:
            location_data = None
            features = ctx.features
            financial_overrides = dict(ctx.financial_overrides)

            if ctx.has_coords:
                lat, lon = ctx.lat, ctx.lon
                if (
                    financial_overrides.get("region", "global") == "global"
                    and ctx.data_source == "nasa_api"
                ):
                    inferred = infer_region_from_coordinates(lat, lon)
                    if inferred != "global":
                        financial_overrides["region"] = inferred

                yield StageResult(
                    "stage",
                    {
                        "stage": "location",
                        "status": "loading",
                        "documents": documents_for_stage("location"),
                    },
                )
                location_data = self._nasa.fetch_solar_parameters(lat, lon)
                features = location_data["annual_averages"]
                yield StageResult(
                    "location",
                    {
                        "location": location_data["location"],
                        "annual_averages": location_data["annual_averages"],
                        "monthly": location_data["monthly"],
                        "annual_ghi": location_data["annual_ghi"],
                        "data_provenance": location_data.get("data_provenance"),
                    },
                )

            if features is None:
                raise ValidationError(
                    "No features available for prediction.", field="features"
                )

            yield StageResult(
                "stage",
                {
                    "stage": "prediction",
                    "status": "loading",
                    "documents": documents_for_stage("prediction"),
                },
            )
            pred_payload = {**features, "model": ctx.model}
            prediction_result = self._prediction.predict(
                pred_payload, data_source=ctx.data_source
            )
            yield StageResult("prediction", prediction_result)

            physics_simulation: dict[str, Any] = {
                "status": "skipped",
                "reason": "coordinates_required",
            }
            if ctx.has_coords and location_data:
                yield StageResult(
                    "stage",
                    {
                        "stage": "physics",
                        "status": "loading",
                        "documents": documents_for_stage("physics"),
                    },
                )
                physics_input = PhysicsInput(
                    lat=ctx.lat,
                    lon=ctx.lon,
                    monthly=location_data["monthly"],
                    system_capacity_kw=float(
                        financial_overrides.get("system_capacity_kw", 5.0)
                    ),
                    panel_technology=str(ctx.panel_technology),
                    installation_type=str(ctx.installation_type),
                    performance_ratio=float(
                        financial_overrides.get("performance_ratio", 0.78)
                    ),
                    panel_efficiency=float(
                        financial_overrides.get("panel_efficiency", 0.20)
                    ),
                )
                try:
                    physics_simulation = self._physics.simulate(physics_input)
                except PhysicsSimulationError as exc:
                    physics_simulation = {"status": "error", "error": str(exc)}
                yield StageResult("physics", physics_simulation)

            yield StageResult(
                "stage",
                {
                    "stage": "financial",
                    "status": "loading",
                    "documents": documents_for_stage("financial"),
                },
            )
            financial_result = self._financial.calculate(
                predicted_irradiance_kwh_m2_day=prediction_result["prediction"],
                overrides=financial_overrides,
            )
            geometry_result = None
            if ctx.has_coords:
                capacity_kw = financial_overrides.get("system_capacity_kw", 5.0)
                geometry_result = self._geometry.calculate(
                    ctx.lat, ctx.lon, system_capacity_kw=capacity_kw
                )
            yield StageResult("financial", financial_result)
            if geometry_result is not None:
                yield StageResult("geometry", geometry_result)

            system_context = self._build_system_context(
                ctx, financial_result, financial_overrides
            )
            yield StageResult(
                "stage",
                {
                    "stage": "explanation",
                    "status": "loading",
                    "documents": documents_for_stage("explanation"),
                },
            )
            document_grounding = self._fetch_document_grounding(
                prediction_result, financial_result, system_context
            )
            explanation_input = {
                **prediction_result,
                "financial": financial_result,
                "system_context": system_context,
                "document_grounding": document_grounding,
            }
            try:
                explanation = self._explanation.explain(explanation_input)
                explanation = self._enrich_explanation_with_rag(
                    explanation,
                    document_grounding,
                    prediction_result,
                    financial_result,
                    system_context,
                )
            except RuntimeError:
                explanation = {
                    "error": "Explanation unavailable — GEMINI_API_KEY not set."
                }
            except Exception as exc:
                # LLM failures (quota exhausted, network, service errors) must
                # never block numeric results — degrade the explanation only.
                logger.warning("Explanation stage degraded: %s", exc)
                explanation = {
                    "error": (
                        "Explanation temporarily unavailable (LLM quota or "
                        "service error). Prediction and financial results "
                        "are unaffected."
                    ),
                    "degraded": True,
                }
            yield StageResult("explanation", explanation)
            yield StageResult("done", {"status": "complete"})

        except NASAServiceError as exc:
            yield StageResult("error", {"error": exc.message, "stage": "location"})
        except Exception as exc:
            logger.error("Analysis pipeline failed: %s", exc, exc_info=True)
            yield StageResult(
                "error", {"error": "Analysis failed. Please try again."}
            )

    def collect_analyze(self, ctx: AnalysisContext) -> dict[str, Any]:
        """Run stages and assemble the /analyze JSON response."""
        location_data = None
        prediction_result = None
        physics_simulation = {
            "status": "skipped",
            "reason": "coordinates_required",
        }
        financial_result = None
        geometry_result = None
        explanation = None

        for stage in self.run_stages(ctx):
            if stage.kind == "location":
                location_data = stage.payload
            elif stage.kind == "prediction":
                prediction_result = stage.payload
            elif stage.kind == "physics":
                physics_simulation = stage.payload
            elif stage.kind == "financial":
                financial_result = stage.payload
            elif stage.kind == "geometry":
                geometry_result = stage.payload
            elif stage.kind == "explanation":
                explanation = stage.payload
            elif stage.kind == "error":
                err = stage.payload
                if err.get("stage") == "location":
                    raise NASAServiceError(
                        err.get("error", "NASA POWER API request failed")
                    )
                raise RuntimeError(err.get("error", "Analysis failed"))

        result: dict[str, Any] = {
            "prediction": prediction_result,
            "physics_simulation": physics_simulation,
            "financial": financial_result,
            "explanation": explanation,
        }

        if (
            physics_simulation.get("status") == "ok"
            and isinstance(financial_result, dict)
        ):
            ml_annual = financial_result.get("annual_output_kwh")
            physics_annual = physics_simulation.get("annual_energy_kwh")
            if isinstance(ml_annual, (int, float)) and isinstance(
                physics_annual, (int, float)
            ):
                delta_kwh = round(float(ml_annual) - float(physics_annual), 2)
                delta_pct = (
                    round((delta_kwh / float(physics_annual)) * 100, 2)
                    if float(physics_annual) > 0
                    else None
                )
                result["ml_vs_physics_delta"] = {
                    "ml_annual_output_kwh": round(float(ml_annual), 2),
                    "physics_annual_output_kwh": round(float(physics_annual), 2),
                    "delta_kwh": delta_kwh,
                    "delta_pct": delta_pct,
                }

        if geometry_result:
            result["geometry"] = geometry_result

        if location_data:
            result["location"] = location_data["location"]
            result["monthly"] = location_data["monthly"]
            result["annual_ghi"] = location_data["annual_ghi"]
            result["data_provenance"] = location_data.get("data_provenance")

        return result

    def _build_system_context(
        self,
        ctx: AnalysisContext,
        financial_result: dict,
        financial_overrides: dict,
    ) -> dict:
        return {
            "installation_type": str(ctx.installation_type),
            "panel_technology": str(ctx.panel_technology),
            "grid_connection": str(
                ctx.grid_connection
                or financial_overrides.get("grid_connection", "grid-tied")
            ),
            "region": str(
                financial_result.get("system_parameters", {}).get("region", "global")
            ),
            "system_capacity_kw": financial_result.get("system_parameters", {}).get(
                "capacity_kw"
            ),
            "electricity_tariff_usd": financial_result.get(
                "system_parameters", {}
            ).get("electricity_tariff_usd_kwh"),
        }

    def _build_grounding_question(
        self,
        prediction_result: dict,
        financial_result: dict,
        system_context: dict,
    ) -> str:
        input_features = prediction_result.get("input_features", {})
        return (
            "Provide scientific context for this solar prediction using retrieval: "
            f"Predicted irradiance={prediction_result.get('prediction')} "
            f"{prediction_result.get('unit', 'kWh/m²/day')}, "
            f"temperature={input_features.get('Temperature', {}).get('value', 'N/A')} °C, "
            f"humidity={input_features.get('Humidity', {}).get('value', 'N/A')} %, "
            f"wind={input_features.get('Wind Speed', {}).get('value', 'N/A')} m/s, "
            f"clear_sky_irradiance={input_features.get('Clear Sky Irradiance', {}).get('value', 'N/A')} kWh/m²/day, "
            f"annual_output={financial_result.get('annual_output_kwh', 'N/A')} kWh, "
            f"payback={financial_result.get('simple_payback_years', 'N/A')} years. "
            f"installation_type={system_context.get('installation_type', 'N/A')}, "
            f"panel_technology={system_context.get('panel_technology', 'N/A')}, "
            f"grid_connection={system_context.get('grid_connection', 'N/A')}, "
            f"region={system_context.get('region', 'N/A')}, "
            f"system_capacity_kw={system_context.get('system_capacity_kw', 'N/A')}, "
            f"tariff_usd_kwh={system_context.get('electricity_tariff_usd', 'N/A')}. "
            "Return concise technical rationale and cite sources."
        )

    def _fetch_document_grounding(
        self,
        prediction_result: dict,
        financial_result: dict,
        system_context: dict,
    ) -> dict:
        if not Config.ENABLE_RAG_GROUNDING:
            return {
                "answer": "",
                "citations": [],
                "is_refusal": False,
                "confidence": "none",
                "query": "",
                "retrieval_count": 0,
                "retrieved_documents": [],
                "grounding_disabled": True,
            }

        query = self._build_grounding_question(
            prediction_result, financial_result, system_context
        )
        try:
            rag_result = self._rag.ask(query)
            if isinstance(rag_result, dict):
                return {**rag_result, "query": rag_result.get("query") or query}
        except RuntimeError as exc:
            logger.warning("RAG grounding unavailable for explanation: %s", exc)
        except Exception as exc:
            logger.warning("RAG grounding failed for explanation: %s", exc)
        return {
            "answer": "",
            "citations": [],
            "is_refusal": False,
            "confidence": "none",
            "query": query,
            "retrieval_count": 0,
            "retrieved_documents": [],
        }

    def _build_trace_defaults(
        self,
        prediction_result: dict,
        financial_result: dict,
        system_context: dict,
    ) -> dict:
        input_trace = []
        for name, details in prediction_result.get("input_features", {}).items():
            input_trace.append(
                {
                    "name": name,
                    "value": f"{details.get('value', 'N/A')} {details.get('unit', '')}".strip(),
                    "source": "nasa",
                    "impact": f"{name} contributes to irradiance estimation through the trained model coefficients.",
                }
            )

        for key in (
            "installation_type",
            "panel_technology",
            "grid_connection",
            "region",
            "system_capacity_kw",
            "electricity_tariff_usd",
        ):
            if system_context.get(key) is not None:
                input_trace.append(
                    {
                        "name": key,
                        "value": str(system_context.get(key)),
                        "source": "user" if key != "region" else "derived",
                        "impact": "Used in physics/financial calculations and contextual viability assessment.",
                    }
                )

        financial_calc_steps = (
            financial_result.get("output_calculation", {}).get("steps", [])
            if isinstance(financial_result, dict)
            else []
        )
        calculation_trace = [
            {
                "step": f"Financial Step {index + 1}",
                "formula": (
                    "Annual kWh = PSH × System_kW × Performance_Ratio × 365"
                    if index == 0
                    else ""
                ),
                "result": str(step),
                "why": "Shows how deterministic output and savings were computed.",
            }
            for index, step in enumerate(financial_calc_steps)
        ]

        return {
            "methodology_trace": [
                {
                    "step": "Prediction",
                    "how": "Deterministic ML model estimates irradiance from climate features.",
                    "why": "Establishes expected solar resource baseline.",
                },
                {
                    "step": "Financial Analysis",
                    "how": "Deterministic cost/output equations compute payback, ROI, and LCOE.",
                    "why": "Converts technical output into investment viability.",
                },
                {
                    "step": "Document Grounding",
                    "how": "RAG retrieves science references and contextual evidence.",
                    "why": "Improves explainability and citation transparency.",
                },
            ],
            "input_trace": input_trace,
            "calculation_trace": calculation_trace,
            "assumptions_used": [
                "Financial defaults are region-adjusted and deterministic.",
                "Prediction uses climatological averages, not day-ahead forecasting.",
                "Performance ratio and tariff sensitivity affect ROI outcomes.",
            ],
        }

    def _enrich_explanation_with_rag(
        self,
        explanation_result: dict,
        rag_result: dict,
        prediction_result: dict,
        financial_result: dict,
        system_context: dict,
    ) -> dict:
        if not isinstance(explanation_result, dict) or explanation_result.get("error"):
            return explanation_result

        explanation_result.setdefault("citations", [])

        if not isinstance(rag_result, dict):
            return explanation_result

        citations = rag_result.get("citations")
        retrieved_docs = rag_result.get("retrieved_documents", [])
        link_by_source = {}
        if isinstance(retrieved_docs, list):
            for item in retrieved_docs:
                if isinstance(item, dict):
                    source = item.get("source")
                    link = item.get("link")
                    if source and link and source not in link_by_source:
                        link_by_source[source] = link

        if isinstance(citations, list):
            normalized_citations = []
            for citation in citations:
                if not isinstance(citation, dict):
                    continue
                source = citation.get("source")
                normalized_citations.append(
                    {
                        **citation,
                        "link": citation.get("link") or link_by_source.get(source),
                    }
                )
            explanation_result["citations"] = normalized_citations

        answer = str(rag_result.get("answer", "")).strip()
        if answer and not rag_result.get("is_refusal", False):
            explanation_result["grounded_context"] = answer

        explanation_result["rag_pipeline"] = {
            "query": rag_result.get("query", ""),
            "answer": answer,
            "confidence": rag_result.get("confidence", "none"),
            "is_refusal": bool(rag_result.get("is_refusal", False)),
            "refusal_reason": rag_result.get("refusal_reason"),
            "retrieval_count": int(rag_result.get("retrieval_count", 0) or 0),
            "retrieved_documents": rag_result.get("retrieved_documents", [])[:4],
        }

        trace_defaults = self._build_trace_defaults(
            prediction_result, financial_result, system_context
        )
        for key, value in trace_defaults.items():
            if key not in explanation_result or not explanation_result.get(key):
                explanation_result[key] = value

        return explanation_result
