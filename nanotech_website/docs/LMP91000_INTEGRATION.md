# LMP91000 Potentiostat - Backend Integration Plan

## Goal
Expose cyclic voltammetry measurements from the Teensy+LMP91000 setup to the web portal via a simple HTTP API.

## Current UI
- **Tool component**: `components/calculations/lmp91000-tool.tsx`
- **Entry point**: `/portal/calculations` card "LMP91000 Potentiostat"
- **Expected backend endpoint**: `${NEXT_PUBLIC_LMP_API_URL}/api/lmp/run`

Response shape expected by the UI:

\`\`\`json
{
  "status": "ok",
  "points": [
    { "bias": -1.0, "current": 0.00123 },
    { "bias": -2.0, "current": 0.00110 }
  ]
}
\`\`\`

Each point corresponds to one `bias,current` line from the firmware.

## Step 1 - Firmware (Teensy)
- Flash the existing `lmp91000-main` PlatformIO project to a Teensy 4.1.
- Keep the serial protocol:
  - Host sends: `RUN\n`
  - Firmware replies with text lines: `bias,current` (CSV), then stops.

## Step 2 - Hardware bridge service
Run this on a PC or Raspberry Pi that is physically connected to the Teensy.

Responsibilities:
- Open USB serial (e.g. `/dev/ttyACM0`, 115200 baud).
- Implement `POST /api/lmp/run`:
  - Send `RUN\n` to the serial port.
  - Read `bias,current` lines until a timeout or explicit end marker.
  - Parse each line into `{ bias: number, current: number }`.
  - Return JSON in the shape shown above.

Suggested stacks:
- **Node.js** + `serialport` + Express/Fastify
- **Python** + `pyserial` + FastAPI/Flask

## Step 3 - Configuration
- Host the bridge at a reachable URL, for example:
  - `http://pi.local:5000` or `https://pi.your-domain.com`
- In the Next.js app environment (local + Vercel):
  - Set `NEXT_PUBLIC_LMP_API_URL` to that base URL.
- Redeploy the app so the client-side `LMP91000Tool` picks up the new env value.

## Step 4 - Verification
1. Open `/portal/calculations`.
2. Select **"LMP91000 Potentiostat"**.
3. Ensure the header shows **"Backend URL configured"**.
4. Click **"Run CV scan"**.
5. Confirm that:
   - The bridge logs a `RUN` request to the Teensy.
   - The UI shows a nonempty table of bias/current points and summary stats.

## Step 5 - Future improvements
- Add an explicit `DONE` line at the end of the firmware scan to avoid timeouts.
- Extend the HTTP body to accept parameters (rate, settling time, potentiostat index).
- Replace the table with a line chart (bias on x-axis, current on y-axis).
- Add basic auth / API key on the bridge and serve it over HTTPS.
