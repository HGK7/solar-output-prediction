"""
Recommendation service — deterministic, actionable site recommendations.

Every number comes from FinancialService / SolarGeometryService re-runs
(ADR-0001: LLMs never generate or alter numeric outputs). Each
recommendation cites a knowledge-base document so the dashboard can open
it in the source modal.
"""

from typing import Any

from services.financial_service import FinancialService
from services.solar_geometry_service import SolarGeometryService

# Performance ratio achievable with disciplined cleaning/O&M (IEC 61724-1
# component ranges; see operations_maintenance.md)
_WELL_MAINTAINED_PR = 0.85
_TARGET_PAYBACK_YEARS = 10.0


class RecommendationService:
    """Builds deterministic recommendations from an existing prediction."""

    def __init__(
        self,
        financial_service: FinancialService,
        geometry_service: SolarGeometryService,
    ):
        self._financial = financial_service
        self._geometry = geometry_service

    def build(
        self,
        predicted_irradiance_kwh_m2_day: float,
        financial_overrides: dict[str, Any] | None = None,
        lat: float | None = None,
        lon: float | None = None,
    ) -> list[dict[str, Any]]:
        overrides = dict(financial_overrides or {})
        baseline = self._financial.calculate(
            predicted_irradiance_kwh_m2_day=predicted_irradiance_kwh_m2_day,
            overrides=dict(overrides),
        )
        params = baseline["system_parameters"]

        recommendations: list[dict[str, Any]] = []

        if lat is not None and lon is not None:
            recommendations.append(
                self._orientation(lat, lon, params["capacity_kw"])
            )

        recommendations.append(self._grid_parity(baseline))
        maintenance = self._maintenance_upside(
            predicted_irradiance_kwh_m2_day, overrides, baseline
        )
        if maintenance:
            recommendations.append(maintenance)
        tariff_rec = self._tariff_break_even(baseline)
        if tariff_rec:
            recommendations.append(tariff_rec)

        return recommendations

    def _orientation(
        self, lat: float, lon: float, capacity_kw: float
    ) -> dict[str, Any]:
        geometry = self._geometry.calculate(lat, lon, system_capacity_kw=capacity_kw)
        orientation = geometry["orientation"]
        layout = geometry["system_layout"]
        return {
            "id": "orientation",
            "title": "Panel orientation",
            "detail": (
                f"Tilt panels at {orientation['optimal_tilt_deg']}° facing "
                f"{orientation['azimuth_direction'].lower()} for maximum annual "
                f"capture. A {layout['system_capacity_kw']} kW system needs "
                f"{layout['num_panels']} panels "
                f"(~{layout['total_panel_area_m2']} m²)."
            ),
            "metrics": {
                "optimal_tilt_deg": orientation["optimal_tilt_deg"],
                "azimuth": orientation["azimuth_direction"],
                "num_panels": layout["num_panels"],
                "total_panel_area_m2": layout["total_panel_area_m2"],
            },
            "source_document": "solar_panel_efficiency.md",
        }

    @staticmethod
    def _grid_parity(baseline: dict[str, Any]) -> dict[str, Any]:
        lcoe = baseline["lcoe_usd_per_kwh"]
        tariff = baseline["system_parameters"]["electricity_tariff_usd_kwh"]
        if tariff > 0 and lcoe < tariff:
            pct_cheaper = round((1 - lcoe / tariff) * 100, 1)
            detail = (
                f"Solar electricity costs ${lcoe}/kWh over the system lifetime "
                f"versus the ${tariff}/kWh grid tariff — {pct_cheaper}% cheaper "
                f"than grid power."
            )
            verdict = "below_grid"
        else:
            detail = (
                f"Lifetime solar cost (${lcoe}/kWh) is at or above the grid "
                f"tariff (${tariff}/kWh). Viability depends on tariff growth "
                f"or incentives."
            )
            verdict = "above_grid"
        return {
            "id": "grid_parity",
            "title": "Grid parity",
            "detail": detail,
            "metrics": {
                "lcoe_usd_per_kwh": lcoe,
                "grid_tariff_usd_per_kwh": tariff,
                "verdict": verdict,
            },
            "source_document": "solar_costs.md",
        }

    def _maintenance_upside(
        self,
        irradiance: float,
        overrides: dict[str, Any],
        baseline: dict[str, Any],
    ) -> dict[str, Any] | None:
        current_pr = baseline["system_parameters"]["performance_ratio"]
        if current_pr >= _WELL_MAINTAINED_PR:
            return None
        improved = self._financial.calculate(
            predicted_irradiance_kwh_m2_day=irradiance,
            overrides={**overrides, "performance_ratio": _WELL_MAINTAINED_PR},
        )
        extra_savings = round(
            improved["annual_savings_usd"] - baseline["annual_savings_usd"], 2
        )
        if extra_savings <= 0:
            return None
        return {
            "id": "maintenance",
            "title": "Maintenance upside",
            "detail": (
                f"Raising the performance ratio from {current_pr} to "
                f"{_WELL_MAINTAINED_PR} through regular cleaning and O&M would "
                f"add about ${extra_savings:,.0f}/year in savings and cut "
                f"payback from {baseline['simple_payback_years']} to "
                f"{improved['simple_payback_years']} years."
            ),
            "metrics": {
                "current_performance_ratio": current_pr,
                "achievable_performance_ratio": _WELL_MAINTAINED_PR,
                "extra_annual_savings_usd": extra_savings,
                "improved_payback_years": improved["simple_payback_years"],
            },
            "source_document": "operations_maintenance.md",
        }

    @staticmethod
    def _tariff_break_even(baseline: dict[str, Any]) -> dict[str, Any] | None:
        annual_output = baseline["annual_output_kwh"]
        if annual_output <= 0:
            return None
        cost = baseline["total_system_cost_usd"]
        maintenance = baseline["annual_maintenance_usd"]
        # Tariff where net annual savings repay the system in the target window
        break_even_tariff = round(
            (cost / _TARGET_PAYBACK_YEARS + maintenance) / annual_output, 3
        )
        current_tariff = baseline["system_parameters"]["electricity_tariff_usd_kwh"]
        payback = baseline["simple_payback_years"]
        if payback <= _TARGET_PAYBACK_YEARS:
            detail = (
                f"At the current ${current_tariff}/kWh tariff the system pays "
                f"back in {payback} years — already inside the "
                f"{_TARGET_PAYBACK_YEARS:.0f}-year window."
            )
        else:
            detail = (
                f"Payback is {payback} years at ${current_tariff}/kWh. A tariff "
                f"of ${break_even_tariff}/kWh (or equivalent incentives) would "
                f"bring payback inside {_TARGET_PAYBACK_YEARS:.0f} years."
            )
        return {
            "id": "tariff_break_even",
            "title": "Tariff sensitivity",
            "detail": detail,
            "metrics": {
                "current_tariff_usd_per_kwh": current_tariff,
                "break_even_tariff_usd_per_kwh": break_even_tariff,
                "current_payback_years": payback,
                "target_payback_years": _TARGET_PAYBACK_YEARS,
            },
            "source_document": "solar_costs.md",
        }
