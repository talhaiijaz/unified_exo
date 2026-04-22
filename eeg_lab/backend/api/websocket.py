import asyncio
import json
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import backend.state as state
from backend.config import CONFIG
from backend.sessions.manager import session

router = APIRouter()

_clients: set[WebSocket] = set()


def _status_payload():
    board_connected = False
    if state.serial_manager and state.serial_manager.connected:
        board_connected = True
    if state.demo_generator and state.demo_generator.running:
        board_connected = True

    return {
        "type": "status",
        "board_connected": board_connected,
        "streaming": bool(session.running),
        "session": session.to_dict(),
        "sample_count": state.buffer.sample_count if state.buffer else 0,
        "fs": float(CONFIG.serial.fs),
    }


def build_eeg_frame():
    if state.buffer is None:
        return _status_payload()

    window_seconds = float(state.dsp_config.get("window_seconds", 5.0))
    focus_channel = int(state.dsp_config.get("focus_channel", 0) or 0)
    display_gain = float(state.dsp_config.get("display_gain", 1.0) or 1.0)
    display_lag = float(state.dsp_config.get("display_lag_seconds", 0.0) or 0.0)
    auto_scale = bool(state.dsp_config.get("auto_scale", False))
    show_bands = bool(state.dsp_config.get("show_bands", False))
    fs = float(CONFIG.serial.fs)

    # To support display lag, request a larger window and then slice
    total_seconds = max(window_seconds + display_lag, window_seconds)
    data, timestamps = state.buffer.get_last_seconds(total_seconds)

    if data is None or len(data) == 0:
        return _status_payload()

    data = np.asarray(data, dtype=float)
    timestamps = np.asarray(timestamps, dtype=float)

    if data.ndim == 1:
        data = data[:, None]

    # Downsample for browser plotting
    max_points = 200
    if len(data) > max_points:
        step = max(1, len(data) // max_points)
        data = data[::step]
        timestamps = timestamps[::step]

    # Mean-center
    means = np.mean(data, axis=0, keepdims=True)
    centered = data - means

    # Auto-scale: use RMS-style normalization per channel when enabled
    if auto_scale:
        norms = np.sqrt(np.mean(centered ** 2, axis=0, keepdims=True)) + 1e-6
    else:
        norms = np.std(centered, axis=0, keepdims=True) + 1e-6

    display = (centered / norms) * display_gain

    # Artifact flags
    rms = np.sqrt(np.mean(display ** 2, axis=0) + 1e-6)
    ptp = display.max(axis=0) - display.min(axis=0)
    artifacts = (ptp > (7.0 * rms)).tolist()

    # Time axis: apply display lag by slicing to show earlier window
    if len(timestamps) >= 2:
        # timestamps are ms; build end_time and start_time
        end_time = timestamps[-1] - int(display_lag * 1000)
        start_time = end_time - int(window_seconds * 1000)
        mask = (timestamps >= start_time) & (timestamps <= end_time)
        if mask.any():
            display = np.asarray(display)[mask]
            timestamps = timestamps[mask]
        # fallback if mask empty
        if len(timestamps) >= 2:
            time_axis = (timestamps - timestamps[-1]) / 1000.0
        else:
            time_axis = np.linspace(-window_seconds, 0.0, len(display))
    else:
        time_axis = np.linspace(-window_seconds, 0.0, len(display))

    # FFT
    if focus_channel < 0:
        focus_channel = 0
    if focus_channel >= display.shape[1]:
        focus_channel = display.shape[1] - 1

    focus_signal = data[:, focus_channel] - np.mean(data[:, focus_channel])

    if len(focus_signal) > 2:
        fft_freqs = np.fft.rfftfreq(len(focus_signal), d=1.0 / fs)
        fft_mags = np.abs(np.fft.rfft(focus_signal)) / max(len(focus_signal) * 0.5, 1.0)
        mask = fft_freqs <= 60.0
        fft_freqs = fft_freqs[mask]
        fft_mags = fft_mags[mask]
    else:
        fft_freqs = np.array([])
        fft_mags = np.array([])

    board_connected = False
    if state.serial_manager and state.serial_manager.connected:
        board_connected = True
    if state.demo_generator and state.demo_generator.running:
        board_connected = True

    bands = [
        {"name": "delta", "range": [0.5, 4.0], "color": "#3355ff", "alpha": 0.08},
        {"name": "theta", "range": [4.0, 8.0], "color": "#33ccff", "alpha": 0.06},
        {"name": "alpha", "range": [8.0, 12.0], "color": "#33ff99", "alpha": 0.06},
        {"name": "beta",  "range": [12.0, 30.0], "color": "#ffcc33", "alpha": 0.04},
        {"name": "gamma", "range": [30.0, 60.0], "color": "#ff3366", "alpha": 0.03},
    ]

    return {
        "type": "eeg_frame",
        "fs": fs,
        "channels": int(display.shape[1]),
        "time_axis": time_axis.tolist(),
        # frontend expects one array per channel
        "data": display.T.tolist(),
        "artifacts": artifacts,
        "fft_freqs": fft_freqs.tolist(),
        "fft_mags": fft_mags.tolist(),
        "focus_channel": focus_channel,
        "sample_count": state.buffer.sample_count if state.buffer else 0,
        "session": session.to_dict(),
        "board_connected": board_connected,
        "show_bands": show_bands,
        "bands": bands,
    }


@router.websocket("/ws/stream")
async def stream(websocket: WebSocket):
    await websocket.accept()
    _clients.add(websocket)

    try:
        # Send an initial status frame immediately
        await websocket.send_text(json.dumps(_status_payload()))

        while True:
            message = await websocket.receive_json()
            if message.get("type") == "heartbeat":
                client_id = message.get("client_id")
                if client_id:
                    session.heartbeat(client_id)
    except WebSocketDisconnect:
        _clients.discard(websocket)
    except Exception:
        _clients.discard(websocket)


async def broadcast_loop():
    while True:
        try:
            if not _clients:
                await asyncio.sleep(0.05)
                continue

            frame = build_eeg_frame()
            payload = json.dumps(frame)

            dead = set()
            for ws in list(_clients):
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.add(ws)

            _clients.difference_update(dead)

        except Exception as e:
            print(f"[WebSocket] broadcast_loop error: {e}")

        await asyncio.sleep(0.05)


websocket_endpoint = stream