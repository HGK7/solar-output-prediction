---
title: Zenith Solar API
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 5000
pinned: false
short_description: Flask API for the Zenith solar planner
---

# Zenith Solar API

Backend for the Zenith solar planning dashboard: NASA POWER climatology, scikit-learn irradiance Prediction, deterministic financial and sizing calculators, and Gemini-written explanations grounded in a small markdown knowledge base.

- Health: `GET /health`
- Analysis stream: `GET /stream-plan?lat=..&lon=..`
- Knowledge-base Q&A: `POST /ask`

Source: https://github.com/HGK7/solar-output-prediction (branch `Solar-AI-System`, folder `backend/`).

## Secrets (Space settings)

- `GEMINI_API_KEY` — shared server key (optional; without it, explanations and Ask are unavailable and figures still work)
- `CORS_ORIGINS` — the dashboard origin, e.g. `https://<project>.vercel.app`
