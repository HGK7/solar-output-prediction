"""
Tree ensemble model wrappers (RandomForestRegressor & HistGradientBoostingRegressor).

Provides non-linear ML baseline upgrades alongside LinearRegression and SVR,
capturing saturation, cloud/humidity interaction, and temperature effects.
"""

from __future__ import annotations

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_squared_error, r2_score


class RandomForestModel:
    """Wrapper around sklearn RandomForestRegressor."""

    name = "random_forest"

    def __init__(self):
        self._model = RandomForestRegressor(
            n_estimators=120,
            max_depth=8,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=-1,
        )
        self._is_trained = False
        self._rmse: float = 0.0
        self._r2: float = 0.0
        self._feature_names: list[str] = []
        self._importances: dict[str, float] = {}

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_test: np.ndarray,
        y_test: np.ndarray,
        feature_names: list[str],
    ) -> dict:
        self._feature_names = list(feature_names)
        self._model.fit(X_train, y_train)

        y_pred = self._model.predict(X_test)
        self._rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        self._r2 = float(r2_score(y_test, y_pred))
        self._importances = {
            name: round(float(imp), 6)
            for name, imp in zip(self._feature_names, self._model.feature_importances_)
        }
        self._is_trained = True
        return self.get_metrics()

    def predict(self, features: np.ndarray) -> float:
        if not self._is_trained:
            raise RuntimeError("Model has not been trained yet.")
        pred = self._model.predict(features.reshape(1, -1))
        return float(pred[0])

    def get_metrics(self) -> dict:
        return {"rmse": round(self._rmse, 4), "r2": round(self._r2, 4)}

    def get_feature_importance(self) -> dict[str, float]:
        if not self._is_trained:
            return {}
        return dict(self._importances)

    def get_error_estimate(self) -> float:
        return round(1.96 * self._rmse, 4)

    def save(self, path: str) -> None:
        joblib.dump(
            {
                "model": self._model,
                "rmse": self._rmse,
                "r2": self._r2,
                "feature_names": self._feature_names,
                "importances": self._importances,
            },
            path,
        )

    def load(self, path: str) -> None:
        data = joblib.load(path)
        self._model = data["model"]
        self._rmse = data["rmse"]
        self._r2 = data["r2"]
        self._feature_names = data["feature_names"]
        self._importances = data.get("importances") or {
            name: round(float(imp), 6)
            for name, imp in zip(
                self._feature_names,
                getattr(self._model, "feature_importances_", [0.25] * len(self._feature_names)),
            )
        }
        self._is_trained = True


class HistGradientBoostingModel:
    """Wrapper around sklearn HistGradientBoostingRegressor."""

    name = "hist_gradient_boosting"

    def __init__(self):
        self._model = HistGradientBoostingRegressor(
            max_iter=120,
            max_depth=6,
            learning_rate=0.06,
            min_samples_leaf=5,
            random_state=42,
        )
        self._is_trained = False
        self._rmse: float = 0.0
        self._r2: float = 0.0
        self._feature_names: list[str] = []
        self._importances: dict[str, float] = {}

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_test: np.ndarray,
        y_test: np.ndarray,
        feature_names: list[str],
    ) -> dict:
        self._feature_names = list(feature_names)
        self._model.fit(X_train, y_train)

        y_pred = self._model.predict(X_test)
        self._rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        self._r2 = float(r2_score(y_test, y_pred))

        perm = permutation_importance(
            self._model, X_test, y_test, n_repeats=5, random_state=42
        )
        self._importances = {
            name: round(float(imp), 6)
            for name, imp in zip(self._feature_names, perm.importances_mean)
        }
        self._is_trained = True
        return self.get_metrics()

    def predict(self, features: np.ndarray) -> float:
        if not self._is_trained:
            raise RuntimeError("Model has not been trained yet.")
        pred = self._model.predict(features.reshape(1, -1))
        return float(pred[0])

    def get_metrics(self) -> dict:
        return {"rmse": round(self._rmse, 4), "r2": round(self._r2, 4)}

    def get_feature_importance(self) -> dict[str, float]:
        if not self._is_trained:
            return {}
        return dict(self._importances)

    def get_error_estimate(self) -> float:
        return round(1.96 * self._rmse, 4)

    def save(self, path: str) -> None:
        joblib.dump(
            {
                "model": self._model,
                "rmse": self._rmse,
                "r2": self._r2,
                "feature_names": self._feature_names,
                "importances": self._importances,
            },
            path,
        )

    def load(self, path: str) -> None:
        data = joblib.load(path)
        self._model = data["model"]
        self._rmse = data["rmse"]
        self._r2 = data["r2"]
        self._feature_names = data["feature_names"]
        self._importances = data.get("importances", {})
        self._is_trained = True
