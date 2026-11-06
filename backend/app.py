"""
Solar Intelligence & Optimization System — Flask API Entrypoint

Endpoints:
    POST /predict      – Deterministic ML prediction (no LLM)
    POST /explain      – LLM explanation of a prediction
    POST /ask          – RAG-grounded domain Q&A
    POST /what-if      – Deterministic financial re-simulation (no ML/LLM re-run)
    POST /analyze      – Full pipeline: location → prediction → financial → explanation
    GET  /stream-plan  – SSE streamed full analysis pipeline
    GET  /health       – Readiness probe
"""

import json
import os
import traceback
from pathlib import Path

from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS

from config import Config
from models.loader import ModelManager, detect_compute_capabilities
from services.prediction_service import PredictionService
from services.explanation_service import ExplanationService
from services.rag_service import RAGService
from services.nasa_service import NASAService, NASAServiceError
from services.financial_service import FinancialService
from services.physics_simulation_service import PhysicsSimulationService
from services.solar_geometry_service import SolarGeometryService
from services.analysis_pipeline import AnalysisContext, AnalysisPipeline
from services.recommendation_service import RecommendationService
from services.portfolio_insights_service import PortfolioInsightsService
from utils.validation import (
    ValidationError,
    validate_coordinates,
    validate_system_inputs,
)
from utils.security import (
    QuotaExceededError,
    SYSTEM_KEY_RATE_LIMITER,
    extract_client_ip,
    resolve_gemini_key,
    sanitize_untrusted_text,
)
from utils.logging import logger


def create_app() -> Flask:
    """Build and configure the Flask application."""
    application = Flask(__name__)
    application.config["MAX_CONTENT_LENGTH"] = 64 * 1024  # 64 KB cap against payload amplification
    CORS(
        application,
        origins=Config.CORS_ORIGINS,
        allow_headers=["Content-Type", "X-Gemini-Api-Key"],
        expose_headers=["X-RateLimit-Remaining", "Retry-After"],
    )

    for warning in Config.validate():
        logger.warning("CONFIG WARNING: %s", warning)

    model_manager = ModelManager()
    model_manager.initialize()

    prediction_service = PredictionService(model_manager)
    explanation_service = ExplanationService()
    rag_service = RAGService()
    nasa_service = NASAService()
    financial_service = FinancialService()
    physics_service = PhysicsSimulationService()
    geometry_service = SolarGeometryService()

    recommendation_service = RecommendationService(
        financial_service=financial_service,
        geometry_service=geometry_service,
    )
    portfolio_insights_service = PortfolioInsightsService()

    pipeline = AnalysisPipeline(
        nasa_service=nasa_service,
        prediction_service=prediction_service,
        physics_service=physics_service,
        financial_service=financial_service,
        geometry_service=geometry_service,
        explanation_service=explanation_service,
        rag_service=rag_service,
    )

    @application.errorhandler(ValidationError)
    def handle_validation_error(exc: ValidationError):
        return jsonify({"error": exc.message, "field": exc.field}), 400

    @application.errorhandler(QuotaExceededError)
    def handle_quota_exceeded(exc: QuotaExceededError):
        resp = jsonify(
            {
                "error": exc.message,
                "code": "system_key_rate_limited",
                "retry_after_seconds": exc.retry_after_seconds,
            }
        )
        resp.status_code = 429
        resp.headers["Retry-After"] = str(exc.retry_after_seconds)
        return resp

    @application.errorhandler(413)
    def handle_payload_too_large(_):
        return jsonify({"error": "Request payload exceeds 64 KB limit."}), 413

    @application.errorhandler(NASAServiceError)
    def handle_nasa_error(exc: NASAServiceError):
        return jsonify({"error": exc.message, "source": "nasa_api"}), 502

    @application.errorhandler(404)
    def handle_not_found(_):
        return jsonify({"error": "Endpoint not found"}), 404

    @application.errorhandler(500)
    def handle_internal_error(_):
        return jsonify({"error": "Internal server error"}), 500

    @application.route("/health", methods=["GET"])
    def health():
        """Readiness / liveness probe."""
        models_loaded = []
        warnings = []

        try:
            models_loaded = model_manager.list_models()
        except Exception as exc:
            warnings.append(f"model_status_unavailable: {exc}")

        rag_chunks = None
        if Config.ENABLE_RAG_GROUNDING:
            try:
                # peek_document_count never eager-loads Chroma (None until first RAG use).
                rag_chunks = rag_service.peek_document_count()
            except Exception as exc:
                warnings.append(f"rag_status_unavailable: {exc}")

        status = "healthy" if not warnings else "degraded"
        client_ip = extract_client_ip(request.headers, request.remote_addr)
        quota_status = SYSTEM_KEY_RATE_LIMITER.status(client_ip)
        compute_info = detect_compute_capabilities()
        return jsonify(
            {
                "status": status,
                "models_loaded": models_loaded,
                "rag_chunks": rag_chunks,
                "physics_mode": Config.PHYSICS_MODE,
                "rag_grounding_enabled": Config.ENABLE_RAG_GROUNDING,
                "embedding_model": Config.EMBEDDING_MODEL,
                "chroma_collection": Config.CHROMA_COLLECTION,
                "compute_device": compute_info["active_device"],
                "compute_capabilities": compute_info,
                "system_key_configured": bool(Config.GEMINI_API_KEY),
                "system_quota": quota_status,
                "warnings": warnings,
            }
        )

    @application.route("/models", methods=["GET"])
    def list_models_endpoint():
        """Return loaded ML models, evaluation metrics, and training distribution stats."""
        return jsonify(
            {
                "models": model_manager.get_all_metrics(),
                "data_stats": model_manager.get_data_stats(),
                "compute": detect_compute_capabilities(),
            }
        )

    @application.route("/sizing", methods=["POST"])
    def calculate_sizing():
        """Deterministic Bill/Consumption-to-kW and Roof Area Sizing Assistant."""
        try:
            payload = request.get_json(force=True) or {}
            if not isinstance(payload, dict):
                raise ValidationError("Request body must be a JSON object.")
            irradiance = float(payload.get("predicted_irradiance_kwh_m2_day") or 4.8)
            if not (0 < irradiance <= 15):
                raise ValidationError(
                    "'predicted_irradiance_kwh_m2_day' must be between 0 and 15.",
                    field="predicted_irradiance_kwh_m2_day",
                )
            inputs = validate_system_inputs(payload)
            result = financial_service.size_system(
                predicted_irradiance_kwh_m2_day=irradiance,
                monthly_bill_usd=inputs.get("monthly_bill_usd"),
                monthly_consumption_kwh=inputs.get("monthly_consumption_kwh"),
                electricity_tariff_usd=inputs.get("electricity_tariff_usd", 0.12),
                performance_ratio=inputs.get("performance_ratio", 0.78),
                available_roof_area_m2=inputs.get("available_roof_area_m2"),
                target_offset_ratio=float(payload.get("target_offset_ratio") or 1.0),
            )
            return jsonify(result)
        except ValidationError:
            raise
        except Exception as exc:
            logger.error("Sizing calculation failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": "Sizing calculation failed."}), 400

    @application.route("/validate-key", methods=["POST"])
    def validate_key():
        """Validate a user-supplied Gemini API key (BYOK) without storing it."""
        payload = request.get_json(silent=True) or {}
        candidate = (
            request.headers.get("X-Gemini-Api-Key")
            or payload.get("api_key")
            or ""
        ).strip()
        if not candidate or len(candidate) < 12 or len(candidate) > 256 or any(c.isspace() for c in candidate):
            return (
                jsonify(
                    {
                        "valid": False,
                        "model": Config.GEMINI_MODEL,
                        "message": "Provide a valid Gemini API key (12–256 non-whitespace characters).",
                    }
                ),
                400,
            )

        try:
            from google import genai

            client = genai.Client(api_key=candidate)
            # Lightweight metadata call to verify the key works without consuming generation tokens
            model_info = client.models.get(model=Config.GEMINI_MODEL)
            return jsonify(
                {
                    "valid": True,
                    "model": getattr(model_info, "name", Config.GEMINI_MODEL),
                    "message": "API key verified with Gemini.",
                }
            )
        except Exception:
            return (
                jsonify(
                    {
                        "valid": False,
                        "model": Config.GEMINI_MODEL,
                        "message": "Gemini rejected this API key. Check the key and try again.",
                    }
                ),
                401,
            )

    @application.route("/predict", methods=["POST"])
    def predict():
        try:
            payload = request.get_json(force=True)
            result = prediction_service.predict(payload)
            return jsonify(result)
        except ValidationError:
            raise
        except Exception as exc:
            logger.error("Prediction failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": "Prediction failed due to an internal error."}), 500

    @application.route("/explain", methods=["POST"])
    def explain():
        try:
            payload = request.get_json(force=True)
            if "prediction" not in payload:
                return jsonify({"error": "Missing 'prediction' in request body."}), 400
            client_ip = extract_client_ip(request.headers, request.remote_addr)
            resolved = resolve_gemini_key(request.headers, client_ip=client_ip)
            explanation = explanation_service.explain(payload, api_key=resolved.api_key)
            return jsonify(explanation)
        except QuotaExceededError:
            raise
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 503
        except Exception as exc:
            logger.error("Explanation failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": "Explanation failed due to a service error."}), 500

    @application.route("/rag/documents", methods=["GET"])
    def list_rag_documents():
        """List indexed markdown and scientific PDF sources available for in-app viewing."""
        docs_dir = Path(Config.DOCUMENTS_DIR)
        if not docs_dir.is_dir():
            return jsonify({"documents": []})
        names = [
            p.name
            for p in docs_dir.iterdir()
            if p.is_file() and p.suffix.lower() in {".md", ".txt", ".pdf"}
        ]
        science_dir = docs_dir / "science_context"
        if science_dir.is_dir():
            names.extend(
                p.name
                for p in science_dir.iterdir()
                if p.is_file() and p.suffix.lower() == ".pdf"
            )
        return jsonify({"documents": sorted(set(names))})

    @application.route("/rag/documents/<path:filename>", methods=["GET"])
    def get_rag_document(filename: str):
        """Serve a trusted knowledge-base document (.md, .txt, or science_context/*.pdf)."""
        normalized = filename.replace("\\", "/").strip("/")
        if ".." in normalized.split("/"):
            return jsonify({"error": "Invalid document path."}), 400
        if normalized.startswith("science_context/"):
            normalized = normalized[len("science_context/") :]
        safe_name = Path(normalized).name
        if not safe_name or safe_name != normalized or "/" in safe_name:
            return jsonify({"error": "Invalid document path."}), 400
        suffix = Path(safe_name).suffix.lower()
        if suffix not in {".md", ".txt", ".pdf"}:
            return jsonify({"error": "Unsupported document type."}), 400

        docs_root = Path(Config.DOCUMENTS_DIR).resolve()
        doc_path = (docs_root / safe_name).resolve()
        if not doc_path.is_file():
            alt_path = (docs_root / "science_context" / safe_name).resolve()
            if alt_path.is_file():
                doc_path = alt_path
            else:
                return jsonify({"error": "Document not found."}), 404

        if docs_root not in doc_path.parents:
            return jsonify({"error": "Invalid document path."}), 400

        if suffix == ".pdf":
            return Response(
                doc_path.read_bytes(),
                mimetype="application/pdf",
                headers={"Content-Disposition": f'inline; filename="{safe_name}"'},
            )

        return jsonify(
            {
                "filename": safe_name,
                "format": "markdown" if suffix == ".md" else "text",
                "content": doc_path.read_text(encoding="utf-8"),
            }
        )

    @application.route("/ask", methods=["POST"])
    def ask():
        try:
            payload = request.get_json(force=True)
            question = payload.get("question", "").strip()
            if not question:
                return jsonify({"error": "Missing 'question' field."}), 400
            if len(question) > 1000:
                return jsonify({"error": "Question exceeds 1000 characters."}), 400
            context = sanitize_untrusted_text(str(payload.get("context") or ""), max_len=600) or None
            client_ip = extract_client_ip(request.headers, request.remote_addr)
            resolved = resolve_gemini_key(request.headers, client_ip=client_ip)
            answer = rag_service.ask(question, context=context, api_key=resolved.api_key)
            answer["key_source"] = resolved.key_source
            return jsonify(answer)
        except QuotaExceededError:
            raise
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 503
        except Exception as exc:
            logger.error("RAG query failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": "Knowledge base query failed due to a service error."}), 500

    @application.route("/what-if", methods=["POST"])
    def what_if():
        """Deterministic financial re-simulation for what-if sliders.

        No ML re-run, no LLM — recomputes financial metrics from an existing
        irradiance prediction with adjusted system parameters (ADR-0001 safe).
        """
        try:
            payload = request.get_json(force=True)
            irradiance = payload.get("predicted_irradiance_kwh_m2_day")
            if not isinstance(irradiance, (int, float)) or irradiance <= 0:
                return (
                    jsonify(
                        {
                            "error": "Missing or invalid "
                            "'predicted_irradiance_kwh_m2_day'."
                        }
                    ),
                    400,
                )
            overrides = validate_system_inputs(payload.get("financial_overrides") or {})
            result = financial_service.calculate(
                predicted_irradiance_kwh_m2_day=float(irradiance),
                overrides=overrides,
            )
            return jsonify({"financial": result})
        except ValidationError:
            raise
        except Exception as exc:
            logger.error("What-if failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": "What-if simulation failed."}), 500

    @application.route("/recommendations", methods=["POST"])
    def recommendations():
        """Deterministic site recommendations from an existing prediction."""
        try:
            payload = request.get_json(force=True)
            irradiance = payload.get("predicted_irradiance_kwh_m2_day")
            if not isinstance(irradiance, (int, float)) or irradiance <= 0:
                return (
                    jsonify(
                        {
                            "error": "Missing or invalid "
                            "'predicted_irradiance_kwh_m2_day'."
                        }
                    ),
                    400,
                )
            lat = payload.get("lat")
            lon = payload.get("lon")
            if lat is not None or lon is not None:
                lat, lon = validate_coordinates(lat, lon)
            result = recommendation_service.build(
                predicted_irradiance_kwh_m2_day=float(irradiance),
                financial_overrides=validate_system_inputs(payload.get("financial_overrides") or {}),
                lat=lat,
                lon=lon,
            )
            return jsonify({"recommendations": result})
        except ValidationError:
            raise
        except Exception as exc:
            logger.error(
                "Recommendations failed: %s\n%s", exc, traceback.format_exc()
            )
            return jsonify({"error": "Recommendations failed."}), 500

    @application.route("/portfolio-insights", methods=["POST"])
    def portfolio_insights():
        """Grounded LLM commentary over deterministic portfolio stats."""
        try:
            payload = request.get_json(force=True)
            sites = payload.get("sites")
            if not isinstance(sites, list):
                return jsonify({"error": "Missing 'sites' list."}), 400
            client_ip = extract_client_ip(request.headers, request.remote_addr)
            resolved = resolve_gemini_key(request.headers, client_ip=client_ip)
            result = portfolio_insights_service.summarize(sites, api_key=resolved.api_key)
            return jsonify(result)
        except QuotaExceededError:
            raise
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 503
        except Exception as exc:
            logger.error(
                "Portfolio insights failed: %s\n%s", exc, traceback.format_exc()
            )
            return jsonify({"error": "Portfolio insights failed."}), 500

    @application.route("/analyze", methods=["POST"])
    def analyze():
        try:
            payload = request.get_json(force=True)
            if not isinstance(payload, dict):
                raise ValidationError("Request body must be a JSON object.")
            ctx = AnalysisContext.from_json(payload)
            client_ip = extract_client_ip(request.headers, request.remote_addr)
            ctx.api_key = resolve_gemini_key(request.headers, client_ip=client_ip).api_key
            result = pipeline.collect_analyze(ctx)
            return jsonify(result)
        except (ValidationError, NASAServiceError, QuotaExceededError):
            raise
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except Exception as exc:
            logger.error("Analysis failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": "Analysis failed. Please try again."}), 500

    @application.route("/stream-plan", methods=["GET", "POST"])
    def stream_plan():
        try:
            if request.method == "POST" and request.is_json:
                params = request.get_json(silent=True) or {}
            else:
                params = request.args.to_dict()
            ctx = AnalysisContext.from_query(params)
            client_ip = extract_client_ip(request.headers, request.remote_addr)
            ctx.api_key = resolve_gemini_key(request.headers, client_ip=client_ip).api_key

            def generate():
                for stage in pipeline.run_stages(ctx):
                    yield _sse_event(stage.kind, stage.payload)
                    if stage.kind not in ("stage", "error", "done"):
                        yield _sse_event("ping", {})
                logger.info("Stream-plan: done event sent")

            return Response(
                stream_with_context(generate()),
                mimetype="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no",
                    "Connection": "keep-alive",
                },
            )
        except (ValidationError, QuotaExceededError):
            raise
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except Exception as exc:
            logger.error("Stream-plan init failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": "Analysis could not start. Please try again."}), 500

    return application


def _sse_event(event_type: str, data: dict) -> str:
    """Format a Server-Sent Event string."""
    event_str = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    logger.debug("SSE event: %s", event_type)
    return event_str


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
