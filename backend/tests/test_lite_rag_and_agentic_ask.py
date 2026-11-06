"""
Tests for Ticket 03:
- Section-aware markdown chunking (`chunk_document_with_sections`)
- Zero-bloat `LiteVectorStore` (`backend/rag/rag_index.sqlite` auto-sync, count > 40, hybrid/BM25 retrieval)
- `/rag/documents` and `/rag/documents/<filename>` serving both `.md` and `science_context/*.pdf` safely
- `RAGService` deterministic agentic tool calls (`calculate_system_sizing`, `simulate_financial_what_if`, `compare_grid_and_battery_modes`, `retrieve_knowledge_base`)
"""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from app import app
from rag.ingest import chunk_document_with_sections
from rag.lite_store import LiteVectorStore
from services.rag_service import RAGService


# ── 1. Section-aware chunking & Corpus Integrity ─────────────────────────────


def test_chunk_document_with_sections_tracks_headings():
    md = (
        "# Global Solar Subsidies\n\n"
        "## India PM Surya Ghar\n\n"
        "Homeowners receive ₹30,000/kW for the first 2 kW and ₹78,000 cap at 3 kW.\n\n"
        "### Commercial Accelerated Depreciation\n\n"
        "C&I systems claim 40% Accelerated Depreciation under Section 32."
    )
    chunks = chunk_document_with_sections(md, chunk_size=140, overlap=20)
    assert len(chunks) >= 2
    sections = [c["section"] for c in chunks]
    assert any("India PM Surya Ghar" in s for s in sections)
    assert any("Commercial Accelerated Depreciation" in s for s in sections)


def test_lite_vector_store_auto_syncs_full_corpus_and_retrieves():
    store = LiteVectorStore()
    total = store.count()
    assert total > 40, f"Expected > 40 chunks in rag_index.sqlite, got {total}"
    assert store.db_path.is_file()

    # Query PM Surya Ghar subsidy slabs
    surya_hits = store.query("What is the PM Surya Ghar subsidy for 3 kW in India?", k=4)
    assert surya_hits
    combined_surya = "\n".join(h.page_content for h in surya_hits)
    assert "78,000" in combined_surya
    assert any(
        h.metadata["source"] in ("global_solar_subsidies_and_tariffs.md", "solar_costs.md")
        for h in surya_hits
    )

    # Query LFP battery DoD and Year-12 replacement
    bat_hits = store.query("LFP battery depth of discharge and Year 12 replacement", k=4)
    assert bat_hits
    combined_bat = "\n".join(h.page_content for h in bat_hits)
    assert "90%" in combined_bat
    assert "Year 12" in combined_bat


# ── 2. /rag/documents and /rag/documents/<filename> (including PDFs) ─────────


def test_rag_documents_routes_resolve_md_and_science_pdfs():
    client = app.test_client()

    list_resp = client.get("/rag/documents")
    assert list_resp.status_code == 200
    docs = list_resp.get_json()["documents"]
    assert "homeowner_sizing_and_roof_guide.md" in docs
    assert "battery_storage_and_grid_modes.md" in docs
    assert "global_solar_subsidies_and_tariffs.md" in docs
    assert "commercial_and_industrial_scaling.md" in docs
    assert "IRENA_Renewable_Power_Generation_Costs_2024.pdf" in docs

    # Fetch markdown guide
    md_resp = client.get("/rag/documents/homeowner_sizing_and_roof_guide.md")
    assert md_resp.status_code == 200
    md_json = md_resp.get_json()
    assert md_json["format"] == "markdown"
    assert "6.5 m²/kW" in md_json["content"]

    # Fetch PDF from science_context/ via bare filename
    pdf_resp = client.get(
        "/rag/documents/IRENA_Renewable_Power_Generation_Costs_2024.pdf"
    )
    assert pdf_resp.status_code == 200
    assert pdf_resp.mimetype == "application/pdf"
    assert pdf_resp.data.startswith(b"%PDF")

    # Block path traversal
    traversal_resp = client.get("/rag/documents/..%2Fconfig.py")
    assert traversal_resp.status_code in (400, 404)


# ── 3. Agentic Tool-Calling in RAGService.ask (ADR-0004) ─────────────────────


def test_rag_service_executes_deterministic_sizing_and_battery_comparison_tools(
    monkeypatch,
):
    rag = RAGService()
    assert rag.document_count() > 40
    assert rag.peek_document_count() > 40

    captured_prompts: list[str] = []

    class FakeLLM:
        def invoke(self, prompt: str):
            captured_prompts.append(prompt)
            payload = {
                "answer": (
                    "Based on Verified Deterministic Tool Calculations and "
                    "`homeowner_sizing_and_roof_guide.md`, a $150/month bill in Texas "
                    "requires a 7.72 kW system (20 panels, 50.2 m² roof area)."
                ),
                "citations": [
                    {
                        "source": "homeowner_sizing_and_roof_guide.md",
                        "section": "Bill-to-kW System Sizing Methodology",
                    }
                ],
                "confidence": "high",
                "is_refusal": False,
                "refusal_reason": None,
            }
            return SimpleNamespace(content=json.dumps(payload))

    monkeypatch.setattr(rag, "_get_llm", lambda api_key=None: FakeLLM())

    question = (
        "How many kW do I need for a $150/month bill in Texas with 45 m2 roof area, "
        "and compare grid-tied vs hybrid adding a 10 kWh LFP battery on my payback?"
    )
    result = rag.ask(
        question=question,
        context="Site: Austin, Texas, USA (5.2 kWh/m²/day)",
        api_key="AIzaSyFakeValidTestKey123456",
    )

    assert result["is_refusal"] is False
    assert result["retrieval_count"] >= 3
    tool_names = [tc["tool"] for tc in result["tool_calls"]]
    assert "calculate_system_sizing" in tool_names
    assert "compare_grid_and_battery_modes" in tool_names
    assert "simulate_financial_what_if" in tool_names
    assert "retrieve_knowledge_base" in tool_names

    sizing_call = next(
        tc for tc in result["tool_calls"] if tc["tool"] == "calculate_system_sizing"
    )
    assert sizing_call["metrics"]["recommended_capacity_kw"] > 0
    assert sizing_call["metrics"]["roof_area_constrained"] is True

    compare_call = next(
        tc
        for tc in result["tool_calls"]
        if tc["tool"] == "compare_grid_and_battery_modes"
    )
    assert "grid-tied" in compare_call["metrics"]
    assert "hybrid" in compare_call["metrics"]
    assert "off-grid" in compare_call["metrics"]
    assert compare_call["metrics"]["hybrid"]["battery_kwh"] == 10.0

    # Ensure deterministic tool numbers were injected into the LLM prompt
    assert captured_prompts
    assert "Verified Deterministic Tool Calculations" in captured_prompts[0]


def test_parse_response_accepts_block_list():
    parsed = RAGService._parse_response(
        [{"type": "text", "text": '{"answer":"grounded","is_refusal":false}'}]
    )
    assert parsed["answer"] == "grounded"
    assert parsed["is_refusal"] is False
