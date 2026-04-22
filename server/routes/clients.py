"""Client listing and status routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/clients", tags=["clients"])


def _get_cm():
    from app import connection_manager
    return connection_manager


@router.get("")
def list_clients():
    return _get_cm().list_clients()


@router.get("/{client_id}")
def get_client(client_id: str):
    client = _get_cm().get_client(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail=f"Client {client_id} not found")
    return client


@router.get("/{client_id}/devices")
def get_client_devices(client_id: str):
    client = _get_cm().get_client(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail=f"Client {client_id} not found")
    return client.get("device_manifest", [])
