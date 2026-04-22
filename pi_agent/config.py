"""Pi agent configuration. All values can be overridden via environment variables."""

from __future__ import annotations

import os
import socket

# --- Server connection ---
HOST = os.getenv("EXO_HOST", "127.0.0.1")
CONTROL_PORT = int(os.getenv("EXO_CONTROL_PORT", "1863"))
VIDEO_PORT = int(os.getenv("EXO_VIDEO_PORT", "8612"))
TELEMETRY_PORT = int(os.getenv("EXO_TELEMETRY_PORT", "8613"))

# --- Identity ---
CLIENT_ID = os.getenv("EXO_CLIENT_ID", socket.gethostname())
SIM_MODE = os.getenv("EXO_SIM_MODE", "0") == "1"

# --- Protocol ---
PROTOCOL_VERSION = 2
HEARTBEAT_INTERVAL_S = float(os.getenv("EXO_HEARTBEAT_INTERVAL_S", "5"))
CONNECT_RETRY_S = float(os.getenv("EXO_CONNECT_RETRY_S", "1"))
VIDEO_FPS = float(os.getenv("EXO_VIDEO_FPS", "15"))
TELEMETRY_HZ = float(os.getenv("EXO_TELEMETRY_HZ", "10"))
MAX_CONTROL_LINE_BYTES = int(os.getenv("EXO_MAX_CONTROL_LINE_BYTES", "65536"))

# --- Device config file ---
DEVICES_CONFIG = os.getenv("EXO_DEVICES_CONFIG", os.path.join(os.path.dirname(__file__), "devices.json"))
