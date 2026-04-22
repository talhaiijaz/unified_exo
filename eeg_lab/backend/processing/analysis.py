"""
analysis.py — FFT and artifact detection.
Migrated from main.py FFT logic and detect_artifacts().
"""
import numpy as np


ARTIFACT_THRESHOLD = 7.0  # peak-to-peak / RMS ratio


def compute_fft(signal: np.ndarray, fs: float, max_freq: float = 60.0
                ) -> tuple[np.ndarray, np.ndarray]:
    """
    Compute single-sided FFT magnitude spectrum.
    Returns (frequencies, magnitudes) up to max_freq Hz.
    """
    if len(signal) < 2:
        return np.array([0.0]), np.array([0.0])

    sig = signal - np.mean(signal)  # remove DC
    freqs = np.fft.rfftfreq(len(sig), d=1.0 / fs)
    mags = np.abs(np.fft.rfft(sig)) / (len(sig) * 0.5)

    mask = freqs <= max_freq
    return freqs[mask], mags[mask]


def detect_artifacts(data: np.ndarray) -> np.ndarray:
    """
    Return boolean array (n_channels,) — True where artifact is detected.
    Uses peak-to-peak vs RMS heuristic.
    """
    if data.size == 0:
        return np.array([], dtype=bool)

    rms = np.sqrt(np.mean(data ** 2, axis=0) + 1e-9)
    ptp = data.max(axis=0) - data.min(axis=0)
    return ptp > (ARTIFACT_THRESHOLD * rms)


def normalize_for_display(data: np.ndarray, gain: float = 1.0
                           ) -> np.ndarray:
    """
    Z-score normalize each channel, apply gain.
    Returns (n_samples, n_channels) ready for offset plotting.
    """
    means = np.mean(data, axis=0)
    stds = np.std(data, axis=0) + 1e-9
    return ((data - means) / stds) * gain
