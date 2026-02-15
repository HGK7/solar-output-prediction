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
    GEMINI_MODEL: str = "gemini-2.5-flash-lite"
    LLM_TEMPERATURE: float = 0.1  # Low temperature for deterministic explanations

    # --- Data & Models ---
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH: str = os.getenv(
        "DATA_PATH",
        os.path.join(BASE_DIR, "..", "cleaned_data.csv"),
    )
    MODEL_DIR: str = os.path.join(BASE_DIR, "trained_models")

    # --- RAG / Vector Store ---
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    DOCUMENTS_DIR: str = os.path.join(BASE_DIR, "rag", "documents")
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    RAG_TOP_K: int = 3

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
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000"
    ).split(",")
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
