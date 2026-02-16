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

from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS

from config import Config
from models.loader import ModelManager
from services.prediction_service import PredictionService
from services.explanation_service import ExplanationService
from services.rag_service import RAGService
from services.nasa_service import NASAService, NASAServiceError
from services.financial_service import FinancialService
from services.solar_geometry_service import SolarGeometryService
from rag.vectorstore import VectorStore
from rag.ingest import ingest_documents
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
    logger.info("Initializing ML models …")
    model_manager = ModelManager()
    model_manager.initialize()

    # --- Initialize RAG vector store (lazy — loads on first /ask request) ---
    vectorstore = VectorStore()
    logger.info("RAG vector store registered (lazy init — loads on first query)")

    # --- Initialize services ---
    prediction_service = PredictionService(model_manager)
    explanation_service = ExplanationService()
    rag_service = RAGService(vectorstore)
    nasa_service = NASAService()
    financial_service = FinancialService()
    geometry_service = SolarGeometryService()

    # Track whether RAG docs have been ingested (deferred to first /ask call)
    _rag_ingested = {"done": False}

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
        return jsonify(
            {
                "status": "healthy",
                "models_loaded": model_manager.list_models(),
                "rag_chunks": vectorstore.count(),
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
            # Lazy-ingest RAG documents on first /ask call
            if not _rag_ingested["done"]:
                logger.info("First /ask request — ingesting RAG documents …")
                n_chunks = ingest_documents(vectorstore)
                logger.info("RAG knowledge base: %d chunks indexed", n_chunks)
                _rag_ingested["done"] = True

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
            prediction_result = prediction_service.predict(
                pred_payload, data_source=data_source
            )

            # Financial analysis
            financial_overrides = payload.get("financial_overrides", {})
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
            explanation_input = {**prediction_result, "financial": financial_result}
            try:
                explanation = explanation_service.explain(explanation_input)
            except RuntimeError:
                explanation = {
                    "error": "Explanation unavailable — GEMINI_API_KEY not set."
                }

            result = {
                "prediction": prediction_result,
                "financial": financial_result,
                "explanation": explanation,
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

            lat, lon = validate_coordinates(lat, lon)

            def generate():
                try:
                    # Stage 1: Location data from NASA
                    yield _sse_event(
                        "stage", {"stage": "location", "status": "loading"}
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

                    # Stage 2: ML Prediction
                    yield _sse_event(
                        "stage", {"stage": "prediction", "status": "loading"}
                    )
                    features = nasa_data["annual_averages"]
                    pred_payload = {**features, "model": model}
                    prediction_result = prediction_service.predict(
                        pred_payload, data_source="nasa_api"
                    )
                    yield _sse_event("prediction", prediction_result)

                    # Stage 3: Financial Analysis + Solar Geometry
                    yield _sse_event(
                        "stage", {"stage": "financial", "status": "loading"}
                    )
                    financial_result = financial_service.calculate(
                        predicted_irradiance_kwh_m2_day=prediction_result["prediction"],
                        overrides={"region": region},
                    )
                    geometry_result = geometry_service.calculate(lat, lon)
                    yield _sse_event("financial", financial_result)
                    yield _sse_event("geometry", geometry_result)

                    # Stage 4: Structured JSON Explanation (non-streamed)
                    yield _sse_event(
                        "stage", {"stage": "explanation", "status": "loading"}
                    )
                    explanation_input = {
                        **prediction_result,
                        "financial": financial_result,
                    }
                    try:
                        explanation_result = explanation_service.explain(
                            explanation_input
                        )
                    except RuntimeError:
                        explanation_result = {
                            "error": "Explanation unavailable — GEMINI_API_KEY not set."
                        }
                    yield _sse_event("explanation", explanation_result)

                    yield _sse_event("done", {"status": "complete"})

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
                },
            )
        except ValidationError:
            raise
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
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


# ──────────────────────────────────────────────
# WSGI entry point — gunicorn app:app
# ──────────────────────────────────────────────
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
