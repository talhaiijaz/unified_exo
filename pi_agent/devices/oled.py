"""OLED display driver — controls OLED glasses/display via serial."""

from __future__ import annotations

from .base import DeviceDriver


class OLEDDriver(DeviceDriver):
    device_type = "oled"

    def execute_command(self, command: str, params: str = "") -> tuple[str, str]:
        if command == "display":
            parts = params.split(" ", 1)
            index = int(parts[0]) if parts and parts[0].isdigit() else 0
            message = parts[1] if len(parts) > 1 else ""
            self._log(f"oled_display {index} {message}")
            if self.sim_mode:
                return ("ok", f"SIM: display {index} '{message}'")
            self._serial_write(f"oled_display {index} {message}")
            return ("ok", f"display {index} executed")

        if command == "clear" or command == "blank":
            self._log("oled_clear")
            if self.sim_mode:
                return ("ok", "SIM: cleared")
            self._serial_write("oled_clear")
            return ("ok", "cleared")

        if command == "dot":
            # Moving dot for eye tracking: "dot x y" or "dot sweep"
            self._log(f"oled_dot {params}")
            if self.sim_mode:
                return ("ok", f"SIM: dot {params}")
            self._serial_write(f"oled_dot {params}")
            return ("ok", f"dot {params}")

        if command == "message":
            self._log(f"oled_message {params}")
            if self.sim_mode:
                return ("ok", f"SIM: message '{params}'")
            self._serial_write(f"oled_message {params}")
            return ("ok", f"message sent")

        return ("error", f"unknown oled command: {command}")
