"""Motor driver — controls stepper/servo motors via Arduino serial."""

from __future__ import annotations

from .base import DeviceDriver


class MotorDriver(DeviceDriver):
    device_type = "motor"

    def execute_command(self, command: str, params: str = "") -> tuple[str, str]:
        full = f"{command} {params}".strip()

        if command == "step":
            steps = int(params) if params else 100
            self._log(f"motor_step {steps}")
            if self.sim_mode:
                return ("ok", f"SIM: step {steps} executed")
            self._serial_write(f"motor_step {steps}")
            return ("ok", f"step {steps} executed")

        if command == "speed":
            rpm = int(params) if params else 60
            self._log(f"motor_speed {rpm}")
            if self.sim_mode:
                return ("ok", f"SIM: speed {rpm} set")
            self._serial_write(f"motor_speed {rpm}")
            return ("ok", f"speed {rpm} set")

        if command == "home":
            self._log("motor_home")
            if self.sim_mode:
                return ("ok", "SIM: homed")
            self._serial_write("motor_home")
            return ("ok", "homed")

        if command == "stop":
            self._log("motor_stop")
            if self.sim_mode:
                return ("ok", "SIM: stopped")
            self._serial_write("motor_stop")
            return ("ok", "stopped")

        return ("error", f"unknown motor command: {command}")
