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
from google import genai
from google.genai import types

from config import Config
from utils.logging import logger

_PROMPT_DIR = os.path.join(Config.BASE_DIR, "prompts")

# Cache explanations for 1 hour (3600 seconds). Max 128 entries.
# Key is hash of (prediction, features, model) — same inputs = same explanation.
_explanation_cache: TTLCache = TTLCache(maxsize=128, ttl=3600)


class ExplanationService:
    """Generates structured natural-language explanations of predictions."""

    def __init__(self):
        self._client: genai.Client | None = None  # Lazy init
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

    def _get_client(self) -> genai.Client:
        if self._client is None:
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
        features_lines = []
        for name, info in result.get("input_features", {}).items():
            features_lines.append(f"  - {name}: {info['value']} {info['unit']}")

        importance_lines = []
        for name, coef in result.get("feature_importance", {}).items():
            importance_lines.append(f"  - {name}: {coef}")

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

        template_kwargs = dict(
            prediction=result["prediction"],
            unit=result["unit"],
            model_name=result["model_used"],
            error_estimate=result.get("error_estimate", "N/A"),
            features_formatted="\n".join(features_lines),
            feature_importance="\n".join(importance_lines) or "  Not available",
            rmse=result.get("metrics", {}).get("rmse", "N/A"),
            r2=result.get("metrics", {}).get("r2", "N/A"),
            financial_context=financial_context,
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
            return json.loads(text)
        except json.JSONDecodeError:
            logger.warning("LLM returned non-JSON explanation; wrapping as raw text.")
            return {
                "explanation_summary": text[:500],
                "key_drivers": [],
                "physical_interpretation": text,
                "uncertainty_notes": "Unable to parse structured response from LLM.",
                "risk_factors": [],
                "confidence_assessment": "low",
                "raw_response": True,
            }
