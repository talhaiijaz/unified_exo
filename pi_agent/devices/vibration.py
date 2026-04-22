"""Vibration motor driver — controls vibration motors via Arduino PWM."""

from __future__ import annotations

from typing import Any

from .base import DeviceDriver


class VibrationDriver(DeviceDriver):
    device_type = "vibration"

    def __init__(self, device_id: str, device_config: dict, sim_mode: bool):
        super().__init__(device_id, device_config, sim_mode)
        self._intensity = 0
        self._pattern: str | None = None

    def execute_command(self, command: str, params: str = "") -> tuple[str, str]:
        if command == "set":
            self._intensity = min(255, max(0, int(params) if params else 0))
            self._pattern = None
            self._log(f"vib_set {self._intensity}")
            if not self.sim_mode:
                self._serial_write(f"vib_set {self._intensity}")
            return ("ok", f"intensity set to {self._intensity}")

        if command == "pattern":
            self._pattern = params.strip()
            self._log(f"vib_pattern {self._pattern}")
            if not self.sim_mode:
                self._serial_write(f"vib_pattern {self._pattern}")
            return ("ok", f"pattern '{self._pattern}' activated")

        if command == "stop":
            self._intensity = 0
            self._pattern = None
            self._log("vib_stop")
            if not self.sim_mode:
                self._serial_write("vib_set 0")
            return ("ok", "vibration stopped")

        return ("error", f"unknown vibration command: {command}")

    def read_telemetry(self) -> dict[str, Any] | None:
        return {
            "intensity": self._intensity,
            "pattern": self._pattern,
            "active": self._intensity > 0 or self._pattern is not None,
        }
