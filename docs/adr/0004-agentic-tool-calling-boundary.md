# ADR-0004: Deliberate Agentic Tool-Calling Boundary

- Status: Accepted
- Date: 2026-11-03
- Implementation note (2026-11-06): calculators are selected by regex/keyword rules in `RAGService._run_deterministic_tools` before a single LLM call; Gemini function calling is not used. The boundary (no LLM arithmetic, numbers only from calculators) holds either way.

## Context

Users asking practical planning questions in `/ask` (e.g., *"How many kW do I need for a $150/month bill in Texas, and how does adding a 10 kWh LFP battery change my payback after the 30% federal tax credit?"*) need both qualitative policy/engineering guidance from the RAG knowledge base and exact, trustworthy numbers. Under ADR-0001, the LLM is strictly forbidden from inventing or calculating numeric solar or financial outputs in prose.

## Decision

1. **Deterministic Tool-Calling in `/ask`**: We equip the Gemini model in `RAGService` / `AgenticAdvisorService` with four deterministic Python tools backed directly by `FinancialService` and `LiteVectorStore`:
   - `calculate_system_sizing`: Converts monthly bill/consumption and available roof area into recommended kW, panel count, and roof constraint status.
   - `simulate_financial_what_if`: Computes exact CAPEX, regional subsidies, net cost, annual savings, LCOE, and 25-year payback for a given irradiance and configuration.
   - `compare_grid_and_battery_modes`: Deterministically compares `grid-tied`, `hybrid` (LFP storage), and `off-grid` configurations.
   - `retrieve_knowledge_base`: Retrieves top-k cited passages from the scientific and policy knowledge base.
2. **Transparent Tool Trace in API & UI**: Every `/ask` response includes a `tool_calls` array listing each invoked tool, its structured inputs, and its deterministic output summary. The frontend `Chatbot` renders these as inspectable **"Verified Tool Calculation"** badges above the grounded answer.
3. **Strict ADR-0001 Compliance**: Prompts and system instructions forbid the LLM from performing mental arithmetic; any numeric claim in `/ask` must come verbatim from a deterministic tool output, the user's current site context, or a cited document passage.

## Consequences

- Zenith demonstrates production-grade Agentic AI engineering (tool orchestration + RAG grounding + deterministic verification) that is fully defensible in technical interviews.
- If no calculation tool is needed for a purely conceptual question, `/ask` executes a fast single-hop RAG retrieval + synthesis.
