"""Tests for RecommendationService — real deterministic services, no network."""

from services.financial_service import FinancialService
from services.recommendation_service import RecommendationService
from services.solar_geometry_service import SolarGeometryService


def make_service() -> RecommendationService:
    return RecommendationService(
        financial_service=FinancialService(),
        geometry_service=SolarGeometryService(),
    )


def test_build_with_coords_includes_orientation():
    recs = make_service().build(
        predicted_irradiance_kwh_m2_day=5.5,
        financial_overrides={"region": "india", "system_capacity_kw": 5.0},
        lat=26.9,
        lon=75.8,
    )
    ids = [r["id"] for r in recs]
    assert ids[0] == "orientation"
    orientation = recs[0]
    assert orientation["metrics"]["optimal_tilt_deg"] == 26.9
    assert orientation["metrics"]["azimuth"] == "Due South"
    assert orientation["source_document"] == "solar_panel_efficiency.md"


def test_build_without_coords_skips_orientation():
    recs = make_service().build(predicted_irradiance_kwh_m2_day=5.5)
    ids = [r["id"] for r in recs]
    assert "orientation" not in ids
    assert "grid_parity" in ids


def test_maintenance_upside_present_below_well_maintained_pr():
    recs = make_service().build(
        predicted_irradiance_kwh_m2_day=5.5,
        financial_overrides={"performance_ratio": 0.78},
    )
    maintenance = next(r for r in recs if r["id"] == "maintenance")
    assert maintenance["metrics"]["extra_annual_savings_usd"] > 0
    assert maintenance["metrics"]["achievable_performance_ratio"] == 0.85


def test_maintenance_upside_absent_when_already_well_maintained():
    recs = make_service().build(
        predicted_irradiance_kwh_m2_day=5.5,
        financial_overrides={"performance_ratio": 0.9},
    )
    assert all(r["id"] != "maintenance" for r in recs)


def test_every_recommendation_cites_a_source_document():
    recs = make_service().build(
        predicted_irradiance_kwh_m2_day=5.5, lat=26.9, lon=75.8
    )
    assert recs
    for rec in recs:
        assert rec["source_document"].endswith(".md")
        assert rec["detail"]
        assert rec["title"]
