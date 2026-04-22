"""Base class for all device drivers."""

from __future__ import annotations

from typing import Any


class DeviceDriver:
    """Abstract base class for device drivers on the Pi agent."""

    device_type: str = "unknown"

    def __init__(self, device_id: str, device_config: dict, sim_mode: bool):
        self.device_id = device_id
        self.config = device_config
        self.sim_mode = sim_mode
        self._serial_conn = None

    def execute_command(self, command: str, params: str = "") -> tuple[str, str]:
        """Execute a command. Returns (status, detail)."""
        return ("error", f"unsupported command: {command}")

    def read_telemetry(self) -> dict[str, Any] | None:
        """Read current sensor data. Returns None if device has no telemetry."""
        return None

    def get_manifest_entry(self) -> dict[str, Any]:
        """Return device info for the hello manifest."""
        return {
            "type": self.device_type,
            "id": self.device_id,
            "config": {k: v for k, v in self.config.items() if k != "port"},
        }

    def cleanup(self) -> None:
        """Clean up resources."""
        if self._serial_conn is not None:
            try:
                self._serial_conn.close()
            except Exception:
                pass
            self._serial_conn = None

    def _get_serial(self):
        """Get or create serial connection."""
        if self._serial_conn is not None:
            return self._serial_conn

        try:
            import serial
        except ImportError:
            raise RuntimeError("pyserial is not installed")

        port = self.config.get("port", "/dev/ttyUSB0")
        baud = self.config.get("baud", 9600)
        self._serial_conn = serial.Serial(port, baud, timeout=1)
        return self._serial_conn

    def _serial_write(self, data: str) -> str | None:
        """Write to serial and optionally read response."""
        if self.sim_mode:
            return None

        ser = self._get_serial()
        ser.write(f"{data}\r".encode("utf-8"))
        ser.flush()

        # Try to read a response line
        try:
            line = ser.readline().decode("utf-8").strip()
            return line if line else None
        except Exception:
            return None

    def _log(self, msg: str) -> None:
        import time
        ts = time.strftime("%H:%M:%S")
        print(f"  [{ts}] [{self.device_id}] {msg}")
