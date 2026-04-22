"""Camera driver — captures frames from Pi camera or USB camera."""

from __future__ import annotations

import io
import time
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from .base import DeviceDriver


class CameraDriver(DeviceDriver):
    device_type = "camera"

    def __init__(self, device_id: str, device_config: dict, sim_mode: bool):
        super().__init__(device_id, device_config, sim_mode)
        self._picam2 = None
        self._frame_count = 0
        self._recording = False
        self._resolution = tuple(device_config.get("resolution", [640, 480]))
        self._camera_index = device_config.get("camera_index", 0)
        try:
            self._font = ImageFont.load_default()
        except Exception:
            self._font = None

    def execute_command(self, command: str, params: str = "") -> tuple[str, str]:
        if command == "start":
            self._log("camera starting")
            return ("ok", "camera active")

        if command == "stop":
            self._log("camera stopping")
            self.cleanup()
            return ("ok", "camera stopped")

        if command == "record_start":
            self._recording = True
            return ("ok", "recording started")

        if command == "record_stop":
            self._recording = False
            return ("ok", "recording stopped")

        if command == "snapshot":
            return ("ok", "snapshot captured")

        return ("error", f"unknown camera command: {command}")

    def capture_frame(self) -> bytes:
        """Capture a single JPEG frame."""
        if self.sim_mode or not self._try_init_camera():
            return self._simulated_frame()
        return self._real_frame()

    def read_telemetry(self) -> dict[str, Any] | None:
        return {
            "frame_count": self._frame_count,
            "recording": self._recording,
            "resolution": list(self._resolution),
        }

    def _try_init_camera(self) -> bool:
        if self._picam2 is not None:
            return True
        try:
            from picamera2 import Picamera2
            self._picam2 = Picamera2(self._camera_index)
            cfg = self._picam2.create_still_configuration(
                main={"size": self._resolution},
                buffer_count=1,
            )
            self._picam2.configure(cfg)
            self._picam2.start()
            time.sleep(2)
            return True
        except Exception:
            self._picam2 = None
            return False

    def _real_frame(self) -> bytes:
        buf = io.BytesIO()
        array = self._picam2.capture_array()
        image = Image.fromarray(array)
        image.save(buf, format="JPEG", quality=70)
        self._frame_count += 1
        return buf.getvalue()

    def _simulated_frame(self) -> bytes:
        buf = io.BytesIO()
        color = (self._frame_count % 255, 100, 220)
        image = Image.new("RGB", self._resolution, color=color)
        draw = ImageDraw.Draw(image)

        text = f"[{self.device_id}]\n{time.strftime('%H:%M:%S')}\nFrame: {self._frame_count}"
        x, y, pad = 10, 10, 4
        try:
            bbox = draw.multiline_textbbox((x, y), text, font=self._font) if self._font else draw.multiline_textbbox((x, y), text)
            bg = (bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad)
        except Exception:
            bg = (x - pad, y - pad, x + 220, y + 60)

        draw.rectangle(bg, fill=(0, 0, 0))
        if self._font:
            draw.multiline_text((x, y), text, fill=(255, 255, 255), font=self._font)
        else:
            draw.multiline_text((x, y), text, fill=(255, 255, 255))

        image.save(buf, format="JPEG", quality=70)
        self._frame_count += 1
        return buf.getvalue()

    def cleanup(self) -> None:
        if self._picam2 is not None:
            try:
                self._picam2.close()
            except Exception:
                pass
            self._picam2 = None
