# Solar Intelligence & Optimization System — Backend

Production-ready Flask API for solar energy prediction, explanation, and domain Q&A.

## Quick Start

```bash
cd backend
cp .env.example .env         # add your GEMINI_API_KEY
pip install -r requirements.txt
python app.py                 # development
# — or —
gunicorn app:app              # production
```

## API Endpoints

| Method | Path                        | Description                              |
| ------ | --------------------------- | ---------------------------------------- |
| GET    | `/health`                   | Readiness probe (models, RAG chunks)     |
| POST   | `/predict`                  | Deterministic ML prediction              |
| POST   | `/explain`                  | LLM-generated explanation                |
| POST   | `/ask`                      | RAG-grounded domain Q&A                  |
| POST   | `/analyze`                  | Full pipeline (location → … → explain)   |
| GET    | `/stream-plan`              | Same pipeline as SSE stream              |
| GET    | `/rag/documents`            | List indexed knowledge-base docs         |
| GET    | `/rag/documents/<filename>` | Serve doc for dashboard source modal     |

### POST /predict

```json
{
  "Temperature": 30.0,
  "Humidity": 35.0,
  "Wind Speed": 2.5,
  "Clear Sky Irradiance": 6.0,
  "model": "linear_regression"
}
```

### POST /explain

Pass the full `/predict` response as the request body.

### POST /ask

```json
{ "question": "How does temperature affect solar panel efficiency?" }
```

### GET /stream

Query params: `temperature`, `humidity`, `wind_speed`, `clear_sky_irradiance`, `model`

## Environment Variables

| Variable        | Required | Default                |
| --------------- | -------- | ---------------------- |
| GEMINI_API_KEY  | Yes*     | —                      |
| CORS_ORIGINS    | No       | <http://localhost:3000>  |
| FLASK_DEBUG     | No       | false                  |
| DATA_PATH       | No       | ../cleaned_data.csv    |

*Required for /explain and /ask endpoints.;  /predict works without it.

## Deployment on Render (free tier)

Build trains models then starts gunicorn (`render.yaml`):

```bash
pip install -r requirements.txt && python scripts/train_models.py
gunicorn -c gunicorn.conf.py app:app
```

| Variable | Render default | Purpose |
| -------- | -------------- | ------- |
| `PHYSICS_MODE` | `analytical` | Skip PySAM (~200+ MB). Use `pysam` only on paid tier + `requirements-dev.txt` |
| `ENABLE_RAG_GROUNDING` | `false` | Skip Gemini-embed + Chroma on `/analyze` |
| `REQUIRE_PRETRAINED_MODELS` | `true` | No train-on-first-request OOM |

Render omits `requirements-rag.txt` at build. `/ask` returns 503 until RAG extras installed.

**RAG re-ingest (Gemini embeddings):** after `pip install -r requirements-rag.txt` and setting `GEMINI_API_KEY`:

```bash
python scripts/ingest_markdown_docs.py  # rag/documents/*.md → chroma_db/ (idempotent, wipes + re-ingests)
python scripts/ingest_science_docs.py   # optional: science_context PDFs → chroma_db/
```

Local full profile: `pip install -r requirements-dev.txt` and `PHYSICS_MODE=pysam`.

## Tests

```bash
pip install -r requirements-dev.txt   # includes pytest
pytest tests -q
```

Covers `AnalysisPipeline.run_stages` ordering/error paths and ingest chunking. No network or API key needed.

## RAG smoke checklist (local E2E)

With `ENABLE_RAG_GROUNDING=true` and `GEMINI_API_KEY` in `.env`:

1. `python scripts/ingest_markdown_docs.py` — expect ~82 chunks from 8 docs
2. `python app.py`, then `GET /health` — `rag_chunks > 0`, `rag_grounding_enabled: true`
3. `POST /ask {"question": "How does humidity affect solar panel output?"}` — grounded answer, citations include `weather_impact.md`, `is_refusal: false`
4. `POST /analyze {"lat": 26.9, "lon": 75.8}` — `explanation.rag_pipeline.retrieval_count > 0`, citations populated
5. `GET /stream-plan?lat=26.9&lon=75.8` — SSE event order: `stage/location/… → geometry → explanation → done`
6. Dashboard: analyze run → explanation Sources tab → source modal opens markdown via `/rag/documents/<name>`

## Manual Render setup

1. Root directory: `backend`
2. Build: `pip install -r requirements.txt && python scripts/train_models.py`
3. Start: `gunicorn -c gunicorn.conf.py app:app`
4. Env: `GEMINI_API_KEY`, `CORS_ORIGINS`, `PHYSICS_MODE=analytical`, `ENABLE_RAG_GROUNDING=false`
