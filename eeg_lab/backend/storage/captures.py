"""
captures.py — Save and list EEG capture files.
Migrated from main.py save_capture_to_file().
"""
import csv
import datetime
import os

import numpy as np


def save_capture(
    data: np.ndarray,
    timestamps: np.ndarray,
    captures_dir: str,
    num_channels: int,
    fs: float,
) -> tuple[str | None, str]:
    """
    Save data to a timestamped CSV file.
    Returns (filename, message).
    """
    if len(data) == 0:
        return None, "no data available"

    os.makedirs(captures_dir, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"eeg_capture_{stamp}.csv"
    filepath = os.path.join(captures_dir, filename)

    header = ["timestamp_ms"] + [f"ch{i+1}" for i in range(num_channels)]

    with open(filepath, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for i, row in enumerate(data):
            ts = int(timestamps[i]) if i < len(timestamps) else 0
            writer.writerow([ts] + [f"{v:.4f}" for v in row])

    n = len(data)
    duration = n / fs
    msg = f"saved {n} samples ({duration:.1f}s) → {filename}"
    return filename, msg


def list_captures(captures_dir: str) -> list[dict]:
    """Return list of capture metadata dicts, newest first."""
    os.makedirs(captures_dir, exist_ok=True)
    files = []
    for name in sorted(os.listdir(captures_dir), reverse=True):
        if not name.endswith(".csv"):
            continue
        path = os.path.join(captures_dir, name)
        size = os.path.getsize(path)
        mtime = os.path.getmtime(path)
        files.append({"filename": name, "size_bytes": size, "mtime": mtime})
    return files
