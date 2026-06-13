"""Exoskeleton arm driver -- sends five joint angles to an Arduino bridge."""

from __future__ import annotations

from urllib.parse import urlencode
from urllib.request import urlopen

from .base import DeviceDriver


JOINT_NAMES = (
    "shoulder_pitch",
    "shoulder_roll",
    "elbow_flexion",
    "wrist_pitch",
    "wrist_yaw",
)


class ExoskeletonDriver(DeviceDriver):
    """Controls the Arduino arm bridge with pitch, roll, elbow, wrist pitch, wrist yaw."""

    device_type = "exoskeleton"

    def __init__(self, device_id: str, device_config: dict, sim_mode: bool):
        super().__init__(device_id, device_config, sim_mode)
        self._angles = [0, 0, 0, 0, 0]
        self._enabled = True
        self._e_stop = False

    def execute_command(self, command: str, params: str = "") -> tuple[str, str]:
        command = command.strip().lower()

        if command in {"angles", "set_angles"}:
            if not self._enabled:
                return ("error", "exoskeleton disabled")
            if self._e_stop:
                return ("error", "e-stop is active")
            return self._set_angles(params)

        if command == "home":
            if self._e_stop:
                return ("error", "clear e-stop before homing")
            if not self._enabled:
                return ("error", "exoskeleton disabled")
            return self._set_angles("0,0,0,0,0")

        if command == "stop":
            return self._send_control("stop")

        if command == "enable":
            self._enabled = self._parse_bool(params, default=True)
            if not self._enabled:
                self._send_control("stop")
            return ("ok", f"enabled={self._enabled}")

        if command == "estop":
            self._e_stop = True
            self._send_control("estop")
            return ("ok", "e-stop active")

        if command in {"estop_clear", "clear_estop"}:
            self._e_stop = False
            return ("ok", "e-stop cleared")

        if command == "raw":
            detail = self._send_payload(params)
            return ("ok", detail or "raw command sent")

        return ("error", f"unknown exoskeleton command: {command}")

    def read_telemetry(self) -> dict:
        return {
            "angles": dict(zip(JOINT_NAMES, self._angles)),
            "enabled": self._enabled,
            "e_stop": self._e_stop,
            "transport": self.config.get("transport", "http"),
        }

    def _set_angles(self, params: str) -> tuple[str, str]:
        values = self._parse_angles(params)
        self._angles = values
        payload = ",".join(str(v) for v in values)

        if self.sim_mode:
            return ("ok", f"SIM: angles {payload}")

        detail = self._send_payload(payload)
        return ("ok", detail or f"angles {payload} sent")

    def _parse_angles(self, params: str) -> list[int]:
        raw = params.strip()
        if raw.startswith("data="):
            raw = raw.split("=", 1)[1]

        parts = raw.replace(",", " ").split()
        if len(parts) != 5:
            raise ValueError("angles command requires 5 values: pitch,roll,elbow,wrist_pitch,wrist_yaw")

        return [round(float(part)) for part in parts]

    def _parse_bool(self, params: str, default: bool) -> bool:
        raw = params.strip().lower()
        if not raw:
            return default
        return raw in {"1", "true", "yes", "on", "enable", "enabled"}

    def _send_payload(self, payload: str) -> str | None:
        transport = str(self.config.get("transport", "http")).lower()
        if transport == "serial":
            prefix = str(self.config.get("command_prefix", "angles")).strip()
            line = f"{prefix} {payload}".strip() if prefix else payload
            response = self._serial_write(line)
            return response or f"serial {line}"

        return self._send_http(payload)

    def _send_control(self, command: str) -> tuple[str, str]:
        if self.sim_mode:
            return ("ok", f"SIM: {command}")

        transport = str(self.config.get("transport", "http")).lower()
        if transport == "serial":
            configured = str(self.config.get(f"{command}_command", command)).strip()
            response = self._serial_write(configured)
            return ("ok", response or configured)

        if not self.config.get("send_control_http", False):
            return ("ok", f"{command} recorded locally")

        detail = self._send_http(command)
        return ("ok", detail or command)

    def _send_http(self, value: str) -> str | None:
        url = str(self.config.get("url", "http://127.0.0.1:5000/angles"))
        query_param = str(self.config.get("query_param", "data"))
        timeout = float(self.config.get("timeout_s", 1.5))

        separator = "&" if "?" in url else "?"
        full_url = f"{url}{separator}{urlencode({query_param: value})}"
        with urlopen(full_url, timeout=timeout) as response:
            body = response.read(200).decode("utf-8", errors="replace").strip()
            return body or f"http {response.status}"
