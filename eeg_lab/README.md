# EEG Lab — Live Neural Signal Acquisition

<div align="center">

*A Raspberry Pi web app for live 10-channel EEG visualization and capture.*

**Part of the [Exo-Platform](../README.md) ecosystem** • UC Berkeley Nanotechnology Laboratory

![Python](https://img.shields.io/badge/python-3.10+-blue.svg?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi)
![Teensy](https://img.shields.io/badge/Teensy-3.2%2B-orange?style=flat-square)
![WebSocket](https://img.shields.io/badge/WebSocket-20Hz-green?style=flat-square)

</div>

---

## What It Does

Teensy microcontroller reads EEG from electrodes at 250 Hz (10 channels) → streams over USB serial to Raspberry Pi → Pi runs a FastAPI server with real-time filters (60Hz notch, 0.5–40Hz bandpass, FFT) → researchers open a browser and watch live traces, adjust DSP parameters, and capture CSV snapshots.

Supports **multi-user sessions**: one controller can start/stop streaming and send commands; any number of viewers can watch simultaneously.

---

## Feature Highlights

| Feature | Detail |
|---------|--------|
| Channels | 10 simultaneous |
| Sample rate | 250 Hz per channel |
| WebSocket frame rate | 20 Hz (downsampled for visualization) |
| Filters | 60Hz notch, bandpass 0.5–40Hz (toggleable) |
| Artifact detection | Amplitude threshold + derivative |
| FFT | Welch's method, live spectrum per channel |
| Captures | 5s, 30s, 60s → CSV with header |
| Session model | 1 controller + N viewers, 30s inactivity lock |
| Storage | Configurable directory (default `./captures`) |

---

## Architecture

```
     Electrodes (scalp)
         │
         ▼
    ┌────────────┐
    │  Teensy    │    eeg_teensy.ino firmware
    │ (ADC @250Hz)│    10 channels, CSV over USB
    └─────┬──────┘
          │ USB Serial @ 115200
          ▼
    ┌──────────────────────────────────────┐
    │       Raspberry Pi                    │
    │                                       │
    │  ┌──────────────────────────────┐    │
    │  │   SerialManager thread        │    │
    │  │   ─────────────────────       │    │
    │  │   Parses CSV, handles READY/  │    │
    │  │   err/ok protocol             │    │
    │  └──────────────┬────────────────┘    │
    │                 ▼                      │
    │  ┌──────────────────────────────┐    │
    │  │   EegBuffer (ring buffer)     │    │
    │  │   120s of history (30000 @250)│    │
    │  └──────────────┬────────────────┘    │
    │                 ▼                      │
    │  ┌──────────────────────────────┐    │
    │  │   FilterBank                  │    │
    │  │   Notch 60Hz + BP 0.5-40Hz    │    │
    │  │   Smoothing + artifact gate   │    │
    │  └──────────────┬────────────────┘    │
    │                 ▼                      │
    │  ┌──────────────────────────────┐    │
    │  │   FastAPI + WebSocket :8000   │    │
    │  │   /api/* REST                 │    │
    │  │   /ws/stream                  │    │
    │  └──────────────┬────────────────┘    │
    └─────────────────┼─────────────────────┘
                      │
                      ▼
              ┌──────────────┐
              │   Browser    │
              │ Plotly plots │
              │  Filter UI   │
              │  Capture UI  │
              └──────────────┘
```

---

## Project Structure

```
eeg_lab/
├── backend/
│   ├── main.py                  FastAPI app entry point
│   ├── config.py                Settings loader (reads config.yaml)
│   ├── state.py                 Shared runtime state
│   ├── api/
│   │   ├── routes.py            REST endpoints
│   │   └── websocket.py         Live stream broadcaster
│   ├── devices/
│   │   └── serial_manager.py    Teensy serial reader thread
│   ├── processing/
│   │   ├── buffer.py            Thread-safe ring buffer
│   │   ├── filters.py           Notch + bandpass + smoothing
│   │   ├── analysis.py          FFT + artifact detection
│   │   └── synthetic.py         Synthetic signal generator (test)
│   ├── sessions/
│   │   └── manager.py           Controller/viewer lock
│   └── storage/
│       └── captures.py          CSV save/list/delete
│
├── frontend/
│   ├── index.html               Single-page instrument UI
│   ├── app.js                   WebSocket client + Plotly plots
│   └── style.css                Dark instrument panel styling
│
├── eeg_teensy/
│   └── eeg_teensy.ino           Teensy firmware
│
├── deploy/
│   ├── eeg-lab.service          systemd unit file
│   ├── nginx.conf               Nginx reverse proxy
│   └── 99-teensy.rules          udev rule for /dev/teensy-eeg
│
├── config.yaml                  Main configuration
├── requirements.txt             Python dependencies
└── run.sh                       One-command startup
```

---

## Setup Guide

### 1. Flash the Teensy firmware

Open [`eeg_teensy/eeg_teensy.ino`](eeg_teensy/eeg_teensy.ino) in **Teensyduino** and upload to your Teensy.

Key protocol details:
- `CSVEn = false` on boot — waits for `csv_on` command from backend
- Emits `READY protocol=v1 ...` banner on startup
- All commands return `ok`/`err` responses
- No human-readable header during streaming (pure CSV rows)

### 2. Prepare the Raspberry Pi

```bash
sudo apt update && sudo apt install -y python3-pip python3-venv nginx git
```

### 3. Install the server

```bash
cd eeg_lab
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Configure

Edit [`config.yaml`](config.yaml):

```yaml
serial:
  port: /dev/ttyACM0    # Your Teensy port (see below)
  baud: 115200
  channels: 10
  fs: 250.0

processing:
  notch_freq: 60.0       # 60Hz in US, 50Hz in EU
  bandpass_low: 0.5
  bandpass_high: 40.0
  history_seconds: 120.0

server:
  host: 0.0.0.0
  port: 8000

storage:
  captures_dir: captures
```

**Finding your Teensy port:**
```bash
ls /dev/ttyACM* /dev/ttyUSB*
dmesg | tail -20 | grep tty   # See most recent USB connection
```

### 5. Set up a stable device path (recommended)

By default `/dev/ttyACM0` can shift between reboots. Use udev rules:

```bash
sudo cp deploy/99-teensy.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger
# Unplug and replug the Teensy
ls -la /dev/teensy-eeg   # should appear
```

Then update `config.yaml`:
```yaml
serial:
  port: /dev/teensy-eeg
```

### 6. Run manually (for testing)

```bash
cd eeg_lab
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Open `http://<pi-ip-address>:8000` in a browser.

### 7. Install as a system service

```bash
sudo cp deploy/eeg-lab.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable eeg-lab
sudo systemctl start eeg-lab
sudo systemctl status eeg-lab
```

Logs:
```bash
journalctl -u eeg-lab -f
```

### 8. (Optional) Nginx for port 80

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/eeg-lab
sudo ln -sf /etc/nginx/sites-available/eeg-lab /etc/nginx/sites-enabled/eeg-lab
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

Team accesses `http://raspberrypi.local` (no port needed).

---

## Lab Workflow

1. Open `http://<pi-ip>:8000` in a browser
2. Click **Claim Control** to take the controller role
3. Click **Start** to open the serial connection and begin streaming
4. Watch live EEG traces and FFT spectrum
5. Toggle **Notch 60Hz** and **Bandpass 0.5–40Hz** as needed
6. Adjust **Gain**, **Window**, **Smooth**, and **Focus Channel**
7. Click **5s / 30s / 60s** to save a capture as CSV
8. Download captures from the sidebar list
9. Click **Stop** when done, or **Release** to hand control to another user

Multiple team members can open the app simultaneously. Only the controller can start/stop and send commands. All users see the live stream in real-time.

---

## Session / Lock Model

- One **controller** per session — holds an exclusive lock
- Lock expires after **30 seconds of inactivity** (no heartbeat)
- Multiple **viewers** can watch the live stream at any time
- Any user can **Claim** if the lock is unclaimed or expired

This prevents command conflicts while allowing collaborative viewing.

---

## REST API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/status` | Board + session + DSP state |
| `POST` | `/api/session/start` | Start streaming |
| `POST` | `/api/session/stop` | Stop streaming |
| `POST` | `/api/session/claim` | Claim controller role |
| `POST` | `/api/session/release` | Release controller |
| `GET` / `POST` | `/api/config` | Read/update DSP config (filters, smoothing, gain) |
| `POST` | `/api/capture` | Save last N seconds to CSV |
| `GET` | `/api/captures` | List saved captures |
| `GET` | `/api/captures/{file}` | Download a capture |
| `DELETE` | `/api/captures/{file}` | Delete a capture |

**WebSocket:** `ws://<host>:8000/ws/stream` — frames at 20 Hz

### Example: Fetch status via curl

```bash
curl http://localhost:8000/api/status | python3 -m json.tool
```

### Example: Start a session and capture

```bash
# Claim controller
curl -X POST http://localhost:8000/api/session/claim \
  -H "Content-Type: application/json" \
  -d '{"client_id":"my-laptop"}'

# Start streaming
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"client_id":"my-laptop"}'

# Wait a bit for data to accumulate...
sleep 10

# Save last 5 seconds as CSV
curl -X POST http://localhost:8000/api/capture \
  -H "Content-Type: application/json" \
  -d '{"client_id":"my-laptop","seconds":5}'
```

---

## Integration with Exo-Platform

EEG Lab runs as a **separate service** (port 8000) alongside the Exo-Platform server (port 5000). Researchers can:

- Open **both dashboards** side-by-side in two browser tabs:
  - Exo-Platform: `http://pi-ip:3000/portal/exo` — Control exoskeleton devices
  - EEG Lab: `http://eeg-pi-ip:8000` — Monitor neural signals

- **Run both on the same Pi** if resources permit (Pi 4 4GB+ recommended)

- **Correlate EEG with exo events** by timestamping both data streams

### Future: Unified Dashboard

A future release may embed the EEG Lab widget inside the Exo-Platform frontend. For now, they live side-by-side — this keeps the EEG Lab's specialized real-time DSP stack decoupled from the general exo telemetry channel.

---

## Troubleshooting

### Board not found

```bash
ls /dev/ttyACM* /dev/ttyUSB*
dmesg | tail | grep tty
```

Make sure:
- Teensy is plugged in directly (not through a USB hub)
- Teensy has firmware flashed (run `eeg_teensy.ino`)
- USB cable supports data (some are charge-only)

### Permission denied on serial port

```bash
sudo usermod -aG dialout $USER
# Log out and back in
```

Or for quick test:
```bash
sudo chmod 666 /dev/ttyACM0
```

### Check service logs

```bash
journalctl -u eeg-lab -n 50
```

### Lock stuck

If someone's session is stuck:

```bash
curl -X POST http://localhost:8000/api/session/release \
  -H "Content-Type: application/json" \
  -d '{"client_id":"any"}'
```

(Lock auto-expires after 30 seconds anyway.)

### High CPU on Pi

- Reduce `history_seconds` in config.yaml (default 120 = 30000 samples × 10 ch)
- Disable bandpass filter if not needed
- Use a Pi 4 or Pi 5 — Pi 3 may struggle with 10ch @ 250Hz filtering

### Samples dropping

Look for "buffer overrun" in logs. Solutions:
- Check USB cable quality
- Reduce Teensy output rate if possible
- Move Teensy closer (short USB cable)

---

## Related Documents

- [../README.md](../README.md) — Exo-Platform project overview
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — System architecture
- [../pi_agent/DEVICES.md](../pi_agent/DEVICES.md) — Other device drivers (can run alongside)
- [../DEPLOYMENT.md](../DEPLOYMENT.md) — Production deployment guide

---

## Acknowledgments

Original source: [github.com/JAM1247/NeuroSignal-Console](https://github.com/JAM1247/NeuroSignal-Console)

## License

MIT — see [../LICENSE](../LICENSE).
