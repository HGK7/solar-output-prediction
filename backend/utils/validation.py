"""Input validation utilities for the Solar Intelligence API."""

import math
from typing import Any, Mapping

from config import Config


class ValidationError(Exception):
    """Raised when input validation fails."""

    def __init__(self, message: str, field: str | None = None):
        self.message = message
        self.field = field
        super().__init__(self.message)


# ── Coordinate validation ──


def validate_coordinates(lat: float | None, lon: float | None) -> tuple[float, float]:
    """
    Validate and return (lat, lon) as floats.
    Raises ValidationError if missing or out of bounds.
    """
    if lat is None or lon is None:
        raise ValidationError("Both 'lat' and 'lon' are required.", field="coordinates")
    try:
        lat = float(lat)
        lon = float(lon)
    except (TypeError, ValueError):
        raise ValidationError(
            "Coordinates must be numeric values.", field="coordinates"
        )

    if not (-90.0 <= lat <= 90.0):
        raise ValidationError(f"Latitude {lat} is out of range [-90, 90].", field="lat")
    if not (-180.0 <= lon <= 180.0):
        raise ValidationError(
            f"Longitude {lon} is out of range [-180, 180].", field="lon"
        )
    return lat, lon


# Physically reasonable bounds for each feature
FEATURE_BOUNDS: dict[str, tuple[float, float]] = {
    "Temperature": (-60.0, 60.0),  # °C
    "Humidity": (0.0, 100.0),  # %
    "Wind Speed": (0.0, 50.0),  # m/s
    "Clear Sky Irradiance": (0.0, 15.0),  # kWh/m²/day
}

VALID_MODELS = {
    "linear_regression",
    "svm",
    "random_forest",
    "hist_gradient_boosting",
}


def validate_prediction_input(payload: dict) -> dict[str, float]:
    """
    Validate and extract prediction features from a request payload.

    Returns a dict of {feature_name: float_value} for all required features.
    Raises ValidationError on any problem.
    """
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")

    features: dict[str, float] = {}

    for name in Config.FEATURE_NAMES:
        # Accept both exact name and snake_case
        key = name
        snake_key = name.lower().replace(" ", "_")

        raw = payload.get(key) or payload.get(snake_key)
        if raw is None:
            raise ValidationError(f"Missing required feature: {name}", field=name)

        try:
            value = float(raw)
        except (TypeError, ValueError):
            raise ValidationError(
                f"Feature '{name}' must be a number, got: {raw!r}", field=name
            )

        lo, hi = FEATURE_BOUNDS[name]
        if not (lo <= value <= hi):
            raise ValidationError(
                f"Feature '{name}' = {value} is out of physically plausible range [{lo}, {hi}].",
                field=name,
            )

        features[name] = value

    return features


def validate_model_name(name: str | None) -> str:
    """Return a validated model name, defaulting to linear_regression."""
    if name is None:
        return "linear_regression"
    name = name.strip().lower()
    if name not in VALID_MODELS:
        raise ValidationError(
            f"Unknown model '{name}'. Valid options: {', '.join(sorted(VALID_MODELS))}"
        )
    return name


# ── System / planning inputs (analysis, what-if, sizing) ──

SYSTEM_ENUMS: dict[str, frozenset[str]] = {
    "region": frozenset({"india", "usa", "europe", "global"}),
    "grid_connection": frozenset({"grid-tied", "hybrid", "off-grid"}),
    "installation_type": frozenset({"rooftop", "ground-mounted", "carport"}),
    "panel_technology": frozenset({"monocrystalline", "polycrystalline", "thin-film"}),
    "planning_scale": frozenset({"homeowner", "small_business", "industrial"}),
}

SYSTEM_NUMERIC_BOUNDS: dict[str, tuple[float, float]] = {
    "system_capacity_kw": (0.5, 5000.0),
    "panel_efficiency": (0.05, 0.30),
    "performance_ratio": (0.40, 0.95),
    "electricity_tariff_usd": (0.01, 5.0),
    "battery_capacity_kwh": (0.0, 50000.0),
    "monthly_bill_usd": (0.0, 1_000_000.0),
    "monthly_consumption_kwh": (0.0, 10_000_000.0),
    "available_roof_area_m2": (0.0, 1_000_000.0),
}

# Mirrors the planner's scale tiers (client/solar-dashboard/lib/planner-input-rules.ts).
SCALE_CAPACITY_KW: dict[str, tuple[float, float, str]] = {
    "homeowner": (1.0, 15.0, "Homeowner"),
    "small_business": (15.0, 100.0, "Small Business"),
    "industrial": (100.0, 5000.0, "Industrial"),
}
MAX_BATTERY_KWH_PER_KW = 10.0


def _parse_number(field: str, raw: Any) -> float:
    try:
        value = float(raw)
    except (TypeError, ValueError):
        raise ValidationError(f"'{field}' must be a number.", field=field)
    lo, hi = SYSTEM_NUMERIC_BOUNDS[field]
    if not math.isfinite(value) or not (lo <= value <= hi):
        raise ValidationError(f"'{field}' must be between {lo:g} and {hi:g}.", field=field)
    return value


def validate_system_inputs(raw: Mapping[str, Any]) -> dict[str, Any]:
    """Validate and normalise planner inputs. Unknown keys are dropped; empty strings count as absent."""
    out: dict[str, Any] = {}
    for field, allowed in SYSTEM_ENUMS.items():
        value = raw.get(field)
        if value is None or value == "":
            continue
        normalised = str(value).strip().lower()
        if normalised not in allowed:
            raise ValidationError(
                f"'{field}' must be one of: {', '.join(sorted(allowed))}.", field=field
            )
        out[field] = normalised

    for field in SYSTEM_NUMERIC_BOUNDS:
        value = raw.get(field)
        if value is None or value == "":
            continue
        out[field] = _parse_number(field, value)

    incentives = raw.get("include_incentives")
    if isinstance(incentives, bool):
        out["include_incentives"] = incentives
    elif incentives not in (None, ""):
        text = str(incentives).strip().lower()
        if text not in ("true", "false", "1", "0"):
            raise ValidationError("'include_incentives' must be true or false.", field="include_incentives")
        out["include_incentives"] = text in ("true", "1")

    kw = out.get("system_capacity_kw")
    scale = out.get("planning_scale")
    if kw is not None and scale is not None:
        lo, hi, label = SCALE_CAPACITY_KW[scale]
        if not (lo <= kw <= hi):
            raise ValidationError(
                f"{label} plans cover {lo:g}–{hi:g} kW; this plan is {kw:g} kW.",
                field="system_capacity_kw",
            )

    if out.get("grid_connection") == "grid-tied":
        out.pop("battery_capacity_kwh", None)
    battery = out.get("battery_capacity_kwh")
    if battery is not None and kw is not None and battery > kw * MAX_BATTERY_KWH_PER_KW:
        raise ValidationError(
            f"Battery size can be at most {MAX_BATTERY_KWH_PER_KW:g} kWh per kW of solar "
            f"({kw * MAX_BATTERY_KWH_PER_KW:g} kWh for {kw:g} kW).",
            field="battery_capacity_kwh",
        )
    return out


def validate_explanation_input(payload: dict) -> dict:
    """Validate input for the /explain endpoint."""
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")

    prediction = payload.get("prediction")
    if prediction is None:
        raise ValidationError("Missing required field: prediction")

    try:
        prediction = float(prediction)
    except (TypeError, ValueError):
        raise ValidationError("Field 'prediction' must be a number.")

    features = payload.get("features") or payload.get("input_features")
    if not features or not isinstance(features, dict):
        raise ValidationError("Missing or invalid 'features' object.")

    model_used = payload.get("model_used", "linear_regression")

    return {
        "prediction": prediction,
        "features": features,
        "model_used": model_used,
        "feature_importance": payload.get("feature_importance"),
    }


def validate_ask_input(payload: dict) -> str:
    """Validate input for the /ask endpoint. Returns the question string."""
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")

    question = payload.get("question", "").strip()
    if not question:
        raise ValidationError("Missing or empty 'question' field.")
    if len(question) > 1000:
        raise ValidationError("Question exceeds maximum length of 1000 characters.")

    return question
