"""System input validation: enums, numeric bounds, and planning-scale guardrails."""

import pytest

from services.analysis_pipeline import AnalysisContext
from utils.validation import ValidationError, validate_system_inputs


def test_query_strings_are_coerced_and_normalised():
    out = validate_system_inputs(
        {
            "region": "India",
            "grid_connection": "hybrid",
            "planning_scale": "homeowner",
            "system_capacity_kw": "12.5",
            "battery_capacity_kwh": "16",
            "include_incentives": "false",
            "monthly_bill_usd": "",
            "unknown_field": "ignored",
        }
    )
    assert out == {
        "region": "india",
        "grid_connection": "hybrid",
        "planning_scale": "homeowner",
        "system_capacity_kw": 12.5,
        "battery_capacity_kwh": 16.0,
        "include_incentives": False,
    }


@pytest.mark.parametrize(
    "field,value",
    [
        ("region", "mars"),
        ("grid_connection", "wireless"),
        ("installation_type", "balloon"),
        ("panel_technology", "perovskite"),
        ("planning_scale", "mega"),
        ("include_incentives", "maybe"),
        ("system_capacity_kw", "abc"),
        ("system_capacity_kw", "nan"),
        ("system_capacity_kw", 0),
        ("performance_ratio", 1.5),
        ("electricity_tariff_usd", -0.1),
        ("monthly_bill_usd", -5),
        ("available_roof_area_m2", "inf"),
    ],
)
def test_rejects_bad_values_with_field(field, value):
    with pytest.raises(ValidationError) as exc:
        validate_system_inputs({field: value})
    assert exc.value.field == field


@pytest.mark.parametrize(
    "scale,kw",
    [("homeowner", 60.0), ("small_business", 5.0), ("industrial", 40.0)],
)
def test_capacity_must_fit_planning_scale(scale, kw):
    with pytest.raises(ValidationError) as exc:
        validate_system_inputs({"planning_scale": scale, "system_capacity_kw": kw})
    assert exc.value.field == "system_capacity_kw"


@pytest.mark.parametrize(
    "scale,kw",
    [("homeowner", 12.5), ("small_business", 70.0), ("industrial", 230.0)],
)
def test_capacity_inside_scale_passes(scale, kw):
    out = validate_system_inputs({"planning_scale": scale, "system_capacity_kw": kw})
    assert out["system_capacity_kw"] == kw


def test_battery_far_larger_than_array_is_rejected():
    with pytest.raises(ValidationError) as exc:
        validate_system_inputs(
            {"grid_connection": "off-grid", "system_capacity_kw": 5, "battery_capacity_kwh": 500}
        )
    assert exc.value.field == "battery_capacity_kwh"


def test_grid_tied_drops_battery():
    out = validate_system_inputs(
        {"grid_connection": "grid-tied", "system_capacity_kw": 5, "battery_capacity_kwh": 16}
    )
    assert "battery_capacity_kwh" not in out


def test_from_query_keeps_bill_roof_and_scale():
    ctx = AnalysisContext.from_query(
        {
            "lat": "10.4787",
            "lon": "76.2737",
            "region": "india",
            "system_capacity_kw": "12.5",
            "monthly_bill_usd": "115",
            "available_roof_area_m2": "52",
            "planning_scale": "homeowner",
        }
    )
    assert ctx.financial_overrides["monthly_bill_usd"] == 115.0
    assert ctx.financial_overrides["available_roof_area_m2"] == 52.0
    assert ctx.financial_overrides["planning_scale"] == "homeowner"


def test_from_query_rejects_scale_mismatch():
    with pytest.raises(ValidationError):
        AnalysisContext.from_query(
            {
                "lat": 10.0,
                "lon": 76.0,
                "planning_scale": "homeowner",
                "system_capacity_kw": 60,
            }
        )
