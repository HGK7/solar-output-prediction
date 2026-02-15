"""
NASA POWER API service — fetches solar and meteorological parameters
for a given location (latitude, longitude).

The NASA POWER API provides free access to solar radiation and
meteorological datasets derived from satellite observations.
https://power.larc.nasa.gov/

This service is strictly data-fetching — no LLM involvement.
"""

import requests
from cachetools import TTLCache
from typing import Any

from utils.logging import logger


# Cache responses for 6 hours (21600 seconds) — solar climatology data
# changes infrequently. Max 256 location entries.
_cache: TTLCache = TTLCache(maxsize=256, ttl=21600)

# NASA POWER API base URL for climatology data
_BASE_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"

# Parameters we need from NASA POWER, mapped to our ML model features
_NASA_PARAMETERS = [
    "ALLSKY_SFC_SW_DWN",  # All Sky Surface Shortwave Downward Irradiance (kWh/m²/day)
    "CLRSKY_SFC_SW_DWN",  # Clear Sky Surface Shortwave Downward Irradiance (kWh/m²/day)
    "T2M",  # Temperature at 2 Meters (°C)
    "RH2M",  # Relative Humidity at 2 Meters (%)
    "WS2M",  # Wind Speed at 2 Meters (m/s)
]


class NASAServiceError(Exception):
    """Raised when NASA POWER API calls fail."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class NASAService:
    """Fetches solar and weather parameters from NASA POWER API."""

    @staticmethod
    def fetch_solar_parameters(lat: float, lon: float) -> dict[str, Any]:
        """
        Fetch climatological averages from NASA POWER for the given coordinates.

        Returns a dict with:
            - location: {lat, lon}
            - annual_averages: feature dict matching ML model input schema
            - monthly: dict of month -> feature dict (for charts)
            - raw_parameters: original NASA response parameters
        """
        cache_key = f"{lat:.4f},{lon:.4f}"
        if cache_key in _cache:
            cached = _cache[cache_key]
            logger.info("NASA POWER cache hit for (%s)", cache_key)
            return cached

        logger.info("Fetching NASA POWER data for lat=%.4f, lon=%.4f", lat, lon)

        params = {
            "parameters": ",".join(_NASA_PARAMETERS),
            "community": "RE",  # Renewable Energy community
            "longitude": lon,
            "latitude": lat,
            "format": "JSON",
        }

        try:
            response = requests.get(_BASE_URL, params=params, timeout=30)
            response.raise_for_status()
        except requests.exceptions.Timeout:
            raise NASAServiceError(
                "NASA POWER API request timed out. Please try again."
            )
        except requests.exceptions.HTTPError as exc:
            raise NASAServiceError(
                f"NASA POWER API returned error: {exc.response.status_code}"
            )
        except requests.exceptions.RequestException as exc:
            raise NASAServiceError(f"Failed to reach NASA POWER API: {exc}")

        data = response.json()

        # Validate response structure
        if "properties" not in data or "parameter" not in data["properties"]:
            raise NASAServiceError("Unexpected response format from NASA POWER API.")

        raw_params = data["properties"]["parameter"]

        result = _parse_nasa_response(lat, lon, raw_params)
        _cache[cache_key] = result
        return result

    @staticmethod
    def fetch_prediction_features(lat: float, lon: float) -> dict[str, float]:
        """
        Convenience method: fetch NASA data and return only the annual
        averages formatted as ML model input features.

        Returns: {"Temperature": float, "Humidity": float, "Wind Speed": float,
                  "Clear Sky Irradiance": float}
        """
        data = NASAService.fetch_solar_parameters(lat, lon)
        return data["annual_averages"]


def _parse_nasa_response(lat: float, lon: float, raw_params: dict) -> dict[str, Any]:
    """Parse NASA POWER response into our structured format."""

    # Month keys in NASA POWER response (uppercase abbreviations)
    month_keys = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
    ]
    month_names = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ]

    # Extract annual averages (key = "ANN" in NASA response)
    annual = {
        "Temperature": _safe_float(raw_params.get("T2M", {}).get("ANN")),
        "Humidity": _safe_float(raw_params.get("RH2M", {}).get("ANN")),
        "Wind Speed": _safe_float(raw_params.get("WS2M", {}).get("ANN")),
        "Clear Sky Irradiance": _safe_float(
            raw_params.get("CLRSKY_SFC_SW_DWN", {}).get("ANN")
        ),
    }

    # Solar irradiance (GHI) for reference — this is what we're predicting
    annual_ghi = _safe_float(raw_params.get("ALLSKY_SFC_SW_DWN", {}).get("ANN"))

    # Extract monthly data for charts
    monthly = {}
    for i, month_key in enumerate(month_keys):
        monthly[month_names[i]] = {
            "Temperature": _safe_float(raw_params.get("T2M", {}).get(month_key)),
            "Humidity": _safe_float(raw_params.get("RH2M", {}).get(month_key)),
            "Wind Speed": _safe_float(raw_params.get("WS2M", {}).get(month_key)),
            "Clear Sky Irradiance": _safe_float(
                raw_params.get("CLRSKY_SFC_SW_DWN", {}).get(month_key)
            ),
            "Solar Irradiance": _safe_float(
                raw_params.get("ALLSKY_SFC_SW_DWN", {}).get(month_key)
            ),
        }

    return {
        "location": {"lat": lat, "lon": lon},
        "annual_averages": annual,
        "annual_ghi": annual_ghi,
        "monthly": monthly,
        "raw_parameters": raw_params,
        "data_provenance": {
            "source": "NASA POWER (Prediction Of Worldwide Energy Resources)",
            "api_endpoint": "https://power.larc.nasa.gov/api/temporal/climatology/point",
            "temporal_type": "Climatology (long-term averages)",
            "date_range": "January 1984 – December 2022 (38-year record)",
            "spatial_resolution": "0.5° × 0.5° latitude/longitude grid",
            "data_origin": "Satellite-derived (CERES, MERRA-2 reanalysis)",
            "community": "Renewable Energy (RE)",
            "parameters_fetched": {
                "ALLSKY_SFC_SW_DWN": {
                    "name": "All Sky Surface Shortwave Downward Irradiance",
                    "unit": "kWh/m²/day",
                    "description": "Total solar radiation reaching the surface under actual sky conditions (clouds, aerosols)",
                },
                "CLRSKY_SFC_SW_DWN": {
                    "name": "Clear Sky Surface Shortwave Downward Irradiance",
                    "unit": "kWh/m²/day",
                    "description": "Solar radiation under hypothetical cloud-free skies — upper bound reference",
                },
                "T2M": {
                    "name": "Temperature at 2 Meters",
                    "unit": "°C",
                    "description": "Average air temperature at 2m height (MERRA-2 reanalysis)",
                },
                "RH2M": {
                    "name": "Relative Humidity at 2 Meters",
                    "unit": "%",
                    "description": "Average relative humidity at 2m height",
                },
                "WS2M": {
                    "name": "Wind Speed at 2 Meters",
                    "unit": "m/s",
                    "description": "Average wind speed at 2m height — affects panel cooling",
                },
            },
            "citation": (
                "NASA Langley Research Center (LaRC) POWER Project. "
                "Data from CERES (Clouds and the Earth's Radiant Energy System) "
                "and GMAO MERRA-2 reanalysis. https://power.larc.nasa.gov/"
            ),
            "limitations": [
                "Climatological averages — does not capture year-to-year variability",
                "0.5° spatial resolution may not capture micro-climate effects",
                "Satellite-derived — ground validation recommended for precision projects",
                "Does not account for local shading, terrain, or urban heat island effects",
            ],
        },
    }


def _safe_float(value: Any) -> float:
    """Convert to float, returning 0.0 for missing / fill values."""
    if value is None:
        return 0.0
    try:
        val = float(value)
        # NASA POWER uses -999 as fill value for missing data
        return 0.0 if val < -900 else round(val, 4)
    except (TypeError, ValueError):
        return 0.0
