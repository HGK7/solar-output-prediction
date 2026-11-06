"""Tests for Ticket 02 — Multi-Climate ML Ensemble, OOD Guard, and Practical Solar Financial/Storage Engine."""

import pytest

from models.loader import ModelManager
from services.financial_service import FinancialService
from services.prediction_service import PredictionService


# --- 1. FinancialService: Bill/Load-to-kW Sizing & Roof Area Constraints ---


def test_financial_sizing_assistant_and_roof_constraint():
    # $120/mo bill at $0.12/kWh -> 1000 kWh/mo -> ~33.33 kWh/day.
    # At PSH=5.0, PR=0.80 -> 4.0 kWh/kW/day -> ~8.33 kW recommended.
    # Available roof area 25 m2 (at 6.5 m2/kW pitched roof -> max ~3.8 kW) -> roof_area_constrained = True!
    res = FinancialService.calculate(
        predicted_irradiance_kwh_m2_day=5.0,
        overrides={
            "region": "usa",
            "system_capacity_kw": 8.0,
            "performance_ratio": 0.80,
            "electricity_tariff_usd": 0.12,
            "monthly_bill_usd": 120.0,
            "available_roof_area_m2": 25.0,
        },
    )
    assert res["monthly_savings_usd"] == pytest.approx(res["annual_savings_usd"] / 12.0, abs=0.05)
    guidance = res["sizing_guidance"]
    assert guidance["recommended_capacity_kw"] == pytest.approx(8.3, abs=0.5)
    assert guidance["roof_area_constrained"] is True
    assert guidance["max_capacity_by_roof_kw"] < 8.0
    assert guidance["required_roof_area_m2"] > 25.0


# --- 2. FinancialService: Grid Connection & LFP Battery Economics ---


def test_financial_grid_connection_modes_affect_capex_and_battery():
    grid_tied = FinancialService.calculate(
        predicted_irradiance_kwh_m2_day=5.5,
        overrides={
            "region": "india",
            "system_capacity_kw": 5.0,
            "grid_connection": "grid-tied",
            "include_incentives": False,
        },
    )
    hybrid = FinancialService.calculate(
        predicted_irradiance_kwh_m2_day=5.5,
        overrides={
            "region": "india",
            "system_capacity_kw": 5.0,
            "grid_connection": "hybrid",
            "include_incentives": False,
        },
    )
    off_grid = FinancialService.calculate(
        predicted_irradiance_kwh_m2_day=5.5,
        overrides={
            "region": "india",
            "system_capacity_kw": 5.0,
            "grid_connection": "off-grid",
            "include_incentives": False,
        },
    )

    assert grid_tied["battery_summary"]["included"] is False
    assert hybrid["battery_summary"]["included"] is True
    assert hybrid["battery_summary"]["capacity_kwh"] >= 5.0
    assert off_grid["battery_summary"]["included"] is True
    assert off_grid["battery_summary"]["capacity_kwh"] > hybrid["battery_summary"]["capacity_kwh"]

    # Capex increases: grid-tied < hybrid < off-grid
    assert grid_tied["total_system_cost_usd"] < hybrid["total_system_cost_usd"]
    assert hybrid["total_system_cost_usd"] < off_grid["total_system_cost_usd"]


# --- 3. FinancialService: Regional Subsidies (India PM Surya Ghar, USA 30% ITC, Europe) ---


def test_financial_regional_subsidies_india_usa_europe():
    # India 3 kW residential -> PM Surya Ghar max ₹78,000 (~$934 USD)
    india_3kw = FinancialService.calculate(
        predicted_irradiance_kwh_m2_day=5.5,
        overrides={
            "region": "india",
            "system_capacity_kw": 3.0,
            "include_incentives": True,
        },
    )
    assert india_3kw["incentive_amount_usd"] == pytest.approx(934.0, abs=15.0)
    assert india_3kw["net_system_cost_usd"] == pytest.approx(
        india_3kw["total_system_cost_usd"] - india_3kw["incentive_amount_usd"], abs=0.05
    )
    assert "PM Surya Ghar" in india_3kw["incentive_summary"]

    # USA 5 kW -> 30% Federal Clean Energy Credit (IRA Sec. 25D)
    usa_5kw = FinancialService.calculate(
        predicted_irradiance_kwh_m2_day=5.0,
        overrides={
            "region": "usa",
            "system_capacity_kw": 5.0,
            "include_incentives": True,
        },
    )
    assert usa_5kw["incentive_amount_usd"] == pytest.approx(
        usa_5kw["total_system_cost_usd"] * 0.30, abs=0.05
    )
    assert "30%" in usa_5kw["incentive_summary"]

    # Europe 5 kW -> 15% VAT exemption / capital grant
    eu_5kw = FinancialService.calculate(
        predicted_irradiance_kwh_m2_day=4.0,
        overrides={
            "region": "europe",
            "system_capacity_kw": 5.0,
            "include_incentives": True,
        },
    )
    assert eu_5kw["incentive_amount_usd"] == pytest.approx(
        eu_5kw["total_system_cost_usd"] * 0.15, abs=0.05
    )


# --- 4. ML Ensemble Models & Out-of-Distribution (OOD) Guard ---


def test_ml_ensemble_models_and_ood_detection():
    manager = ModelManager()
    manager.initialize()
    models = manager.list_models()
    assert "linear_regression" in models
    assert "svm" in models
    assert "random_forest" in models
    assert "hist_gradient_boosting" in models

    pred_service = PredictionService(manager)
    # Normal in-distribution climate input
    normal_res = pred_service.predict(
        {
            "Temperature": 26.0,
            "Humidity": 35.0,
            "Wind Speed": 2.5,
            "Clear Sky Irradiance": 6.2,
            "model": "hist_gradient_boosting",
        }
    )
    assert normal_res["model_used"] == "hist_gradient_boosting"
    assert normal_res["prediction"] > 0
    assert normal_res["ood_warning"] is False

    # Extreme polar/sub-zero climate input -> triggers OOD warning
    extreme_res = pred_service.predict(
        {
            "Temperature": -25.0,
            "Humidity": 95.0,
            "Wind Speed": 18.0,
            "Clear Sky Irradiance": 1.2,
            "model": "random_forest",
        }
    )
    assert extreme_res["model_used"] == "random_forest"
    assert extreme_res["ood_warning"] is True
    assert len(extreme_res["ood_details"]) > 0
