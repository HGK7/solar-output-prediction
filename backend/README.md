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

| Method | Path       | Description                         |
| ------ | ---------- | ----------------------------------- |
| GET    | `/health`  | Readiness probe                     |
| POST   | `/predict` | Deterministic ML prediction         |
| POST   | `/explain` | LLM-generated explanation           |
| POST   | `/ask`     | RAG-grounded domain Q&A             |
| GET    | `/stream`  | SSE streamed prediction+explanation |

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
| `ENABLE_RAG_GROUNDING` | `false` | Skip HuggingFace+Chroma on `/analyze` |
| `REQUIRE_PRETRAINED_MODELS` | `true` | No train-on-first-request OOM |

Local full profile: `pip install -r requirements-dev.txt` and `PHYSICS_MODE=pysam`.

## Manual Render setup

1. Root directory: `backend`
2. Build: `pip install -r requirements.txt && python scripts/train_models.py`
3. Start: `gunicorn -c gunicorn.conf.py app:app`
4. Env: `GEMINI_API_KEY`, `CORS_ORIGINS`, `PHYSICS_MODE=analytical`, `ENABLE_RAG_GROUNDING=false`
