"""Programmatic validator for Phase 2 (PySAM integration and endpoint contracts).

Usage:
    python scripts/validate_phase2.py --base-url http://localhost:5000
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any

import requests


class ValidationFailure(Exception):
    """Raised when a validation contract fails."""


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationFailure(message)


def _print_ok(message: str) -> None:
    print(f"[OK] {message}")


def validate_health(base_url: str) -> None:
    response = requests.get(f"{base_url}/health", timeout=20)
    _assert(response.status_code == 200, f"/health returned {response.status_code}")

    payload = response.json()
    _assert("status" in payload, "health payload missing 'status'")
    _assert("models_loaded" in payload, "health payload missing 'models_loaded'")
    _assert("rag_chunks" in payload, "health payload missing 'rag_chunks'")
    _print_ok("/health contract is valid")


def validate_analyze(base_url: str) -> dict[str, Any]:
    payload = {
        "lat": 27.5,
        "lon": 71.6,
        "financial_overrides": {
            "region": "global",
            "system_capacity_kw": 5.0,
            "panel_efficiency": 0.20,
            "performance_ratio": 0.78,
            "electricity_tariff_usd": 0.12,
        },
        "panel_technology": "monocrystalline",
        "installation_type": "rooftop",
    }

    response = requests.post(f"{base_url}/analyze", json=payload, timeout=90)
    _assert(response.status_code == 200, f"/analyze returned {response.status_code}")

    body = response.json()
    _assert("prediction" in body, "analyze payload missing 'prediction'")
    _assert("financial" in body, "analyze payload missing 'financial'")
    _assert("explanation" in body, "analyze payload missing 'explanation'")
    _assert(
        "physics_simulation" in body, "analyze payload missing 'physics_simulation'"
    )

    physics = body["physics_simulation"]
    _assert(isinstance(physics, dict), "physics_simulation must be an object")
    _assert("status" in physics, "physics_simulation missing 'status'")

    if physics.get("status") == "ok":
        _assert(
            isinstance(physics.get("annual_energy_kwh"), (int, float)),
            "physics_simulation.annual_energy_kwh must be numeric when status=ok",
        )
        _assert(
            isinstance(physics.get("monthly_energy_kwh"), list),
            "physics_simulation.monthly_energy_kwh must be a list when status=ok",
        )
        _print_ok("/analyze returns physics_simulation=status:ok with expected fields")
    elif physics.get("status") in {"error", "skipped"}:
        _assert(
            "error" in physics or "reason" in physics,
            "physics_simulation should include 'error' or 'reason' when not ok",
        )
        _print_ok("/analyze returns non-ok physics_simulation with rationale")
    else:
        raise ValidationFailure(
            f"Unexpected physics_simulation.status: {physics.get('status')}"
        )

    if "ml_vs_physics_delta" in body:
        delta = body["ml_vs_physics_delta"]
        for key in [
            "ml_annual_output_kwh",
            "physics_annual_output_kwh",
            "delta_kwh",
            "delta_pct",
        ]:
            _assert(key in delta, f"ml_vs_physics_delta missing '{key}'")
        _print_ok("/analyze returns ml_vs_physics_delta contract")

    return body


def validate_stream_plan(base_url: str) -> None:
    params = {
        "lat": 27.5,
        "lon": 71.6,
        "model": "linear_regression",
        "region": "global",
        "system_capacity_kw": 5.0,
        "panel_efficiency": 0.20,
        "performance_ratio": 0.78,
        "electricity_tariff_usd": 0.12,
        "panel_technology": "monocrystalline",
        "installation_type": "rooftop",
    }

    response = requests.get(
        f"{base_url}/stream-plan",
        params=params,
        stream=True,
        timeout=(10, 120),
    )
    _assert(
        response.status_code == 200, f"/stream-plan returned {response.status_code}"
    )

    seen_events: set[str] = set()
    current_event = "message"

    for raw_line in response.iter_lines(decode_unicode=True):
        if raw_line is None:
            continue

        line = raw_line.strip()
        if not line:
            continue

        if line.startswith("event: "):
            current_event = line.removeprefix("event: ").strip()
            seen_events.add(current_event)
            continue

        if line.startswith("data: "):
            data_payload = line.removeprefix("data: ")
            parsed = json.loads(data_payload)
            if current_event == "physics":
                _assert(
                    isinstance(parsed, dict) and "status" in parsed,
                    "physics SSE payload must include status",
                )
            if current_event == "done":
                break

    response.close()

    required_events = {
        "location",
        "prediction",
        "physics",
        "financial",
        "explanation",
        "done",
    }
    missing = required_events - seen_events
    _assert(not missing, f"/stream-plan missing events: {sorted(missing)}")
    _print_ok("/stream-plan includes physics stage and completes")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate Phase 2 integration contracts"
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:5000",
        help="Backend base URL (default: http://localhost:5000)",
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    try:
        validate_health(base_url)
        validate_analyze(base_url)
        validate_stream_plan(base_url)
    except requests.RequestException as exc:
        print(f"[FAIL] Network error: {exc}")
        print("Start backend first, e.g. python app.py")
        return 1
    except ValidationFailure as exc:
        print(f"[FAIL] {exc}")
        return 1
    except json.JSONDecodeError as exc:
        print(f"[FAIL] Invalid JSON encountered: {exc}")
        return 1

    print("[PASS] Phase 2 validation completed successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())
