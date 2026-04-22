"""SQLite database for persistent storage of telemetry, commands, users, and recordings."""

from __future__ import annotations

import sqlite3
import time
from pathlib import Path

import config

_db: sqlite3.Connection | None = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'researcher',
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    device_type TEXT NOT NULL,
    sensor_name TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT DEFAULT '',
    timestamp REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_telemetry_client_ts ON telemetry(client_id, timestamp);

CREATE TABLE IF NOT EXISTS recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    camera_id TEXT NOT NULL DEFAULT 'main',
    started_at REAL NOT NULL,
    ended_at REAL,
    file_path TEXT NOT NULL,
    size_bytes INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS command_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    msg_id TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL,
    device_type TEXT DEFAULT '',
    command TEXT NOT NULL,
    sent_at REAL NOT NULL,
    ack_at REAL,
    ack_accepted INTEGER,
    result_at REAL,
    result_status TEXT,
    result_detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_command_log_client ON command_log(client_id, sent_at);
"""


def get_db() -> sqlite3.Connection:
    global _db
    if _db is None:
        Path(config.DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)
        _db = sqlite3.connect(config.DATABASE_PATH, check_same_thread=False)
        _db.row_factory = sqlite3.Row
        _db.executescript(SCHEMA)
    return _db


def close_db() -> None:
    global _db
    if _db is not None:
        _db.close()
        _db = None


# --- Users ---

def create_user(username: str, password_hash: str, role: str = "researcher") -> int:
    db = get_db()
    cursor = db.execute(
        "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
        (username, password_hash, role, time.time()),
    )
    db.commit()
    return cursor.lastrowid


def get_user_by_username(username: str) -> dict | None:
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    return dict(row) if row else None


def list_users() -> list[dict]:
    db = get_db()
    rows = db.execute("SELECT id, username, role, created_at FROM users").fetchall()
    return [dict(r) for r in rows]


# --- Telemetry ---

def save_telemetry(client_id: str, device_type: str, sensor_name: str, value: float, unit: str = "", timestamp: float | None = None) -> None:
    db = get_db()
    db.execute(
        "INSERT INTO telemetry (client_id, device_type, sensor_name, value, unit, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
        (client_id, device_type, sensor_name, value, unit, timestamp or time.time()),
    )
    db.commit()


def save_telemetry_batch(client_id: str, readings: dict, timestamp: float | None = None) -> None:
    """Save a batch of telemetry readings from a single packet."""
    db = get_db()
    ts = timestamp or time.time()
    for key, val in readings.items():
        if isinstance(val, dict):
            for sub_key, sub_val in val.items():
                if isinstance(sub_val, (int, float)):
                    db.execute(
                        "INSERT INTO telemetry (client_id, device_type, sensor_name, value, unit, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                        (client_id, key, sub_key, float(sub_val), "", ts),
                    )
        elif isinstance(val, (int, float)):
            db.execute(
                "INSERT INTO telemetry (client_id, device_type, sensor_name, value, unit, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                (client_id, "", key, float(val), "", ts),
            )
    db.commit()


def get_telemetry(client_id: str, since: float | None = None, limit: int = 1000) -> list[dict]:
    db = get_db()
    if since:
        rows = db.execute(
            "SELECT * FROM telemetry WHERE client_id = ? AND timestamp > ? ORDER BY timestamp DESC LIMIT ?",
            (client_id, since, limit),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM telemetry WHERE client_id = ? ORDER BY timestamp DESC LIMIT ?",
            (client_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


# --- Command Log ---

def log_command(msg_id: str, client_id: str, command: str, device_type: str = "", sent_at: float | None = None) -> None:
    db = get_db()
    db.execute(
        "INSERT OR IGNORE INTO command_log (msg_id, client_id, device_type, command, sent_at) VALUES (?, ?, ?, ?, ?)",
        (msg_id, client_id, device_type, command, sent_at or time.time()),
    )
    db.commit()


def update_command_ack(msg_id: str, accepted: bool) -> None:
    db = get_db()
    db.execute(
        "UPDATE command_log SET ack_at = ?, ack_accepted = ? WHERE msg_id = ?",
        (time.time(), int(accepted), msg_id),
    )
    db.commit()


def update_command_result(msg_id: str, status: str, detail: str) -> None:
    db = get_db()
    db.execute(
        "UPDATE command_log SET result_at = ?, result_status = ?, result_detail = ? WHERE msg_id = ?",
        (time.time(), status, detail, msg_id),
    )
    db.commit()


def get_command_history(client_id: str, limit: int = 100) -> list[dict]:
    db = get_db()
    rows = db.execute(
        "SELECT * FROM command_log WHERE client_id = ? ORDER BY sent_at DESC LIMIT ?",
        (client_id, limit),
    ).fetchall()
    return [dict(r) for r in rows]


# --- Recordings ---

def create_recording(client_id: str, camera_id: str, file_path: str) -> int:
    db = get_db()
    cursor = db.execute(
        "INSERT INTO recordings (client_id, camera_id, started_at, file_path) VALUES (?, ?, ?, ?)",
        (client_id, camera_id, time.time(), file_path),
    )
    db.commit()
    return cursor.lastrowid


def finish_recording(recording_id: int, size_bytes: int) -> None:
    db = get_db()
    db.execute(
        "UPDATE recordings SET ended_at = ?, size_bytes = ? WHERE id = ?",
        (time.time(), size_bytes, recording_id),
    )
    db.commit()


def list_recordings(client_id: str | None = None) -> list[dict]:
    db = get_db()
    if client_id:
        rows = db.execute(
            "SELECT * FROM recordings WHERE client_id = ? ORDER BY started_at DESC",
            (client_id,),
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM recordings ORDER BY started_at DESC").fetchall()
    return [dict(r) for r in rows]
