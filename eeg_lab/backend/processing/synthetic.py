"""
synthetic.py — Generates realistic synthetic EEG when no board is connected.

Produces multi-channel signals with:
- Alpha rhythm (10 Hz) strongest on posterior channels
- Beta rhythm (20 Hz) on frontal channels
- Delta (2 Hz) low-frequency drift
- Pink noise baseline
- Occasional artifact spikes

Run via: POST /api/demo/start  (controller only)
"""
import math
import threading
import time

import numpy as np

from backend.processing.buffer import EegBuffer


class SyntheticEegGenerator:
    """Generates and pushes synthetic EEG samples into a buffer at a target fs."""

    def __init__(self, buffer: EegBuffer, fs: float = 250.0, num_channels: int = 10):
        self.buffer = buffer
        self.fs = fs
        self.num_channels = num_channels

        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self.running = False

        # Pink noise state
        self._pink_state = np.zeros((num_channels, 7))

    def start(self):
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        self.running = True
        print("[Demo] Synthetic EEG generator started")

    def stop(self):
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2.0)
        self.running = False
        print("[Demo] Synthetic EEG generator stopped")

    def _loop(self):
        dt = 1.0 / self.fs
        t = 0.0
        sample_idx = 0
        interval = dt

        while not self._stop.is_set():
            t_start = time.perf_counter()

            sample = self._generate_sample(t, sample_idx)
            ts_ms = int(t * 1000)
            self.buffer.append(sample, ts_ms)

            t += dt
            sample_idx += 1

            elapsed = time.perf_counter() - t_start
            sleep = interval - elapsed
            if sleep > 0:
                time.sleep(sleep)

    def _generate_sample(self, t: float, idx: int) -> list[float]:
        n = self.num_channels
        sample = np.zeros(n)

        for ch in range(n):
            # Alpha (8–12 Hz) — stronger on ch 7–9 (posterior)
            alpha_amp = 60.0 if ch >= 7 else 20.0
            alpha_freq = 9.5 + ch * 0.15
            alpha = alpha_amp * math.sin(2 * math.pi * alpha_freq * t + ch * 0.4)

            # Beta (15–30 Hz) — stronger on ch 0–3 (frontal)
            beta_amp = 15.0 if ch < 4 else 5.0
            beta_freq = 20.0 + ch * 0.5
            beta = beta_amp * math.sin(2 * math.pi * beta_freq * t + ch * 0.8)

            # Delta (1–4 Hz) — slow drift
            delta = 40.0 * math.sin(2 * math.pi * 2.0 * t + ch * 1.2)

            # Pink noise
            pink = self._pink_noise(ch)

            # Occasional artifacts (1% of samples on random channels)
            artifact = 0.0
            if np.random.random() < 0.003 and ch == (idx // 100) % n:
                artifact = np.random.uniform(200, 500) * np.random.choice([-1, 1])

            # 12-bit ADC center ≈ 2048, ± signal
            raw = 2048.0 + alpha + beta + delta + pink * 30.0 + artifact
            raw = max(0.0, min(4095.0, raw))
            sample[ch] = raw

        return sample.tolist()

    def _pink_noise(self, ch: int) -> float:
        """Simple Voss-McCartney pink noise approximation."""
        state = self._pink_state[ch]
        p = np.random.random()
        idx = 0
        while idx < 6 and p < 0.5 ** (idx + 1):
            state[idx] = np.random.randn()
            idx += 1
        state[6] = np.random.randn() * 0.1
        return float(state.sum() / 7.0)
