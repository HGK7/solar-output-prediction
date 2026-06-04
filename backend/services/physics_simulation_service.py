"""Physics simulation — analytical default, optional PySAM adapter."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from config import Config
from utils.logging import logger

# Re-export for callers
from services.pysam_service import PhysicsInput, PhysicsSimulationError  # noqa: F401


class PhysicsSimulationService:
    """Tiered physics module: analytical (light) or PySAM (heavy, opt-in)."""

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

    def __init__(self) -> None:
        self._mode = Config.PHYSICS_MODE
        self._pysam_service = None

    def simulate(self, params: PhysicsInput) -> dict[str, Any]:
        if self._mode == "off":
            return {"status": "skipped", "reason": "physics_disabled"}

        if self._mode == "pysam":
            return self._simulate_pysam(params)

        return self._simulate_analytical(params)

    def _simulate_pysam(self, params: PhysicsInput) -> dict[str, Any]:
        if self._pysam_service is None:
            from services.pysam_service import PySAMService

            self._pysam_service = PySAMService()
        return self._pysam_service.simulate(params)

    def _simulate_analytical(self, params: PhysicsInput) -> dict[str, Any]:
        """PSH × capacity × performance_ratio × days — matches financial module math."""
        if not params.monthly:
            raise PhysicsSimulationError(
                "Monthly climatology data is required for physics simulation."
            )
        if params.system_capacity_kw <= 0:
            raise PhysicsSimulationError("system_capacity_kw must be > 0")

        pr = float(params.performance_ratio)
        capacity = float(params.system_capacity_kw)
        monthly_energy: list[dict[str, Any]] = []
        annual_energy_kwh = 0.0

        for month in self.MONTHS:
            monthly_values = params.monthly.get(month, {})
            psh = float(monthly_values.get("Solar Irradiance", 0.0))
            days = self.DAYS_PER_MONTH[month]
            energy = psh * capacity * pr * days
            annual_energy_kwh += energy
            monthly_energy.append({"month": month, "energy_kwh": round(energy, 2)})

        capacity_factor_pct = (
            (annual_energy_kwh / (capacity * 8760.0)) * 100.0 if capacity > 0 else 0.0
        )

        logger.info(
            "Analytical physics complete: annual=%.2f kWh, cf=%.2f%%",
            annual_energy_kwh,
            capacity_factor_pct,
        )

        return {
            "status": "ok",
            "model": "analytical_psh",
            "annual_energy_kwh": round(annual_energy_kwh, 2),
            "specific_yield_kwh_per_kw": round(annual_energy_kwh / capacity, 2),
            "capacity_factor_pct": round(capacity_factor_pct, 2),
            "monthly_energy_kwh": monthly_energy,
            "assumptions": {
                "system_capacity_kw": capacity,
                "panel_technology": params.panel_technology,
                "installation_type": params.installation_type,
                "performance_ratio": pr,
                "panel_efficiency": params.panel_efficiency,
                "method": (
                    "Climatological PSH proxy (monthly irradiance × capacity × "
                    "performance ratio × days). PySAM not loaded."
                ),
            },
        }
