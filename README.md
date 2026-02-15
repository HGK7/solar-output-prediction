# Solar Intelligence & Optimization System

> AI-powered decision support for solar energy — prediction, explanation, and domain Q&A.

## What This Is

A **vertical AI system** (not a chatbot wrapper) that:

1. **Predicts** solar energy output using deterministic ML models (Linear Regression, SVM)
2. **Explains** predictions using a constrained LLM (Gemini 2.0 Flash)
3. **Answers** domain questions using RAG grounded in trusted documents
4. **Refuses** gracefully when context is insufficient

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│   Prediction Form  │  Explanation Display  │  RAG Q&A Panel     │
└────────┬────────────────────┬────────────────────┬──────────────┘
         │ POST /predict      │ POST /explain      │ POST /ask
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Flask API  (backend/)                        │
├─────────────────┬──────────────────────┬────────────────────────┤
│ PredictionSvc   │  ExplanationSvc      │  RAGService            │
│ (sklearn only)  │  (Gemini via         │  (ChromaDB retrieval   │
│ NO LLM          │   LangChain)         │   + Gemini via         │
│                 │  Strict prompt:      │   LangChain)           │
│                 │  explain, don't      │  Strict prompt:        │
│                 │  predict             │  ground or refuse      │
├─────────────────┴──────────────────────┴────────────────────────┤
│ ML Models          │ Prompts            │ Vector Store           │
│ LinearRegression   │ explanation.txt    │ ChromaDB (in-memory)   │
│ SVR (linear)       │ rag.txt            │ sentence-transformers  │
│ Trained on NASA    │                    │ 4 domain documents     │
│ POWER data         │                    │                        │
└────────────────────┴────────────────────┴────────────────────────┘
```

## Why LLMs Are Constrained

| Component         | Role                              | LLM Involved? |
| ----------------- | --------------------------------- | -------------- |
| `/predict`        | Numeric solar output prediction   | **No**         |
| `/explain`        | Natural-language explanation       | Yes — explain only |
| `/ask`            | Domain Q&A with citations          | Yes — RAG only |

**LLMs never generate or modify numeric predictions.**
They are used exclusively for explanation, reasoning, and grounded Q&A.
Every LLM prompt explicitly forbids hallucination and requires structured JSON output.

## Failure Modes & Mitigations

| Failure                            | Mitigation                                            |
| ---------------------------------- | ----------------------------------------------------- |
| LLM hallucinates numbers           | Impossible — predictions are ML-only, LLM sees result |
| RAG returns insufficient context   | System returns structured refusal with reason          |
| Gemini API unavailable             | `/predict` still works; `/explain` and `/ask` return 503 |
| Input out of physical range        | Validation rejects with descriptive error              |
| LLM returns non-JSON              | Fallback wrapper preserves raw text with flag          |

## Tech Stack

**Backend**: Python 3.11+, Flask, LangChain, Gemini 2.0 Flash, ChromaDB, sentence-transformers, gunicorn
**Frontend**: Next.js, React 19, shadcn/ui, Tailwind CSS v4
**Deployment**: Backend on Render, Frontend on Vercel

## Project Structure

```
solar-output-prediction/
├── cleaned_data.csv              # Training data (NASA POWER API)
├── backend/
│   ├── app.py                    # Flask entrypoint
│   ├── config.py                 # Centralised configuration
│   ├── gunicorn.conf.py          # Production server config
│   ├── requirements.txt
│   ├── models/
│   │   ├── regression.py         # LinearRegression wrapper
│   │   ├── svm.py                # SVR wrapper
│   │   └── loader.py             # ModelManager — train/load/serve
│   ├── services/
│   │   ├── prediction_service.py # Deterministic prediction pipeline
│   │   ├── explanation_service.py# LLM explanation (Gemini)
│   │   └── rag_service.py        # RAG Q&A (ChromaDB + Gemini)
│   ├── rag/
│   │   ├── vectorstore.py        # ChromaDB wrapper
│   │   ├── ingest.py             # Document ingestion pipeline
│   │   └── documents/            # Trusted knowledge base (.md)
│   ├── prompts/
│   │   ├── explanation_prompt.txt
│   │   └── rag_prompt.txt
│   └── utils/
│       ├── validation.py         # Input validation with physical bounds
│       └── logging.py
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   ├── components/           # React components
│   │   └── lib/                  # API client + utilities
│   ├── package.json
│   └── next.config.ts
└── README.md                     # ← You are here
```

## Getting Started

### Backend

```bash
cd backend
cp .env.example .env   # set GEMINI_API_KEY
pip install -r requirements.txt
python app.py          # runs on :5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # runs on :3000
```

### Production

```bash
# Backend
cd backend && gunicorn app:app

# Frontend
cd frontend && npm run build && npm start
```

## Data Source

Training data comes from the **NASA POWER** (Prediction of Worldwide Energy Resources) API:

- Location: Bhadla Solar Park, Rajasthan, India (27.54°N, 71.92°E)
- Period: 2023-01-01 to 2026-01-01
- Features: Temperature, Humidity, Wind Speed, Clear Sky Irradiance
- Target: All-Sky Surface Shortwave Downward Irradiance (Solar Irradiance)

## Future: Agentic Expansion

This MVP uses a **linear pipeline** (request → service → response).
The architecture is designed to evolve into an agentic system:

- Services are stateless and composable
- Each service has a clear, single responsibility
- Prompts are externalised and versioned
- The pipeline can be replaced with LangGraph orchestration
- Tool-calling agents can wrap PredictionService and RAGService

**Planned expansions:**

- LangGraph agent with tool-calling for multi-step reasoning
- Automated anomaly detection and alerting
- Real-time weather data integration
- Multi-location support
- Historical trend analysis agent
