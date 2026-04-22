"""Command sending and tracking routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import db
from comm import ClientNotConnectedError

router = APIRouter(prefix="/api", tags=["commands"])


def _get_cm():
    from app import connection_manager
    return connection_manager


class CommandRequest(BaseModel):
    device: str = ""
    command: str
    params: dict = {}


class LegacyCommandRequest(BaseModel):
    command: str
    client_id: str


@router.post("/clients/{client_id}/command")
def send_command(client_id: str, req: CommandRequest):
    """Send a command to a Pi agent. Format: device:command params"""
    if req.device:
        param_str = " ".join(str(v) for v in req.params.values()) if req.params else ""
        full_command = f"{req.device}:{req.command} {param_str}".strip()
    else:
        full_command = req.command

    try:
        event = _get_cm().send_command(client_id, full_command)
    except ClientNotConnectedError:
        raise HTTPException(status_code=409, detail=f"Client {client_id} is not connected")

    db.log_command(event.msg_id, client_id, full_command, req.device, event.sent_at)
    return {"msg_id": event.msg_id, "status": "sent", "command": full_command}


@router.post("/clients/{client_id}/devices/{device_type}/command")
def send_device_command(client_id: str, device_type: str, req: CommandRequest):
    """Send a device-specific command to a Pi agent."""
    param_str = " ".join(str(v) for v in req.params.values()) if req.params else ""
    full_command = f"{device_type}:{req.command} {param_str}".strip()

    try:
        event = _get_cm().send_command(client_id, full_command)
    except ClientNotConnectedError:
        raise HTTPException(status_code=409, detail=f"Client {client_id} is not connected")

    db.log_command(event.msg_id, client_id, full_command, device_type, event.sent_at)
    return {"msg_id": event.msg_id, "status": "sent", "command": full_command}


@router.get("/commands/{msg_id}")
def get_command_status(msg_id: str):
    event = _get_cm().get_command_event(msg_id)
    if event is None:
        raise HTTPException(status_code=404, detail=f"No command with msg_id={msg_id}")
    return event


@router.get("/clients/{client_id}/commands")
def get_command_history(client_id: str, limit: int = 100):
    return _get_cm().list_command_events(client_id=client_id, limit=limit)
