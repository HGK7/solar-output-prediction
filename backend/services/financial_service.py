"""
Financial calculation service — deterministic analysis of solar installation
economics based on ML predictions and sourced cost data.

All calculations are deterministic. LLMs are never involved.
Cost parameters are sourced from IRENA, IEA, and public databases
(see rag/documents/solar_costs.md for full citations).
"""

from dataclasses import dataclass
from typing import Any

from utils.logging import logger


@dataclass
class FinancialDefaults:
    """Region-aware default parameters for financial calculations.

    All defaults are sourced from IRENA Renewable Power Generation Costs 2024,
    IEA World Energy Outlook 2024, and Indian CERC tariff orders.
    See backend/rag/documents/solar_costs.md for full citations.
    """

    # System parameters
    system_capacity_kw: float = 5.0  # Typical residential system (kW)
    panel_efficiency: float = 0.20  # 20% — modern monocrystalline
    performance_ratio: float = 0.78  # System losses (inverter, wiring, soiling)
    system_lifetime_years: int = 25  # Industry standard warranty period

    # Cost parameters (USD)
    cost_per_watt_usd: float = 0.75  # IRENA 2024: global avg $0.75/W for utility
    installation_cost_per_watt_usd: float = 0.30  # Installation + BOS
    maintenance_cost_annual_per_kw: float = 15.0  # O&M avg from IRENA

    # Sub-cost breakdown fractions (of total module cost) — IRENA 2024 Appendix
    module_cost_fraction: float = 0.45  # Solar modules
    inverter_cost_fraction: float = 0.12  # Inverter
    bos_cost_fraction: float = 0.18  # Balance of System (wiring, mounting, etc.)
    soft_cost_fraction: float = 0.25  # Permitting, labor, margin

    # Degradation
    annual_degradation_rate: float = 0.005  # 0.5%/year — industry standard

    # Electricity tariff (USD/kWh)
    electricity_tariff_usd: float = 0.08  # India avg residential ~₹6.5/kWh ≈ $0.08

    # Discount rate for LCOE
    discount_rate: float = 0.08  # 8% nominal for developing markets


# Regional preset overrides
REGIONAL_DEFAULTS: dict[str, dict[str, float]] = {
    "india": {
        "cost_per_watt_usd": 0.55,
        "installation_cost_per_watt_usd": 0.25,
        "electricity_tariff_usd": 0.08,
        "discount_rate": 0.08,
    },
    "usa": {
        "cost_per_watt_usd": 1.00,
        "installation_cost_per_watt_usd": 0.80,
        "electricity_tariff_usd": 0.16,
        "discount_rate": 0.05,
    },
    "europe": {
        "cost_per_watt_usd": 0.85,
        "installation_cost_per_watt_usd": 0.60,
        "electricity_tariff_usd": 0.25,
        "discount_rate": 0.04,
    },
    "global": {},  # Use base defaults
}


class FinancialService:
    """Deterministic financial analysis for solar installations."""

    @staticmethod
    def calculate(
        predicted_irradiance_kwh_m2_day: float,
        overrides: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Calculate financial metrics from a solar irradiance prediction.

        Args:
            predicted_irradiance_kwh_m2_day: Predicted solar irradiance (kWh/m²/day)
                from the ML model.
            overrides: Optional dict of parameter overrides. Supported keys:
                - system_capacity_kw, panel_efficiency, performance_ratio
                - cost_per_watt_usd, installation_cost_per_watt_usd
                - electricity_tariff_usd, region, system_lifetime_years

        Returns:
            Dict with financial analysis results and source citations.
        """
        defaults = FinancialDefaults()
        overrides = overrides or {}

        # Apply regional defaults first, then user overrides
        region = overrides.pop("region", "global").lower()
        regional = REGIONAL_DEFAULTS.get(region, {})
        for key, val in regional.items():
            if hasattr(defaults, key):
                setattr(defaults, key, val)

        # Apply explicit user overrides
        for key, val in overrides.items():
            if hasattr(defaults, key) and val is not None:
                try:
                    setattr(defaults, key, type(getattr(defaults, key))(val))
                except (TypeError, ValueError):
                    pass  # Skip invalid overrides silently

        d = defaults  # Shorthand

        # ── Core calculations ──

        # Annual energy output (kWh)
        # predicted_irradiance is kWh/m²/day of solar resource
        # Peak Sun Hours (PSH) = irradiance in kWh/m²/day
        annual_output_kwh = (
            predicted_irradiance_kwh_m2_day  # PSH (hours equivalent)
            * d.system_capacity_kw  # System size
            * d.performance_ratio  # System efficiency
            * 365  # Days per year
        )

        # Total system cost
        total_cost_usd = (
            d.system_capacity_kw
            * 1000  # Convert kW to W
            * (d.cost_per_watt_usd + d.installation_cost_per_watt_usd)
        )

        # --- Sub-cost breakdown ---
        module_cost = total_cost_usd * d.module_cost_fraction
        inverter_cost = total_cost_usd * d.inverter_cost_fraction
        bos_cost = total_cost_usd * d.bos_cost_fraction
        soft_cost = total_cost_usd * d.soft_cost_fraction

        # Annual savings
        annual_savings_usd = annual_output_kwh * d.electricity_tariff_usd

        # Annual maintenance
        annual_maintenance_usd = d.maintenance_cost_annual_per_kw * d.system_capacity_kw

        # Net annual savings
        net_annual_savings_usd = annual_savings_usd - annual_maintenance_usd

        # Simple payback period (years)
        if net_annual_savings_usd > 0:
            simple_payback_years = total_cost_usd / net_annual_savings_usd
        else:
            simple_payback_years = float("inf")

        # 25-year cumulative savings with degradation
        cumulative_savings_usd = 0.0
        yearly_breakdown = []
        for year in range(1, d.system_lifetime_years + 1):
            degradation_factor = (1 - d.annual_degradation_rate) ** (year - 1)
            year_output = annual_output_kwh * degradation_factor
            year_savings = (
                year_output * d.electricity_tariff_usd
            ) - annual_maintenance_usd
            cumulative_savings_usd += year_savings
            yearly_breakdown.append(
                {
                    "year": year,
                    "output_kwh": round(year_output, 1),
                    "savings_usd": round(year_savings, 2),
                    "cumulative_savings_usd": round(cumulative_savings_usd, 2),
                }
            )

        # Net ROI over lifetime
        lifetime_roi_pct = (
            ((cumulative_savings_usd - total_cost_usd) / total_cost_usd) * 100
            if total_cost_usd > 0
            else 0.0
        )

        # LCOE (Levelized Cost of Energy)
        lcoe = _calculate_lcoe(
            total_cost_usd=total_cost_usd,
            annual_output_kwh=annual_output_kwh,
            annual_maintenance_usd=annual_maintenance_usd,
            degradation_rate=d.annual_degradation_rate,
            discount_rate=d.discount_rate,
            lifetime_years=d.system_lifetime_years,
        )

        result = {
            "annual_output_kwh": round(annual_output_kwh, 1),
            "total_system_cost_usd": round(total_cost_usd, 2),
            "annual_savings_usd": round(annual_savings_usd, 2),
            "annual_maintenance_usd": round(annual_maintenance_usd, 2),
            "net_annual_savings_usd": round(net_annual_savings_usd, 2),
            "simple_payback_years": round(simple_payback_years, 1),
            "lifetime_savings_usd": round(cumulative_savings_usd, 2),
            "lifetime_roi_pct": round(lifetime_roi_pct, 1),
            "lcoe_usd_per_kwh": round(lcoe, 4),
            "cost_breakdown": {
                "module_cost_usd": round(module_cost, 2),
                "inverter_cost_usd": round(inverter_cost, 2),
                "bos_cost_usd": round(bos_cost, 2),
                "soft_cost_usd": round(soft_cost, 2),
                "annual_maintenance_usd": round(annual_maintenance_usd, 2),
                "sources": {
                    "module_cost": "IRENA Renewable Power Generation Costs 2024, Table 3.2",
                    "inverter_cost": "IRENA 2024, Appendix — inverter share 10-15%",
                    "bos_cost": "IRENA 2024 — BOS includes mounting, wiring, combiner boxes",
                    "soft_cost": "IRENA 2024 — permitting, design, labor, installer margin",
                    "maintenance": "IRENA 2024 — $10-20/kW/year O&M global average",
                },
            },
            "output_calculation": {
                "formula": "Annual kWh = PSH × System_kW × Performance_Ratio × 365",
                "peak_sun_hours": round(predicted_irradiance_kwh_m2_day, 4),
                "system_capacity_kw": d.system_capacity_kw,
                "performance_ratio": d.performance_ratio,
                "performance_ratio_components": {
                    "inverter_efficiency": "96-98% (IRENA 2024)",
                    "wiring_losses": "1-3%",
                    "soiling_losses": "2-5% (location dependent)",
                    "temperature_losses": "3-8% (climate dependent)",
                    "mismatch_losses": "1-2%",
                    "combined_ratio": d.performance_ratio,
                    "source": "IEC 61724-1 — Performance Ratio definition",
                },
                "steps": [
                    f"1. Peak Sun Hours (PSH) = {predicted_irradiance_kwh_m2_day:.4f} kWh/m²/day (from prediction)",
                    f"2. Daily output = {predicted_irradiance_kwh_m2_day:.4f} × {d.system_capacity_kw} kW × {d.performance_ratio} = {predicted_irradiance_kwh_m2_day * d.system_capacity_kw * d.performance_ratio:.2f} kWh/day",
                    f"3. Annual output = {predicted_irradiance_kwh_m2_day * d.system_capacity_kw * d.performance_ratio:.2f} × 365 = {annual_output_kwh:.1f} kWh/year",
                ],
            },
            "system_parameters": {
                "capacity_kw": d.system_capacity_kw,
                "panel_efficiency": d.panel_efficiency,
                "performance_ratio": d.performance_ratio,
                "lifetime_years": d.system_lifetime_years,
                "degradation_rate_pct": d.annual_degradation_rate * 100,
                "electricity_tariff_usd_kwh": d.electricity_tariff_usd,
                "region": region,
            },
            "yearly_breakdown": yearly_breakdown,
            "sources": [
                "IRENA Renewable Power Generation Costs 2024",
                "IEA World Energy Outlook 2024",
                "Industry standard 0.5%/year degradation rate",
            ],
            "disclaimer": (
                "This is an estimate based on climatological averages and "
                "standardized cost data. Actual results will vary based on "
                "local conditions, installer pricing, government incentives, "
                "and equipment selection. Consult a certified solar installer "
                "for accurate project-specific quotes."
            ),
        }

        logger.info(
            "Financial analysis: %.1f kWh/yr, $%.0f cost, %.1f yr payback, %.1f%% ROI",
            annual_output_kwh,
            total_cost_usd,
            simple_payback_years,
            lifetime_roi_pct,
        )

        return result


def _calculate_lcoe(
    total_cost_usd: float,
    annual_output_kwh: float,
    annual_maintenance_usd: float,
    degradation_rate: float,
    discount_rate: float,
    lifetime_years: int,
) -> float:
    """
    Calculate Levelized Cost of Energy (LCOE).

    LCOE = (Sum of discounted costs) / (Sum of discounted energy output)

    This is the standard LCOE formula used by IRENA and IEA.
    """
    total_discounted_cost = total_cost_usd  # Initial investment at year 0
    total_discounted_energy = 0.0

    for year in range(1, lifetime_years + 1):
        discount_factor = (1 + discount_rate) ** year
        degradation_factor = (1 - degradation_rate) ** (year - 1)

        total_discounted_cost += annual_maintenance_usd / discount_factor
        total_discounted_energy += (
            annual_output_kwh * degradation_factor
        ) / discount_factor

    if total_discounted_energy > 0:
        return total_discounted_cost / total_discounted_energy
    return 0.0
