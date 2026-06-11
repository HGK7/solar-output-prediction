"""
Portfolio insights service — LLM summary of the user's saved analysis runs.

ADR-0001 boundary: the LLM only restates and compares numbers provided in
the request. It never computes, estimates, or invents figures. Site stats
(best/worst, totals) are computed deterministically here and handed to the
LLM pre-labelled.
"""

import json

from config import Config
from utils.logging import logger

_MAX_SITES = 25

_SYSTEM_INSTRUCTION = (
    "You are a solar portfolio analyst. You receive pre-computed metrics for "
    "a user's saved solar sites. You ONLY restate and compare the numbers "
    "given — never invent, recompute, or extrapolate figures. Respond in "
    "valid JSON matching the requested schema."
)

_PROMPT_TEMPLATE = """Summarize this solar site portfolio for the dashboard.

## Pre-computed portfolio metrics (the only numbers you may use)
{portfolio_json}

## Output JSON schema (strict)
{{
  "headline": "One-sentence portfolio takeaway (max 160 chars).",
  "highlights": [
    "2-4 short bullet insights comparing sites, each citing only the numbers above."
  ],
  "watch_out": "One short caution or null if nothing stands out."
}}
"""


class PortfolioInsightsService:
    """Grounded LLM commentary over deterministic portfolio stats."""

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not Config.GEMINI_API_KEY:
                raise RuntimeError(
                    "GEMINI_API_KEY is not configured. Set it in .env to "
                    "enable portfolio insights."
                )
            from google import genai

            self._client = genai.Client(api_key=Config.GEMINI_API_KEY)
        return self._client

    def summarize(self, sites: list[dict]) -> dict:
        """Build deterministic stats then ask the LLM for grounded commentary."""
        cleaned = self._clean_sites(sites)
        if len(cleaned) < 2:
            raise ValueError("At least 2 saved sites with runs are required.")

        stats = self._portfolio_stats(cleaned)

        client = self._get_client()
        from google.genai import types

        prompt = _PROMPT_TEMPLATE.format(
            portfolio_json=json.dumps(stats, indent=2)
        )
        logger.info("Portfolio insights for %d sites", len(cleaned))
        response = client.models.generate_content(
            model=Config.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM_INSTRUCTION,
                temperature=Config.LLM_TEMPERATURE,
                response_mime_type="application/json",
            ),
        )

        parsed = self._parse_response(response.text)
        parsed["stats"] = stats
        return parsed

    @staticmethod
    def _clean_sites(sites: list[dict]) -> list[dict]:
        cleaned = []
        for site in sites[:_MAX_SITES]:
            if not isinstance(site, dict):
                continue
            name = str(site.get("name", "")).strip()[:80]
            try:
                annual_output = float(site["annual_output_kwh"])
                annual_savings = float(site["annual_savings_usd"])
                payback = float(site["payback_years"])
                capacity = float(site.get("capacity_kw", 0))
            except (KeyError, TypeError, ValueError):
                continue
            if not name or annual_output <= 0:
                continue
            cleaned.append(
                {
                    "name": name,
                    "region": str(site.get("region", "global"))[:20],
                    "capacity_kw": capacity,
                    "annual_output_kwh": round(annual_output, 1),
                    "annual_savings_usd": round(annual_savings, 2),
                    "payback_years": round(payback, 1),
                }
            )
        return cleaned

    @staticmethod
    def _portfolio_stats(sites: list[dict]) -> dict:
        """Deterministic portfolio aggregates — the LLM's only number source."""
        by_output = sorted(
            sites, key=lambda s: s["annual_output_kwh"], reverse=True
        )
        by_payback = sorted(sites, key=lambda s: s["payback_years"])
        total_output = round(sum(s["annual_output_kwh"] for s in sites), 1)
        total_savings = round(sum(s["annual_savings_usd"] for s in sites), 2)
        total_capacity = round(sum(s["capacity_kw"] for s in sites), 1)

        # Specific yield normalizes output by capacity for fair comparison
        for site in sites:
            site["specific_yield_kwh_per_kw"] = (
                round(site["annual_output_kwh"] / site["capacity_kw"], 1)
                if site["capacity_kw"] > 0
                else None
            )

        return {
            "site_count": len(sites),
            "total_capacity_kw": total_capacity,
            "total_annual_output_kwh": total_output,
            "total_annual_savings_usd": total_savings,
            "highest_output_site": by_output[0],
            "lowest_output_site": by_output[-1],
            "fastest_payback_site": by_payback[0],
            "slowest_payback_site": by_payback[-1],
            "sites": sites,
        }

    @staticmethod
    def _parse_response(content: str) -> dict:
        text = content.strip()
        if text.startswith("```"):
            lines = [
                line
                for line in text.split("\n")
                if not line.strip().startswith("```")
            ]
            text = "\n".join(lines)
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            logger.warning("Portfolio insights returned non-JSON; wrapping.")
            return {
                "headline": text[:160],
                "highlights": [],
                "watch_out": None,
                "raw_response": True,
            }
        parsed.setdefault("headline", "")
        parsed.setdefault("highlights", [])
        parsed.setdefault("watch_out", None)
        if isinstance(parsed["highlights"], list):
            parsed["highlights"] = [
                " ".join(str(h).split())[:220] for h in parsed["highlights"][:4]
            ]
        else:
            parsed["highlights"] = []
        parsed["headline"] = " ".join(str(parsed["headline"]).split())[:200]
        return parsed
