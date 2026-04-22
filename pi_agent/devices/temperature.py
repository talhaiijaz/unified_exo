"""Temperature sensor driver — reads/controls temperature via Arduino."""

from __future__ import annotations

import random
import time
from typing import Any

from .base import DeviceDriver


class TemperatureDriver(DeviceDriver):
    device_type = "temperature"

    def __init__(self, device_id: str, device_config: dict, sim_mode: bool):
        super().__init__(device_id, device_config, sim_mode)
        self._target_temp: float | None = None
        self._control_active = False
        self._last_reading = 25.0

    def execute_command(self, command: str, params: str = "") -> tuple[str, str]:
        if command == "read":
            reading = self._read_temp()
            return ("ok", f"temperature: {reading:.1f}C")

        if command == "set_target":
            self._target_temp = float(params) if params else None
            self._log(f"target set to {self._target_temp}")
            if not self.sim_mode:
                self._serial_write(f"temp_target {self._target_temp}")
            return ("ok", f"target set to {self._target_temp}C")

        if command == "control":
            self._control_active = params.strip().lower() in ("on", "1", "true")
            self._log(f"control {'on' if self._control_active else 'off'}")
            if not self.sim_mode:
                self._serial_write(f"temp_control {'on' if self._control_active else 'off'}")
            return ("ok", f"control {'enabled' if self._control_active else 'disabled'}")

        return ("error", f"unknown temperature command: {command}")

    def read_telemetry(self) -> dict[str, Any] | None:
        return {
            "temperature_c": self._read_temp(),
            "target_c": self._target_temp,
            "control_active": self._control_active,
        }

    def _read_temp(self) -> float:
        if self.sim_mode:
            # Simulate gradual temperature changes
            self._last_reading += random.uniform(-0.3, 0.3)
            if self._target_temp and self._control_active:
                diff = self._target_temp - self._last_reading
                self._last_reading += diff * 0.1
            return round(self._last_reading, 1)

        resp = self._serial_write("temp_read")
        if resp:
            try:
                return float(resp)
            except ValueError:
                pass
        return self._last_reading
