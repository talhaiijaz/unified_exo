# Project Structure — Complete Map

**Repo:** `jadoo-tech/unified_server` · **Server path:** `/opt/unified_server`

## Top-level layout

```
unified_server/
├── server/                 # FastAPI backend
├── nanotech_website/       # Next.js frontend
├── pi_agent/               # Raspberry Pi agents
├── Exoskeleton_public/     # Exoskeleton project files
├── eeg_lab/                # EEG lab tools
├── arduino/                # Firmware
├── contrib/                # Per-person experiments (see contrib/README.md)
├── deploy/                 # systemd units + env templates
├── scripts/                # deploy.sh, install.sh, start_server.sh
├── docs/                   # Role-based guides (START HERE for your area)
├── archive/                # Retired/legacy folders (not active)
└── docker-compose.yml      # Local full-stack via Docker
```

**Role guides:** [docs/OVERVIEW.md](docs/OVERVIEW.md) · [docs/ONBOARDING.md](docs/ONBOARDING.md)

---

A single-page guide to the entire repo. Use this to find what you're looking for or to understand how the pieces fit together.

---

## The Big Picture

This repo contains **three integrated systems** plus **theoretical/scientific tools** for Dr. Waqas Khalid's Nanotech Lab at UC Berkeley:

```
        ┌──────────────────────────────────────────────────────────────┐
        │                        THIS REPO                              │
        └──────────────────────────────────────────────────────────────┘

┌───────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────┐
│  1. Exo-Platform          │  │  2. EEG Lab               │  │  3. Nanotech     │
│     (Exoskeleton control)│  │     (Neural signals)     │  │     Website      │
│                           │  │                           │  │                  │
│  Laptop/server ↔ Pi agent │  │  Pi + Teensy → browser    │  │  Research portal │
│  ↔ Arduino ↔ devices       │  │  with live plots          │  │  + simulations   │
└───────────────────────────┘  └───────────────────────────┘  └──────────────────┘
         │                              │                              │
         └──────────────────────────────┴──────────────────────────────┘
                                        │
                                ┌───────┴────────┐
                                │  Shared infra  │
                                │  • Python 3.10+│
                                │  • Node 20+    │
                                │  • Docker      │
                                │  • systemd     │
                                └────────────────┘
```

---

## Directory Tree (with purpose)

```
WQ/
│
├── README.md                           ← Start here (project overview)
├── STRUCTURE.md                        ← You are here (full map)
├── ARCHITECTURE.md                     ← Deep technical architecture
├── DEPLOYMENT.md                       ← Production deployment guide
├── CONTRIBUTING.md                     ← How to contribute
├── LICENSE                             ← MIT
├── .gitignore
├── docker-compose.yml                  ← One-command full-stack startup
│
├── ═══════════════════════════════════════════════════════════════════
├──   ⚙️  1. EXO-PLATFORM (Exoskeleton Control System)
├── ═══════════════════════════════════════════════════════════════════
│
├── server/                             ← Python FastAPI backend (runs on laptop/server)
│   ├── README.md
│   ├── .env.example
│   ├── Dockerfile
│   ├── app.py                          FastAPI entry point
│   ├── config.py                       Environment config
│   ├── db.py                           SQLite schema
│   ├── comm/
│   │   └── manager.py                  ConnectionManager (multi-Pi TCP)
│   ├── routes/
│   │   ├── clients.py                  Pi status endpoints
│   │   ├── commands.py                 Command dispatch
│   │   ├── video.py                    MJPEG video streaming
│   │   ├── telemetry.py                Sensor data + WebSocket
│   │   └── auth.py                     JWT authentication
│   └── auth/                           Password hashing + JWT
│
├── pi_agent/                           ← Runs on each Raspberry Pi exoskeleton
│   ├── README.md
│   ├── DEVICES.md                      Per-device wiring reference
│   ├── .env.example
│   ├── Dockerfile
│   ├── agent.py                        Main agent (session lifecycle)
│   ├── telemetry.py                    Telemetry sender thread
│   ├── devices.json                    Per-Pi device manifest (edit for each Pi)
│   └── devices/                        Pluggable device drivers
│       ├── base.py
│       ├── motor.py                    Stepper/servo motors
│       ├── oled.py                     AR glasses display
│       ├── camera.py                   Pi Camera + USB cams
│       ├── temperature.py              Temp sensors
│       ├── gyroscope.py                IMU (MPU6050/LSM6DSL)
│       ├── ultrasonic.py               Ultrasonic stimulator
│       ├── vibration.py                Haptic motors
│       └── tens.py                     TENS unit (with safety)
│
├── arduino/                            ← Microcontroller firmware
│   ├── README.md
│   ├── WIRING.md                       Complete schematics + BOM
│   └── exo_controller/
│       └── exo_controller.ino          Unified firmware for all devices
│
├── ═══════════════════════════════════════════════════════════════════
├──   🧠  2. EEG LAB (Neural Signal Acquisition)
├── ═══════════════════════════════════════════════════════════════════
│
├── eeg_lab/                            ← Separate service on Pi (port 8000)
│   ├── README.md                       Setup guide
│   ├── config.yaml                     Sample rate, channels, port
│   ├── requirements.txt
│   ├── run.sh                          One-command startup
│   ├── backend/
│   │   ├── main.py                     FastAPI entry
│   │   ├── api/                        REST + WebSocket
│   │   ├── devices/serial_manager.py   Teensy serial reader
│   │   ├── processing/                 Filters + FFT + ring buffer
│   │   ├── sessions/manager.py         Controller/viewer lock
│   │   └── storage/captures.py         CSV save/load
│   ├── frontend/
│   │   ├── index.html                  Single-page instrument UI
│   │   ├── app.js                      WebSocket client + Plotly plots
│   │   └── style.css                   Dark instrument panel
│   ├── eeg_teensy/
│   │   └── eeg_teensy.ino              Teensy firmware (10ch EEG @ 250Hz)
│   ├── deploy/
│   │   ├── eeg-lab.service             systemd unit
│   │   ├── nginx.conf                  Reverse proxy
│   │   └── 99-teensy.rules             udev rule for stable device path
│   └── hardware/                       Physical accessories
│       ├── README.md                   Overview + jig instructions
│       ├── cable-cutting-jig.stl       3D model for cable cutting (Yuxiang)
│       └── cable-cutting-jig-aligned.stl   Alternative print-optimized version
│
├── ═══════════════════════════════════════════════════════════════════
├──   🌐  3. NANOTECH WEBSITE (Research Portal + Frontend)
├── ═══════════════════════════════════════════════════════════════════
│
├── nanotech_website/                   ← Next.js frontend (port 3000)
│   ├── README.md                       Original site docs
│   ├── EXO_README.md                   Exo-specific frontend docs
│   ├── .env.example
│   ├── Dockerfile
│   ├── next.config.mjs                 Proxy rewrite to backend
│   ├── app/portal/
│   │   ├── page.tsx                    Portal landing
│   │   ├── exo/
│   │   │   ├── page.tsx                Exoskeleton dashboard
│   │   │   ├── client/[clientId]/      Per-Pi control panel
│   │   │   └── simulator/              Software twin visualization
│   │   ├── cnt-simulation/             ← NEW: embeds CNT simulation
│   │   │   └── page.tsx
│   │   ├── calculations/               Scientific calculators
│   │   ├── potentiostat/               Teensy-based potentiostat UI
│   │   ├── eeg/                        EEG page (linked to EEG Lab)
│   │   ├── syringe-pump/
│   │   ├── bnest/
│   │   └── team/
│   ├── components/exo/                 Exo UI components
│   │   ├── client-card.tsx
│   │   ├── video-feed.tsx
│   │   └── device-control.tsx
│   ├── lib/exo/api.ts                  Typed API client
│   └── public/simulations/             ← NEW: standalone HTML simulators
│       ├── README.md                   Simulation index
│       └── cnt-nanosensor.html         CNT Unified Simulation (Tyler Wang)
│
├── ═══════════════════════════════════════════════════════════════════
├──   🔧  Shared Scripts & Tools
├── ═══════════════════════════════════════════════════════════════════
│
├── scripts/
│   ├── start_server.sh                 Start backend + frontend in one command
│   ├── deploy_pi.sh                    SCP pi_agent to a Pi
│   └── setup_pi.sh                     Fresh Pi OS preparation
│
├── .github/workflows/ci.yml            GitHub Actions CI pipeline
│
└── (legacy reference)
    ├── Exoskeleton_public/             ← Original source code (unchanged)
    └── E-Beam-Website-Repository-main/ ← Separate project (unchanged)
```

---

## What Talks to What?

### Scenario 1: Researcher controls an exoskeleton

```
Browser (Next.js :3000)
    ↓ POST /api/exo/clients/pi-01/devices/motor/command
Next.js proxy rewrite
    ↓ forwards to :5000
FastAPI server (port 5000)
    ↓ TCP socket to Pi
Pi Agent (TCP :1863)
    ↓ USB Serial
Arduino (exo_controller.ino)
    ↓ PWM / GPIO
Motor / TENS / Vibration / OLED
```

### Scenario 2: Researcher watches live EEG

```
Browser (port 8000)
    ↓ WebSocket /ws/stream
FastAPI EEG server (on Pi)
    ↓ read ring buffer
Filter bank → FFT → downsample to 20Hz
    ↑ samples from
SerialManager thread
    ↑ USB Serial @ 115200
Teensy (eeg_teensy.ino)
    ↑ 10ch ADC @ 250Hz
Electrodes on subject's scalp
```

### Scenario 3: Researcher runs theoretical simulation

```
Browser → http://localhost:3000/portal/cnt-simulation
    → Next.js serves portal page with <iframe>
    → iframe loads /simulations/cnt-nanosensor.html
    → Vanilla JS runs Tyler's physics simulation
    → No backend needed (100% client-side)
```

---

## Which Docs to Read for What

| I want to... | Read this |
|--------------|-----------|
| Get an overview in 2 minutes | [README.md](README.md) |
| Understand the whole structure | This file ([STRUCTURE.md](STRUCTURE.md)) |
| Deploy the system | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Understand protocols & data flow | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Set up the server | [server/README.md](server/README.md) |
| Set up a Raspberry Pi | [pi_agent/README.md](pi_agent/README.md) |
| Wire up a device | [pi_agent/DEVICES.md](pi_agent/DEVICES.md) |
| Configure Arduino pins | [arduino/README.md](arduino/README.md) + [arduino/WIRING.md](arduino/WIRING.md) |
| Run the EEG Lab | [eeg_lab/README.md](eeg_lab/README.md) |
| Print the cable jig | [eeg_lab/hardware/README.md](eeg_lab/hardware/README.md) |
| Modify the frontend | [nanotech_website/EXO_README.md](nanotech_website/EXO_README.md) |
| Add a new simulation | [nanotech_website/public/simulations/README.md](nanotech_website/public/simulations/README.md) |
| Add a new device driver | [CONTRIBUTING.md](CONTRIBUTING.md) |

---

## Team & Contributions

| Person | Role | Contribution |
|--------|------|--------------|
| **Dr. Waqas Khalid** | Principal Investigator | Lab lead, overall direction |
| **Muhammad Talha Ijaz** | Developer | Exo-Platform, EEG Lab integration, Frontend |
| **Tyler Wang** | Contributor | CNT Nanosensor theoretical simulation |
| **Yuxiang Tian** | Contributor | EEG cable cutting jig (3D-printed) |
| **Marco** | Contributor | Server infrastructure |
| **ARM** | Collaborator | Partnership driving working prototype |

---

## Quick-Reference: File Types

| Extension | What it is | Where |
|-----------|------------|-------|
| `.py` | Python source | `server/`, `pi_agent/`, `eeg_lab/backend/` |
| `.ts` / `.tsx` | TypeScript / React | `nanotech_website/` |
| `.ino` | Arduino / Teensy firmware | `arduino/`, `eeg_lab/eeg_teensy/` |
| `.yaml` / `.yml` | Config | `eeg_lab/config.yaml`, `.github/workflows/ci.yml` |
| `.json` | Device manifest / package lists | `pi_agent/devices.json`, various |
| `.md` | Documentation | Throughout |
| `.stl` | 3D printable model | `eeg_lab/hardware/` |
| `.html` | Static simulations | `nanotech_website/public/simulations/` |
| `.sh` | Shell scripts | `scripts/`, `eeg_lab/run.sh` |

---

## Ports Reference

| Port | Service | Where |
|------|---------|-------|
| 3000 | Next.js frontend | nanotech_website |
| 5000 | Exo-Platform HTTP API | server |
| 1863 | Exo-Platform TCP control | server ↔ pi_agent |
| 8612 | Exo-Platform TCP video | server ↔ pi_agent |
| 8613 | Exo-Platform TCP telemetry | server ↔ pi_agent |
| 8000 | EEG Lab HTTP + WebSocket | eeg_lab (separate Pi or same box) |
| 22 | SSH | — |
| 80 / 443 | HTTP/HTTPS (if using reverse proxy) | Caddy/Nginx |

---

## Got a Question?

- **For the overall project vision:** See [README.md](README.md) → "Why This Exists"
- **For deep technical details:** See [ARCHITECTURE.md](ARCHITECTURE.md)
- **For "how do I do X":** Use the docs table above
- **For bugs or contributions:** See [CONTRIBUTING.md](CONTRIBUTING.md)
