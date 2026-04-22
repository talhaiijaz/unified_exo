"""
manager.py — Session state: one controller, many viewers, TTL-based lock.
"""
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional


LOCK_TTL_SECONDS = 30.0


@dataclass
class SessionState:
    session_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    running: bool = False
    controller_id: Optional[str] = None
    _last_heartbeat: float = field(default_factory=time.time, repr=False)

    def lock_expired(self) -> bool:
        if self.controller_id is None:
            return True
        return (time.time() - self._last_heartbeat) > LOCK_TTL_SECONDS

    def claim(self, client_id: str) -> bool:
        if self.controller_id is None or self.lock_expired():
            self.controller_id = client_id
            self._last_heartbeat = time.time()
            return True
        if self.controller_id == client_id:
            self._last_heartbeat = time.time()
            return True
        return False

    def release(self, client_id: str) -> bool:
        if self.controller_id == client_id:
            self.controller_id = None
            return True
        return False

    def heartbeat(self, client_id: str):
        if self.controller_id == client_id:
            self._last_heartbeat = time.time()

    def is_controller(self, client_id: str) -> bool:
        return self.controller_id == client_id and not self.lock_expired()

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "running": self.running,
            "controller_id": self.controller_id,
            "lock_expired": self.lock_expired(),
        }


# Module-level singleton
session = SessionState()
