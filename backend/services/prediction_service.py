"""
Prediction service — orchestrates ML model inference.

This is the ONLY path through which numeric predictions are generated.
LLMs are never involved in this pipeline.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from config import Config
from utils.logging import logger
from utils.validation import (
    ValidationError,
    validate_model_name,
    validate_prediction_input,
)

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
        3. Check Out-of-Distribution (OOD) feature bounds against training stats
        4. Run deterministic prediction
        5. Package result with metadata, OOD diagnostics, and provenance
        """
        features = validate_prediction_input(payload)
        model_name = validate_model_name(payload.get("model"))

        model = self.model_manager.get_model(model_name)

        import numpy as np

        feature_vector = np.array([features[name] for name in Config.FEATURE_NAMES])
        raw_prediction = model.predict(feature_vector)
        # Clamp to physically non-negative irradiance
        prediction = max(0.05, float(raw_prediction))
        error_estimate = model.get_error_estimate()

        ood_warning, ood_details = self._evaluate_ood(features)

        logger.info(
            "Prediction: %.4f %s (model=%s, ±%.4f, ood=%s)",
            prediction,
            Config.TARGET_UNIT,
            model_name,
            error_estimate,
            ood_warning,
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
            "ood_warning": ood_warning,
            "ood_details": ood_details,
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
                    "dataset": "NASA POWER multi-season solar radiation & meteorological observations",
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

    def _evaluate_ood(self, features: dict[str, float]) -> tuple[bool, list[str]]:
        """Check if input features fall substantially outside training distribution."""
        stats = self.model_manager.get_data_stats()
        if not stats or "features" not in stats:
            return False, []

        feat_stats = stats["features"]
        details: list[str] = []
        for name, val in features.items():
            info = feat_stats.get(name)
            if not info:
                continue
            f_min = float(info.get("min", val))
            f_max = float(info.get("max", val))
            f_std = max(float(info.get("std", 1.0)), 1e-4)
            f_mean = float(info.get("mean", val))
            z_score = abs(val - f_mean) / f_std

            if val < f_min - 0.5 * f_std or val > f_max + 0.5 * f_std or z_score > 3.2:
                unit = Config.FEATURE_UNITS.get(name, "")
                details.append(
                    f"{name} ({val} {unit}) is outside training range [{f_min:.1f}, {f_max:.1f}] {unit}."
                )

        return len(details) > 0, details
