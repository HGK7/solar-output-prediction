"""Tests for PortfolioInsightsService deterministic stats (no LLM calls)."""

import pytest

from services.portfolio_insights_service import PortfolioInsightsService


def site(name, output, savings, payback, capacity=5.0, region="india"):
    return {
        "name": name,
        "region": region,
        "capacity_kw": capacity,
        "annual_output_kwh": output,
        "annual_savings_usd": savings,
        "payback_years": payback,
    }


def test_clean_sites_drops_invalid_entries():
    cleaned = PortfolioInsightsService._clean_sites(
        [
            site("Valid", 7000, 560, 7.1),
            {"name": "No numbers"},
            site("", 7000, 560, 7.1),
            site("Zero output", 0, 100, 5.0),
            "not-a-dict",
        ]
    )
    assert [s["name"] for s in cleaned] == ["Valid"]


def test_portfolio_stats_identifies_extremes():
    stats = PortfolioInsightsService._portfolio_stats(
        [
            site("Jaipur", 8000, 640, 6.5, capacity=5.0),
            site("Berlin", 4000, 1000, 9.8, capacity=5.0),
            site("Phoenix", 9000, 1440, 5.2, capacity=6.0),
        ]
    )
    assert stats["site_count"] == 3
    assert stats["highest_output_site"]["name"] == "Phoenix"
    assert stats["lowest_output_site"]["name"] == "Berlin"
    assert stats["fastest_payback_site"]["name"] == "Phoenix"
    assert stats["slowest_payback_site"]["name"] == "Berlin"
    assert stats["total_annual_output_kwh"] == 21000.0
    jaipur = next(s for s in stats["sites"] if s["name"] == "Jaipur")
    assert jaipur["specific_yield_kwh_per_kw"] == 1600.0


def test_summarize_requires_two_sites():
    service = PortfolioInsightsService()
    with pytest.raises(ValueError):
        service.summarize([site("Only one", 7000, 560, 7.1)])
