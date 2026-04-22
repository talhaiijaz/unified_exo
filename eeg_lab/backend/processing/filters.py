"""
filters.py — Digital filter design and application.
Migrated from main.py design_digital_filters() and apply_signal_processing().
"""
import numpy as np

try:
    from scipy import signal as scipy_signal
    HAVE_SCIPY = True
except ImportError:
    HAVE_SCIPY = False
    print("[WARN] SciPy not found — filters disabled.")


class FilterBank:
    """Holds pre-designed filter coefficients for a given sampling rate."""

    def __init__(self, fs: float, notch_freq: float = 60.0,
                 bandpass_low: float = 0.5, bandpass_high: float = 40.0):
        self.fs = fs
        self.notch_b = self.notch_a = None
        self.band_b = self.band_a = None

        if not HAVE_SCIPY:
            return

        nyq = 0.5 * fs

        # Notch filter
        try:
            w0 = notch_freq / nyq
            self.notch_b, self.notch_a = scipy_signal.iirnotch(w0, Q=30.0)
        except Exception as e:
            print(f"[WARN] Notch filter design failed: {e}")

        # Bandpass filter
        try:
            low = bandpass_low / nyq
            high = bandpass_high / nyq
            self.band_b, self.band_a = scipy_signal.butter(
                4, [low, high], btype="bandpass"
            )
        except Exception as e:
            print(f"[WARN] Bandpass filter design failed: {e}")

    @property
    def has_scipy(self) -> bool:
        return HAVE_SCIPY


def apply_filters(
    data: np.ndarray,
    bank: FilterBank,
    notch_enabled: bool = False,
    bandpass_enabled: bool = False,
    smoothing_samples: int = 1,
) -> np.ndarray:
    """
    Apply enabled filters to data (n_samples, n_channels).
    Returns processed copy.
    """
    if data.size == 0:
        return data

    out = data.astype(np.float64, copy=True)

    if HAVE_SCIPY:
        if notch_enabled and bank.notch_b is not None:
            out = scipy_signal.lfilter(bank.notch_b, bank.notch_a, out, axis=0)

        if bandpass_enabled and bank.band_b is not None:
            out = scipy_signal.lfilter(bank.band_b, bank.band_a, out, axis=0)

    if smoothing_samples > 1:
        kernel = np.ones(smoothing_samples) / smoothing_samples
        for ch in range(out.shape[1]):
            out[:, ch] = np.convolve(out[:, ch], kernel, mode="same")

    return out
