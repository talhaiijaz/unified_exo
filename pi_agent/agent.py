"""Exo-Platform Pi Agent — connects to server, manages devices, streams video and telemetry.

Run: python agent.py
With sim mode: EXO_SIM_MODE=1 EXO_HOST=127.0.0.1 python agent.py
"""

from __future__ import annotations

import json
import os
import socket
import struct
import sys
import threading
import time
import uuid

sys.path.insert(0, os.path.dirname(__file__))

import config
from devices import DEVICE_REGISTRY, DeviceDriver
from telemetry import telemetry_loop


class ClientAgent:
    def __init__(self):
        self.client_id = config.CLIENT_ID
        self.sim_mode = config.SIM_MODE
        self.devices: dict[str, DeviceDriver] = {}
        self._load_devices()

    def _load_devices(self) -> None:
        """Load device drivers from devices.json config."""
        config_path = config.DEVICES_CONFIG
        if not os.path.exists(config_path):
            self._log(f"No devices.json found at {config_path}, using defaults")
            return

        with open(config_path) as f:
            data = json.load(f)

        for dev_conf in data.get("devices", []):
            dev_type = dev_conf.get("type", "")
            dev_id = dev_conf.get("id", dev_type)
            driver_class = DEVICE_REGISTRY.get(dev_type)
            if driver_class is None:
                self._log(f"Unknown device type: {dev_type}, skipping")
                continue
            self.devices[dev_id] = driver_class(dev_id, dev_conf, self.sim_mode)
            self._log(f"Loaded device: {dev_id} ({dev_type})")

    def _log(self, message: str) -> None:
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{ts}] [{self.client_id}] {message}")

    def run_forever(self) -> None:
        self._log(f"Starting client agent sim_mode={self.sim_mode} devices={len(self.devices)}")
        while True:
            try:
                self._run_session()
            except Exception as err:
                self._log(f"Agent session ended: {err}")
            time.sleep(config.CONNECT_RETRY_S)

    def _run_session(self) -> None:
        control_sock = self._connect_with_retry(
            config.HOST, config.CONTROL_PORT, "control"
        )
        control_reader = control_sock.makefile("rb")

        # Send hello with device manifest
        hello = {
            "version": config.PROTOCOL_VERSION,
            "type": "hello",
            "client_id": self.client_id,
            "session_id": None,
            "msg_id": uuid.uuid4().hex,
            "ts": time.time(),
            "payload": {
                "sim_mode": self.sim_mode,
                "devices": [d.get_manifest_entry() for d in self.devices.values()],
            },
        }
        self._send_json_line(control_sock, hello)

        hello_ack = self._read_json_line(control_reader)
        if hello_ack is None or hello_ack.get("type") != "hello_ack":
            raise RuntimeError("Invalid hello_ack from server")

        session_id = str(hello_ack.get("session_id", "")).strip()
        if not session_id:
            raise RuntimeError("Server hello_ack missing session_id")

        self._log(f"Connected to server session={session_id}")

        session_stop = threading.Event()

        # Find the primary camera for video streaming
        camera = None
        for dev in self.devices.values():
            if dev.device_type == "camera":
                camera = dev
                break

        threads = [
            threading.Thread(
                target=self._heartbeat_loop,
                args=(control_sock, session_id, session_stop),
                daemon=True,
            ),
            threading.Thread(
                target=self._video_loop,
                args=(session_id, session_stop, camera),
                daemon=True,
            ),
            threading.Thread(
                target=telemetry_loop,
                args=(self.client_id, session_id, self.devices, session_stop),
                daemon=True,
            ),
        ]

        for t in threads:
            t.start()

        try:
            self._command_loop(control_sock, control_reader, session_id, session_stop)
        finally:
            session_stop.set()
            try:
                control_reader.close()
            except OSError:
                pass
            try:
                control_sock.close()
            except OSError:
                pass

    def _command_loop(
        self,
        control_sock: socket.socket,
        control_reader,
        session_id: str,
        session_stop: threading.Event,
    ) -> None:
        while not session_stop.is_set():
            msg = self._read_json_line(control_reader)
            if msg is None:
                raise RuntimeError("Server closed control connection")

            if msg.get("type") != "command":
                continue

            msg_id = str(msg.get("msg_id", "")).strip()
            command = str(msg.get("payload", {}).get("command", "")).strip()
            self._log(f"Received command msg_id={msg_id} command='{command}'")

            accepted = bool(command and msg_id)
            ack = {
                "version": config.PROTOCOL_VERSION,
                "type": "command_ack",
                "client_id": self.client_id,
                "session_id": session_id,
                "msg_id": msg_id or uuid.uuid4().hex,
                "ts": time.time(),
                "payload": {"accepted": accepted},
            }
            self._send_json_line(control_sock, ack)

            if not accepted:
                continue

            status, detail = self._execute_command(command)
            result = {
                "version": config.PROTOCOL_VERSION,
                "type": "command_result",
                "client_id": self.client_id,
                "session_id": session_id,
                "msg_id": msg_id,
                "ts": time.time(),
                "payload": {"status": status, "detail": detail},
            }
            self._send_json_line(control_sock, result)
            self._log(f"Result: {status} - {detail}")

    def _execute_command(self, command: str) -> tuple[str, str]:
        """Dispatch command to the appropriate device driver.

        Format: "device_type:command params" (new) or "step 100" (legacy)
        """
        try:
            # New format: "device_type:command params"
            if ":" in command:
                device_type, rest = command.split(":", 1)
                parts = rest.strip().split(" ", 1)
                cmd = parts[0]
                params = parts[1] if len(parts) > 1 else ""

                # Find device by type or id
                device = self.devices.get(device_type)
                if device is None:
                    # Search by device_type
                    for d in self.devices.values():
                        if d.device_type == device_type:
                            device = d
                            break

                if device is None:
                    return ("error", f"no device found: {device_type}")

                return device.execute_command(cmd, params)

            # Legacy format: "step 100", "display 0 hello"
            return self._execute_legacy_command(command)
        except Exception as err:
            return ("error", str(err))

    def _execute_legacy_command(self, command: str) -> tuple[str, str]:
        """Handle old-style commands for backwards compatibility."""
        if command.startswith("step "):
            parts = command.split(" ", 1)
            for d in self.devices.values():
                if d.device_type == "motor":
                    return d.execute_command("step", parts[1])
            return ("ok", f"SIM: {command}")

        if command.startswith("display "):
            parts = command.split(" ", 2)
            for d in self.devices.values():
                if d.device_type == "oled":
                    return d.execute_command("display", " ".join(parts[1:]))
            return ("ok", f"SIM: {command}")

        if command == "start_video":
            return ("ok", "video loop already active")

        return ("error", f"unsupported command: {command}")

    def _heartbeat_loop(
        self,
        control_sock: socket.socket,
        session_id: str,
        session_stop: threading.Event,
    ) -> None:
        while not session_stop.is_set():
            heartbeat = {
                "version": config.PROTOCOL_VERSION,
                "type": "heartbeat",
                "client_id": self.client_id,
                "session_id": session_id,
                "msg_id": uuid.uuid4().hex,
                "ts": time.time(),
                "payload": {},
            }
            try:
                self._send_json_line(control_sock, heartbeat)
            except OSError:
                session_stop.set()
                return
            session_stop.wait(config.HEARTBEAT_INTERVAL_S)

    def _video_loop(
        self,
        session_id: str,
        session_stop: threading.Event,
        camera: DeviceDriver | None,
    ) -> None:
        video_sock = self._connect_with_retry(
            config.HOST, config.VIDEO_PORT, "video"
        )

        registration = {
            "version": config.PROTOCOL_VERSION,
            "type": "video_hello",
            "client_id": self.client_id,
            "session_id": session_id,
            "msg_id": uuid.uuid4().hex,
            "ts": time.time(),
            "payload": {},
        }
        self._send_length_prefixed_json(video_sock, registration)

        # Use camera device driver or fallback to simulation
        from devices.camera import CameraDriver
        if camera is None:
            camera = CameraDriver("default_cam", {"resolution": [640, 480]}, self.sim_mode or True)

        frame_count = 0
        try:
            while not session_stop.is_set():
                frame = camera.capture_frame()
                video_sock.sendall(struct.pack(">I", len(frame)))
                video_sock.sendall(frame)
                frame_count += 1
                if frame_count % 60 == 0:
                    self._log(f"Sent {frame_count} video frames")
                session_stop.wait(1 / config.VIDEO_FPS)
        except OSError:
            session_stop.set()
        finally:
            try:
                video_sock.close()
            except OSError:
                pass

    # --- Network helpers ---

    def _connect_with_retry(self, host: str, port: int, label: str) -> socket.socket:
        while True:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                self._log(f"Connecting {label} to {host}:{port}")
                sock.connect((host, port))
                self._log(f"Connected {label}")
                return sock
            except OSError as err:
                sock.close()
                self._log(f"{label} connect failed: {err}. Retrying...")
                time.sleep(config.CONNECT_RETRY_S)

    def _send_json_line(self, sock: socket.socket, payload: dict) -> None:
        encoded = (json.dumps(payload, separators=(",", ":")) + "\n").encode("utf-8")
        sock.sendall(encoded)

    def _read_json_line(self, reader):
        line = reader.readline(config.MAX_CONTROL_LINE_BYTES + 1)
        if not line:
            return None
        if len(line) > config.MAX_CONTROL_LINE_BYTES:
            raise RuntimeError("Control line too large")
        return json.loads(line.decode("utf-8"))

    def _send_length_prefixed_json(self, sock: socket.socket, payload: dict) -> None:
        encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        sock.sendall(struct.pack(">I", len(encoded)))
        sock.sendall(encoded)


if __name__ == "__main__":
    ClientAgent().run_forever()
