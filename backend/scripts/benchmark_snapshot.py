#!/usr/bin/env python3
"""Reproduce Zenith's estimate for the real-world reference plants shown on the landing page.

Runs the same Analysis Pipeline as /stream-plan (NASA POWER → ML Prediction → physics →
financial → geometry) with the explanation stage stubbed out, so no LLM is called.
Paste the printed values into client/solar-dashboard/context/zenith-preferences-context.tsx
(REFERENCE_SITES) whenever models or the financial engine change.

Usage (from backend/):
    python scripts/benchmark_snapshot.py
"""

from __future__ import annotations

import json
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from config import Config  # noqa: E402
from models.loader import ModelManager  # noqa: E402
from services.analysis_pipeline import AnalysisContext, AnalysisPipeline  # noqa: E402
from services.financial_service import FinancialService  # noqa: E402
from services.nasa_service import NASAService  # noqa: E402
from services.physics_simulation_service import PhysicsSimulationService  # noqa: E402
from services.prediction_service import PredictionService  # noqa: E402
from services.solar_geometry_service import SolarGeometryService  # noqa: E402

# Planner inputs each preset sends (Engineering Setup, documented capacity).
SITES = {
    "cial-kochi": {"lat": 10.1533, "lon": 76.3882, "system_capacity_kw": 1000, "panel_technology": "monocrystalline", "installation_type": "ground-mounted", "region": "india", "electricity_tariff_usd": 0.08},
    "vatican-paul-vi": {"lat": 41.9007, "lon": 12.4547, "system_capacity_kw": 220, "panel_technology": "monocrystalline", "installation_type": "rooftop", "region": "europe", "electricity_tariff_usd": 0.25},
    "yulara-desert-gardens": {"lat": -25.2069, "lon": 130.971, "system_capacity_kw": 1058.4, "panel_technology": "polycrystalline", "installation_type": "ground-mounted", "region": "global", "electricity_tariff_usd": 0.12},
    "gujarat-canal-top": {"lat": 23.0811, "lon": 72.3011, "system_capacity_kw": 1000, "panel_technology": "polycrystalline", "installation_type": "ground-mounted", "region": "india", "electricity_tariff_usd": 0.08},
}
PANEL_EFFICIENCY = {"monocrystalline": 0.2, "polycrystalline": 0.17, "thin-film": 0.11}


class _NoExplanation:
    def explain(self, *_args, **_kwargs):
        raise RuntimeError("explanation skipped for snapshot")


def main() -> int:
    Config.ENABLE_RAG_GROUNDING = False
    manager = ModelManager()
    manager.initialize()
    pipeline = AnalysisPipeline(
        nasa_service=NASAService(),
        prediction_service=PredictionService(manager),
        physics_service=PhysicsSimulationService(),
        financial_service=FinancialService(),
        geometry_service=SolarGeometryService(),
        explanation_service=_NoExplanation(),
        rag_service=None,
    )
    out = {}
    for site_id, site in SITES.items():
        params = {
            **site,
            "model": "hist_gradient_boosting",
            "panel_efficiency": PANEL_EFFICIENCY[site["panel_technology"]],
            "performance_ratio": 0.78,
            "grid_connection": "grid-tied",
            "include_incentives": "true",
            "planning_scale": "industrial",
        }
        result = pipeline.collect_analyze(AnalysisContext.from_query(params))
        monthly = result.get("monthly") or {}
        out[site_id] = {
            "annual_output_kwh": result["financial"]["annual_output_kwh"],
            "prediction": result["prediction"]["prediction"],
            "error_estimate": result["prediction"].get("error_estimate"),
            "ood_warning": result["prediction"].get("ood_warning"),
            "annual_averages": result.get("annual_averages") or result.get("location", {}).get("annual_averages"),
            "optimal_tilt_deg": result["geometry"]["orientation"]["optimal_tilt_deg"],
            "azimuth_direction": result["geometry"]["orientation"]["azimuth_direction"],
            "monthly": {
                m: {
                    "irr": round(v.get("Solar Irradiance", 0), 2),
                    "clear": round(v.get("Clear Sky Irradiance", 0), 2),
                    "temp": round(v.get("Temperature", 0), 1),
                }
                for m, v in monthly.items()
            },
        }
    print(json.dumps(out, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
