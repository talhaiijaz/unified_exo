"""Exo-Platform Server — FastAPI backend managing Pi agent connections.

Run: python app.py
Or:  uvicorn app:app --host 0.0.0.0 --port 5000 --reload
"""

from __future__ import annotations

import os
import sys

# Ensure server/ is in path for imports
sys.path.insert(0, os.path.dirname(__file__))

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import config
import db
from comm import ConnectionManager
from routes import clients, commands, video, telemetry, auth

# --- ConnectionManager singleton ---

connection_manager = ConnectionManager(
    host=config.HOST,
    control_port=config.CONTROL_PORT,
    video_port=config.VIDEO_PORT,
    telemetry_port=config.TELEMETRY_PORT,
    heartbeat_timeout_s=config.HEARTBEAT_TIMEOUT_S,
    heartbeat_interval_s=config.HEARTBEAT_INTERVAL_S,
    max_frame_bytes=config.MAX_FRAME_BYTES,
    max_control_line_bytes=config.MAX_CONTROL_LINE_BYTES,
)


def _on_telemetry(client_id: str, data: dict):
    """Persist telemetry data to SQLite."""
    try:
        readings = data.get("readings", data)
        db.save_telemetry_batch(client_id, readings, data.get("timestamp"))
    except Exception as err:
        print(f"Failed to save telemetry: {err}")


connection_manager.on_telemetry = _on_telemetry


# --- App lifecycle ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db.get_db()  # Initialize database
    connection_manager.ensure_started()

    # Create default admin user if none exists
    if not db.get_user_by_username("admin"):
        from auth import hash_password
        db.create_user("admin", hash_password("admin"), "admin")
        print("Created default admin user (username: admin, password: admin)")

    os.makedirs(config.RECORDINGS_DIR, exist_ok=True)
    print(f"Exo-Platform Server starting on http://0.0.0.0:{config.HTTP_PORT}")
    print(f"  Control port: {config.CONTROL_PORT}")
    print(f"  Video port:   {config.VIDEO_PORT}")
    print(f"  Telemetry:    {config.TELEMETRY_PORT}")
    print(f"  Database:     {config.DATABASE_PATH}")

    yield

    # Shutdown
    connection_manager.stop()
    db.close_db()


# --- FastAPI app ---

app = FastAPI(
    title="Exo-Platform API",
    description="Unified exoskeleton control platform — manages Pi agents, devices, telemetry, and video.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(clients.router)
app.include_router(commands.router)
app.include_router(video.router)
app.include_router(telemetry.router)
app.include_router(auth.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "comm_running": connection_manager.is_running(),
        "clients_connected": len(connection_manager.list_clients()),
    }


@app.get("/api/status")
def status():
    return {
        "server": "exo-platform",
        "version": "1.0.0",
        "comm_running": connection_manager.is_running(),
        "clients": connection_manager.list_clients(),
        "ports": {
            "http": config.HTTP_PORT,
            "control": config.CONTROL_PORT,
            "video": config.VIDEO_PORT,
            "telemetry": config.TELEMETRY_PORT,
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=config.HTTP_PORT,
        reload=False,
        log_level="info",
    )
