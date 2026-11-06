"""
Configuration for Solar Intelligence & Optimization System.
All settings are centralized here and loaded from environment variables.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""

    # --- Gemini LLM ---
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    LLM_TEMPERATURE: float = 0.1  # Low temperature for deterministic explanations

    # --- Data & Models ---
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH: str = os.getenv(
        "DATA_PATH",
        os.path.join(BASE_DIR, "data", "cleaned_data.csv"),
    )
    MODEL_DIR: str = os.path.join(BASE_DIR, "trained_models")

    # --- RAG / Vector Store ---
    # Gemini embedding API — no local torch (see ADR-0003)
    EMBEDDING_MODEL: str = os.getenv(
        "EMBEDDING_MODEL", "models/gemini-embedding-001"
    )
    CHROMA_COLLECTION: str = os.getenv("CHROMA_COLLECTION", "solar_science_gemini")
    DOCUMENTS_DIR: str = os.path.join(BASE_DIR, "rag", "documents")
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    RAG_TOP_K: int = 3

    # --- Memory / deployment profile (Render free tier) ---
    # analytical = lightweight PSH math (default); pysam = NREL PVWatts; off = skip
    PHYSICS_MODE: str = os.getenv("PHYSICS_MODE", "analytical").lower()
    # When false, /analyze skips Gemini-embed + Chroma grounding
    ENABLE_RAG_GROUNDING: bool = (
        os.getenv("ENABLE_RAG_GROUNDING", "true").lower() == "true"
    )
    # When true, refuse to train at request time — models must exist (build or commit)
    REQUIRE_PRETRAINED_MODELS: bool = (
        os.getenv("REQUIRE_PRETRAINED_MODELS", "true").lower() == "true"
    )
    # Hourly request cap per IP when callers use the server's System GEMINI_API_KEY
    SYSTEM_KEY_HOURLY_LIMIT: int = int(os.getenv("SYSTEM_KEY_HOURLY_LIMIT", "30"))
    # Compute device preference: auto | cuda | cpu
    COMPUTE_DEVICE: str = os.getenv("COMPUTE_DEVICE", "auto").lower()

    # --- Feature Schema ---
    FEATURE_NAMES: list[str] = [
        "Temperature",
        "Humidity",
        "Wind Speed",
        "Clear Sky Irradiance",
    ]
    TARGET_NAME: str = "Solar Irradiance"
    FEATURE_UNITS: dict[str, str] = {
        "Temperature": "°C",
        "Humidity": "%",
        "Wind Speed": "m/s",
        "Clear Sky Irradiance": "kWh/m²/day",
    }
    TARGET_UNIT: str = "kWh/m²/day"

    # --- Flask ---
    # Accept both CORS_ORIGINS (preferred) and CORS_ORIGIN (legacy/single-origin).
    _CORS_RAW: str = os.getenv("CORS_ORIGINS") or os.getenv(
        "CORS_ORIGIN", "http://localhost:3000"
    )

    @staticmethod
    def _parse_origins(raw: str) -> list[str]:
        origins: list[str] = []
        for chunk in raw.replace(";", ",").split(","):
            origin = chunk.strip()
            if not origin:
                continue
            if origin != "*":
                # Browsers send Origin without trailing slash.
                origin = origin.rstrip("/")
            origins.append(origin)
        return origins or ["http://localhost:3000"]

    CORS_ORIGINS: list[str] = _parse_origins.__func__(_CORS_RAW)
    DEBUG: bool = os.getenv("FLASK_DEBUG", "false").lower() == "true"

    @classmethod
    def validate(cls) -> list[str]:
        """Return a list of missing-but-required config keys."""
        warnings = []
        if not cls.GEMINI_API_KEY:
            warnings.append("GEMINI_API_KEY is not set — /explain and /ask will fail.")
        if not os.path.exists(cls.DATA_PATH):
            warnings.append(f"DATA_PATH not found: {cls.DATA_PATH}")
        return warnings
