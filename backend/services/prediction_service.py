"""
Prediction service — orchestrates ML model inference.

This is the ONLY path through which numeric predictions are generated.
LLMs are never involved in this pipeline.

"""

from __future__ import annotations

from typing import TYPE_CHECKING

from config import Config
from utils.validation import (
    validate_prediction_input,
    validate_model_name,
    ValidationError,
)
from utils.logging import logger

if TYPE_CHECKING:
    from models.loader import ModelManager


class PredictionService:
    """Stateless service that turns validated features into predictions."""

    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager

    def predict(self, payload: dict, data_source: str = "manual") -> dict:
        """
        Run a full prediction pipeline:
        1. Validate input
        2. Select model
        3. Run deterministic prediction
        4. Package result with metadata and provenance
        """
        # --- Validate ---
        features = validate_prediction_input(payload)
        model_name = validate_model_name(payload.get("model"))

        # --- Get model ---
        model = self.model_manager.get_model(model_name)

        # --- Build feature vector (order must match training) ---
        import numpy as np

        feature_vector = np.array([features[name] for name in Config.FEATURE_NAMES])

        # --- Predict ---
        prediction = model.predict(feature_vector)
        error_estimate = model.get_error_estimate()

        logger.info(
            "Prediction: %.4f %s (model=%s, ±%.4f)",
            prediction,
            Config.TARGET_UNIT,
            model_name,
            error_estimate,
        )

        return {
            "prediction": round(prediction, 4),
            "unit": Config.TARGET_UNIT,
            "model_used": model_name,
            "input_features": {
                name: {
                    "value": features[name],
                    "unit": Config.FEATURE_UNITS[name],
                }
                for name in Config.FEATURE_NAMES
            },
            "error_estimate": error_estimate,
            "metrics": model.get_metrics(),
            "feature_importance": model.get_feature_importance(),
            "prediction_context": {
                "what_is_predicted": (
                    "Global Horizontal Irradiance (GHI) — the total solar radiation "
                    "received on a horizontal surface, including direct, diffuse, and "
                    "ground-reflected radiation."
                ),
                "prediction_represents": (
                    "Climatological daily average (kWh/m²/day) — representative of a "
                    "typical day aggregated from the 38-year satellite record "
                    "(1984–2022). Not a forecast for a specific future date."
                ),
                "data_source": data_source,
                "data_source_detail": (
                    "NASA POWER Climatology API — 38-year satellite-derived averages (1984–2022)"
                    if data_source == "nasa_api"
                    else "User-provided manual input values"
                ),
                "training_data": {
                    "dataset": "NASA POWER parameters for Bhadla Solar Park region (27.5°N, 71.6°E)",
                    "records": "Cleaned climatological observations",
                    "features_used": Config.FEATURE_NAMES,
                    "target_variable": f"{Config.TARGET_NAME} ({Config.TARGET_UNIT})",
                    "source": "NASA POWER Climatology API (CERES + MERRA-2 reanalysis)",
                },
                "methodology": (
                    f"Supervised learning ({model_name.replace('_', ' ').title()}) "
                    f"trained on satellite-derived climate features to predict GHI. "
                    f"Features are annual climatological averages, so the prediction "
                    f"represents a long-term expected daily mean, not a single-day forecast."
                ),
            },
        }
