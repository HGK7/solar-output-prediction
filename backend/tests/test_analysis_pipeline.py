"""Unit tests for services.analysis_pipeline — fake services, no network."""

import pytest

from config import Config
from services.analysis_pipeline import (
    AnalysisContext,
    AnalysisPipeline,
    infer_region_from_coordinates,
)
from services.nasa_service import NASAServiceError
from utils.validation import ValidationError


# --- Fakes -----------------------------------------------------------------

LOCATION_PAYLOAD = {
    "location": {"lat": 26.9, "lon": 75.8},
    "annual_averages": {
        "Temperature": 25.0,
        "Humidity": 40.0,
        "Wind Speed": 3.0,
        "Clear Sky Irradiance": 6.5,
    },
    "monthly": {"GHI": [5.0] * 12},
    "annual_ghi": 5.8,
    "data_provenance": {"source": "fake"},
}


class FakeNASA:
    def __init__(self, fail=False):
        self.fail = fail

    def fetch_solar_parameters(self, lat, lon):
        if self.fail:
            raise NASAServiceError("NASA POWER unreachable")
        return LOCATION_PAYLOAD


class FakePrediction:
    def predict(self, payload, data_source=None):
        return {
            "prediction": 5.5,
            "unit": "kWh/m²/day",
            "model_used": payload.get("model"),
            "input_features": {
                "Temperature": {"value": 25.0, "unit": "°C"},
            },
        }


class FakePhysics:
    def simulate(self, physics_input):
        return {"status": "ok", "annual_energy_kwh": 7000.0}


class FakeFinancial:
    def calculate(self, predicted_irradiance_kwh_m2_day, overrides):
        return {
            "annual_output_kwh": 7500.0,
            "simple_payback_years": 5.0,
            "system_parameters": {
                "region": overrides.get("region", "global"),
                "capacity_kw": overrides.get("system_capacity_kw", 5.0),
                "electricity_tariff_usd_kwh": 0.1,
            },
            "output_calculation": {"steps": ["step1"]},
        }


class FakeGeometry:
    def calculate(self, lat, lon, system_capacity_kw=5.0):
        return {"optimal_tilt_deg": round(abs(lat), 1)}


class FakeExplanation:
    def explain(self, explanation_input):
        return {"summary": "explained", "citations": []}


class QuotaExhaustedExplanation:
    def explain(self, explanation_input):
        raise ValueError("429 RESOURCE_EXHAUSTED: quota exceeded")


class FakeRAG:
    def ask(self, question):
        raise AssertionError("RAG must not be called when grounding disabled")


@pytest.fixture
def pipeline(monkeypatch):
    monkeypatch.setattr(Config, "ENABLE_RAG_GROUNDING", False)
    return AnalysisPipeline(
        nasa_service=FakeNASA(),
        prediction_service=FakePrediction(),
        physics_service=FakePhysics(),
        financial_service=FakeFinancial(),
        geometry_service=FakeGeometry(),
        explanation_service=FakeExplanation(),
        rag_service=FakeRAG(),
    )


def kinds(results):
    return [r.kind for r in results]


# --- run_stages ordering ---------------------------------------------------


def test_run_stages_coords_full_order(pipeline):
    ctx = AnalysisContext(lat=26.9, lon=75.8)
    result_kinds = kinds(pipeline.run_stages(ctx))
    assert result_kinds == [
        "stage",  # location loading
        "location",
        "stage",  # prediction loading
        "prediction",
        "stage",  # physics loading
        "physics",
        "stage",  # financial loading
        "financial",
        "geometry",
        "stage",  # explanation loading
        "explanation",
        "done",
    ]


def test_run_stages_manual_features_skips_physics_and_geometry(pipeline):
    ctx = AnalysisContext(
        features=LOCATION_PAYLOAD["annual_averages"], data_source="manual"
    )
    result_kinds = kinds(pipeline.run_stages(ctx))
    assert "location" not in result_kinds
    assert "physics" not in result_kinds
    assert "geometry" not in result_kinds
    assert result_kinds[-2:] == ["explanation", "done"]


def test_run_stages_nasa_failure_yields_location_error(monkeypatch, pipeline):
    pipeline._nasa = FakeNASA(fail=True)
    results = list(pipeline.run_stages(AnalysisContext(lat=26.9, lon=75.8)))
    assert results[-1].kind == "error"
    assert results[-1].payload["stage"] == "location"
    assert "NASA" in results[-1].payload["error"]


def test_run_stages_llm_failure_degrades_explanation_not_pipeline(pipeline):
    """LLM quota/service errors must not block numeric results (non-blocking)."""
    pipeline._explanation = QuotaExhaustedExplanation()
    results = list(pipeline.run_stages(AnalysisContext(lat=26.9, lon=75.8)))
    result_kinds = [r.kind for r in results]
    assert "error" not in result_kinds
    assert result_kinds[-1] == "done"
    explanation = next(r for r in results if r.kind == "explanation")
    assert explanation.payload.get("degraded") is True
    assert "unavailable" in explanation.payload["error"].lower()
    prediction = next(r for r in results if r.kind == "prediction")
    assert prediction.payload["prediction"] == 5.5


def test_run_stages_infers_india_region(pipeline):
    ctx = AnalysisContext(lat=26.9, lon=75.8)
    financial = next(
        r for r in pipeline.run_stages(ctx) if r.kind == "financial"
    )
    assert financial.payload["system_parameters"]["region"] == "india"


# --- collect_analyze -------------------------------------------------------


def test_collect_analyze_assembles_response(pipeline):
    result = pipeline.collect_analyze(AnalysisContext(lat=26.9, lon=75.8))
    assert result["prediction"]["prediction"] == 5.5
    assert result["physics_simulation"]["status"] == "ok"
    assert result["financial"]["annual_output_kwh"] == 7500.0
    assert result["explanation"]["summary"] == "explained"
    assert result["geometry"] == {"optimal_tilt_deg": 26.9}
    assert result["location"] == LOCATION_PAYLOAD["location"]
    delta = result["ml_vs_physics_delta"]
    assert delta["delta_kwh"] == 500.0
    assert delta["delta_pct"] == pytest.approx(7.14, abs=0.01)


def test_collect_analyze_raises_on_nasa_error(pipeline):
    pipeline._nasa = FakeNASA(fail=True)
    with pytest.raises(NASAServiceError):
        pipeline.collect_analyze(AnalysisContext(lat=26.9, lon=75.8))


# --- AnalysisContext -------------------------------------------------------


def test_from_json_requires_coords_or_features():
    with pytest.raises(ValidationError):
        AnalysisContext.from_json({})


def test_from_json_manual_features_sets_manual_source():
    ctx = AnalysisContext.from_json({"features": {"Temperature": 25}})
    assert ctx.data_source == "manual"
    assert not ctx.has_coords


def test_from_json_coords_sets_nasa_source():
    ctx = AnalysisContext.from_json({"lat": 26.9, "lon": 75.8, "model": "svm"})
    assert ctx.has_coords
    assert ctx.data_source == "nasa_api"
    assert ctx.model == "svm"


# --- region inference ------------------------------------------------------


@pytest.mark.parametrize(
    "lat,lon,expected",
    [
        (26.9, 75.8, "india"),
        (40.0, -100.0, "usa"),
        (48.0, 10.0, "europe"),
        (-30.0, 140.0, "global"),
    ],
)
def test_infer_region_from_coordinates(lat, lon, expected):
    assert infer_region_from_coordinates(lat, lon) == expected
