"""
serial_manager.py — Serial communication with the Teensy.

Key design:
- Runs blocking serial I/O in a daemon thread (not async, avoids pyserial async issues)
- Correctly parses: column 0 = timestamp_ms, columns 1-10 = channels
- Supports send_command() for fire-and-forget control commands
- Exposes connected / streaming state
"""
import threading
import time
from typing import Optional

import serial
import serial.tools.list_ports

from backend.processing.buffer import EegBuffer


class SerialManager:
    def __init__(self, port: str, baud: int, num_channels: int, buffer: EegBuffer):
        self.port = port
        self.baud = baud
        self.num_channels = num_channels
        self.buffer = buffer

        self._serial: Optional[serial.Serial] = None
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

        self.connected = False
        self.streaming = False
        self.error: Optional[str] = None
        # command response queue for ACK/status lines from board
        from collections import deque
        self._responses = deque()
        self._resp_cv = threading.Condition()

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def start(self):
        """Open serial port and begin reading thread."""
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()

    def stop(self):
        """Signal the read thread to stop and close the port."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=3.0)
        self._close()

    def send_command(self, cmd: str):
        """Send a newline-terminated command. Non-blocking."""
        if self._serial and self._serial.is_open:
            try:
                self._serial.write(f"{cmd}\n".encode("utf-8"))
                self._serial.flush()
            except Exception as e:
                print(f"[Serial] send_command error: {e}")

    def send_command_with_response(self, cmd: str, timeout: float = 1.0) -> Optional[str]:
        """Send a command and wait (up to timeout) for an ACK/response line from the board."""
        if not (self._serial and self._serial.is_open):
            return None

        # clear previously queued responses
        with self._resp_cv:
            self._responses.clear()
        try:
            self._serial.write(f"{cmd}\n".encode("utf-8"))
            self._serial.flush()
        except Exception as e:
            print(f"[Serial] send_command error: {e}")
            return None

        # wait for a response pushed by read loop
        end = time.time() + float(timeout)
        with self._resp_cv:
            while time.time() < end:
                if self._responses:
                    return self._responses.popleft()
                remaining = end - time.time()
                if remaining <= 0:
                    break
                self._resp_cv.wait(timeout=remaining)
        return None

    def status(self) -> dict:
        return {
            "connected": self.connected,
            "streaming": self.streaming,
            "port": self.port,
            "error": self.error,
        }

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _open(self) -> bool:
        try:
            self._serial = serial.Serial(self.port, self.baud, timeout=1.0)
            time.sleep(0.5)  # let Teensy stabilize
            self.connected = True
            self.error = None
            print(f"[Serial] Connected to {self.port}")
            return True
        except serial.SerialException as e:
            self.error = str(e)
            self.connected = False
            print(f"[Serial] Could not open {self.port}: {e}")
            return False

    def _close(self):
        self.connected = False
        self.streaming = False
        if self._serial and self._serial.is_open:
            try:
                self._serial.close()
            except Exception:
                pass
        self._serial = None

    def _read_loop(self):
        """Blocking loop that runs in a daemon thread. Auto-reconnects on disconnect."""
        RECONNECT_DELAY = 3.0

        while not self._stop_event.is_set():
            if not self._open():
                print(f"[Serial] Retrying in {RECONNECT_DELAY}s...")
                time.sleep(RECONNECT_DELAY)
                continue

            self.send_command("csv_on")
            self.streaming = True
            print("[Serial] Streaming started")

            # Inner read loop
            while not self._stop_event.is_set():
                try:
                    raw = self._serial.readline()
                except serial.SerialException as e:
                    print(f"[Serial] Read error: {e}")
                    self.error = str(e)
                    self._close()
                    break  # outer loop will reconnect

                if not raw:
                    continue

                try:
                    line = raw.decode("utf-8", errors="ignore").strip()
                except Exception:
                    continue

                if not line:
                    continue

                # Skip banner, ack, and error lines from board
                low = line.lower()
                # Common control/status responses we want to capture
                if low.startswith("ready") or low.startswith("ok") or low.startswith("err") or low.startswith("status") or low.startswith("ack"):
                    print(f"[Board] {line}")
                    # push into response queue and notify any waiting thread
                    with self._resp_cv:
                        self._responses.append(line)
                        self._resp_cv.notify_all()
                    continue

                # -------------------------------------------------------
                # CRITICAL PARSER FIX:
                # Column 0 = timestamp_ms (skip as channel)
                # Columns 1..num_channels = actual EEG channels
                # -------------------------------------------------------
                parts = line.split(",")
                expected = 1 + self.num_channels  # timestamp + channels
                if len(parts) < expected:
                    continue

                try:
                    timestamp_ms = int(parts[0])
                    channels = [float(parts[i]) for i in range(1, 1 + self.num_channels)]
                    self.buffer.append(channels, timestamp_ms)
                except (ValueError, IndexError):
                    continue

            if not self._stop_event.is_set():
                print(f"[Serial] Disconnected — reconnecting in {RECONNECT_DELAY}s...")
                time.sleep(RECONNECT_DELAY)

        # Clean shutdown
        if self._serial and self._serial.is_open:
            self.send_command("csv_off")
        self._close()
        print("[Serial] Read loop stopped")


def find_teensy_port() -> Optional[str]:
    """
    Try to auto-detect a Teensy on a known stable symlink,
    then fall back to scanning for USB CDC devices.
    """
    # Stable udev symlink (set up with 99-teensy.rules)
    candidates = [
        "/dev/teensy-eeg",
        "/dev/ttyACM0",
        "/dev/ttyACM1",
        "/dev/ttyUSB0",
        "COM3", "COM4", "COM5", "COM14",
    ]
    for p in candidates:
        try:
            s = serial.Serial(p, 115200, timeout=0.1)
            s.close()
            return p
        except Exception:
            continue
    return None
