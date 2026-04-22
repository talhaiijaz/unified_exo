"""Gyroscope/IMU driver — reads accelerometer and gyroscope data."""

from __future__ import annotations

import math
import random
import time
from typing import Any

from .base import DeviceDriver


class GyroscopeDriver(DeviceDriver):
    device_type = "gyroscope"

    def __init__(self, device_id: str, device_config: dict, sim_mode: bool):
        super().__init__(device_id, device_config, sim_mode)
        self._calibrated = False
        self._sim_angle = 0.0

    def execute_command(self, command: str, params: str = "") -> tuple[str, str]:
        if command == "calibrate":
            self._log("calibrating IMU")
            self._calibrated = True
            if not self.sim_mode:
                self._serial_write("imu_calibrate")
            return ("ok", "IMU calibrated")

        if command == "read":
            data = self.read_telemetry()
            return ("ok", str(data))

        return ("error", f"unknown gyroscope command: {command}")

    def read_telemetry(self) -> dict[str, Any] | None:
        if self.sim_mode:
            self._sim_angle += 0.5
            return {
                "accel_x": round(random.uniform(-0.1, 0.1), 3),
                "accel_y": round(random.uniform(-0.1, 0.1), 3),
                "accel_z": round(9.8 + random.uniform(-0.05, 0.05), 3),
                "gyro_x": round(math.sin(self._sim_angle * 0.1) * 2, 3),
                "gyro_y": round(math.cos(self._sim_angle * 0.1) * 2, 3),
                "gyro_z": round(random.uniform(-0.5, 0.5), 3),
                "calibrated": self._calibrated,
            }

        resp = self._serial_write("imu_read")
        if resp:
            try:
                import json
                return json.loads(resp)
            except Exception:
                pass
        return {"accel_x": 0, "accel_y": 0, "accel_z": 9.8, "gyro_x": 0, "gyro_y": 0, "gyro_z": 0, "calibrated": self._calibrated}
