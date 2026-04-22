"""Unified configuration for the exo-platform server.

All values can be overridden via environment variables.
"""

from __future__ import annotations

import os

# --- Network ---
HOST = os.getenv("EXO_HOST", "0.0.0.0")
CONTROL_PORT = int(os.getenv("EXO_CONTROL_PORT", "1863"))
VIDEO_PORT = int(os.getenv("EXO_VIDEO_PORT", "8612"))
TELEMETRY_PORT = int(os.getenv("EXO_TELEMETRY_PORT", "8613"))
HTTP_PORT = int(os.getenv("EXO_HTTP_PORT", "5000"))

# --- Protocol ---
PROTOCOL_VERSION = 2
HEARTBEAT_INTERVAL_S = float(os.getenv("EXO_HEARTBEAT_INTERVAL_S", "5"))
HEARTBEAT_TIMEOUT_S = float(os.getenv("EXO_HEARTBEAT_TIMEOUT_S", "20"))
VIDEO_STREAM_FPS = float(os.getenv("EXO_VIDEO_STREAM_FPS", "15"))
MAX_FRAME_BYTES = int(os.getenv("EXO_MAX_FRAME_BYTES", "4000000"))
MAX_CONTROL_LINE_BYTES = int(os.getenv("EXO_MAX_CONTROL_LINE_BYTES", "65536"))

# --- Database ---
DATABASE_PATH = os.getenv("EXO_DATABASE_PATH", os.path.join(os.path.dirname(__file__), "exo_data.db"))

# --- Auth ---
JWT_SECRET = os.getenv("EXO_JWT_SECRET", "exo-platform-dev-secret-change-in-production")
JWT_EXPIRE_MINUTES = int(os.getenv("EXO_JWT_EXPIRE_MINUTES", "480"))

# --- Recordings ---
RECORDINGS_DIR = os.getenv("EXO_RECORDINGS_DIR", os.path.join(os.path.dirname(__file__), "recordings"))

# --- CORS ---
CORS_ORIGINS = os.getenv("EXO_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
