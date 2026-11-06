"""
Model loader — trains, saves, and serves ML models.

On application startup the ModelManager:
1. Looks for pre-trained joblib files in `trained_models/`.
2. If any are missing, trains from `cleaned_data.csv` and saves them along with feature distribution stats.
3. Exposes models via `get_model(name)` and distribution stats via `get_data_stats()`.
"""

from __future__ import annotations

import json
import os
import shutil
import threading
from typing import TYPE_CHECKING, Any

from config import Config
from utils.logging import logger

if TYPE_CHECKING:
    from models.ensemble import HistGradientBoostingModel, RandomForestModel
    from models.regression import LinearRegressionModel
    from models.svm import SVMModel


def detect_compute_capabilities() -> dict[str, Any]:
    """Detect GPU/CUDA hardware availability (e.g., NVIDIA RTX 3050 Ti on Windows/WSL2)."""
    cuda_available = False
    gpu_name = None
    try:
        import torch  # type: ignore

        if torch.cuda.is_available():
            cuda_available = True
            gpu_name = torch.cuda.get_device_name(0)
    except Exception:
        pass

    if not cuda_available and shutil.which("nvidia-smi"):
        cuda_available = True
        gpu_name = "NVIDIA CUDA GPU (detected via nvidia-smi)"

    pref = getattr(Config, "COMPUTE_DEVICE", "auto").lower()
    if pref == "cuda" and cuda_available:
        active = "cuda"
    elif pref == "cpu":
        active = "cpu"
    else:
        active = "cuda" if cuda_available else "cpu"

    return {
        "preferred_device": pref,
        "active_device": active,
        "cuda_available": cuda_available,
        "gpu_name": gpu_name,
    }


class ModelManager:
    """Owns the lifecycle of all ML models."""

    def __init__(self):
        self._models: dict[str, Any] = {}
        self._data_stats: dict | None = None
        self._initialized = False
        self._init_lock = threading.Lock()

    def initialize(self, force_retrain: bool = False) -> None:
        """Load or train all models. Call once at startup."""
        if self._initialized and not force_retrain:
            return

        with self._init_lock:
            if self._initialized and not force_retrain:
                return

            os.makedirs(Config.MODEL_DIR, exist_ok=True)

            from models.ensemble import HistGradientBoostingModel, RandomForestModel
            from models.regression import LinearRegressionModel
            from models.svm import SVMModel

            model_specs = {
                "linear_regression": (
                    LinearRegressionModel(),
                    os.path.join(Config.MODEL_DIR, "linear_regression.joblib"),
                ),
                "svm": (
                    SVMModel(),
                    os.path.join(Config.MODEL_DIR, "svm.joblib"),
                ),
                "random_forest": (
                    RandomForestModel(),
                    os.path.join(Config.MODEL_DIR, "random_forest.joblib"),
                ),
                "hist_gradient_boosting": (
                    HistGradientBoostingModel(),
                    os.path.join(Config.MODEL_DIR, "hist_gradient_boosting.joblib"),
                ),
            }
            stats_path = os.path.join(Config.MODEL_DIR, "data_stats.json")

            all_exist = (
                not force_retrain
                and os.path.exists(stats_path)
                and all(os.path.exists(path) for _, path in model_specs.values())
            )

            if all_exist:
                logger.info("Loading pre-trained models from disk …")
                for name, (instance, path) in model_specs.items():
                    instance.load(path)
                    self._models[name] = instance
                try:
                    with open(stats_path, "r", encoding="utf-8") as f:
                        self._data_stats = json.load(f)
                except Exception:
                    self._data_stats = None
            else:
                if (
                    Config.REQUIRE_PRETRAINED_MODELS
                    and not os.path.exists(Config.DATA_PATH)
                ):
                    raise RuntimeError(
                        "Pre-trained models and training CSV not found."
                    )
                logger.info("Training ML models from %s …", Config.DATA_PATH)
                X_train, X_test, y_train, y_test, feature_names = self._load_data()

                for name, (instance, path) in model_specs.items():
                    metrics = instance.train(
                        X_train, y_train, X_test, y_test, feature_names
                    )
                    instance.save(path)
                    self._models[name] = instance
                    logger.info("Trained %s: %s", name, metrics)

                if self._data_stats:
                    with open(stats_path, "w", encoding="utf-8") as f:
                        json.dump(self._data_stats, f, indent=2)

            self._initialized = True
            logger.info("ModelManager ready — models: %s", list(self._models.keys()))

    def get_model(self, name: str):
        """Return a trained model by name."""
        self.initialize()
        model = self._models.get(name)
        if model is None:
            raise KeyError(f"Unknown model: {name}")
        return model

    def list_models(self) -> list[str]:
        self.initialize()
        return list(self._models.keys())

    def get_all_metrics(self) -> dict[str, dict]:
        self.initialize()
        return {name: m.get_metrics() for name, m in self._models.items()}

    def get_data_stats(self) -> dict | None:
        self.initialize()
        return self._data_stats

    def _load_data(self):
        """Load and split the cleaned CSV into train/test arrays."""
        import pandas as pd
        from sklearn.model_selection import train_test_split

        logger.info("Loading data from %s", Config.DATA_PATH)
        df = pd.read_csv(Config.DATA_PATH)

        feature_names = Config.FEATURE_NAMES
        X = df[feature_names].values
        y = df[Config.TARGET_NAME].values

        self._data_stats = {
            "n_samples": len(df),
            "features": {
                name: {
                    "mean": round(float(df[name].mean()), 4),
                    "std": round(float(df[name].std()), 4),
                    "min": round(float(df[name].min()), 4),
                    "max": round(float(df[name].max()), 4),
                }
                for name in feature_names
            },
            "target": {
                "mean": round(float(y.mean()), 4),
                "std": round(float(y.std()), 4),
                "min": round(float(y.min()), 4),
                "max": round(float(y.max()), 4),
            },
        }

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        return X_train, X_test, y_train, y_test, feature_names
