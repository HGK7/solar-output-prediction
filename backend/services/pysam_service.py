"""Deterministic physics simulation service using NREL PySAM PVWatts v8."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from utils.logging import logger


class PhysicsSimulationError(Exception):
    """Raised when PySAM simulation cannot be completed."""


@dataclass
class PhysicsInput:
    lat: float
    lon: float
    monthly: dict[str, dict[str, float]]
    system_capacity_kw: float = 5.0
    panel_technology: str = "monocrystalline"
    installation_type: str = "rooftop"
    performance_ratio: float = 0.78
    panel_efficiency: float = 0.20


class PySAMService:
    """Runs deterministic PVWatts simulations for cross-checking ML outputs."""

    MONTHS = [
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

    DAYS_PER_MONTH = {
        "Jan": 31,
        "Feb": 28,
        "Mar": 31,
        "Apr": 30,
        "May": 31,
        "Jun": 30,
        "Jul": 31,
        "Aug": 31,
        "Sep": 30,
        "Oct": 31,
        "Nov": 30,
        "Dec": 31,
    }

    def simulate(self, params: PhysicsInput) -> dict[str, Any]:
        try:
            import PySAM.Pvwattsv8 as pvwattsv8
        except Exception as exc:
            raise PhysicsSimulationError(f"PySAM import failed: {exc}") from exc

        self._validate(params)

        try:
            model = pvwattsv8.default("PVWattsNone")
        except Exception as exc:
            raise PhysicsSimulationError(
                f"Unable to initialize PVWatts model: {exc}"
            ) from exc

        tz = int(max(-12, min(14, round(params.lon / 15))))
        resource_data = self._build_hourly_resource(params, tz)

        module_type = self._module_type(params.panel_technology)
        array_type = self._array_type(params.installation_type)
        losses_pct = max(0.0, min(99.0, (1.0 - params.performance_ratio) * 100.0))
        tilt = max(0.0, min(60.0, abs(params.lat)))

        try:
            model.SolarResource.solar_resource_data = resource_data
            model.SystemDesign.system_capacity = float(params.system_capacity_kw)
            model.SystemDesign.module_type = module_type
            model.SystemDesign.array_type = array_type
            model.SystemDesign.tilt = float(tilt)
            model.SystemDesign.azimuth = 180.0
            model.SystemDesign.dc_ac_ratio = 1.2
            model.SystemDesign.gcr = 0.4
            model.SystemDesign.inv_eff = 96.0
            model.SystemDesign.losses = float(losses_pct)
            model.execute()
        except Exception as exc:
            raise PhysicsSimulationError(f"PySAM execution failed: {exc}") from exc

        try:
            annual_energy_kwh = float(model.Outputs.ac_annual)
            capacity_factor_pct = float(model.Outputs.capacity_factor)
            monthly = [float(v) for v in model.Outputs.ac_monthly]
        except Exception as exc:
            raise PhysicsSimulationError(
                f"Unable to parse PySAM outputs: {exc}"
            ) from exc

        logger.info(
            "PySAM simulation complete: annual=%.2f kWh, cf=%.2f%%",
            annual_energy_kwh,
            capacity_factor_pct,
        )

        monthly_energy_kwh = [
            {"month": month, "energy_kwh": round(value, 2)}
            for month, value in zip(self.MONTHS, monthly)
        ]

        return {
            "status": "ok",
            "model": "pysam_pvwattsv8",
            "annual_energy_kwh": round(annual_energy_kwh, 2),
            "specific_yield_kwh_per_kw": round(
                annual_energy_kwh / float(params.system_capacity_kw), 2
            ),
            "capacity_factor_pct": round(capacity_factor_pct, 2),
            "monthly_energy_kwh": monthly_energy_kwh,
            "assumptions": {
                "system_capacity_kw": params.system_capacity_kw,
                "panel_technology": params.panel_technology,
                "installation_type": params.installation_type,
                "performance_ratio": params.performance_ratio,
                "losses_pct": round(losses_pct, 2),
                "panel_efficiency": params.panel_efficiency,
                "tilt_deg": tilt,
                "azimuth_deg": 180.0,
            },
        }

    def _validate(self, params: PhysicsInput) -> None:
        if not params.monthly:
            raise PhysicsSimulationError(
                "Monthly climatology data is required for deterministic PySAM simulation."
            )
        if params.system_capacity_kw <= 0:
            raise PhysicsSimulationError("system_capacity_kw must be > 0")
        if not (0.05 <= params.panel_efficiency <= 0.35):
            raise PhysicsSimulationError(
                "panel_efficiency must be between 0.05 and 0.35"
            )
        if not (0.5 <= params.performance_ratio <= 0.95):
            raise PhysicsSimulationError(
                "performance_ratio must be between 0.5 and 0.95"
            )

    def _build_hourly_resource(self, params: PhysicsInput, tz: int) -> dict[str, Any]:
        year = []
        month = []
        day = []
        hour = []
        minute = []
        gh = []
        dn = []
        df = []
        tdry = []
        wspd = []

        day_weights = self._daylight_hour_weights()

        for month_name in self.MONTHS:
            monthly_values = params.monthly.get(month_name, {})
            monthly_ghi_kwh = float(monthly_values.get("Solar Irradiance", 0.0))
            monthly_temp = float(monthly_values.get("Temperature", 20.0))
            monthly_wind = float(monthly_values.get("Wind Speed", 2.0))
            daily_wh_m2 = max(0.0, monthly_ghi_kwh * 1000.0)

            for day_idx in range(1, self.DAYS_PER_MONTH[month_name] + 1):
                for hour_idx in range(24):
                    year.append(2020)
                    month.append(self.MONTHS.index(month_name) + 1)
                    day.append(day_idx)
                    hour.append(hour_idx)
                    minute.append(30)

                    weight = day_weights[hour_idx]
                    ghi_w_m2 = daily_wh_m2 * weight
                    ghi_w_m2 = max(0.0, min(1400.0, ghi_w_m2))

                    gh.append(ghi_w_m2)
                    dn.append(ghi_w_m2 * 0.7)
                    df.append(ghi_w_m2 * 0.3)
                    tdry.append(monthly_temp)
                    wspd.append(max(0.0, monthly_wind))

        return {
            "lat": float(params.lat),
            "lon": float(params.lon),
            "tz": tz,
            "elev": 0.0,
            "year": year,
            "month": month,
            "day": day,
            "hour": hour,
            "minute": minute,
            "gh": gh,
            "dn": dn,
            "df": df,
            "tdry": tdry,
            "wspd": wspd,
        }

    @staticmethod
    def _daylight_hour_weights() -> dict[int, float]:
        daylight_hours = list(range(6, 18))
        raw = {
            h: math.sin(math.pi * ((i + 0.5) / len(daylight_hours)))
            for i, h in enumerate(daylight_hours)
        }
        total = sum(raw.values())
        return {h: raw.get(h, 0.0) / total for h in range(24)}

    @staticmethod
    def _module_type(panel_technology: str) -> int:
        tech = panel_technology.strip().lower()
        if "thin" in tech:
            return 2
        if "mono" in tech:
            return 1
        return 0

    @staticmethod
    def _array_type(installation_type: str) -> int:
        install = installation_type.strip().lower()
        if "ground" in install:
            return 0
        if "carport" in install:
            return 0
        return 1
