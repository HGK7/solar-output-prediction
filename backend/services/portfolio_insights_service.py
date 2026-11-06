"""
Portfolio insights service — LLM summary of the user's saved analysis runs.

ADR-0001 boundary: the LLM only restates and compares numbers provided in
the request. It never computes, estimates, or invents figures. Site stats
(best/worst, totals) are computed deterministically here and handed to the
LLM pre-labelled.
"""

import json
import os

from config import Config
from utils.logging import logger

_MAX_SITES = 25
_PROMPT_DIR = os.path.join(Config.BASE_DIR, "prompts")

_SYSTEM_INSTRUCTION = (
    "You are a solar portfolio analyst. You receive pre-computed metrics for "
    "a user's saved solar sites. You ONLY restate and compare the numbers "
    "given — never invent, recompute, or extrapolate figures. Respond in "
    "valid JSON matching the requested schema."
)


class PortfolioInsightsService:
    """Grounded LLM commentary over deterministic portfolio stats."""

    def __init__(self):
        self._client = None
        prompt_path = os.path.join(_PROMPT_DIR, "portfolio_insights_prompt.txt")
        with open(prompt_path, "r", encoding="utf-8") as f:
            self._prompt_template = f.read()

    def _get_client(self, api_key: str | None = None):
        from google import genai

        custom_key = (api_key or "").strip()
        if custom_key:
            return genai.Client(api_key=custom_key)

        if self._client is None:
            if not Config.GEMINI_API_KEY:
                raise RuntimeError(
                    "GEMINI_API_KEY is not configured. Set it in .env or provide X-Gemini-Api-Key."
                )
            self._client = genai.Client(api_key=Config.GEMINI_API_KEY)
        return self._client

    def summarize(self, sites: list[dict], api_key: str | None = None) -> dict:
        """Build deterministic stats then ask the LLM for grounded commentary."""
        cleaned = self._clean_sites(sites)
        if len(cleaned) < 2:
            raise ValueError("At least 2 saved sites with runs are required.")

        stats = self._portfolio_stats(cleaned)

        client = self._get_client(api_key=api_key)
        from google.genai import types

        aggregates = {k: v for k, v in stats.items() if k != "sites"}
        prompt = self._prompt_template.format(
            aggregates=json.dumps(aggregates, indent=2),
            sites=json.dumps(stats["sites"], indent=2),
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
            from utils.security import sanitize_untrusted_text

            name = sanitize_untrusted_text(str(site.get("name", "")), max_len=80)
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
                "summary": text[:400],
                "highlights": [],
                "watchouts": [],
                "raw_response": True,
            }

        def _clean_list(value) -> list[str]:
            if not isinstance(value, list):
                return []
            return [" ".join(str(item).split())[:220] for item in value[:3]]

        parsed.setdefault("summary", "")
        parsed["summary"] = " ".join(str(parsed["summary"]).split())[:500]
        parsed["highlights"] = _clean_list(parsed.get("highlights"))
        parsed["watchouts"] = _clean_list(parsed.get("watchouts"))
        return parsed
