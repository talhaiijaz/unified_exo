"""HTTP-polling hardware agents for laptops that cannot accept inbound TCP."""

from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any


POLLING_AGENT_TIMEOUT_S = 45.0


@dataclass
class PollingCommandEvent:
    msg_id: str
    client_id: str
    command: str
    sent_at: float
    ack: dict[str, Any] | None = None
    acked_at: float | None = None
    result: dict[str, Any] | None = None
    result_at: float | None = None
    delivered_at: float | None = None

    def snapshot(self) -> dict[str, Any]:
        return {
            "msg_id": self.msg_id,
            "client_id": self.client_id,
            "command": self.command,
            "sent_at": self.sent_at,
            "ack": self.ack,
            "acked_at": self.acked_at,
            "result": self.result,
            "result_at": self.result_at,
            "delivered_at": self.delivered_at,
        }


@dataclass
class PollingClient:
    client_id: str
    session_id: str
    connected_at: float
    last_heartbeat: float
    device_manifest: list[dict[str, Any]]
    sim_mode: bool = False
    pending: list[str] = field(default_factory=list)

    def snapshot(self) -> dict[str, Any]:
        return {
            "client_id": self.client_id,
            "session_id": self.session_id,
            "connected_at": self.connected_at,
            "last_heartbeat": self.last_heartbeat,
            "video_connected": False,
            "telemetry_connected": True,
            "device_manifest": self.device_manifest,
            "sim_mode": self.sim_mode,
            "transport": "http-polling",
        }


class PollingAgentRegistry:
    def __init__(self):
        self._lock = threading.RLock()
        self._clients: dict[str, PollingClient] = {}
        self._events: dict[str, PollingCommandEvent] = {}

    def register(
        self,
        client_id: str,
        device_manifest: list[dict[str, Any]],
        sim_mode: bool = False,
    ) -> dict[str, Any]:
        now = time.time()
        with self._lock:
            existing = self._clients.get(client_id)
            if existing is None:
                client = PollingClient(
                    client_id=client_id,
                    session_id=uuid.uuid4().hex,
                    connected_at=now,
                    last_heartbeat=now,
                    device_manifest=device_manifest,
                    sim_mode=sim_mode,
                )
                self._clients[client_id] = client
            else:
                existing.last_heartbeat = now
                existing.device_manifest = device_manifest
                existing.sim_mode = sim_mode
                client = existing

            return client.snapshot()

    def heartbeat(self, client_id: str) -> dict[str, Any] | None:
        with self._lock:
            self._prune_locked()
            client = self._clients.get(client_id)
            if client is None:
                return None
            client.last_heartbeat = time.time()
            return client.snapshot()

    def list_clients(self) -> list[dict[str, Any]]:
        with self._lock:
            self._prune_locked()
            return [client.snapshot() for client in self._clients.values()]

    def get_client(self, client_id: str) -> dict[str, Any] | None:
        with self._lock:
            self._prune_locked()
            client = self._clients.get(client_id)
            return client.snapshot() if client else None

    def get_client_devices(self, client_id: str) -> list[dict[str, Any]] | None:
        with self._lock:
            self._prune_locked()
            client = self._clients.get(client_id)
            return list(client.device_manifest) if client else None

    def has_client(self, client_id: str) -> bool:
        with self._lock:
            self._prune_locked()
            return client_id in self._clients

    def enqueue_command(self, client_id: str, command: str) -> PollingCommandEvent:
        with self._lock:
            self._prune_locked()
            client = self._clients.get(client_id)
            if client is None:
                raise KeyError(client_id)

            event = PollingCommandEvent(
                msg_id=uuid.uuid4().hex,
                client_id=client_id,
                command=command,
                sent_at=time.time(),
            )
            self._events[event.msg_id] = event
            client.pending.append(event.msg_id)
            return event

    def pop_pending_commands(self, client_id: str, limit: int = 10) -> list[dict[str, Any]]:
        safe_limit = max(1, min(limit, 100))
        with self._lock:
            self._prune_locked()
            client = self._clients.get(client_id)
            if client is None:
                return []

            client.last_heartbeat = time.time()
            msg_ids = client.pending[:safe_limit]
            del client.pending[:safe_limit]

            commands = []
            for msg_id in msg_ids:
                event = self._events.get(msg_id)
                if event is None:
                    continue
                event.delivered_at = time.time()
                commands.append(event.snapshot())
            return commands

    def ack_command(self, client_id: str, msg_id: str, accepted: bool) -> dict[str, Any] | None:
        with self._lock:
            event = self._events.get(msg_id)
            if event is None or event.client_id != client_id:
                return None
            event.ack = {"accepted": accepted}
            event.acked_at = time.time()
            return event.snapshot()

    def result_command(
        self,
        client_id: str,
        msg_id: str,
        status: str,
        detail: str,
    ) -> dict[str, Any] | None:
        with self._lock:
            event = self._events.get(msg_id)
            if event is None or event.client_id != client_id:
                return None
            event.result = {"status": status, "detail": detail}
            event.result_at = time.time()
            return event.snapshot()

    def get_command_event(self, msg_id: str) -> dict[str, Any] | None:
        with self._lock:
            event = self._events.get(msg_id)
            return event.snapshot() if event else None

    def list_command_events(self, client_id: str, limit: int = 100) -> list[dict[str, Any]]:
        safe_limit = max(1, min(limit, 500))
        with self._lock:
            events = [
                event.snapshot()
                for event in self._events.values()
                if event.client_id == client_id
            ]
        events.sort(key=lambda event: event["sent_at"], reverse=True)
        return events[:safe_limit]

    def _prune_locked(self) -> None:
        now = time.time()
        stale = [
            client_id
            for client_id, client in self._clients.items()
            if now - client.last_heartbeat > POLLING_AGENT_TIMEOUT_S
        ]
        for client_id in stale:
            self._clients.pop(client_id, None)


polling_registry = PollingAgentRegistry()
