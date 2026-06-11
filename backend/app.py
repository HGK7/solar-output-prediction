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
from pathlib import Path

from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS

from config import Config
from models.loader import ModelManager
from services.prediction_service import PredictionService
from services.explanation_service import ExplanationService
from services.rag_service import RAGService
from services.nasa_service import NASAService, NASAServiceError
from services.financial_service import FinancialService
from services.physics_simulation_service import PhysicsSimulationService
from services.solar_geometry_service import SolarGeometryService
from services.analysis_pipeline import AnalysisContext, AnalysisPipeline
from utils.validation import ValidationError
from utils.logging import logger


def create_app() -> Flask:
    """Build and configure the Flask application."""
    application = Flask(__name__)
    CORS(application, origins=Config.CORS_ORIGINS)

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

        rag_chunks = 0
        if Config.ENABLE_RAG_GROUNDING:
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
                "physics_mode": Config.PHYSICS_MODE,
                "rag_grounding_enabled": Config.ENABLE_RAG_GROUNDING,
                "embedding_model": Config.EMBEDDING_MODEL,
                "chroma_collection": Config.CHROMA_COLLECTION,
                "warnings": warnings,
            }
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
            return jsonify({"error": f"Prediction failed: {exc}"}), 500

    @application.route("/explain", methods=["POST"])
    def explain():
        try:
            payload = request.get_json(force=True)
            if "prediction" not in payload:
                return jsonify({"error": "Missing 'prediction' in request body."}), 400
            explanation = explanation_service.explain(payload)
            return jsonify(explanation)
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 503
        except Exception as exc:
            logger.error("Explanation failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": f"Explanation failed: {exc}"}), 500

    @application.route("/rag/documents", methods=["GET"])
    def list_rag_documents():
        """List indexed markdown sources available for in-app viewing."""
        docs_dir = Path(Config.DOCUMENTS_DIR)
        if not docs_dir.is_dir():
            return jsonify({"documents": []})
        names = sorted(
            p.name for p in docs_dir.iterdir() if p.suffix.lower() in {".md", ".txt"}
        )
        return jsonify({"documents": names})

    @application.route("/rag/documents/<path:filename>", methods=["GET"])
    def get_rag_document(filename: str):
        """Serve a trusted knowledge-base document for dashboard source modal."""
        safe_name = Path(filename).name
        if not safe_name or safe_name != filename:
            return jsonify({"error": "Invalid document path."}), 400
        suffix = Path(safe_name).suffix.lower()
        if suffix not in {".md", ".txt", ".pdf"}:
            return jsonify({"error": "Unsupported document type."}), 400

        doc_path = Path(Config.DOCUMENTS_DIR) / safe_name
        if not doc_path.is_file():
            return jsonify({"error": "Document not found."}), 404

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
            answer = rag_service.ask(question)
            return jsonify(answer)
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 503
        except Exception as exc:
            logger.error("RAG query failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": f"RAG query failed: {exc}"}), 500

    @application.route("/analyze", methods=["POST"])
    def analyze():
        try:
            payload = request.get_json(force=True)
            ctx = AnalysisContext.from_json(payload)
            result = pipeline.collect_analyze(ctx)
            return jsonify(result)
        except (ValidationError, NASAServiceError):
            raise
        except Exception as exc:
            logger.error("Analysis failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": "Analysis failed. Please try again."}), 500

    @application.route("/stream-plan", methods=["GET"])
    def stream_plan():
        try:
            ctx = AnalysisContext.from_query(
                {
                    "lat": request.args.get("lat", type=float),
                    "lon": request.args.get("lon", type=float),
                    "model": request.args.get("model", "linear_regression"),
                    "region": request.args.get("region", "global"),
                    "panel_technology": request.args.get(
                        "panel_technology", "monocrystalline"
                    ),
                    "installation_type": request.args.get(
                        "installation_type", "rooftop"
                    ),
                    "system_capacity_kw": request.args.get(
                        "system_capacity_kw", type=float
                    ),
                    "panel_efficiency": request.args.get(
                        "panel_efficiency", type=float
                    ),
                    "performance_ratio": request.args.get(
                        "performance_ratio", type=float
                    ),
                    "electricity_tariff_usd": request.args.get(
                        "electricity_tariff_usd", type=float
                    ),
                }
            )

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
    logger.debug("SSE event: %s", event_type)
    return event_str


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
