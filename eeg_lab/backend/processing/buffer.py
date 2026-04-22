"""
buffer.py — Thread-safe ring buffer for streaming EEG data.
Migrated and cleaned up from main.py EegBuffer class.
"""
import threading
from collections import deque

import numpy as np


class EegBuffer:
    """Thread-safe ring buffer storing raw EEG samples."""

    def __init__(self, num_channels: int, fs: float, history_seconds: float = 120.0):
        self.num_channels = num_channels
        self.fs = fs
        self.max_samples = int(history_seconds * fs)

        self._data: deque = deque(maxlen=self.max_samples)
        self._timestamps: deque = deque(maxlen=self.max_samples)
        self._lock = threading.Lock()
        self._sample_count = 0

    def append(self, sample: list[float], timestamp_ms: int = 0):
        """Append one sample (list of channel values) and its timestamp."""
        arr = np.asarray(sample, dtype=np.float32)
        with self._lock:
            self._data.append(arr)
            self._timestamps.append(timestamp_ms)
            self._sample_count += 1

    @property
    def sample_count(self) -> int:
        return self._sample_count

    def get_last_seconds(self, seconds: float) -> tuple[np.ndarray, np.ndarray]:
        """
        Return (data, timestamps) for the last N seconds.
        data shape: (n_samples, n_channels)
        timestamps shape: (n_samples,)
        """
        n = int(seconds * self.fs)
        with self._lock:
            if not self._data:
                return (
                    np.empty((0, self.num_channels), dtype=np.float32),
                    np.empty(0, dtype=np.int64),
                )
            data_snap = list(self._data)
            ts_snap = list(self._timestamps)

        data_arr = np.stack(data_snap, axis=0)
        ts_arr = np.array(ts_snap, dtype=np.int64)

        if len(data_arr) > n:
            return data_arr[-n:], ts_arr[-n:]
        return data_arr, ts_arr

    def get_snapshot(self) -> tuple[np.ndarray, np.ndarray]:
        """Return full buffer snapshot."""
        with self._lock:
            if not self._data:
                return (
                    np.empty((0, self.num_channels), dtype=np.float32),
                    np.empty(0, dtype=np.int64),
                )
            data_arr = np.stack(list(self._data), axis=0)
            ts_arr = np.array(list(self._timestamps), dtype=np.int64)
        return data_arr, ts_arr

    def clear(self):
        with self._lock:
            self._data.clear()
            self._timestamps.clear()
