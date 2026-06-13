"""Routes used by simple HTTP-polling hardware agents."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import db
from polling_agents import polling_registry


router = APIRouter(prefix="/api/polling-agents", tags=["polling-agents"])


class RegisterRequest(BaseModel):
    client_id: str
    device_manifest: list[dict] = []
    sim_mode: bool = False


class AckRequest(BaseModel):
    accepted: bool = True


class ResultRequest(BaseModel):
    status: str
    detail: str = ""


@router.post("/register")
def register_agent(req: RegisterRequest):
    client_id = req.client_id.strip()
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")

    client = polling_registry.register(
        client_id=client_id,
        device_manifest=req.device_manifest,
        sim_mode=req.sim_mode,
    )
    return {"ok": True, "client": client, "poll_interval_s": 0.5}


@router.post("/{client_id}/heartbeat")
def heartbeat(client_id: str):
    client = polling_registry.heartbeat(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail=f"Polling agent {client_id} is not registered")
    return {"ok": True, "client": client}


@router.get("/{client_id}/commands")
def get_pending_commands(client_id: str, limit: int = 10):
    if not polling_registry.has_client(client_id):
        raise HTTPException(status_code=404, detail=f"Polling agent {client_id} is not registered")
    return {"commands": polling_registry.pop_pending_commands(client_id, limit=limit)}


@router.post("/{client_id}/commands/{msg_id}/ack")
def ack_command(client_id: str, msg_id: str, req: AckRequest):
    event = polling_registry.ack_command(client_id, msg_id, req.accepted)
    if event is None:
        raise HTTPException(status_code=404, detail=f"Command {msg_id} not found")
    db.update_command_ack(msg_id, req.accepted)
    return {"ok": True, "event": event}


@router.post("/{client_id}/commands/{msg_id}/result")
def result_command(client_id: str, msg_id: str, req: ResultRequest):
    event = polling_registry.result_command(client_id, msg_id, req.status, req.detail)
    if event is None:
        raise HTTPException(status_code=404, detail=f"Command {msg_id} not found")
    db.update_command_result(msg_id, req.status, req.detail)
    return {"ok": True, "event": event}
