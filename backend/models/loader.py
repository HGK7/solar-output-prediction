"""
Model loader — trains, saves, and serves ML models.

On application startup the ModelManager:
1. Looks for pre-trained joblib files in `trained_models/`.
2. If none exist, trains from `cleaned_data.csv` and saves them.
3. Exposes models via `get_model(name)`.
"""

import os

from config import Config
from models.regression import LinearRegressionModel
from models.svm import SVMModel
from utils.logging import logger


class ModelManager:
    """Owns the lifecycle of all ML models."""

    def __init__(self):
        self._models: dict[str, LinearRegressionModel | SVMModel] = {}
        self._data_stats: dict | None = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def initialize(self) -> None:
        """Load or train all models. Call once at startup."""
        os.makedirs(Config.MODEL_DIR, exist_ok=True)

        lr = LinearRegressionModel()
        svm = SVMModel()

        lr_path = os.path.join(Config.MODEL_DIR, "linear_regression.joblib")
        svm_path = os.path.join(Config.MODEL_DIR, "svm.joblib")

        if os.path.exists(lr_path) and os.path.exists(svm_path):
            logger.info("Loading pre-trained models from disk …")
            lr.load(lr_path)
            svm.load(svm_path)
        else:
            logger.info("No saved models found — training from CSV …")
            X_train, X_test, y_train, y_test, feature_names = self._load_data()

            lr_metrics = lr.train(X_train, y_train, X_test, y_test, feature_names)
            svm_metrics = svm.train(X_train, y_train, X_test, y_test, feature_names)

            logger.info("LinearRegression metrics: %s", lr_metrics)
            logger.info("SVM metrics: %s", svm_metrics)

            lr.save(lr_path)
            svm.save(svm_path)
            logger.info("Models saved to %s", Config.MODEL_DIR)

        self._models["linear_regression"] = lr
        self._models["svm"] = svm
        logger.info("ModelManager ready — models: %s", list(self._models.keys()))

    def get_model(self, name: str) -> LinearRegressionModel | SVMModel:
        """Return a trained model by name."""
        model = self._models.get(name)
        if model is None:
            raise KeyError(f"Unknown model: {name}")
        return model

    def list_models(self) -> list[str]:
        return list(self._models.keys())

    def get_data_stats(self) -> dict | None:
        return self._data_stats

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_data(self):
        """Load and split the cleaned CSV into train/test arrays."""
        import pandas as pd
        from sklearn.model_selection import train_test_split

        logger.info("Loading data from %s", Config.DATA_PATH)
        df = pd.read_csv(Config.DATA_PATH)

        feature_names = Config.FEATURE_NAMES
        X = df[feature_names].values
        y = df[Config.TARGET_NAME].values

        # Store basic statistics for later use
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
