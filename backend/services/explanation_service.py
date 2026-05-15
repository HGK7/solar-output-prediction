"""
Explanation service — uses Gemini LLM to *explain* (never generate)
deterministic predictions from the ML models.

Architectural rule:  LLMs EXPLAIN predictions.  They do NOT produce them.

Uses the google-genai SDK (google.genai) — the current, supported SDK.
The deprecated google-generativeai package is NOT used.
"""

import hashlib
import json
import os

from cachetools import TTLCache

from config import Config
from utils.logging import logger

_PROMPT_DIR = os.path.join(Config.BASE_DIR, "prompts")

# Cache explanations for 1 hour (3600 seconds). Max 128 entries.
# Key is hash of (prediction, features, model) — same inputs = same explanation.
_explanation_cache: TTLCache = TTLCache(maxsize=128, ttl=3600)


class ExplanationService:
    """Generates structured natural-language explanations of predictions."""

    def __init__(self):
        self._client = None  # Lazy init
        self._prompt_template: str = self._load_prompt("explanation_prompt.txt")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def explain(self, prediction_result: dict) -> dict:
        """
        Return a structured JSON explanation for a completed prediction.

        `prediction_result` is the dict returned by PredictionService.predict().
        Uses caching to avoid redundant API calls for identical predictions.
        """
        # Build cache key from deterministic inputs
        cache_key = self._build_cache_key(prediction_result)

        if cache_key in _explanation_cache:
            logger.info("Explanation cache hit for key: %s", cache_key[:16])
            return _explanation_cache[cache_key]

        client = self._get_client()
        prompt = self._format_prompt(prediction_result)

        from google.genai import types

        logger.info("Requesting explanation from Gemini …")
        response = client.models.generate_content(
            model=Config.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=self._system_instruction(),
                temperature=Config.LLM_TEMPERATURE,
                response_mime_type="application/json",
            ),
        )

        result = self._parse_response(response.text)
        result = self._normalize_key_drivers(result, prediction_result)

        # Cache the result
        _explanation_cache[cache_key] = result
        logger.info("Cached explanation for key: %s", cache_key[:16])

        return result

    @staticmethod
    def _build_cache_key(prediction_result: dict) -> str:
        """
        Build a deterministic cache key from prediction inputs.
        Same prediction + features + model = same explanation.
        """
        key_data = {
            "schema_version": 2,
            "prediction": round(prediction_result.get("prediction", 0), 4),
            "model": prediction_result.get("model_name", ""),
            "features": {
                k: round(v, 2) if isinstance(v, (int, float)) else v
                for k, v in prediction_result.get("features_used", {}).items()
            },
        }
        key_json = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_json.encode()).hexdigest()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _get_client(self):
        if self._client is None:
            from google import genai

            if not Config.GEMINI_API_KEY:
                raise RuntimeError(
                    "GEMINI_API_KEY is not configured. "
                    "Set it in your .env file to enable explanations."
                )
            self._client = genai.Client(api_key=Config.GEMINI_API_KEY)
        return self._client

    @staticmethod
    def _system_instruction() -> str:
        return (
            "You are a solar energy analysis expert embedded in a decision-support "
            "system. You EXPLAIN predictions made by deterministic ML models. "
            "You must NEVER modify, invent, or regenerate numeric predictions. "
            "Always respond in valid JSON matching the requested schema."
        )

    def _format_prompt(self, result: dict) -> str:
        """Interpolate the explanation prompt template with prediction data."""
        input_features = result.get("input_features", {})
        feature_importance = result.get("feature_importance", {})

        features_lines = []
        for name, info in input_features.items():
            features_lines.append(f"  - {name}: {info['value']} {info['unit']}")

        importance_lines = []
        for name, coef in feature_importance.items():
            importance_lines.append(f"  - {name}: {coef}")

        key_driver_lines = []
        for name, info in input_features.items():
            coef = feature_importance.get(name)
            key_driver_lines.append(
                f"  - {name}: value={info.get('value')} {info.get('unit', '')}, coefficient={coef if coef is not None else 'N/A'}"
            )

        # Financial context (optional — present in /analyze responses)
        financial = result.get("financial")
        if financial:
            financial_context = (
                f"  - Annual Output: {financial.get('annual_output_kwh', 'N/A')} kWh\n"
                f"  - System Cost: ${financial.get('total_system_cost_usd', 'N/A')}\n"
                f"  - Annual Savings: ${financial.get('annual_savings_usd', 'N/A')}\n"
                f"  - Payback Period: {financial.get('simple_payback_years', 'N/A')} years\n"
                f"  - 25-Year ROI: {financial.get('lifetime_roi_pct', 'N/A')}%\n"
                f"  - LCOE: ${financial.get('lcoe_usd_per_kwh', 'N/A')}/kWh"
            )
        else:
            financial_context = "  No financial data provided for this prediction."

        system_context = result.get("system_context", {})
        if system_context:
            system_context_text = "\n".join(
                [f"  - {key}: {value}" for key, value in system_context.items()]
            )
        else:
            system_context_text = "  No explicit system context provided."

        if financial and financial.get("output_calculation"):
            calculation_steps = financial.get("output_calculation", {}).get("steps", [])
            calculation_trace = "\n".join([f"  - {step}" for step in calculation_steps])
            if not calculation_trace:
                calculation_trace = "  No deterministic calculation steps available."
        else:
            calculation_trace = "  No deterministic calculation steps available."

        document_grounding = result.get("document_grounding", {})
        grounding_text = str(document_grounding.get("answer", "")).strip()
        if grounding_text:
            document_grounding_context = grounding_text
        else:
            document_grounding_context = "Insufficient information"

        citations = document_grounding.get("citations", [])
        if isinstance(citations, list) and citations:
            document_citations = "\n".join(
                [
                    f"  - {citation.get('source', 'unknown')}"
                    + (
                        f" ({citation.get('section')})"
                        if citation.get("section")
                        else ""
                    )
                    for citation in citations
                ]
            )
        else:
            document_citations = "  No citations available."

        template_kwargs = dict(
            prediction=result["prediction"],
            unit=result["unit"],
            model_name=result["model_used"],
            error_estimate=result.get("error_estimate", "N/A"),
            features_formatted="\n".join(features_lines),
            feature_importance="\n".join(importance_lines) or "  Not available",
            key_driver_context="\n".join(key_driver_lines) or "  Not available",
            rmse=result.get("metrics", {}).get("rmse", "N/A"),
            r2=result.get("metrics", {}).get("r2", "N/A"),
            financial_context=financial_context,
            system_context=system_context_text,
            calculation_trace=calculation_trace,
            document_grounding_context=document_grounding_context,
            document_citations=document_citations,
        )
        return self._prompt_template.format(**template_kwargs)

    @staticmethod
    def _load_prompt(filename: str) -> str:
        path = os.path.join(_PROMPT_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    @staticmethod
    def _parse_response(content: str) -> dict:
        """Parse LLM response, extracting JSON from possible markdown fences."""
        text = content.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first and last fence lines
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)

        try:
            parsed = json.loads(text)
            parsed.setdefault("explanation_summary", "")
            parsed.setdefault("key_drivers", [])
            parsed.setdefault("physical_interpretation", "")
            parsed.setdefault("uncertainty_notes", "")
            parsed.setdefault("risk_factors", [])
            parsed.setdefault("confidence_assessment", "medium")
            parsed.setdefault("financial_insight", None)
            parsed.setdefault("methodology_trace", [])
            parsed.setdefault("input_trace", [])
            parsed.setdefault("calculation_trace", [])
            parsed.setdefault("assumptions_used", [])
            parsed.setdefault("grounded_context", "")
            parsed.setdefault("citations", [])

            def _trim_text(value, max_len=320):
                if not isinstance(value, str):
                    return value
                normalized = " ".join(value.split())
                if len(normalized) <= max_len:
                    return normalized
                return normalized[: max_len - 1].rstrip() + "…"

            parsed["explanation_summary"] = _trim_text(
                parsed.get("explanation_summary", ""), max_len=240
            )
            parsed["physical_interpretation"] = _trim_text(
                parsed.get("physical_interpretation", ""), max_len=280
            )
            parsed["uncertainty_notes"] = _trim_text(
                parsed.get("uncertainty_notes", ""), max_len=220
            )
            parsed["financial_insight"] = _trim_text(
                parsed.get("financial_insight"), max_len=240
            )
            parsed["grounded_context"] = _trim_text(
                parsed.get("grounded_context", ""), max_len=320
            )

            if isinstance(parsed.get("risk_factors"), list):
                parsed["risk_factors"] = [
                    _trim_text(item, max_len=120)
                    for item in parsed["risk_factors"][:3]
                    if isinstance(item, str)
                ]

            if isinstance(parsed.get("key_drivers"), list):
                compact_drivers = []
                for driver in parsed["key_drivers"][:3]:
                    if isinstance(driver, dict):
                        compact_drivers.append(
                            {
                                **driver,
                                "impact": _trim_text(
                                    driver.get("impact", ""), max_len=140
                                ),
                            }
                        )
                parsed["key_drivers"] = compact_drivers

            if isinstance(parsed.get("citations"), list):
                parsed["citations"] = parsed["citations"][:4]

            return parsed
        except json.JSONDecodeError:
            logger.warning("LLM returned non-JSON explanation; wrapping as raw text.")
            return {
                "explanation_summary": text[:500],
                "key_drivers": [],
                "physical_interpretation": text,
                "uncertainty_notes": "Unable to parse structured response from LLM.",
                "risk_factors": [],
                "confidence_assessment": "low",
                "methodology_trace": [],
                "input_trace": [],
                "calculation_trace": [],
                "assumptions_used": [],
                "grounded_context": "",
                "citations": [],
                "raw_response": True,
            }

    @staticmethod
    def _normalize_key_drivers(parsed: dict, prediction_result: dict) -> dict:
        """Ensure key drivers use physical feature values/units and optional coefficient."""
        input_features = prediction_result.get("input_features", {})
        feature_importance = prediction_result.get("feature_importance", {})

        canonical_by_lower = {}
        for feature_name, feature_info in input_features.items():
            canonical_by_lower[feature_name.lower()] = {
                "feature": feature_name,
                "value": feature_info.get("value"),
                "unit": feature_info.get("unit", ""),
                "coefficient": feature_importance.get(feature_name),
            }

        normalized = []
        raw_drivers = parsed.get("key_drivers", []) if isinstance(parsed, dict) else []
        if isinstance(raw_drivers, list):
            for driver in raw_drivers[:3]:
                if not isinstance(driver, dict):
                    continue

                raw_feature = str(driver.get("feature", "")).strip()
                if not raw_feature:
                    continue

                canonical = canonical_by_lower.get(raw_feature.lower())
                if not canonical:
                    continue

                normalized.append(
                    {
                        "feature": canonical["feature"],
                        "value": canonical["value"],
                        "unit": canonical["unit"],
                        "coefficient": canonical["coefficient"],
                        "impact": driver.get(
                            "impact", "Influences predicted irradiance."
                        ),
                    }
                )

        if not normalized:
            sorted_features = sorted(
                feature_importance.items(), key=lambda item: abs(item[1]), reverse=True
            )
            for feature_name, coefficient in sorted_features:
                canonical = canonical_by_lower.get(feature_name.lower())
                if not canonical:
                    continue

                normalized.append(
                    {
                        "feature": canonical["feature"],
                        "value": canonical["value"],
                        "unit": canonical["unit"],
                        "coefficient": coefficient,
                        "impact": "Influences predicted irradiance based on model coefficient.",
                    }
                )

                if len(normalized) >= 3:
                    break

        parsed["key_drivers"] = normalized[:3]
        return parsed
