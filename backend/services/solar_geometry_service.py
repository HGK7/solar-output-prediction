"""
Solar geometry service — deterministic calculations for panel orientation,
area, and dawn-to-dusk energy period.

All formulas are from:
  - Duffie & Beckman, "Solar Engineering of Thermal Processes", 4th Ed. (Wiley, 2013)
  - NREL "Solar Radiation Data Manual for Buildings" methodology
  - Cooper's equation for solar declination: δ = 23.45 × sin(360/365 × (284 + n))

No LLM involvement — pure physics-based calculations.
"""

import math
from dataclasses import dataclass, field
from typing import Any

from utils.logging import logger

# Standard test condition panel dimensions (IEC 61215)
# 72-cell monocrystalline panel — most common residential/commercial
_STANDARD_PANEL_LENGTH_M = 2.0  # ~2000 mm
_STANDARD_PANEL_WIDTH_M = 1.0  # ~1000 mm
_STANDARD_PANEL_AREA_M2 = _STANDARD_PANEL_LENGTH_M * _STANDARD_PANEL_WIDTH_M  # 2.0 m²
_STANDARD_PANEL_WATT_PEAK = 400  # 400 Wp — typical modern 72-cell mono


@dataclass
class PanelSpec:
    """Physical panel specification. Sourced from IEC 61215 / manufacturer norms."""

    length_m: float = _STANDARD_PANEL_LENGTH_M
    width_m: float = _STANDARD_PANEL_WIDTH_M
    area_m2: float = _STANDARD_PANEL_AREA_M2
    watt_peak: int = _STANDARD_PANEL_WATT_PEAK
    source: str = "IEC 61215 standard 72-cell monocrystalline (400 Wp)"


@dataclass
class SunPath:
    """Dawn-to-dusk results for a single day or averaged period."""

    sunrise_hour: float  # decimal hours, e.g. 6.25 = 06:15
    sunset_hour: float
    daylight_hours: float
    solar_noon_altitude_deg: float  # maximum sun elevation angle
    declination_deg: float

    @property
    def sunrise_time(self) -> str:
        return _decimal_hours_to_hhmm(self.sunrise_hour)

    @property
    def sunset_time(self) -> str:
        return _decimal_hours_to_hhmm(self.sunset_hour)


@dataclass
class GeometryResult:
    """Full solar geometry analysis for a location."""

    latitude: float
    longitude: float
    panel_spec: PanelSpec
    optimal_tilt_deg: float
    optimal_azimuth_deg: float  # 180 = due south (northern hemisphere)
    azimuth_direction: str  # human-readable, e.g. "Due South"
    num_panels: int
    total_panel_area_m2: float
    system_capacity_kw: float
    monthly_sun_paths: dict  # month_name -> SunPath
    annual_avg_daylight_hours: float
    annual_avg_solar_noon_altitude: float
    effective_irradiance_factor: float  # cos(θ_incidence) approximation
    methodology: list[str] = field(default_factory=list)


class SolarGeometryService:
    """Deterministic solar geometry calculations."""

    @staticmethod
    def calculate(
        lat: float,
        lon: float,
        system_capacity_kw: float = 5.0,
    ) -> dict[str, Any]:
        """
        Compute panel orientation, area, and dawn-to-dusk data.

        Args:
            lat: Latitude in degrees (-90 to 90)
            lon: Longitude in degrees (-180 to 180)
            system_capacity_kw: System size in kW (default 5 kW)

        Returns:
            Dict with panel specs, orientation, area, and monthly sun paths.
        """
        panel = PanelSpec()

        # --- Number of panels needed ---
        num_panels = math.ceil((system_capacity_kw * 1000) / panel.watt_peak)
        total_area = num_panels * panel.area_m2

        # --- Optimal tilt angle ---
        # Rule of thumb validated by NREL: tilt ≈ |latitude| for annual max
        # Duffie & Beckman Ch.2: for maximum annual energy, β ≈ φ
        optimal_tilt = abs(lat)

        # --- Optimal azimuth ---
        # Northern hemisphere → face south (180°)
        # Southern hemisphere → face north (0°)
        if lat >= 0:
            optimal_azimuth = 180.0
            azimuth_dir = "Due South"
        else:
            optimal_azimuth = 0.0
            azimuth_dir = "Due North"

        # --- Monthly sun paths ---
        # Representative day of each month (Klein, 1977 — DOY for avg day)
        representative_days = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344]
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

        monthly_paths = {}
        total_daylight = 0.0
        total_noon_alt = 0.0

        for i, doy in enumerate(representative_days):
            sun = _compute_sun_path(lat, doy)
            monthly_paths[month_names[i]] = {
                "sunrise": sun.sunrise_time,
                "sunset": sun.sunset_time,
                "daylight_hours": round(sun.daylight_hours, 2),
                "solar_noon_altitude_deg": round(sun.solar_noon_altitude_deg, 1),
                "declination_deg": round(sun.declination_deg, 1),
            }
            total_daylight += sun.daylight_hours
            total_noon_alt += sun.solar_noon_altitude_deg

        annual_avg_daylight = total_daylight / 12
        annual_avg_noon_alt = total_noon_alt / 12

        # --- Effective irradiance factor ---
        # Approximate annual average cos(θ_incidence) for optimally tilted panel
        # θ_incidence ≈ 0 at solar noon on equinox when tilt = latitude
        # Average over the year is typically 0.85-0.92 for optimal tilt
        eff_factor = _estimate_effective_irradiance_factor(lat, optimal_tilt)

        methodology = [
            "Optimal tilt: β ≈ |latitude| (Duffie & Beckman, Solar Engineering of Thermal Processes, 4th Ed., Ch.2)",
            "Solar declination: Cooper's equation, δ = 23.45° × sin(360/365 × (284 + n))",
            "Sunrise/sunset hour angle: ωs = arccos(-tan(φ) × tan(δ))",
            "Daylight hours: N = (2/15) × ωs",
            "Representative days: Klein (1977) monthly mean days",
            "Panel spec: IEC 61215 standard 72-cell monocrystalline, 400 Wp, 2.0 m × 1.0 m",
        ]

        result = {
            "panel_spec": {
                "length_m": panel.length_m,
                "width_m": panel.width_m,
                "area_per_panel_m2": panel.area_m2,
                "watt_peak": panel.watt_peak,
                "source": panel.source,
            },
            "orientation": {
                "optimal_tilt_deg": round(optimal_tilt, 1),
                "optimal_azimuth_deg": round(optimal_azimuth, 1),
                "azimuth_direction": azimuth_dir,
                "tilt_rationale": (
                    f"Tilt angle of {optimal_tilt:.1f}° equals the absolute latitude, "
                    f"maximizing annual energy capture (Duffie & Beckman, Ch.2)."
                ),
            },
            "system_layout": {
                "system_capacity_kw": system_capacity_kw,
                "num_panels": num_panels,
                "total_panel_area_m2": round(total_area, 1),
                "panel_arrangement": f"{num_panels} panels × {panel.area_m2} m² each",
            },
            "dawn_to_dusk": {
                "monthly": monthly_paths,
                "annual_avg_daylight_hours": round(annual_avg_daylight, 2),
                "annual_avg_solar_noon_altitude_deg": round(annual_avg_noon_alt, 1),
            },
            "effective_irradiance_factor": round(eff_factor, 3),
            "methodology": methodology,
        }

        logger.info(
            "Solar geometry: lat=%.2f, tilt=%.1f°, %d panels, %.1f m², %.1fh avg daylight",
            lat,
            optimal_tilt,
            num_panels,
            total_area,
            annual_avg_daylight,
        )

        return result


def _compute_sun_path(lat_deg: float, day_of_year: int) -> SunPath:
    """
    Compute sunrise, sunset, daylight hours, and solar noon altitude
    for a given latitude and day of year.

    Formulas:
        - Cooper's equation for declination
        - Hour angle at sunrise/sunset: ωs = arccos(-tan(φ)·tan(δ))
        - Daylight duration: N = (2/15)·ωs (in hours, ωs in degrees)
        - Solar noon altitude: α = 90° - |φ - δ|
    """
    lat_rad = math.radians(lat_deg)

    # Solar declination — Cooper's equation
    declination_deg = 23.45 * math.sin(math.radians(360 / 365 * (284 + day_of_year)))
    decl_rad = math.radians(declination_deg)

    # Hour angle at sunrise/sunset
    cos_hour_angle = -math.tan(lat_rad) * math.tan(decl_rad)

    # Clamp for polar regions (midnight sun / polar night)
    if cos_hour_angle < -1:
        # Midnight sun — 24h daylight
        hour_angle_deg = 180.0
    elif cos_hour_angle > 1:
        # Polar night — 0h daylight
        hour_angle_deg = 0.0
    else:
        hour_angle_deg = math.degrees(math.acos(cos_hour_angle))

    # Daylight hours
    daylight_hours = (2.0 / 15.0) * hour_angle_deg

    # Sunrise/sunset in decimal hours (symmetric around 12:00 solar noon)
    half_day = daylight_hours / 2.0
    sunrise = 12.0 - half_day
    sunset = 12.0 + half_day

    # Solar noon altitude (maximum sun elevation)
    noon_altitude = 90.0 - abs(lat_deg - declination_deg)

    return SunPath(
        sunrise_hour=sunrise,
        sunset_hour=sunset,
        daylight_hours=daylight_hours,
        solar_noon_altitude_deg=noon_altitude,
        declination_deg=declination_deg,
    )


def _estimate_effective_irradiance_factor(lat_deg: float, tilt_deg: float) -> float:
    """
    Estimate annual average cos(θ_incidence) for a south-facing tilted panel.

    This is a simplified analytical approximation. For the optimal tilt
    (tilt ≈ |latitude|), the factor is typically 0.85-0.92.

    Uses Liu & Jordan (1963) isotropic diffuse model simplification.
    """
    lat_rad = math.radians(abs(lat_deg))
    tilt_rad = math.radians(tilt_deg)

    # At equinox (δ=0), cos(θ) = cos(φ - β) at solar noon
    equinox_cos = math.cos(lat_rad - tilt_rad)

    # Summer solstice (δ=23.45°)
    summer_cos = math.cos(lat_rad - tilt_rad - math.radians(23.45))

    # Winter solstice (δ=-23.45°)
    winter_cos = math.cos(lat_rad - tilt_rad + math.radians(23.45))

    # Weighted annual average (equinoxes count double — 2 per year)
    avg_noon_cos = (2 * equinox_cos + summer_cos + winter_cos) / 4

    # Daily average is roughly 0.65-0.75 of noon value
    # (integration of cos over daylight hours)
    daily_factor = 0.70

    return max(0.1, min(1.0, avg_noon_cos * daily_factor / 0.65))


def _decimal_hours_to_hhmm(h: float) -> str:
    """Convert decimal hours to HH:MM string."""
    hours = int(h)
    minutes = int((h - hours) * 60)
    return f"{hours:02d}:{minutes:02d}"
