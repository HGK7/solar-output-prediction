"""
Solar Intelligence & Optimization System — Flask API Entrypoint

Endpoints:
    POST /predict      – Deterministic ML prediction (no LLM)
    POST /explain      – LLM explanation of a prediction
    POST /ask          – RAG-grounded domain Q&A
    POST /analyze      – Full pipeline: location → prediction → financial → explanation
    GET  /stream-plan  – SSE streamed full analysis pipeline
    GET  /health       – Readiness probe
"""

import json
import os
import traceback
from concurrent.futures import ThreadPoolExecutor

from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS

from config import Config
from models.loader import ModelManager
from services.prediction_service import PredictionService
from services.explanation_service import ExplanationService
from services.rag_service import RAGService
from services.nasa_service import NASAService, NASAServiceError
from services.financial_service import FinancialService
from services.pysam_service import PhysicsInput, PhysicsSimulationError, PySAMService
from services.solar_geometry_service import SolarGeometryService
from utils.validation import ValidationError, validate_coordinates
from utils.logging import logger

# ──────────────────────────────────────────────
# Application factory
# ──────────────────────────────────────────────


def create_app() -> Flask:
    """Build and configure the Flask application."""
    application = Flask(__name__)
    CORS(application, origins=Config.CORS_ORIGINS)

    # --- Startup warnings ---
    for warning in Config.validate():
        logger.warning("CONFIG WARNING: %s", warning)

    # --- Initialize ML models ---
    model_manager = ModelManager()

    # --- Initialize services ---
    prediction_service = PredictionService(model_manager)
    explanation_service = ExplanationService()
    rag_service = RAGService()
    nasa_service = NASAService()
    financial_service = FinancialService()
    pysam_service = PySAMService()
    geometry_service = SolarGeometryService()

    def infer_region_from_coordinates(lat: float, lon: float) -> str:
        """Infer a coarse financial region from coordinates when region is unset."""
        if 5.0 <= lat <= 38.5 and 68.0 <= lon <= 97.5:
            return "india"
        if 24.0 <= lat <= 49.5 and -125.0 <= lon <= -66.0:
            return "usa"
        if 35.0 <= lat <= 71.0 and -10.0 <= lon <= 40.0:
            return "europe"
        return "global"

    def build_grounding_question(
        prediction_result: dict,
        financial_result: dict,
        system_context: dict,
    ) -> str:
        """Build a compact scientific grounding query for explanation enrichment."""
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

    def fetch_document_grounding(
        prediction_result: dict, financial_result: dict, system_context: dict
    ) -> dict:
        """Retrieve scientific grounding once and reuse in explanation pipeline."""
        query = build_grounding_question(
            prediction_result,
            financial_result,
            system_context,
        )
        try:
            rag_result = rag_service.ask(query)
            if isinstance(rag_result, dict):
                return {
                    **rag_result,
                    "query": rag_result.get("query") or query,
                }
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

    def build_trace_defaults(
        prediction_result: dict,
        financial_result: dict,
        system_context: dict,
    ) -> dict:
        """Build deterministic fallback traces for UI transparency."""
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

        for key in [
            "installation_type",
            "panel_technology",
            "grid_connection",
            "region",
            "system_capacity_kw",
            "electricity_tariff_usd",
        ]:
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

        methodology_trace = [
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
        ]

        assumptions_used = [
            "Financial defaults are region-adjusted and deterministic.",
            "Prediction uses climatological averages, not day-ahead forecasting.",
            "Performance ratio and tariff sensitivity affect ROI outcomes.",
        ]

        return {
            "methodology_trace": methodology_trace,
            "input_trace": input_trace,
            "calculation_trace": calculation_trace,
            "assumptions_used": assumptions_used,
        }

    def enrich_explanation_with_rag(
        explanation_result: dict,
        rag_result: dict,
        prediction_result: dict,
        financial_result: dict,
        system_context: dict,
    ) -> dict:
        """Attach retrieval-grounded context and citations to explanation payload."""
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

        trace_defaults = build_trace_defaults(
            prediction_result, financial_result, system_context
        )
        for key, value in trace_defaults.items():
            if key not in explanation_result or not explanation_result.get(key):
                explanation_result[key] = value

        return explanation_result

    # ──────────────────────────────────────────
    # Error handlers
    # ──────────────────────────────────────────

    @application.errorhandler(ValidationError)
    def handle_validation_error(exc: ValidationError):
        return jsonify({"error": exc.message, "field": exc.field}), 400

    @application.errorhandler(NASAServiceError)
    def handle_nasa_error(exc: NASAServiceError):
        return jsonify({"error": exc.message, "source": "nasa_api"}), 502

    @application.errorhandler(404)
    def handle_not_found(_):
        return jsonify({"error": "Endpoint not found"}), 404

    @application.errorhandler(500)
    def handle_internal_error(_):
        return jsonify({"error": "Internal server error"}), 500

    # ──────────────────────────────────────────
    # Endpoints
    # ──────────────────────────────────────────

    @application.route("/health", methods=["GET"])
    def health():
        """Readiness / liveness probe."""
        models_loaded = []
        rag_chunks = 0
        warnings = []

        try:
            models_loaded = model_manager.list_models()
        except Exception as exc:
            warnings.append(f"model_status_unavailable: {exc}")

        try:
            rag_chunks = rag_service.document_count()
        except Exception as exc:
            warnings.append(f"rag_status_unavailable: {exc}")

        status = "healthy" if not warnings else "degraded"
        return jsonify(
            {
                "status": status,
                "models_loaded": models_loaded,
                "rag_chunks": rag_chunks,
                "warnings": warnings,
            }
        )

    # ----- POST /predict -----

    @application.route("/predict", methods=["POST"])
    def predict():
        """
        Run a deterministic ML prediction.

        Body (JSON):
            Temperature, Humidity, Wind Speed, Clear Sky Irradiance
            (or snake_case equivalents)
            model (optional): "linear_regression" | "svm"
        """
        try:
            payload = request.get_json(force=True)
            result = prediction_service.predict(payload)
            return jsonify(result)
        except ValidationError:
            raise
        except Exception as exc:
            logger.error("Prediction failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": f"Prediction failed: {exc}"}), 500

    # ----- POST /explain -----

    @application.route("/explain", methods=["POST"])
    def explain():
        """
        Generate an LLM explanation for a completed prediction.

        Body (JSON): the full result dict from /predict,
        or at minimum {prediction, features, model_used}.
        """
        try:
            payload = request.get_json(force=True)

            # Allow passing a raw prediction result directly
            if "prediction" not in payload:
                return jsonify({"error": "Missing 'prediction' in request body."}), 400

            explanation = explanation_service.explain(payload)
            return jsonify(explanation)
        except RuntimeError as exc:
            # Gemini API key not set
            return jsonify({"error": str(exc)}), 503
        except Exception as exc:
            logger.error("Explanation failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": f"Explanation failed: {exc}"}), 500

    # ----- POST /ask -----

    @application.route("/ask", methods=["POST"])
    def ask():
        """
        Answer a natural-language question via RAG.

        Body (JSON): { "question": "..." }
        """
        try:
            payload = request.get_json(force=True)
            question = payload.get("question", "").strip()
            if not question:
                return jsonify({"error": "Missing 'question' field."}), 400
            if len(question) > 1000:
                return jsonify({"error": "Question exceeds 1000 characters."}), 400

            answer = rag_service.ask(question)
            return jsonify(answer)
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 503
        except Exception as exc:
            logger.error("RAG query failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": f"RAG query failed: {exc}"}), 500

    # ----- POST /analyze -----

    @application.route("/analyze", methods=["POST"])
    def analyze():
        """
        Full analysis pipeline: location → NASA data → prediction → financial → explanation.

        Body (JSON):
            Required (one of):
                - lat, lon: float coordinates (triggers NASA POWER fetch)
                - features: dict of manual feature values (skips NASA)
            Optional:
                - model: "linear_regression" | "svm"
                - financial_overrides: dict (region, system_capacity_kw, etc.)
        """
        try:
            payload = request.get_json(force=True)

            # Determine if using location-based or manual features
            has_coords = (
                payload.get("lat") is not None and payload.get("lon") is not None
            )
            manual_features = payload.get("features")

            if has_coords:
                lat, lon = validate_coordinates(payload["lat"], payload["lon"])

                # Fetch NASA data
                nasa_data = nasa_service.fetch_solar_parameters(lat, lon)
                features = nasa_data["annual_averages"]
                location_data = nasa_data
                data_source = "nasa_api"
            elif manual_features and isinstance(manual_features, dict):
                features = manual_features
                location_data = None
                data_source = "manual"
            else:
                return (
                    jsonify(
                        {
                            "error": "Provide either (lat, lon) coordinates or a 'features' dict."
                        }
                    ),
                    400,
                )

            # Build prediction payload
            pred_payload = {
                **features,
                "model": payload.get("model", "linear_regression"),
            }

            # Financial analysis
            financial_overrides = payload.get("financial_overrides", {})

            panel_technology = payload.get("panel_technology", "monocrystalline")
            installation_type = payload.get("installation_type", "rooftop")
            grid_connection = payload.get(
                "grid_connection",
                financial_overrides.get("grid_connection", "grid-tied"),
            )

            requested_region = str(financial_overrides.get("region", "global")).lower()
            if has_coords and requested_region == "global":
                inferred_region = infer_region_from_coordinates(lat, lon)
                if inferred_region != "global":
                    financial_overrides = {
                        **financial_overrides,
                        "region": inferred_region,
                    }

            physics_simulation = {
                "status": "skipped",
                "reason": "coordinates_required",
            }

            if has_coords and location_data:
                physics_input = PhysicsInput(
                    lat=lat,
                    lon=lon,
                    monthly=location_data["monthly"],
                    system_capacity_kw=float(
                        financial_overrides.get("system_capacity_kw", 5.0)
                    ),
                    panel_technology=str(panel_technology),
                    installation_type=str(installation_type),
                    performance_ratio=float(
                        financial_overrides.get("performance_ratio", 0.78)
                    ),
                    panel_efficiency=float(
                        financial_overrides.get("panel_efficiency", 0.20)
                    ),
                )

                with ThreadPoolExecutor(max_workers=2) as executor:
                    prediction_future = executor.submit(
                        prediction_service.predict,
                        pred_payload,
                        data_source,
                    )
                    physics_future = executor.submit(
                        pysam_service.simulate,
                        physics_input,
                    )

                    prediction_result = prediction_future.result()
                    try:
                        physics_simulation = physics_future.result()
                    except PhysicsSimulationError as exc:
                        physics_simulation = {
                            "status": "error",
                            "error": str(exc),
                        }
            else:
                prediction_result = prediction_service.predict(
                    pred_payload, data_source=data_source
                )

            financial_result = financial_service.calculate(
                predicted_irradiance_kwh_m2_day=prediction_result["prediction"],
                overrides=financial_overrides,
            )

            # Solar geometry (only if coordinates available)
            geometry_result = None
            if has_coords:
                capacity_kw = financial_overrides.get("system_capacity_kw", 5.0)
                geometry_result = geometry_service.calculate(
                    lat, lon, system_capacity_kw=capacity_kw
                )

            # LLM explanation (includes financial context)
            system_context = {
                "installation_type": str(installation_type),
                "panel_technology": str(panel_technology),
                "grid_connection": str(grid_connection),
                "region": str(
                    financial_result.get("system_parameters", {}).get(
                        "region", "global"
                    )
                ),
                "system_capacity_kw": financial_result.get("system_parameters", {}).get(
                    "capacity_kw"
                ),
                "electricity_tariff_usd": financial_result.get(
                    "system_parameters", {}
                ).get("electricity_tariff_usd_kwh"),
            }
            document_grounding = fetch_document_grounding(
                prediction_result, financial_result, system_context
            )

            explanation_input = {
                **prediction_result,
                "financial": financial_result,
                "system_context": system_context,
                "document_grounding": document_grounding,
            }
            try:
                explanation = explanation_service.explain(explanation_input)
                explanation = enrich_explanation_with_rag(
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

            result = {
                "prediction": prediction_result,
                "physics_simulation": physics_simulation,
                "financial": financial_result,
                "explanation": explanation,
            }

            if physics_simulation.get("status") == "ok":
                ml_annual_output = financial_result.get("annual_output_kwh")
                physics_annual_output = physics_simulation.get("annual_energy_kwh")
                if isinstance(ml_annual_output, (int, float)) and isinstance(
                    physics_annual_output, (int, float)
                ):
                    delta_kwh = round(
                        float(ml_annual_output) - float(physics_annual_output), 2
                    )
                    delta_pct = (
                        round((delta_kwh / float(physics_annual_output)) * 100, 2)
                        if float(physics_annual_output) > 0
                        else None
                    )
                    result["ml_vs_physics_delta"] = {
                        "ml_annual_output_kwh": round(float(ml_annual_output), 2),
                        "physics_annual_output_kwh": round(
                            float(physics_annual_output), 2
                        ),
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

            return jsonify(result)

        except (ValidationError, NASAServiceError):
            raise
        except Exception as exc:
            logger.error("Analysis failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": "Analysis failed. Please try again."}), 500

    # ----- Document tracking for SSE progress -----

    def get_active_documents_for_stage(stage: str) -> list[str]:
        """Return list of documents relevant to current analysis stage."""
        stage_docs = {
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
        return stage_docs.get(stage, [])

    # ----- GET /stream-plan -----

    @application.route("/stream-plan", methods=["GET"])
    def stream_plan():
        """
        SSE-streamed full analysis pipeline.

        Query params:
            lat, lon: float (required)
            model: str (optional, default "linear_regression")
            region: str (optional, default "global")
        """
        try:
            lat = request.args.get("lat", type=float)
            lon = request.args.get("lon", type=float)
            model = request.args.get("model", "linear_regression")
            region = request.args.get("region", "global")
            panel_technology = request.args.get("panel_technology", "monocrystalline")
            installation_type = request.args.get("installation_type", "rooftop")
            system_capacity_kw = request.args.get("system_capacity_kw", type=float)
            panel_efficiency = request.args.get("panel_efficiency", type=float)
            performance_ratio = request.args.get("performance_ratio", type=float)
            electricity_tariff_usd = request.args.get(
                "electricity_tariff_usd", type=float
            )

            lat, lon = validate_coordinates(lat, lon)

            def generate():
                try:
                    financial_overrides = {"region": region}
                    if region == "global":
                        inferred_region = infer_region_from_coordinates(lat, lon)
                        if inferred_region != "global":
                            financial_overrides["region"] = inferred_region
                    if system_capacity_kw is not None:
                        financial_overrides["system_capacity_kw"] = system_capacity_kw
                    if panel_efficiency is not None:
                        financial_overrides["panel_efficiency"] = panel_efficiency
                    if performance_ratio is not None:
                        financial_overrides["performance_ratio"] = performance_ratio
                    if electricity_tariff_usd is not None:
                        financial_overrides["electricity_tariff_usd"] = (
                            electricity_tariff_usd
                        )

                    # Stage 1: Location data from NASA
                    yield _sse_event(
                        "stage",
                        {
                            "stage": "location",
                            "status": "loading",
                            "documents": get_active_documents_for_stage("location"),
                        },
                    )
                    nasa_data = nasa_service.fetch_solar_parameters(lat, lon)

                    location_payload = {
                        "location": nasa_data["location"],
                        "annual_averages": nasa_data["annual_averages"],
                        "monthly": nasa_data["monthly"],
                        "annual_ghi": nasa_data["annual_ghi"],
                        "data_provenance": nasa_data.get("data_provenance"),
                    }

                    yield _sse_event("location", location_payload)
                    yield _sse_event("ping", {})

                    # Stage 2: ML Prediction
                    yield _sse_event(
                        "stage",
                        {
                            "stage": "prediction",
                            "status": "loading",
                            "documents": get_active_documents_for_stage("prediction"),
                        },
                    )
                    features = nasa_data["annual_averages"]
                    pred_payload = {**features, "model": model}
                    prediction_result = prediction_service.predict(
                        pred_payload, data_source="nasa_api"
                    )
                    yield _sse_event("prediction", prediction_result)
                    yield _sse_event("ping", {})

                    # Stage 3: Physics simulation
                    yield _sse_event(
                        "stage",
                        {
                            "stage": "physics",
                            "status": "loading",
                            "documents": get_active_documents_for_stage("physics"),
                        },
                    )
                    physics_input = PhysicsInput(
                        lat=lat,
                        lon=lon,
                        monthly=nasa_data["monthly"],
                        system_capacity_kw=float(
                            financial_overrides.get("system_capacity_kw", 5.0)
                        ),
                        panel_technology=str(panel_technology),
                        installation_type=str(installation_type),
                        performance_ratio=float(
                            financial_overrides.get("performance_ratio", 0.78)
                        ),
                        panel_efficiency=float(
                            financial_overrides.get("panel_efficiency", 0.20)
                        ),
                    )
                    try:
                        physics_result = pysam_service.simulate(physics_input)
                    except PhysicsSimulationError as exc:
                        physics_result = {
                            "status": "error",
                            "error": str(exc),
                        }
                    yield _sse_event("physics", physics_result)
                    yield _sse_event("ping", {})

                    # Stage 4: Financial Analysis + Solar Geometry
                    yield _sse_event(
                        "stage",
                        {
                            "stage": "financial",
                            "status": "loading",
                            "documents": get_active_documents_for_stage("financial"),
                        },
                    )
                    financial_result = financial_service.calculate(
                        predicted_irradiance_kwh_m2_day=prediction_result["prediction"],
                        overrides=financial_overrides,
                    )
                    geometry_capacity_kw = financial_overrides.get(
                        "system_capacity_kw", 5.0
                    )
                    geometry_result = geometry_service.calculate(
                        lat, lon, system_capacity_kw=geometry_capacity_kw
                    )
                    yield _sse_event("financial", financial_result)
                    yield _sse_event("geometry", geometry_result)
                    yield _sse_event("ping", {})

                    # Stage 5: Structured JSON Explanation (non-streamed)
                    yield _sse_event(
                        "stage",
                        {
                            "stage": "explanation",
                            "status": "loading",
                            "documents": get_active_documents_for_stage("explanation"),
                        },
                    )
                    explanation_input = {
                        **prediction_result,
                        "financial": financial_result,
                    }
                    system_context = {
                        "installation_type": str(installation_type),
                        "panel_technology": str(panel_technology),
                        "grid_connection": str(
                            financial_overrides.get("grid_connection", "grid-tied")
                        ),
                        "region": str(
                            financial_result.get("system_parameters", {}).get(
                                "region", "global"
                            )
                        ),
                        "system_capacity_kw": financial_result.get(
                            "system_parameters", {}
                        ).get("capacity_kw"),
                        "electricity_tariff_usd": financial_result.get(
                            "system_parameters", {}
                        ).get("electricity_tariff_usd_kwh"),
                    }
                    document_grounding = fetch_document_grounding(
                        prediction_result, financial_result, system_context
                    )
                    explanation_input["system_context"] = system_context
                    explanation_input["document_grounding"] = document_grounding
                    try:
                        explanation_result = explanation_service.explain(
                            explanation_input
                        )
                        explanation_result = enrich_explanation_with_rag(
                            explanation_result,
                            document_grounding,
                            prediction_result,
                            financial_result,
                            system_context,
                        )
                    except RuntimeError:
                        explanation_result = {
                            "error": "Explanation unavailable — GEMINI_API_KEY not set."
                        }
                    yield _sse_event("explanation", explanation_result)
                    yield _sse_event("ping", {})

                    logger.info("Stream-plan: About to send done event")
                    yield _sse_event("done", {"status": "complete"})
                    logger.info("Stream-plan: Done event sent successfully")

                except NASAServiceError as exc:
                    yield _sse_event(
                        "error", {"error": exc.message, "stage": "location"}
                    )
                except Exception as exc:
                    logger.error(
                        "Stream-plan failed: %s\n%s", exc, traceback.format_exc()
                    )
                    yield _sse_event(
                        "error", {"error": "Analysis failed. Please try again."}
                    )

            return Response(
                stream_with_context(generate()),
                mimetype="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no",
                    "Connection": "keep-alive",
                },
            )
        except ValidationError as exc:
            logger.error("Stream-plan init failed: %s\n%s", exc, traceback.format_exc())
            error_msg = json.dumps({"error": str(exc)})
            return Response(
                f"data: {error_msg}\n\n",
                mimetype="text/event-stream",
                status=400,
            )
        except Exception as exc:
            logger.error("Stream-plan init failed: %s\n%s", exc, traceback.format_exc())
            error_msg = json.dumps({"error": str(exc)})
            return Response(
                f"data: {error_msg}\n\n",
                mimetype="text/event-stream",
                status=500,
            )

    return application


def _sse_event(event_type: str, data: dict) -> str:
    """Format a Server-Sent Event string."""
    event_str = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    logger.debug(f"SSE event: {event_type}")
    return event_str


# ──────────────────────────────────────────────
# WSGI entry point — gunicorn app:app
# ──────────────────────────────────────────────
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
