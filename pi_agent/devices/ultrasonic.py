"""Ultrasonic stimulator driver — controls ultrasonic transducer via Arduino PWM."""

from __future__ import annotations

from typing import Any

from .base import DeviceDriver


class UltrasonicDriver(DeviceDriver):
    device_type = "ultrasonic"

    def __init__(self, device_id: str, device_config: dict, sim_mode: bool):
        super().__init__(device_id, device_config, sim_mode)
        self._active = False
        self._frequency_hz = 0
        self._duration_ms = 0

    def execute_command(self, command: str, params: str = "") -> tuple[str, str]:
        if command == "pulse":
            parts = params.split()
            self._frequency_hz = int(parts[0]) if len(parts) > 0 else 40000
            self._duration_ms = int(parts[1]) if len(parts) > 1 else 500
            self._active = True
            self._log(f"us_pulse {self._frequency_hz}Hz {self._duration_ms}ms")
            if not self.sim_mode:
                self._serial_write(f"us_pulse {self._frequency_hz} {self._duration_ms}")
            return ("ok", f"pulse {self._frequency_hz}Hz for {self._duration_ms}ms")

        if command == "stop":
            self._active = False
            self._frequency_hz = 0
            self._log("us_stop")
            if not self.sim_mode:
                self._serial_write("us_stop")
            return ("ok", "ultrasonic stopped")

        if command == "set_frequency":
            self._frequency_hz = int(params) if params else 40000
            self._log(f"us_freq {self._frequency_hz}")
            if not self.sim_mode:
                self._serial_write(f"us_freq {self._frequency_hz}")
            return ("ok", f"frequency set to {self._frequency_hz}Hz")

        return ("error", f"unknown ultrasonic command: {command}")

    def read_telemetry(self) -> dict[str, Any] | None:
        return {
            "active": self._active,
            "frequency_hz": self._frequency_hz,
            "duration_ms": self._duration_ms,
        }
