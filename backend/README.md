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

## Deployment on Render

1. Create a new **Web Service** on Render
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn app:app`
5. Set environment variable `GEMINI_API_KEY`
6. Set `CORS_ORIGINS` to your Vercel frontend URL
