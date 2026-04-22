"""TENS unit driver — controls transcutaneous electrical nerve stimulation.

SAFETY: Auto-stops after configurable duration. Max intensity enforced.
"""

from __future__ import annotations

import time
import threading
from typing import Any

from .base import DeviceDriver


class TENSDriver(DeviceDriver):
    device_type = "tens"

    def __init__(self, device_id: str, device_config: dict, sim_mode: bool):
        super().__init__(device_id, device_config, sim_mode)
        self._intensity = 0
        self._frequency_hz = 0
        self._active = False
        self._max_intensity = device_config.get("max_intensity", 100)
        self._max_duration_s = device_config.get("max_duration_s", 30)
        self._auto_stop_timer: threading.Timer | None = None

    def execute_command(self, command: str, params: str = "") -> tuple[str, str]:
        if command == "set":
            parts = params.split()
            intensity = min(self._max_intensity, max(0, int(parts[0]) if len(parts) > 0 else 0))
            freq = int(parts[1]) if len(parts) > 1 else 40
            duration = min(self._max_duration_s, float(parts[2]) if len(parts) > 2 else 10)

            self._intensity = intensity
            self._frequency_hz = freq
            self._active = True
            self._log(f"tens_set intensity={intensity} freq={freq}Hz duration={duration}s")

            # Auto-stop safety timer
            self._cancel_auto_stop()
            self._auto_stop_timer = threading.Timer(duration, self._auto_stop)
            self._auto_stop_timer.daemon = True
            self._auto_stop_timer.start()

            if not self.sim_mode:
                self._serial_write(f"tens_set {intensity} {freq} {int(duration * 1000)}")
            return ("ok", f"TENS active: {intensity}/{self._max_intensity} at {freq}Hz for {duration}s")

        if command == "pattern":
            pattern_name = params.strip()
            self._active = True
            self._log(f"tens_pattern {pattern_name}")
            if not self.sim_mode:
                self._serial_write(f"tens_pattern {pattern_name}")
            return ("ok", f"TENS pattern '{pattern_name}' activated")

        if command == "stop":
            return self._stop()

        return ("error", f"unknown TENS command: {command}")

    def read_telemetry(self) -> dict[str, Any] | None:
        return {
            "active": self._active,
            "intensity": self._intensity,
            "frequency_hz": self._frequency_hz,
            "max_intensity": self._max_intensity,
        }

    def _stop(self) -> tuple[str, str]:
        self._intensity = 0
        self._frequency_hz = 0
        self._active = False
        self._cancel_auto_stop()
        self._log("tens_stop")
        if not self.sim_mode:
            self._serial_write("tens_stop")
        return ("ok", "TENS stopped")

    def _auto_stop(self) -> None:
        self._log("TENS auto-stop triggered (safety)")
        self._stop()

    def _cancel_auto_stop(self) -> None:
        if self._auto_stop_timer is not None:
            self._auto_stop_timer.cancel()
            self._auto_stop_timer = None

    def cleanup(self) -> None:
        self._stop()
        super().cleanup()
