

from typing import Optional
from backend.processing.buffer import EegBuffer
from backend.processing.filters import FilterBank


buffer: Optional[EegBuffer] = None
filter_bank: Optional[FilterBank] = None
serial_manager = None   
demo_generator = None   


dsp_config: dict = {
    "notch_enabled": False,
    "bandpass_enabled": False,
    "smoothing_samples": 1,
    "display_gain": 2.0,
    "focus_channel": 0,
    "window_seconds": 5.0,

    "display_paused": False,
    "display_lag_seconds": 0.0,
    "auto_scale": False,
    "show_bands": False,
}
