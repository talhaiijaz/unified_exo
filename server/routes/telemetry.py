"""Telemetry routes — real-time sensor data via WebSocket and REST."""

from __future__ import annotations

import asyncio
import json
import time

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query

import db

router = APIRouter(prefix="/api/clients", tags=["telemetry"])


def _get_cm():
    from app import connection_manager
    return connection_manager


@router.get("/{client_id}/telemetry")
def get_latest_telemetry(client_id: str):
    data = _get_cm().get_latest_telemetry(client_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"No telemetry for client {client_id}")
    return data


@router.get("/{client_id}/telemetry/history")
def get_telemetry_history(
    client_id: str,
    since: float | None = Query(None),
    limit: int = Query(1000, le=5000),
):
    return db.get_telemetry(client_id, since=since, limit=limit)


@router.websocket("/{client_id}/telemetry/ws")
async def telemetry_websocket(websocket: WebSocket, client_id: str):
    """WebSocket endpoint that pushes telemetry data to the browser in real-time."""
    await websocket.accept()
    cm = _get_cm()

    last_sent = None
    try:
        while True:
            data = cm.get_latest_telemetry(client_id)
            if data is not None and data != last_sent:
                await websocket.send_json(data)
                last_sent = data
            await asyncio.sleep(0.1)  # 10Hz push rate
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
