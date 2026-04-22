"""Telemetry sender — collects sensor readings from all devices and streams to server."""

from __future__ import annotations

import json
import socket
import struct
import time
import uuid

import config


def telemetry_loop(
    client_id: str,
    session_id: str,
    devices: dict,
    session_stop,
) -> None:
    """Connect to server telemetry port and stream sensor data."""
    try:
        sock = _connect_with_retry(config.HOST, config.TELEMETRY_PORT)
    except Exception as err:
        print(f"[telemetry] Failed to connect: {err}")
        return

    # Send telemetry_hello
    registration = {
        "version": config.PROTOCOL_VERSION,
        "type": "telemetry_hello",
        "client_id": client_id,
        "session_id": session_id,
        "msg_id": uuid.uuid4().hex,
        "ts": time.time(),
        "payload": {},
    }
    _send_length_prefixed_json(sock, registration)
    print(f"[telemetry] Connected to server")

    try:
        while not session_stop.is_set():
            readings = {}
            for dev_id, device in devices.items():
                try:
                    data = device.read_telemetry()
                    if data is not None:
                        readings[dev_id] = data
                except Exception as err:
                    readings[dev_id] = {"error": str(err)}

            if readings:
                packet = {
                    "client_id": client_id,
                    "timestamp": time.time(),
                    "readings": readings,
                }
                _send_length_prefixed_json(sock, packet)

            session_stop.wait(1.0 / config.TELEMETRY_HZ)
    except OSError:
        session_stop.set()
    finally:
        try:
            sock.close()
        except OSError:
            pass


def _connect_with_retry(host: str, port: int) -> socket.socket:
    for _ in range(10):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.connect((host, port))
            return sock
        except OSError:
            sock.close()
            time.sleep(config.CONNECT_RETRY_S)
    raise RuntimeError(f"Failed to connect to telemetry port {host}:{port}")


def _send_length_prefixed_json(sock: socket.socket, payload: dict) -> None:
    encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    sock.sendall(struct.pack(">I", len(encoded)))
    sock.sendall(encoded)
