

import asyncio
import os

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import backend.state as state
from backend.api.routes import router as api_router
from backend.api.websocket import broadcast_loop, websocket_endpoint
from backend.config import CONFIG
from backend.devices.serial_manager import SerialManager
from backend.processing.buffer import EegBuffer
from backend.processing.filters import FilterBank


app = FastAPI(title="EEG Lab", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.websocket("/ws/stream")
async def ws_stream(websocket: WebSocket):
    await websocket_endpoint(websocket)


@app.on_event("startup")
async def startup():
    os.makedirs(CONFIG.storage.captures_dir, exist_ok=True)

    state.buffer = EegBuffer(
        num_channels=CONFIG.serial.channels,
        fs=CONFIG.serial.fs,
        history_seconds=CONFIG.processing.history_seconds,
    )

    state.filter_bank = FilterBank(
        fs=CONFIG.serial.fs,
        notch_freq=CONFIG.processing.notch_freq,
        bandpass_low=CONFIG.processing.bandpass_low,
        bandpass_high=CONFIG.processing.bandpass_high,
    )

    state.serial_manager = SerialManager(
        port=CONFIG.serial.port,
        baud=CONFIG.serial.baud,
        num_channels=CONFIG.serial.channels,
        buffer=state.buffer,
    )

    asyncio.create_task(broadcast_loop())

    print(f"[App] EEG Lab server started")
    print(f"[App] Board port: {CONFIG.serial.port}")
    print(f"[App] Captures dir: {CONFIG.storage.captures_dir}")


@app.on_event("shutdown")
async def shutdown():
    if state.serial_manager:
        state.serial_manager.stop()



FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
