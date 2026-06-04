#!/usr/bin/env python3
"""Train and persist ML models at build time (Render deploy).

Usage (from backend/):
    python scripts/train_models.py
"""

from __future__ import annotations

import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ.setdefault("REQUIRE_PRETRAINED_MODELS", "false")


def main() -> int:
    from config import Config
    from models.loader import ModelManager
    from utils.logging import logger

    if not os.path.exists(Config.DATA_PATH):
        print(f"[FAIL] Training data not found: {Config.DATA_PATH}", file=sys.stderr)
        return 1

    logger.info("Training models from %s …", Config.DATA_PATH)
    manager = ModelManager()
    manager.initialize()
    print("[OK] Models ready in", Config.MODEL_DIR)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
