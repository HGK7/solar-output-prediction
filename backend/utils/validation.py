"""Input validation utilities for the Solar Intelligence API."""

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

VALID_MODELS = {"linear_regression", "svm"}


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
