"""Structured logging setup for the Solar Intelligence API."""

import logging
import sys


def setup_logging(level: str = "INFO") -> logging.Logger:
    """
    Configure and return the application logger.

    Uses structured format: timestamp | level | module | message
    """
    logger = logging.getLogger("solar_intelligence")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.DEBUG)
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s.%(module)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


# Module-level logger for convenience
logger = setup_logging()
