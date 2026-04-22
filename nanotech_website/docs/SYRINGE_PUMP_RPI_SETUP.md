# Syringe Pump Raspberry Pi Setup

This document describes how to connect the syringe pump hardware (Arduino Nano board) to a Raspberry Pi and wire it into the web portal via the `/api/pump/*` endpoints.

---

## 1. High-level architecture

- The **web UI** lives in the Next.js portal page at `app/portal/pump/page.tsx`.
- The UI talks to HTTP endpoints under `/api/pump/*`:
  - `GET   /api/pump/config`
  - `GET   /api/pump/state`
  - `POST  /api/pump/run`
  - `POST  /api/pump/stop`
  - `POST  /api/pump/home`
- The **Raspberry Pi** is responsible for:
  - Talking to the Arduino Nano syringe pump controller over USB/serial.
  - Exposing a small HTTP API that matches the JSON contracts described in this repo.

You can either:

- Run a **separate pump backend service** on the Pi and have Next.js proxy to it, or
- Integrate serial communication **directly inside** the Next.js `/api/pump/*` route handlers.

The UI does not change between these options; only the backend wiring does.

---

## 2. Expected `/api/pump/*` JSON contracts

These are the logical shapes that the Next.js app expects. They should be honored by whatever code runs on the Pi.

### 2.1 `GET /api/pump/config`

**Response JSON**:

\`\`\`jsonc
{
  "syringe": {
    "inner_diameter_mm": 9.0,
    "max_volume_ml": 10.0
  },
  "mechanics": {
    "lead_screw_pitch_mm": 1.0,
    "steps_per_rev": 200,
    "microstepping": 16
  },
  "limits": {
    "max_flow_rate_ml_min": 5.0,
    "min_flow_rate_ml_min": 0.01
  }
}
\`\`\`

### 2.2 `GET /api/pump/state`

**Response JSON**:

\`\`\`jsonc
{
  "connected": true,
  "status": "idle",          // "idle" | "running" | "homing" | "error"
  "position_ml": 0.3,
  "target_ml": 1.0,
  "flow_rate_ml_min": 0.5,
  "direction": "forward",    // "forward" | "reverse"
  "error": null               // or string with error description
}
\`\`\`

### 2.3 `POST /api/pump/run`

**Request JSON**:

\`\`\`jsonc
{
  "volume_ml": 1.0,
  "flow_rate_ml_min": 0.5,
  "direction": "forward"     // "forward" | "reverse"
}
\`\`\`

**Response JSON**:

\`\`\`jsonc
{
  "ok": true,
  "job_id": "optional-job-id"
}
\`\`\`

### 2.4 `POST /api/pump/stop`

**Request JSON**: usually empty `{}`.

**Response JSON**:

\`\`\`jsonc
{
  "ok": true
}
\`\`\`

### 2.5 `POST /api/pump/home`

**Request JSON**: may be `{}` or include options like `{ "force": true }`.

**Response JSON**:

\`\`\`jsonc
{
  "ok": true
}
\`\`\`

You are free to extend these objects (e.g. add `timestamp` fields) as long as the existing keys remain compatible.

---

## 3. Raspberry Pi responsibilities

1. **Connect the Arduino Nano**
   - Plug the syringe pump PCB (with Arduino Nano) into the Raspberry Pi via USB.
   - Identify the serial device (e.g. `/dev/ttyUSB0` or `/dev/ttyACM0`).

2. **Flash firmware on the Arduino**
   - The firmware should implement a simple line-based serial protocol, for example:
     - `RUN volume=1.0 flow=0.5 dir=F`  → start pumping
     - `STOP`                           → stop immediately
     - `HOME`                           → run homing routine
     - `STATUS?`                        → return current state
   - The firmware is responsible for converting volume + flow rate into steps and step timing, enforcing travel limits, and reporting errors.

3. **Run a pump backend on the Pi**

Two main options:

- **Option A: Separate HTTP service (recommended to start)**
  - Language: Node.js (TypeScript) or Python.
  - Responsibilities:
    - Open the serial port to the Arduino.
    - Translate HTTP requests into serial commands.
    - Poll or request status from the Arduino and expose it as JSON.
  - Example API surface (running on Pi):
    - `GET  http://localhost:8000/api/pump/config`
    - `GET  http://localhost:8000/api/pump/state`
    - `POST http://localhost:8000/api/pump/run`
    - `POST http://localhost:8000/api/pump/stop`
    - `POST http://localhost:8000/api/pump/home`

- **Option B: Direct integration inside Next.js routes**
  - Install a serial library (e.g. `serialport`) in the Next.js project.
  - Implement serial communication directly in `app/api/pump/*/route.ts`.
  - Keep a singleton connection and minimal in-memory state on the server side.

---

## 4. Wiring Next.js to the Pi backend

### 4.1 While hosted on Vercel

- Run the pump backend on a machine (could be the Pi) that is reachable from Vercel.
- Set the following environment variables on Vercel:
  - `PUMP_BACKEND_URL`   → base URL of the pump service (e.g. `https://pump-backend.example.com/api/pump`)
  - `PUMP_BACKEND_TOKEN` → shared secret for authorization (optional but recommended)
- Implement `/api/pump/*` Next.js route handlers as **thin proxies** that:
  - Forward the request body to `PUMP_BACKEND_URL`.
  - Attach `Authorization: Bearer ${PUMP_BACKEND_TOKEN}`.
  - Return the JSON response back to the client unchanged.

### 4.2 When fully migrated to Raspberry Pi

On the Pi you have two options:

- **Keep the separate backend**
  - Run the pump HTTP service on `http://localhost:8000/api/pump`.
  - Set `PUMP_BACKEND_URL=http://localhost:8000/api/pump` in the Next.js environment.
  - The existing `/api/pump/*` proxy code continues to work unchanged.

- **Collapse into Next.js**
  - Remove the proxying and have `/api/pump/*` call local TypeScript helpers that talk to serial directly.
  - Keep the JSON shapes exactly as defined in this document so the UI does not need changes.

In both cases the **portal UI remains the same**. Only the deployment and wiring change.

---

## 5. Operational notes

- Make sure the Pi has a **stable power supply** and that the syringe pump board is within the current limits of the Pi + external driver.
- Consider running the pump backend (and optionally the Next.js app) under a process manager like `systemd` or `pm2` so it restarts automatically.
- Log serial errors and HTTP requests for debugging.

Once these steps are complete and `/api/pump/*` returns data matching the shapes above, the `Syringe Pump Control` page in the portal will become fully interactive.
