"""
Financial, Sizing, and Storage calculation service — deterministic analysis of solar
installation economics, bill-to-kW sizing, roof area constraints, LFP battery storage,
and regional subsidies (India PM Surya Ghar / 40% AD, US 30% IRA ITC, Europe VAT/grants).

All calculations are deterministic. LLMs are never involved (ADR-0001).
Cost parameters are sourced from IRENA, NREL, IEA, MNRE, and public databases.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any

from utils.logging import logger

# Standard 400 Wp monocrystalline panel (2.0 m2 net module area)
_PANEL_WATT_PEAK = 400.0
_PANEL_NET_AREA_M2 = 2.0
# Gross roof area per kW including fire setbacks / inter-row spacing (GCR ~0.77 for rooftop)
_ROOF_AREA_M2_PER_KW = 6.5
# INR to USD reference exchange rate for PM Surya Ghar CFA conversion
_INR_PER_USD = 83.5


@dataclass
class FinancialDefaults:
    """Region-aware default parameters for financial calculations."""

    # System parameters
    system_capacity_kw: float = 5.0
    panel_efficiency: float = 0.20
    performance_ratio: float = 0.78
    system_lifetime_years: int = 25

    # Cost parameters (USD)
    cost_per_watt_usd: float = 0.75
    installation_cost_per_watt_usd: float = 0.30
    maintenance_cost_annual_per_kw: float = 15.0

    # LFP Battery Storage installed cost ($/kWh nominal)
    battery_cost_per_kwh_usd: float = 350.0

    # Sub-cost breakdown fractions (of base PV system cost) — IRENA 2024 Appendix
    module_cost_fraction: float = 0.45
    inverter_cost_fraction: float = 0.12
    bos_cost_fraction: float = 0.18
    soft_cost_fraction: float = 0.25

    # Degradation
    annual_degradation_rate: float = 0.005

    # Electricity tariff (USD/kWh)
    electricity_tariff_usd: float = 0.12

    # Discount rate for LCOE
    discount_rate: float = 0.07


REGIONAL_DEFAULTS: dict[str, dict[str, float]] = {
    "india": {
        "cost_per_watt_usd": 0.55,
        "installation_cost_per_watt_usd": 0.25,
        "electricity_tariff_usd": 0.08,
        "discount_rate": 0.08,
        "battery_cost_per_kwh_usd": 280.0,
    },
    "usa": {
        "cost_per_watt_usd": 1.00,
        "installation_cost_per_watt_usd": 0.80,
        "electricity_tariff_usd": 0.16,
        "discount_rate": 0.05,
        "battery_cost_per_kwh_usd": 450.0,
    },
    "europe": {
        "cost_per_watt_usd": 0.85,
        "installation_cost_per_watt_usd": 0.60,
        "electricity_tariff_usd": 0.25,
        "discount_rate": 0.04,
        "battery_cost_per_kwh_usd": 400.0,
    },
    "global": {
        "electricity_tariff_usd": 0.12,
        "battery_cost_per_kwh_usd": 350.0,
    },
}


class FinancialService:
    """Deterministic financial, sizing, battery storage, and subsidy engine."""

    @staticmethod
    def size_system(
        predicted_irradiance_kwh_m2_day: float,
        monthly_bill_usd: float | None = None,
        monthly_consumption_kwh: float | None = None,
        electricity_tariff_usd: float = 0.12,
        performance_ratio: float = 0.78,
        available_roof_area_m2: float | None = None,
        target_offset_ratio: float = 1.0,
    ) -> dict[str, Any]:
        """Deterministically size a PV array from monthly bill/consumption and roof area."""
        tariff = max(0.01, float(electricity_tariff_usd or 0.12))
        psh = max(0.5, float(predicted_irradiance_kwh_m2_day or 4.5))
        pr = max(0.4, min(0.95, float(performance_ratio or 0.78)))

        inferred_monthly_kwh: float | None = None
        if monthly_consumption_kwh is not None and float(monthly_consumption_kwh) > 0:
            inferred_monthly_kwh = float(monthly_consumption_kwh)
        elif monthly_bill_usd is not None and float(monthly_bill_usd) > 0:
            inferred_monthly_kwh = float(monthly_bill_usd) / tariff

        recommended_kw: float | None = None
        if inferred_monthly_kwh is not None and inferred_monthly_kwh > 0:
            daily_target_kwh = (inferred_monthly_kwh / 30.0) * max(
                0.2, min(1.5, float(target_offset_ratio))
            )
            daily_yield_per_kw = psh * pr
            recommended_kw = round(max(0.5, daily_target_kwh / daily_yield_per_kw), 2)

        max_by_roof_kw: float | None = None
        if available_roof_area_m2 is not None and float(available_roof_area_m2) > 0:
            max_by_roof_kw = round(
                float(available_roof_area_m2) / _ROOF_AREA_M2_PER_KW, 2
            )

        effective_kw = recommended_kw or 5.0
        required_roof_m2 = round(effective_kw * _ROOF_AREA_M2_PER_KW, 1)
        num_panels = int(math.ceil((effective_kw * 1000.0) / _PANEL_WATT_PEAK))
        roof_constrained = bool(
            max_by_roof_kw is not None and effective_kw > max_by_roof_kw
        )

        return {
            "inferred_monthly_consumption_kwh": (
                round(inferred_monthly_kwh, 1)
                if inferred_monthly_kwh is not None
                else None
            ),
            "recommended_capacity_kw": recommended_kw,
            "max_capacity_by_roof_kw": max_by_roof_kw,
            "required_roof_area_m2": required_roof_m2,
            "required_roof_area_sqft": round(required_roof_m2 * 10.7639, 0),
            "estimated_panels": num_panels,
            "roof_area_constrained": roof_constrained,
        }

    @staticmethod
    def calculate(
        predicted_irradiance_kwh_m2_day: float,
        overrides: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Calculate deterministic financial, battery, sizing, and subsidy metrics."""
        defaults = FinancialDefaults()
        raw_overrides = dict(overrides or {})

        region = str(raw_overrides.pop("region", "global") or "global").lower()
        grid_connection = str(
            raw_overrides.pop("grid_connection", "grid-tied") or "grid-tied"
        ).lower()
        installation_type = str(
            raw_overrides.pop("installation_type", "rooftop") or "rooftop"
        ).lower()
        planning_scale = str(
            raw_overrides.pop("planning_scale", "homeowner") or "homeowner"
        ).lower()

        include_incentives_raw = raw_overrides.pop("include_incentives", True)
        if isinstance(include_incentives_raw, str):
            include_incentives = include_incentives_raw.lower() not in (
                "false",
                "0",
                "no",
            )
        else:
            include_incentives = bool(include_incentives_raw)

        battery_capacity_override = raw_overrides.pop("battery_capacity_kwh", None)
        monthly_bill_usd = raw_overrides.pop("monthly_bill_usd", None)
        monthly_consumption_kwh = raw_overrides.pop("monthly_consumption_kwh", None)
        available_roof_area_m2 = raw_overrides.pop("available_roof_area_m2", None)

        regional = REGIONAL_DEFAULTS.get(region, REGIONAL_DEFAULTS["global"])
        for key, val in regional.items():
            if hasattr(defaults, key):
                setattr(defaults, key, val)

        for key, val in raw_overrides.items():
            if hasattr(defaults, key) and val is not None:
                try:
                    setattr(defaults, key, type(getattr(defaults, key))(val))
                except (TypeError, ValueError):
                    pass

        # Clamp core parameters to safe physical/financial bounds
        defaults.system_capacity_kw = max(0.5, min(100000.0, defaults.system_capacity_kw))
        defaults.performance_ratio = max(0.40, min(0.95, defaults.performance_ratio))
        defaults.electricity_tariff_usd = max(0.01, min(5.00, defaults.electricity_tariff_usd))

        d = defaults

        # ── 1. Installation type BOS adjustment ──
        bos_multiplier = 1.0
        if installation_type == "carport":
            bos_multiplier = 1.15  # Elevated steel canopy structure
        elif installation_type == "ground-mounted":
            bos_multiplier = 1.05  # Ground racking & trenching

        # ── 2. Grid connection & LFP Battery Storage model ──
        battery_kwh = 0.0
        utilization_factor = 1.0
        inverter_bos_premium_usd = 0.0

        if grid_connection == "hybrid":
            if battery_capacity_override is not None and float(battery_capacity_override) > 0:
                battery_kwh = float(battery_capacity_override)
            else:
                # Default 2.0 kWh LFP storage per kW solar (4-6h evening peak coverage)
                battery_kwh = round(d.system_capacity_kw * 2.0, 1)
            # Hybrid inverter & bimodal transfer switch premium ($120/kW)
            inverter_bos_premium_usd = d.system_capacity_kw * 120.0
            # Higher self-consumption + TOU peak arbitrage uplift
            utilization_factor = 1.06
        elif grid_connection == "off-grid":
            if battery_capacity_override is not None and float(battery_capacity_override) > 0:
                battery_kwh = float(battery_capacity_override)
            else:
                # Default 3.5 kWh LFP storage per kW solar (24h+ autonomy)
                battery_kwh = round(d.system_capacity_kw * 3.5, 1)
            # Off-grid standalone inverter + charge controller + genset interface ($220/kW)
            inverter_bos_premium_usd = d.system_capacity_kw * 220.0
            # Off-grid dump-load curtailment when battery is full on sunny days
            utilization_factor = 0.88
        else:
            grid_connection = "grid-tied"
            if battery_capacity_override is not None and float(battery_capacity_override) > 0:
                battery_kwh = float(battery_capacity_override)

        battery_gross_cost_usd = round(battery_kwh * d.battery_cost_per_kwh_usd, 2)
        battery_replacement_cost_usd = (
            round(battery_gross_cost_usd * 0.60, 2) if battery_kwh > 0 else 0.0
        )

        # ── 3. Annual energy output (kWh) ──
        raw_annual_output_kwh = (
            predicted_irradiance_kwh_m2_day
            * d.system_capacity_kw
            * d.performance_ratio
            * 365.0
        )
        annual_output_kwh = raw_annual_output_kwh * utilization_factor

        # ── 4. Gross System Cost (PV + BOS + Battery) ──
        base_pv_cost_usd = (
            d.system_capacity_kw
            * 1000.0
            * (d.cost_per_watt_usd + d.installation_cost_per_watt_usd * bos_multiplier)
        )
        total_cost_usd = base_pv_cost_usd + inverter_bos_premium_usd + battery_gross_cost_usd

        module_cost = base_pv_cost_usd * d.module_cost_fraction
        inverter_cost = (
            base_pv_cost_usd * d.inverter_cost_fraction + inverter_bos_premium_usd
        )
        bos_cost = base_pv_cost_usd * d.bos_cost_fraction
        soft_cost = base_pv_cost_usd * d.soft_cost_fraction

        # ── 5. Regional Subsidies & Incentives ──
        incentive_amount_usd = 0.0
        incentive_summary = "No subsidy applied"
        if include_incentives:
            incentive_amount_usd, incentive_summary = _calculate_regional_incentive(
                region=region,
                capacity_kw=d.system_capacity_kw,
                gross_cost_usd=total_cost_usd,
                planning_scale=planning_scale,
            )

        net_system_cost_usd = max(0.0, total_cost_usd - incentive_amount_usd)

        # ── 6. Savings, Maintenance & Payback ──
        annual_savings_usd = annual_output_kwh * d.electricity_tariff_usd
        monthly_savings_usd = annual_savings_usd / 12.0
        annual_maintenance_usd = (
            d.maintenance_cost_annual_per_kw * d.system_capacity_kw
            + (battery_kwh * 3.5 if battery_kwh > 0 else 0.0)
        )
        net_annual_savings_usd = annual_savings_usd - annual_maintenance_usd

        if net_annual_savings_usd > 0:
            simple_payback_years = net_system_cost_usd / net_annual_savings_usd
        else:
            simple_payback_years = float("inf")

        # ── 7. 25-Year Cumulative Cashflow (with degradation & Year-12 battery replacement) ──
        cumulative_savings_usd = 0.0
        yearly_breakdown = []
        for year in range(1, d.system_lifetime_years + 1):
            degradation_factor = (1.0 - d.annual_degradation_rate) ** (year - 1)
            year_output = annual_output_kwh * degradation_factor
            replacement_outflow = battery_replacement_cost_usd if year == 12 else 0.0
            year_savings = (
                (year_output * d.electricity_tariff_usd)
                - annual_maintenance_usd
                - replacement_outflow
            )
            cumulative_savings_usd += year_savings
            yearly_breakdown.append(
                {
                    "year": year,
                    "output_kwh": round(year_output, 1),
                    "savings_usd": round(year_savings, 2),
                    "cumulative_savings_usd": round(cumulative_savings_usd, 2),
                }
            )

        lifetime_roi_pct = (
            ((cumulative_savings_usd - net_system_cost_usd) / net_system_cost_usd) * 100.0
            if net_system_cost_usd > 0
            else 0.0
        )

        lcoe = _calculate_lcoe(
            total_cost_usd=net_system_cost_usd,
            annual_output_kwh=annual_output_kwh,
            annual_maintenance_usd=annual_maintenance_usd,
            degradation_rate=d.annual_degradation_rate,
            discount_rate=d.discount_rate,
            lifetime_years=d.system_lifetime_years,
            battery_replacement_cost_usd=battery_replacement_cost_usd,
        )

        # ── 8. Sizing & Roof Area Guidance ──
        sizing = FinancialService.size_system(
            predicted_irradiance_kwh_m2_day=predicted_irradiance_kwh_m2_day,
            monthly_bill_usd=monthly_bill_usd,
            monthly_consumption_kwh=monthly_consumption_kwh,
            electricity_tariff_usd=d.electricity_tariff_usd,
            performance_ratio=d.performance_ratio,
            available_roof_area_m2=available_roof_area_m2,
        )
        required_roof_for_selected_kw = round(
            d.system_capacity_kw * _ROOF_AREA_M2_PER_KW, 1
        )
        max_by_roof = sizing["max_capacity_by_roof_kw"]
        roof_constrained = bool(
            max_by_roof is not None and d.system_capacity_kw > max_by_roof
        )
        sizing_guidance = {
            **sizing,
            "required_roof_area_m2": required_roof_for_selected_kw,
            "required_roof_area_sqft": round(required_roof_for_selected_kw * 10.7639, 0),
            "roof_area_constrained": roof_constrained,
        }

        result = {
            "annual_output_kwh": round(annual_output_kwh, 1),
            "total_system_cost_usd": round(total_cost_usd, 2),
            "incentive_amount_usd": round(incentive_amount_usd, 2),
            "incentive_summary": incentive_summary,
            "net_system_cost_usd": round(net_system_cost_usd, 2),
            "annual_savings_usd": round(annual_savings_usd, 2),
            "monthly_savings_usd": round(monthly_savings_usd, 2),
            "annual_maintenance_usd": round(annual_maintenance_usd, 2),
            "net_annual_savings_usd": round(net_annual_savings_usd, 2),
            "simple_payback_years": round(simple_payback_years, 1),
            "lifetime_savings_usd": round(cumulative_savings_usd, 2),
            "lifetime_roi_pct": round(lifetime_roi_pct, 1),
            "lcoe_usd_per_kwh": round(lcoe, 4),
            "battery_summary": {
                "included": battery_kwh > 0,
                "capacity_kwh": round(battery_kwh, 1),
                "chemistry": "LFP (LiFePO4)",
                "gross_cost_usd": battery_gross_cost_usd,
                "replacement_year": 12 if battery_kwh > 0 else None,
                "replacement_cost_usd": battery_replacement_cost_usd,
                "self_consumption_pct": (
                    85.0
                    if grid_connection == "hybrid"
                    else (100.0 if grid_connection == "off-grid" else 38.0)
                ),
            },
            "sizing_guidance": sizing_guidance,
            "cost_breakdown": {
                "module_cost_usd": round(module_cost, 2),
                "inverter_cost_usd": round(inverter_cost, 2),
                "bos_cost_usd": round(bos_cost, 2),
                "soft_cost_usd": round(soft_cost, 2),
                "battery_cost_usd": battery_gross_cost_usd,
                "incentive_credit_usd": round(incentive_amount_usd, 2),
                "annual_maintenance_usd": round(annual_maintenance_usd, 2),
                "sources": {
                    "module_cost": "IRENA Renewable Power Generation Costs 2024, Table 3.2",
                    "inverter_cost": "IRENA 2024, Appendix — string/hybrid inverter share",
                    "bos_cost": "IRENA 2024 — BOS mounting, wiring, combiner boxes",
                    "soft_cost": "IRENA 2024 — permitting, design, labor, installer margin",
                    "battery_cost": "NREL ATB / BNEF 2024–2026 LFP residential/C&I storage benchmarks",
                    "incentives": "MNRE PM Surya Ghar (India), IRC Sec. 25D/48E (USA), EU VAT/FiT directives",
                },
            },
            "output_calculation": {
                "formula": "Annual kWh = PSH × System_kW × Performance_Ratio × 365 × Grid_Utilization",
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
                    f"1. Peak Sun Hours (PSH) = {predicted_irradiance_kwh_m2_day:.4f} kWh/m²/day (from ML prediction)",
                    f"2. Daily output = {predicted_irradiance_kwh_m2_day:.4f} × {d.system_capacity_kw} kW × {d.performance_ratio} = {predicted_irradiance_kwh_m2_day * d.system_capacity_kw * d.performance_ratio:.2f} kWh/day",
                    f"3. Annual output ({grid_connection}) = {annual_output_kwh:.1f} kWh/year",
                    f"4. Net CAPEX = ${total_cost_usd:,.0f} gross − ${incentive_amount_usd:,.0f} ({incentive_summary}) = ${net_system_cost_usd:,.0f}",
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
                "grid_connection": grid_connection,
                "installation_type": installation_type,
                "battery_capacity_kwh": round(battery_kwh, 1),
                "include_incentives": include_incentives,
            },
            "yearly_breakdown": yearly_breakdown,
            "sources": [
                "IRENA Renewable Power Generation Costs 2024",
                "NREL US Solar Photovoltaic System and Energy Storage Cost Benchmarks",
                "MNRE PM Surya Ghar: Muft Bijli Yojana (2024–2026) & US IRA Sec. 25D/48E",
            ],
            "disclaimer": (
                "Estimates use 38-year NASA POWER satellite climatology and standardized "
                "IRENA/NREL cost models. Actual output, structural roof capacity, and "
                "subsidy eligibility require verification by a licensed solar engineer."
            ),
        }

        logger.info(
            "Financial analysis (%s, %s): %.1f kWh/yr, $%.0f net ($%.0f gross), %.1f yr payback",
            region,
            grid_connection,
            annual_output_kwh,
            net_system_cost_usd,
            total_cost_usd,
            simple_payback_years,
        )

        return result


def _calculate_regional_incentive(
    region: str,
    capacity_kw: float,
    gross_cost_usd: float,
    planning_scale: str = "homeowner",
) -> tuple[float, str]:
    """Compute deterministic regional solar subsidy / tax credit in USD."""
    if region == "india":
        # Residential rooftop (<= 10 kW): PM Surya Ghar: Muft Bijli Yojana (2024–2026)
        # ₹30,000/kW up to 2 kW, ₹18,000 for 3rd kW, capped at ₹78,000 for >= 3 kW
        if capacity_kw <= 10.0 and planning_scale != "industrial":
            if capacity_kw <= 2.0:
                cfa_inr = 30000.0 * capacity_kw
            elif capacity_kw <= 3.0:
                cfa_inr = 60000.0 + 18000.0 * (capacity_kw - 2.0)
            else:
                cfa_inr = 78000.0
            subsidy_usd = min(gross_cost_usd * 0.60, cfa_inr / _INR_PER_USD)
            return round(subsidy_usd, 2), f"India PM Surya Ghar CFA (₹{cfa_inr:,.0f})"
        # C&I (>10 kW or industrial): Section 32 40% Accelerated Depreciation tax shield (~10% net present value)
        ad_shield_usd = gross_cost_usd * 0.10
        return round(ad_shield_usd, 2), "India C&I Sec. 32 Accelerated Depreciation (40% WDV shield)"

    if region == "usa":
        # US IRA Section 25D (Residential) / Section 48E (Commercial) 30% Federal Clean Energy Credit
        itc_usd = gross_cost_usd * 0.30
        label = (
            "US Federal Clean Energy Credit (30% IRA Sec. 25D)"
            if capacity_kw <= 20.0
            else "US Commercial Investment Tax Credit (30% IRA Sec. 48E)"
        )
        return round(itc_usd, 2), label

    if region == "europe":
        # EU 0% VAT exemption (Germany Nullsteuersatz / UK / Austria) + municipal grant (~15% effective savings)
        vat_grant_usd = gross_cost_usd * 0.15
        return round(vat_grant_usd, 2), "EU 0% Solar VAT Exemption / Capital Grant (15%)"

    return 0.0, "Global baseline (no regional subsidy applied)"


def _calculate_lcoe(
    total_cost_usd: float,
    annual_output_kwh: float,
    annual_maintenance_usd: float,
    degradation_rate: float,
    discount_rate: float,
    lifetime_years: int,
    battery_replacement_cost_usd: float = 0.0,
) -> float:
    """Calculate Levelized Cost of Energy (LCOE) including Year-12 battery replacement."""
    total_discounted_cost = total_cost_usd
    total_discounted_energy = 0.0

    for year in range(1, lifetime_years + 1):
        discount_factor = (1.0 + discount_rate) ** year
        degradation_factor = (1.0 - degradation_rate) ** (year - 1)
        extra_cost = battery_replacement_cost_usd if year == 12 else 0.0

        total_discounted_cost += (annual_maintenance_usd + extra_cost) / discount_factor
        total_discounted_energy += (
            annual_output_kwh * degradation_factor
        ) / discount_factor

    if total_discounted_energy > 0:
        return total_discounted_cost / total_discounted_energy
    return 0.0
