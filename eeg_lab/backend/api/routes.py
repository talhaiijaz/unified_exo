"""
routes.py — REST API endpoints.
"""
import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

import backend.state as state
from backend.config import CONFIG
from backend.sessions.manager import session
from backend.storage.captures import list_captures, save_capture

router = APIRouter(prefix="/api")


# ── Status & device ──────────────────────────────────────────────────

@router.get("/status")
def get_status():
    serial_status = state.serial_manager.status() if state.serial_manager else {
        "connected": False, "streaming": False, "port": CONFIG.serial.port, "error": None
    }
    return {
        "board": serial_status,
        "session": session.to_dict(),
        "sample_count": state.buffer.sample_count if state.buffer else 0,
        "dsp": state.dsp_config,
    }


# ── Session control ──────────────────────────────────────────────────

class ClientBody(BaseModel):
    client_id: str


@router.post("/session/start")
def start_session(body: ClientBody):
    if not session.is_controller(body.client_id) and not session.claim(body.client_id):
        raise HTTPException(403, "Another controller is active")
    if session.running:
        return {"ok": True, "msg": "already running"}

    session.running = True

    if state.serial_manager and not state.serial_manager.connected:
        state.serial_manager.start()

    return {"ok": True, "msg": "session started"}


@router.post("/session/stop")
def stop_session(body: ClientBody):
    if not session.is_controller(body.client_id):
        raise HTTPException(403, "Not the controller")

    session.running = False
    if state.serial_manager:
        state.serial_manager.stop()
        # Reinitialize serial manager so it can be started again
        from backend.devices.serial_manager import SerialManager
        state.serial_manager = SerialManager(
            CONFIG.serial.port,
            CONFIG.serial.baud,
            CONFIG.serial.channels,
            state.buffer,
        )

    return {"ok": True, "msg": "session stopped"}


@router.post("/session/claim")
def claim_session(body: ClientBody):
    ok = session.claim(body.client_id)
    if not ok:
        raise HTTPException(403, "Lock held by another controller")
    return {"ok": True, "controller_id": session.controller_id}


@router.post("/session/release")
def release_session(body: ClientBody):
    session.release(body.client_id)
    return {"ok": True}


@router.post("/session/heartbeat")
def heartbeat(body: ClientBody):
    session.heartbeat(body.client_id)
    return {"ok": True}


@router.get("/session")
def get_session():
    return session.to_dict()


# ── DSP config ───────────────────────────────────────────────────────

class DspConfig(BaseModel):
    notch_enabled: Optional[bool] = None
    bandpass_enabled: Optional[bool] = None
    smoothing_samples: Optional[int] = None
    display_gain: Optional[float] = None
    focus_channel: Optional[int] = None
    window_seconds: Optional[float] = None


@router.get("/config")
def get_config():
    return state.dsp_config


@router.post("/config")
def update_config(body: DspConfig):
    updates = body.model_dump(exclude_none=True)
    state.dsp_config.update(updates)
    return {"ok": True, "dsp": state.dsp_config}


# ── Board commands ───────────────────────────────────────────────────

class CommandBody(BaseModel):
    client_id: str
    command: str
    expect_response: Optional[bool] = False
    timeout: Optional[float] = 1.0


@router.post("/command")
def send_command(body: CommandBody):
    if not session.is_controller(body.client_id):
        raise HTTPException(403, "Not the controller")
    if not state.serial_manager or not state.serial_manager.connected:
        raise HTTPException(503, "Board not connected")
    # Send command; optionally wait for a response
    try:
        if body.expect_response:
            resp = state.serial_manager.send_command_with_response(body.command, timeout=float(body.timeout or 1.0))
            return {"ok": True, "command": body.command, "response": resp}
        else:
            state.serial_manager.send_command(body.command)
            return {"ok": True, "command": body.command}
    except Exception as e:
        raise HTTPException(500, f"Command error: {e}")


# ── Screenshot upload (optional) ─────────────────────────────────────
class ScreenshotBody(BaseModel):
    client_id: str
    png_base64: str


@router.post('/screenshot')
def save_screenshot(body: ScreenshotBody):
    # simple permission check
    if not session.is_controller(body.client_id):
        # allow any client to upload, but prefer controller; don't block for now
        pass

    import base64, time, os
    b = body.png_base64
    if b.startswith('data:'):
        b = b.split(',', 1)[1]
    try:
        data = base64.b64decode(b)
    except Exception:
        raise HTTPException(400, 'Invalid base64')

    outdir = CONFIG.storage.captures_dir
    os.makedirs(outdir, exist_ok=True)
    fname = f"screenshot_{int(time.time())}.png"
    path = os.path.join(outdir, fname)
    with open(path, 'wb') as f:
        f.write(data)

    return {"ok": True, "filename": fname}


# ── Captures ─────────────────────────────────────────────────────────

class CaptureBody(BaseModel):
    seconds: float = 30.0


@router.post("/capture")
def save_capture_endpoint(body: CaptureBody):
    if state.buffer is None:
        raise HTTPException(503, "No buffer")

    data, timestamps = state.buffer.get_last_seconds(body.seconds)
    filename, msg = save_capture(
        data, timestamps,
        CONFIG.storage.captures_dir,
        CONFIG.serial.channels,
        CONFIG.serial.fs,
    )
    if filename is None:
        raise HTTPException(400, msg)
    return {"ok": True, "filename": filename, "msg": msg}


@router.get("/captures")
def get_captures():
    return list_captures(CONFIG.storage.captures_dir)


@router.get("/captures/{filename}")
def download_capture(filename: str):
    # Sanitize filename — no path traversal
    filename = os.path.basename(filename)
    path = os.path.join(CONFIG.storage.captures_dir, filename)
    if not os.path.exists(path):
        raise HTTPException(404, "File not found")
    return FileResponse(path, media_type="text/csv", filename=filename)


@router.delete("/captures/{filename}")
def delete_capture(filename: str):
    filename = os.path.basename(filename)
    path = os.path.join(CONFIG.storage.captures_dir, filename)
    if not os.path.exists(path):
        raise HTTPException(404, "File not found")
    os.remove(path)
    return {"ok": True}


# ── Demo / synthetic mode ─────────────────────────────────────────────

@router.post("/demo/start")
def start_demo(body: ClientBody):
    """Start synthetic EEG generator (no Teensy required)."""
    if not session.is_controller(body.client_id) and not session.claim(body.client_id):
        raise HTTPException(403, "Not the controller")

    # Stop real serial if running
    if state.serial_manager and state.serial_manager.connected:
        state.serial_manager.stop()

    from backend.processing.synthetic import SyntheticEegGenerator
    if state.demo_generator and state.demo_generator.running:
        return {"ok": True, "msg": "demo already running"}

    state.buffer.clear()
    state.demo_generator = SyntheticEegGenerator(
        state.buffer, CONFIG.serial.fs, CONFIG.serial.channels
    )
    state.demo_generator.start()
    session.running = True
    return {"ok": True, "msg": "synthetic EEG started"}


@router.post("/demo/stop")
def stop_demo(body: ClientBody):
    """Stop synthetic EEG generator."""
    if not session.is_controller(body.client_id):
        raise HTTPException(403, "Not the controller")
    if state.demo_generator:
        state.demo_generator.stop()
        state.demo_generator = None
    session.running = False
    return {"ok": True, "msg": "synthetic EEG stopped"}


@router.get("/demo/status")
def demo_status():
    return {
        "demo_running": bool(state.demo_generator and state.demo_generator.running)
    }
