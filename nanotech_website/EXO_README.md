# Frontend — Exo-Platform UI

The web dashboard for Exo-Platform is built into the existing `nanotech_website` Next.js project at `/portal/exo`. This document explains what was added and how to customize it.

For the nanotech_website itself (calculators, team pages, etc.), see [README.md](README.md).

---

## What Was Added

### New Pages

| Route | File | Purpose |
|-------|------|---------|
| `/portal/exo` | `app/portal/exo/page.tsx` | Main dashboard — lists connected Pi agents |
| `/portal/exo/client/[clientId]` | `app/portal/exo/client/[clientId]/page.tsx` | Per-Pi control panel with 4 tabs |
| `/portal/exo/simulator` | `app/portal/exo/simulator/page.tsx` | Software twin with animated device visualizations |

### New Components

Located in `components/exo/`:

| Component | Purpose |
|-----------|---------|
| `client-card.tsx` | Displays a connected Pi's status, device count, heartbeat |
| `video-feed.tsx` | MJPEG video player with error handling and retry |
| `device-control.tsx` | Generic device control UI (commands + custom input) |

### New API Client

`lib/exo/api.ts` — Typed fetch wrappers for all backend routes:
- `listClients()`, `getClient(id)`, `getClientDevices(id)`
- `sendCommand(id, cmd)`, `sendDeviceCommand(id, type, cmd, params)`
- `getVideoFeedUrl(id)`, `getSnapshotUrl(id)`
- `getLatestTelemetry(id)`, `createTelemetryWebSocket(id)`
- `login(u, p)`, `register(u, p, role)`

### Proxy Configuration

`next.config.mjs` adds a rewrite:

```javascript
async rewrites() {
  return [
    {
      source: '/api/exo/:path*',
      destination: 'http://localhost:5000/api/:path*',
    },
  ]
}
```

This makes the browser see the backend as the same origin, avoiding CORS.

---

## Running Locally

```bash
cd nanotech_website
pnpm install   # or: npm install
pnpm dev       # or: npm run dev
```

Open **http://localhost:3000/portal/exo**.

**Prerequisite:** The Python backend must be running at `http://localhost:5000` — see [../server/README.md](../server/README.md).

---

## Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_EXO_API_URL` | `/api/exo` | Frontend-facing API path (proxied) |
| `EXO_BACKEND_URL` | `http://localhost:5000` | Where Next.js proxies requests to |

If the backend is on a different host in production (e.g., `https://api.exo.berkeley.edu`), update `next.config.mjs` accordingly:

```javascript
destination: process.env.EXO_BACKEND_URL + '/api/:path*',
```

---

## Page Walkthroughs

### `/portal/exo` — Dashboard

The landing page for exoskeleton control.

**Features:**
- Header with E-stop, Enable toggle, Home button
- **Connected Pi Agents card** — auto-refreshes every 3s
  - Shows online/offline status
  - "No Pi agents connected" message with copy-paste command to start one
  - Click a card → navigates to per-client page
- Existing joint controls (shoulder, elbow, wrist) — simulation mode by default
- Stick Figure Kinematics visualization (SVG)

**Key code:**

```tsx
const [connectedPis, setConnectedPis] = useState<PiClient[]>([])

useEffect(() => {
  const poll = async () => {
    try {
      const clients = await listClients()
      setConnectedPis(clients)
      setServerOnline(true)
    } catch {
      setServerOnline(false)
    }
  }
  poll()
  const interval = setInterval(poll, 3000)
  return () => clearInterval(interval)
}, [])
```

### `/portal/exo/client/[clientId]` — Per-Client Page

Detailed control panel for a single Pi agent.

**4 tabs:**

1. **Devices** — A `DeviceControl` card for each device in the Pi's manifest
2. **Video** — Live MJPEG stream from the Pi's primary camera
3. **Telemetry** — Real-time sensor readings (updates via WebSocket at 10Hz)
4. **Commands** — History of sent commands with ack/result status

**WebSocket subscription:**

```tsx
useEffect(() => {
  if (!clientId) return
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const ws = new WebSocket(`${protocol}//${window.location.host}/api/exo/clients/${clientId}/telemetry/ws`)
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    setTelemetry(data.readings || data)
  }
  return () => { ws.close() }
}, [clientId])
```

### `/portal/exo/simulator` — Software Twin

Animated visualizations of virtual devices. Updates in real-time from telemetry.

**Supported visualizations:**
- Motor — Rotating wheel
- OLED — Mock green-text display
- Camera — Pulsing red REC indicator
- Temperature — Animated thermometer with color gradient
- Gyroscope — 3D cube rotating in CSS transforms
- Ultrasonic — Expanding wave animation
- Vibration — Bouncing ball
- TENS — Lightning bolt animation

Each device type has a render function in `DEVICE_VISUALS` — extend this map to add new visualizations.

---

## Customization

### Adding a New Device Visualization

1. Open `app/portal/exo/simulator/page.tsx`
2. Add to `DEVICE_VISUALS`:

```tsx
DEVICE_VISUALS.mydevice = (s) => (
  <div className="flex flex-col items-center gap-2">
    {/* Your visualization */}
    <span>{s.my_metric}</span>
  </div>
)
```

3. Add to `DEVICE_ICONS` in `components/exo/device-control.tsx`:

```tsx
const DEVICE_ICONS: Record<string, string> = {
  ...
  mydevice: "X",
}
```

4. Add commands to `DEVICE_COMMANDS`:

```tsx
mydevice: [
  { label: "Action 1", command: "do_thing" },
  { label: "Stop", command: "stop", color: "red" },
],
```

### Changing the Theme

Built on Tailwind CSS 4 + Radix UI. Edit `app/globals.css` for CSS custom properties:

```css
:root {
  --primary: 210 100% 50%;
  --background: 0 0% 100%;
  /* ... */
}
```

Dark mode is already configured via the `dark:` Tailwind prefix.

### Changing the Dashboard Refresh Rate

In `app/portal/exo/page.tsx`:

```tsx
const interval = setInterval(poll, 3000)   // Change to 1000 for 1Hz
```

---

## File Structure (Exo Additions Only)

```
nanotech_website/
├── next.config.mjs              ← Modified: added proxy rewrite
├── lib/
│   └── exo/
│       └── api.ts               ← NEW: typed API client
├── components/
│   └── exo/                     ← NEW: exo-specific components
│       ├── client-card.tsx
│       ├── video-feed.tsx
│       └── device-control.tsx
├── app/
│   └── portal/
│       └── exo/
│           ├── page.tsx         ← Modified: added Connected Pis section
│           ├── client/
│           │   └── [clientId]/
│           │       └── page.tsx ← NEW: per-Pi control panel
│           └── simulator/
│               └── page.tsx     ← NEW: software twin
└── EXO_README.md                ← NEW: this file
```

---

## Build for Production

```bash
pnpm build
pnpm start
```

The build outputs to `.next/`. Deploy options:

- **Vercel** — Push to GitHub, connect repo → zero-config
- **Docker** — See `../Dockerfile.frontend`
- **Self-hosted** — Run `pnpm start` behind Caddy/Nginx

For production, set these environment variables:

```bash
EXO_BACKEND_URL=https://api.your-domain.com
NODE_ENV=production
```

---

## Testing Checklist

Before pushing changes to the exo pages:

- [ ] Dashboard shows connected simulated Pi
- [ ] Video feed loads (placeholder or real)
- [ ] Clicking a device command shows result
- [ ] Telemetry tab updates via WebSocket (watch browser DevTools Network tab)
- [ ] Command history tab shows recent commands
- [ ] Simulator page animates when telemetry is flowing
- [ ] Server offline state shows helpful message
- [ ] Mobile responsive (test at 375px, 768px, 1024px widths)
- [ ] Dark mode works correctly

---

## Troubleshooting

### "Failed to fetch" errors in browser console

- Check server is running: `curl http://localhost:5000/api/health`
- Check Next.js proxy: look at terminal where `pnpm dev` runs for proxy errors
- Verify CORS in server's `.env`: `EXO_CORS_ORIGINS=http://localhost:3000`

### Video feed shows "No Video Feed"

- Pi agent must be running and connected
- Pi agent must have a camera in `devices.json` (type: "camera")
- In sim mode, synthetic frames are sent — should work
- Check server logs for "Video client connected: ..."

### WebSocket telemetry not updating

- Check DevTools → Network → WS tab; should see connection to `/api/exo/clients/<id>/telemetry/ws`
- Pi agent must be streaming telemetry (look for "Telemetry client connected" in server logs)
- Next.js dev server handles WebSocket proxying natively via rewrites

### TypeScript errors

TypeScript strict mode is enabled. Run:

```bash
pnpm tsc --noEmit
```

---

## See Also

- [../server/README.md](../server/README.md) — Backend API reference
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — Frontend ↔ Backend flow
- [../README.md](../README.md) — Project overview
- [README.md](README.md) — Original nanotech_website docs (calculators, portal, etc.)
