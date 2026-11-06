"""
Agentic RAG & Solar Optimization Advisor Service (ADR-0001, ADR-0004, ADR-0005).

Combines:
1. `LiteVectorStore` (`backend/rag/rag_index.sqlite`) for fast, <5 MB hybrid
   (BM25 + optional Gemini embedding cosine similarity) retrieval across the
   markdown corpus, with optional Chroma fallback.
2. Four deterministic Python tools backed by `FinancialService` and `LiteVectorStore`:
   - `calculate_system_sizing`
   - `simulate_financial_what_if`
   - `compare_grid_and_battery_modes`
   - `retrieve_knowledge_base`
3. Strict ADR-0001 compliance: the LLM never performs mental math; all sizing,
   CAPEX, subsidy, payback, LCOE, and battery comparisons are computed by
   deterministic tools and returned in `tool_calls` alongside `answer` and `citations`.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
from typing import TYPE_CHECKING, Any

from config import Config
from rag.lite_store import LiteVectorStore, RetrievedChunk
from services.financial_service import FinancialService
from utils.logging import logger

if TYPE_CHECKING:
    from langchain_google_genai import ChatGoogleGenerativeAI

_PROMPT_DIR = os.path.join(Config.BASE_DIR, "prompts")

# Regex extractors for deterministic tool routing from natural-language questions + site context
_BILL_USD_RE = re.compile(
    r"(?:\$\s*(\d+(?:\.\d+)?)\s*(?:/\s*mo|/month|per\s+month|monthly|bill)?)|(?:(\d+(?:\.\d+)?)\s*(?:usd|dollars?)\s*(?:monthly\s+)?bill)",
    re.IGNORECASE,
)
_BILL_INR_RE = re.compile(
    r"(?:₹|rs\.?|inr)\s*(\d[\d,]*(?:\.\d+)?)\s*(?:/\s*mo|/month|per\s+month|monthly|bill)?",
    re.IGNORECASE,
)
_MONTHLY_KWH_RE = re.compile(
    r"(\d[\d,]*(?:\.\d+)?)\s*kwh\s*(?:/\s*mo|/month|per\s+month|monthly)",
    re.IGNORECASE,
)
_CAPACITY_KW_RE = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(?:kw|kwp)\b",
    re.IGNORECASE,
)
_BATTERY_KWH_RE = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*kwh\s*(?:lfp\s+|lithium\s+|li-ion\s+)?(?:battery|storage|pack)",
    re.IGNORECASE,
)
_ROOF_M2_RE = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(?:m2|m²|sq\.?\s*m|square\s+meters?)\b",
    re.IGNORECASE,
)
_ROOF_SQFT_RE = re.compile(
    r"\b(\d[\d,]*(?:\.\d+)?)\s*(?:sq\.?\s*ft|sqft|square\s+feet)\b",
    re.IGNORECASE,
)
_IRRADIANCE_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*kwh/m[²2]/day",
    re.IGNORECASE,
)
_TARIFF_RE = re.compile(
    r"\$\s*(0\.\d+)\s*/\s*kwh",
    re.IGNORECASE,
)


def _citation_link(_source_name: str) -> str | None:
    """Indexed docs are viewed in-dashboard via GET /rag/documents/."""
    return None


def _infer_parameters_from_text(
    question: str, context: str | None = None
) -> dict[str, Any]:
    """Extract deterministic solar/site parameters from user question and site context."""
    combined_ctx = f"{context or ''}\n{question}"
    q_lower = question.lower()
    ctx_lower = combined_ctx.lower()

    # 1. Region detection
    region = "global"
    if any(
        k in ctx_lower
        for k in (
            "india",
            "jaipur",
            "jodhpur",
            "rajasthan",
            "gujarat",
            "delhi",
            "mumbai",
            "bangalore",
            "bengaluru",
            "chennai",
            "hyderabad",
            "pune",
            "kolkata",
            "surya ghar",
            "mnre",
            "discom",
            "₹",
            "inr",
        )
    ):
        region = "india"
    elif any(
        k in ctx_lower
        for k in (
            "usa",
            "u.s.",
            "united states",
            "texas",
            "california",
            "arizona",
            "florida",
            "nevada",
            "ira",
            "25d",
            "48e",
            "nem 3",
            "itc",
        )
    ):
        region = "usa"
    elif any(
        k in ctx_lower
        for k in (
            "europe",
            "eu",
            "germany",
            "uk",
            "united kingdom",
            "austria",
            "spain",
            "netherlands",
            "nullsteuersatz",
            "eeg",
            "vat",
        )
    ):
        region = "europe"

    # 2. Irradiance (PSH)
    irradiance = 5.0
    if region == "india":
        irradiance = 5.6
    elif region == "usa":
        irradiance = 5.2
    elif region == "europe":
        irradiance = 3.8

    irr_match = _IRRADIANCE_RE.search(combined_ctx)
    if irr_match:
        try:
            irradiance = float(irr_match.group(1))
        except ValueError:
            pass

    # 3. Capacity (kW)
    capacity_kw: float | None = None
    q_kw = _CAPACITY_KW_RE.search(question)
    if q_kw:
        capacity_kw = float(q_kw.group(1))
    elif context:
        ctx_kw = _CAPACITY_KW_RE.search(context)
        if ctx_kw:
            capacity_kw = float(ctx_kw.group(1))

    # 4. Monthly bill (USD) or Monthly consumption (kWh)
    monthly_bill_usd: float | None = None
    bill_match = _BILL_USD_RE.search(question)
    if bill_match:
        val_str = bill_match.group(1) or bill_match.group(2)
        if val_str and "bill" in q_lower or "/mo" in q_lower or "month" in q_lower:
            monthly_bill_usd = float(val_str)
    if monthly_bill_usd is None:
        inr_match = _BILL_INR_RE.search(question)
        if inr_match and ("bill" in q_lower or "month" in q_lower):
            inr_val = float(inr_match.group(1).replace(",", ""))
            monthly_bill_usd = round(inr_val / 83.5, 2)

    monthly_consumption_kwh: float | None = None
    kwh_match = _MONTHLY_KWH_RE.search(question)
    if kwh_match:
        monthly_consumption_kwh = float(kwh_match.group(1).replace(",", ""))

    # 5. Roof area (m2)
    available_roof_area_m2: float | None = None
    m2_match = _ROOF_M2_RE.search(question)
    if m2_match:
        available_roof_area_m2 = float(m2_match.group(1))
    else:
        sqft_match = _ROOF_SQFT_RE.search(question)
        if sqft_match:
            available_roof_area_m2 = round(
                float(sqft_match.group(1).replace(",", "")) / 10.7639, 1
            )

    # 6. Battery capacity (kWh)
    battery_capacity_kwh: float | None = None
    bat_match = _BATTERY_KWH_RE.search(question)
    if bat_match:
        battery_capacity_kwh = float(bat_match.group(1))

    # 7. Grid connection & installation type
    grid_connection = "grid-tied"
    if "off-grid" in q_lower or "off grid" in q_lower:
        grid_connection = "off-grid"
    elif (
        "hybrid" in q_lower
        or battery_capacity_kwh is not None
        or "with battery" in q_lower
        or "with storage" in q_lower
    ):
        grid_connection = "hybrid"

    installation_type = "rooftop"
    if "carport" in q_lower:
        installation_type = "carport"
    elif "ground-mount" in q_lower or "ground mount" in q_lower:
        installation_type = "ground-mounted"

    planning_scale = "homeowner"
    if (
        (capacity_kw is not None and capacity_kw >= 25.0)
        or "commercial" in q_lower
        or "industrial" in q_lower
        or "factory" in q_lower
        or "c&i" in q_lower
    ):
        planning_scale = "industrial"

    tariff_usd: float | None = None
    t_match = _TARIFF_RE.search(combined_ctx)
    if t_match:
        tariff_usd = float(t_match.group(1))

    return {
        "region": region,
        "irradiance": irradiance,
        "capacity_kw": capacity_kw,
        "monthly_bill_usd": monthly_bill_usd,
        "monthly_consumption_kwh": monthly_consumption_kwh,
        "available_roof_area_m2": available_roof_area_m2,
        "battery_capacity_kwh": battery_capacity_kwh,
        "grid_connection": grid_connection,
        "installation_type": installation_type,
        "planning_scale": planning_scale,
        "electricity_tariff_usd": tariff_usd,
    }


def _llm_text(content) -> str:
    if isinstance(content, list):
        chunks = []
        for part in content:
            if isinstance(part, str):
                chunks.append(part)
            elif isinstance(part, dict):
                chunks.append(str(part.get("text") or part.get("content") or ""))
            else:
                chunks.append(str(getattr(part, "text", part)))
        return "".join(chunks)
    return str(content or "")


class RAGService:
    """Agentic Retrieval-Augmented Generation & Deterministic Tool Advisor for solar Q&A."""

    def __init__(self, lite_store: LiteVectorStore | None = None):
        self._prompt_template: str = self._load_prompt("rag_prompt.txt")
        self._persist_dir = os.path.join(Config.BASE_DIR, "chroma_db")
        self._lite_store = lite_store or LiteVectorStore()
        self._financial_service = FinancialService()
        self._embeddings = None
        self._vectorstore = None
        self._retriever = None
        self._llm = None

    def _retrieve_docs(
        self, question: str, api_key: str | None = None
    ) -> list[RetrievedChunk]:
        """Retrieve top-k chunks via LiteVectorStore (<5 MB SQLite), falling back to Chroma only if empty."""
        try:
            docs = self._lite_store.query(
                question, k=max(4, Config.RAG_TOP_K), api_key=api_key
            )
            if docs:
                return docs
        except Exception as exc:
            logger.warning("LiteVectorStore query failed, trying fallback: %s", exc)

        # Fallback to Chroma only if LiteVectorStore returned nothing
        try:
            from langchain_chroma import Chroma
            from services.rag_embeddings import create_rag_embeddings

            if self._vectorstore is None:
                self._embeddings = create_rag_embeddings(api_key=api_key)
                self._vectorstore = Chroma(
                    persist_directory=self._persist_dir,
                    embedding_function=self._embeddings,
                    collection_name=Config.CHROMA_COLLECTION,
                )
                self._retriever = self._vectorstore.as_retriever(
                    search_kwargs={"k": Config.RAG_TOP_K}
                )
            raw_docs = self._retriever.invoke(question)
            return [
                RetrievedChunk(page_content=d.page_content, metadata=d.metadata or {})
                for d in raw_docs
            ]
        except Exception as exc:
            logger.warning("Chroma fallback unavailable: %s", exc)
            return []

    def _run_deterministic_tools(
        self,
        question: str,
        context: str | None,
        retrieved_docs: list[RetrievedChunk],
    ) -> list[dict[str, Any]]:
        """
        Execute deterministic Python tools (ADR-0004) when the question asks for:
        - System sizing / roof fit (`calculate_system_sizing`)
        - Financial / subsidy / CAPEX / payback what-if (`simulate_financial_what_if`)
        - Grid-tied vs Hybrid (LFP battery) vs Off-grid comparison (`compare_grid_and_battery_modes`)
        - Knowledge base retrieval (`retrieve_knowledge_base`)
        """
        q_lower = question.lower()
        params = _infer_parameters_from_text(question, context)
        tool_calls: list[dict[str, Any]] = []

        # Tool 1: calculate_system_sizing
        wants_sizing = (
            params["monthly_bill_usd"] is not None
            or params["monthly_consumption_kwh"] is not None
            or params["available_roof_area_m2"] is not None
            or any(
                phrase in q_lower
                for phrase in (
                    "how many kw",
                    "what size",
                    "system size",
                    "how many panels",
                    "roof area",
                    "size a system",
                    "sizing",
                )
            )
        )

        sized_kw: float | None = None
        if wants_sizing:
            tariff = params["electricity_tariff_usd"] or (
                0.08
                if params["region"] == "india"
                else (
                    0.16
                    if params["region"] == "usa"
                    else (0.25 if params["region"] == "europe" else 0.12)
                )
            )
            bill_usd = params["monthly_bill_usd"]
            monthly_kwh = params["monthly_consumption_kwh"]
            if bill_usd is None and monthly_kwh is None and params["capacity_kw"] is None:
                bill_usd = 120.0  # Reference residential bill when user asks generic sizing question

            sizing_res = self._financial_service.size_system(
                predicted_irradiance_kwh_m2_day=params["irradiance"],
                monthly_bill_usd=bill_usd,
                monthly_consumption_kwh=monthly_kwh,
                electricity_tariff_usd=tariff,
                performance_ratio=0.78,
                available_roof_area_m2=params["available_roof_area_m2"],
            )
            sized_kw = sizing_res.get("recommended_capacity_kw")
            rec_kw_display = sized_kw or params["capacity_kw"] or 5.0
            summary = (
                f"Recommended {rec_kw_display} kW array "
                f"({sizing_res['estimated_panels']} × 400W panels, "
                f"{sizing_res['required_roof_area_m2']} m² / {int(sizing_res['required_roof_area_sqft'])} sq ft gross roof area"
                f"{', roof-constrained' if sizing_res['roof_area_constrained'] else ''})."
            )
            tool_calls.append(
                {
                    "tool": "calculate_system_sizing",
                    "inputs": {
                        "predicted_irradiance_kwh_m2_day": params["irradiance"],
                        "monthly_bill_usd": bill_usd,
                        "monthly_consumption_kwh": monthly_kwh,
                        "electricity_tariff_usd": tariff,
                        "available_roof_area_m2": params["available_roof_area_m2"],
                    },
                    "result_summary": summary,
                    "metrics": sizing_res,
                }
            )

        # Tool 2: compare_grid_and_battery_modes
        wants_comparison = any(
            phrase in q_lower
            for phrase in (
                "compare",
                "grid-tied vs",
                "hybrid vs",
                "off-grid vs",
                "add a",
                "adding a",
                "with and without battery",
                "change my payback",
                "battery worth it",
            )
        ) and any(
            w in q_lower
            for w in ("battery", "lfp", "storage", "hybrid", "off-grid", "off grid", "grid-tied")
        )

        effective_kw = params["capacity_kw"] or sized_kw or 5.0

        if wants_comparison:
            modes_summary: dict[str, Any] = {}
            for mode in ("grid-tied", "hybrid", "off-grid"):
                ov: dict[str, Any] = {
                    "system_capacity_kw": effective_kw,
                    "region": params["region"],
                    "grid_connection": mode,
                    "installation_type": params["installation_type"],
                    "planning_scale": params["planning_scale"],
                    "include_incentives": True,
                }
                if params["electricity_tariff_usd"] is not None:
                    ov["electricity_tariff_usd"] = params["electricity_tariff_usd"]
                if mode == "hybrid" and params["battery_capacity_kwh"] is not None:
                    ov["battery_capacity_kwh"] = params["battery_capacity_kwh"]
                res = self._financial_service.calculate(
                    predicted_irradiance_kwh_m2_day=params["irradiance"],
                    overrides=ov,
                )
                modes_summary[mode] = {
                    "net_cost_usd": res["net_system_cost_usd"],
                    "gross_cost_usd": res["total_system_cost_usd"],
                    "incentive_usd": res["incentive_amount_usd"],
                    "annual_output_kwh": res["annual_output_kwh"],
                    "annual_savings_usd": res["net_annual_savings_usd"],
                    "simple_payback_years": res["simple_payback_years"],
                    "lcoe_usd_per_kwh": res["lcoe_usd_per_kwh"],
                    "battery_kwh": res["battery_summary"]["capacity_kwh"],
                    "self_consumption_pct": res["battery_summary"]["self_consumption_pct"],
                }

            gt = modes_summary["grid-tied"]
            hy = modes_summary["hybrid"]
            og = modes_summary["off-grid"]
            summary = (
                f"For {effective_kw} kW ({params['region'].upper()}): "
                f"Grid-Tied net ${gt['net_cost_usd']:,.0f} ({gt['simple_payback_years']} yr payback, LCOE ${gt['lcoe_usd_per_kwh']:.3f}/kWh) | "
                f"Hybrid ({hy['battery_kwh']} kWh LFP) net ${hy['net_cost_usd']:,.0f} ({hy['simple_payback_years']} yr payback, {hy['self_consumption_pct']:.0f}% self-consumption) | "
                f"Off-Grid ({og['battery_kwh']} kWh LFP) net ${og['net_cost_usd']:,.0f} ({og['simple_payback_years']} yr payback)."
            )
            tool_calls.append(
                {
                    "tool": "compare_grid_and_battery_modes",
                    "inputs": {
                        "system_capacity_kw": effective_kw,
                        "region": params["region"],
                        "predicted_irradiance_kwh_m2_day": params["irradiance"],
                        "battery_capacity_kwh": params["battery_capacity_kwh"],
                    },
                    "result_summary": summary,
                    "metrics": modes_summary,
                }
            )

        # Tool 3: simulate_financial_what_if
        wants_financial = (
            params["capacity_kw"] is not None
            or sized_kw is not None
            or params["battery_capacity_kwh"] is not None
            or any(
                w in q_lower
                for w in (
                    "cost",
                    "capex",
                    "payback",
                    "roi",
                    "lcoe",
                    "savings",
                    "subsidy",
                    "surya ghar",
                    "tax credit",
                    "itc",
                    "25d",
                    "what if",
                    "how much",
                )
            )
        )

        if wants_financial:
            overrides: dict[str, Any] = {
                "system_capacity_kw": effective_kw,
                "region": params["region"],
                "grid_connection": params["grid_connection"],
                "installation_type": params["installation_type"],
                "planning_scale": params["planning_scale"],
                "include_incentives": True,
            }
            if params["battery_capacity_kwh"] is not None:
                overrides["battery_capacity_kwh"] = params["battery_capacity_kwh"]
            if params["electricity_tariff_usd"] is not None:
                overrides["electricity_tariff_usd"] = params["electricity_tariff_usd"]

            fin = self._financial_service.calculate(
                predicted_irradiance_kwh_m2_day=params["irradiance"],
                overrides=overrides,
            )
            summary = (
                f"{effective_kw} kW {params['grid_connection']} ({params['region'].upper()}): "
                f"Gross ${fin['total_system_cost_usd']:,.0f} − ${fin['incentive_amount_usd']:,.0f} ({fin['incentive_summary']}) "
                f"= Net ${fin['net_system_cost_usd']:,.0f} | "
                f"Output {fin['annual_output_kwh']:,.0f} kWh/yr | "
                f"Net Savings ${fin['net_annual_savings_usd']:,.0f}/yr | "
                f"Payback {fin['simple_payback_years']} yrs | "
                f"25-yr ROI {fin['lifetime_roi_pct']}% | LCOE ${fin['lcoe_usd_per_kwh']:.4f}/kWh."
            )
            tool_calls.append(
                {
                    "tool": "simulate_financial_what_if",
                    "inputs": {
                        "predicted_irradiance_kwh_m2_day": params["irradiance"],
                        **overrides,
                    },
                    "result_summary": summary,
                    "metrics": {
                        "annual_output_kwh": fin["annual_output_kwh"],
                        "total_system_cost_usd": fin["total_system_cost_usd"],
                        "incentive_amount_usd": fin["incentive_amount_usd"],
                        "incentive_summary": fin["incentive_summary"],
                        "net_system_cost_usd": fin["net_system_cost_usd"],
                        "net_annual_savings_usd": fin["net_annual_savings_usd"],
                        "simple_payback_years": fin["simple_payback_years"],
                        "lifetime_roi_pct": fin["lifetime_roi_pct"],
                        "lcoe_usd_per_kwh": fin["lcoe_usd_per_kwh"],
                        "battery_summary": fin["battery_summary"],
                    },
                }
            )

        # Tool 4: retrieve_knowledge_base (always logged when chunks are retrieved)
        if retrieved_docs:
            top_sources = [
                f"{Path(str(d.metadata.get('source', 'unknown'))).name}"
                + (
                    f" ({d.metadata.get('section')})"
                    if d.metadata.get("section")
                    else ""
                )
                for d in retrieved_docs[:4]
            ]
            tool_calls.append(
                {
                    "tool": "retrieve_knowledge_base",
                    "inputs": {
                        "query": question[:160],
                        "top_k": len(retrieved_docs),
                    },
                    "result_summary": f"Retrieved {len(retrieved_docs)} cited passages from {', '.join(top_sources)}.",
                    "metrics": {
                        "chunks_retrieved": len(retrieved_docs),
                        "sources": [
                            Path(str(d.metadata.get("source", "unknown"))).name
                            for d in retrieved_docs
                        ],
                    },
                }
            )

        return tool_calls

    def _get_llm(self, api_key: str | None = None):
        from langchain_google_genai import ChatGoogleGenerativeAI

        active_key = (api_key or Config.GEMINI_API_KEY or "").strip()
        if custom := (api_key or "").strip():
            return ChatGoogleGenerativeAI(
                model=Config.GEMINI_MODEL,
                google_api_key=custom,
                temperature=Config.LLM_TEMPERATURE,
            )
        if self._llm is None:
            self._llm = ChatGoogleGenerativeAI(
                model=Config.GEMINI_MODEL,
                google_api_key=active_key,
                temperature=Config.LLM_TEMPERATURE,
            )
        return self._llm

    def ask(
        self,
        question: str,
        context: str | None = None,
        api_key: str | None = None,
    ) -> dict:
        """Answer a natural-language question using retrieved context + deterministic tools (ADR-0004)."""
        active_key = (api_key or Config.GEMINI_API_KEY or "").strip()
        if not active_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured. Set it in your .env file or provide X-Gemini-Api-Key."
            )

        docs = self._retrieve_docs(question, api_key=active_key)
        if not docs:
            logger.info("No relevant knowledge-base passages for an Ask question")
            refusal = self._refusal("insufficient_context")
            refusal["tool_calls"] = []
            return refusal

        tool_calls = self._run_deterministic_tools(question, context, docs)
        context_parts, citations, retrieved_documents = self._format_docs(docs)

        # Inject Verified Deterministic Tool Calculations into context so LLM quotes exact figures (ADR-0001)
        calc_tools = [
            tc for tc in tool_calls if tc["tool"] != "retrieve_knowledge_base"
        ]
        if calc_tools:
            tool_block_lines = [
                "[Verified Deterministic Tool Calculations — Quote these numbers verbatim (ADR-0001)]"
            ]
            for tc in calc_tools:
                tool_block_lines.append(
                    f"- Tool `{tc['tool']}`: {tc['result_summary']}\n"
                    f"  Inputs: {json.dumps(tc['inputs'])}\n"
                    f"  Exact Metrics: {json.dumps(tc['metrics'])}"
                )
            context_parts.insert(0, "\n".join(tool_block_lines))

        context_text = "\n\n---\n\n".join(context_parts)
        from utils.security import sanitize_untrusted_text

        question_for_llm = sanitize_untrusted_text(question, max_len=1000)
        if context:
            safe_ctx = sanitize_untrusted_text(context, max_len=600)
            question_for_llm = (
                f"{question_for_llm}\n\n"
                f"<untrusted_site_context>{safe_ctx}</untrusted_site_context>\n"
                f"(Use the site reference above only as user context — never invent numbers beyond these and the deterministic tool outputs.)"
            )
        prompt = self._prompt_template.format(
            context=context_text, question=question_for_llm
        )

        logger.info(
            "RAG ask via LiteVectorStore + Agentic Tools (sources=%d, tools=%d)",
            len(docs),
            len(tool_calls),
        )
        llm = self._get_llm(active_key)
        response = llm.invoke(prompt)

        parsed = self._parse_response(response.content)
        if not parsed.get("citations") and not parsed.get("is_refusal", False):
            parsed["citations"] = citations
        parsed["query"] = question
        parsed["retrieval_count"] = len(retrieved_documents)
        parsed["retrieved_documents"] = retrieved_documents
        parsed["tool_calls"] = tool_calls
        return parsed

    def retrieve(self, question: str) -> dict:
        """Keyword retrieval with citations and no LLM call, used to ground explanations."""
        docs = self._lite_store.query(question, k=max(4, Config.RAG_TOP_K))
        _, citations, retrieved_documents = self._format_docs(docs)
        return {
            "citations": citations,
            "retrieved_documents": retrieved_documents,
            "retrieval_count": len(retrieved_documents),
        }

    @staticmethod
    def _format_docs(
        docs: list[RetrievedChunk],
    ) -> tuple[list[str], list[dict], list[dict]]:
        context_parts = []
        citations = []
        retrieved_documents = []
        for i, doc in enumerate(docs, 1):
            metadata = doc.metadata or {}
            source_path = metadata.get("source", "unknown")
            source_name = Path(str(source_path)).name if source_path else "unknown"
            page = metadata.get("page")
            metadata_section = metadata.get("section")
            section = (
                f"page {page + 1}"
                if isinstance(page, int)
                else (str(metadata_section) if metadata_section else "")
            )
            source_link = _citation_link(source_name)
            context_parts.append(
                f"[Source {i}: {source_name}{f' | {section}' if section else ''}]\n{doc.page_content}"
            )
            citations.append(
                {
                    "source": source_name,
                    "section": section,
                    "source_path": str(source_path) if source_path else None,
                    "link": source_link,
                }
            )
            retrieved_documents.append(
                {
                    "source": source_name,
                    "section": section,
                    "source_path": str(source_path) if source_path else None,
                    "link": source_link,
                    "snippet": " ".join(doc.page_content.split())[:320],
                }
            )
        return context_parts, citations, retrieved_documents

    def document_count(self) -> int:
        """Count of indexed chunks in LiteVectorStore (<5 MB SQLite)."""
        try:
            return int(self._lite_store.count())
        except Exception:
            return 0

    def peek_document_count(self) -> int | None:
        """Health-safe count from LiteVectorStore SQLite index (<5 MB RAM)."""
        try:
            return int(self._lite_store.count())
        except Exception:
            return None

    @staticmethod
    def _load_prompt(filename: str) -> str:
        path = os.path.join(_PROMPT_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    @staticmethod
    def _refusal(reason: str) -> dict:
        messages = {
            "insufficient_context": (
                "I don't have sufficient scientific context in the indexed knowledge base "
                "to answer this accurately."
            ),
            "outside_scope": "This question is outside the scientific solar scope.",
            "ambiguous_question": (
                "The question is ambiguous for a grounded scientific response. "
                "Please provide more specific details."
            ),
        }
        return {
            "answer": messages.get(reason, messages["insufficient_context"]),
            "citations": [],
            "confidence": "none",
            "is_refusal": True,
            "refusal_reason": reason,
            "query": "",
            "retrieval_count": 0,
            "retrieved_documents": [],
            "tool_calls": [],
        }

    @staticmethod
    def _parse_response(content: str | list) -> dict:
        text = _llm_text(content).strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [line for line in lines if not line.strip().startswith("```")]
            text = "\n".join(lines)

        try:
            parsed = json.loads(text)
            parsed.setdefault("answer", "")
            parsed.setdefault("citations", [])
            parsed.setdefault("confidence", "low")
            parsed.setdefault("is_refusal", False)
            parsed.setdefault("refusal_reason", None)
            parsed.setdefault("query", "")
            parsed.setdefault("retrieval_count", 0)
            parsed.setdefault("retrieved_documents", [])
            parsed.setdefault("tool_calls", [])
            return parsed
        except json.JSONDecodeError:
            logger.warning("RAG model returned non-JSON response; wrapping raw text.")
            return {
                "answer": text[:1500],
                "citations": [],
                "confidence": "low",
                "is_refusal": False,
                "refusal_reason": None,
                "query": "",
                "retrieval_count": 0,
                "retrieved_documents": [],
                "tool_calls": [],
                "raw_response": True,
            }
