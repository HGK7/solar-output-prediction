"""
Support Vector Machine (SVR) model wrapper.

Wraps sklearn SVR with a consistent interface matching LinearRegressionModel.
The model is deterministic — LLMs never touch these predictions.
"""

import numpy as np
import joblib
from sklearn.svm import SVR
from sklearn.metrics import mean_squared_error, r2_score


class SVMModel:
    """Thin wrapper around sklearn SVR with linear kernel."""

    name = "svm"

    def __init__(self):
        self._model = SVR(kernel="linear")
        self._is_trained = False
        self._rmse: float = 0.0
        self._r2: float = 0.0
        self._feature_names: list[str] = []

    # ------ Training ------

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_test: np.ndarray,
        y_test: np.ndarray,
        feature_names: list[str],
    ) -> dict:
        """Train the model and compute evaluation metrics."""
        self._feature_names = feature_names
        self._model.fit(X_train, y_train)

        y_pred = self._model.predict(X_test)
        self._rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        self._r2 = float(r2_score(y_test, y_pred))
        self._is_trained = True

        return self.get_metrics()

    # ------ Prediction ------

    def predict(self, features: np.ndarray) -> float:
        """Return a single scalar prediction."""
        if not self._is_trained:
            raise RuntimeError("Model has not been trained yet.")
        prediction = self._model.predict(features.reshape(1, -1))
        return float(prediction[0])

    # ------ Introspection ------

    def get_metrics(self) -> dict:
        return {
            "rmse": round(self._rmse, 4),
            "r2": round(self._r2, 4),
        }

    def get_feature_importance(self) -> dict[str, float]:
        """Return SVR coefficients (linear kernel) as feature importance."""
        if not self._is_trained:
            return {}
        coefs = self._model.coef_[0]
        return {
            name: round(float(coef), 6)
            for name, coef in zip(self._feature_names, coefs)
        }

    def get_error_estimate(self) -> float:
        """Return ±1.96 × RMSE (~95 % prediction interval)."""
        return round(1.96 * self._rmse, 4)

    # ------ Persistence ------

    def save(self, path: str) -> None:
        joblib.dump(
            {
                "model": self._model,
                "rmse": self._rmse,
                "r2": self._r2,
                "feature_names": self._feature_names,
            },
            path,
        )

    def load(self, path: str) -> None:
        data = joblib.load(path)
        self._model = data["model"]
        self._rmse = data["rmse"]
        self._r2 = data["r2"]
        self._feature_names = data["feature_names"]
        self._is_trained = True
