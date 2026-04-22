"""Video streaming routes."""

from __future__ import annotations

import time

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

import config

router = APIRouter(prefix="/api/clients", tags=["video"])


def _get_cm():
    from app import connection_manager
    return connection_manager


def _generate_mjpeg(client_id: str):
    cm = _get_cm()
    while True:
        frame = cm.get_latest_frame(client_id)
        if frame is not None:
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n")
        time.sleep(1 / config.VIDEO_STREAM_FPS)


@router.get("/{client_id}/video")
def video_feed(client_id: str):
    client = _get_cm().get_client(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail=f"Client {client_id} not found")

    return StreamingResponse(
        _generate_mjpeg(client_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.get("/{client_id}/video/snapshot")
def video_snapshot(client_id: str):
    frame = _get_cm().get_latest_frame(client_id)
    if frame is None:
        raise HTTPException(status_code=404, detail=f"No video frame for client {client_id}")
    from fastapi.responses import Response
    return Response(content=frame, media_type="image/jpeg")
