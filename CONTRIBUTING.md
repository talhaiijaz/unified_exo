# Contributing to Unified Server (Exo-Platform)

**Canonical repo:** [jadoo-tech/unified_server](https://github.com/jadoo-tech/unified_server)  
**New here?** Start with [docs/ONBOARDING.md](docs/ONBOARDING.md)

## Git workflow

1. Get jadoo-tech access from **Dr. Waqas Khalid** (send GitHub username)
2. Fork `jadoo-tech/unified_server`
3. `git checkout -b feature/short-name`
4. Make changes — see table below
5. Open PR to `main`
6. After merge, deployer runs `./scripts/deploy.sh` on [nanotechserver](http://nanotechserver.ddns.net:8080)

---

Thanks for your interest! This doc covers how to add features, fix bugs, and extend the platform.

---

## Ways to Contribute

| Type | Where | Effort |
|------|-------|:------:|
| **Add a new device driver** | `pi_agent/devices/` + `arduino/exo_controller.ino` | 30 min |
| **Add a new API route** | `server/routes/` | 15 min |
| **Add a UI component** | `nanotech_website/components/exo/` | 30 min |
| **Fix a bug** | Anywhere | Varies |
| **Improve docs** | `*.md` files | 10 min |
| **Add tests** | `tests/` directories | Varies |

---

## Adding a New Device Driver — Full Walkthrough

Let's add a **pressure sensor** as an example.

### Step 1: Create the Pi driver

Create `pi_agent/devices/pressure.py`:

```python
"""Pressure sensor driver — reads pressure values via I2C or serial."""

from __future__ import annotations

import random
from typing import Any

from .base import DeviceDriver


class PressureDriver(DeviceDriver):
    device_type = "pressure"

    def __init__(self, device_id, device_config, sim_mode):
        super().__init__(device_id, device_config, sim_mode)
        self._last_reading = 1013.25  # standard atm pressure (hPa)

    def execute_command(self, command, params=""):
        if command == "read":
            reading = self._read_pressure()
            return ("ok", f"pressure: {reading:.2f} hPa")

        if command == "zero":
            if not self.sim_mode:
                self._serial_write("pressure_zero")
            return ("ok", "zeroed")

        return ("error", f"unknown pressure command: {command}")

    def read_telemetry(self) -> dict[str, Any] | None:
        return {
            "pressure_hpa": self._read_pressure(),
            "altitude_m": self._estimate_altitude(),
        }

    def _read_pressure(self) -> float:
        if self.sim_mode:
            # Simulate slight fluctuation
            self._last_reading += random.uniform(-0.5, 0.5)
            return round(self._last_reading, 2)

        resp = self._serial_write("pressure_read")
        if resp:
            try:
                return float(resp)
            except ValueError:
                pass
        return self._last_reading

    def _estimate_altitude(self) -> float:
        # Barometric formula
        p = self._last_reading
        return round(44330 * (1 - (p / 1013.25) ** 0.1903), 1)
```

### Step 2: Register in the DEVICE_REGISTRY

Edit `pi_agent/devices/__init__.py`:

```python
from .pressure import PressureDriver   # add this import

DEVICE_REGISTRY: dict[str, type[DeviceDriver]] = {
    "motor": MotorDriver,
    # ... existing devices ...
    "pressure": PressureDriver,          # add this entry
}

__all__ = [
    # ... existing exports ...
    "PressureDriver",
]
```

### Step 3: Add to `devices.json`

```json
{
  "devices": [
    {"type": "pressure", "id": "barometer", "port": "/dev/ttyUSB0", "baud": 115200}
  ]
}
```

### Step 4: Add Arduino handler

Edit `arduino/exo_controller/exo_controller.ino`:

```cpp
// Add at top
#define ENABLE_PRESSURE 1
#define PRESSURE_I2C_ADDR 0x77   // BMP280 default

// In setup()
#if ENABLE_PRESSURE
  // Init BMP280 or similar
#endif

// In processCommand()
#if ENABLE_PRESSURE
  if (cmd == "pressure_read") {
    float hpa = readPressure();   // your implementation
    Serial.print("{\"type\":\"telemetry\",\"sensor\":\"pressure\",\"value\":");
    Serial.print(hpa, 2);
    Serial.println("}");
    return;
  }
  if (cmd == "pressure_zero") {
    sendAck("pressure_zero", "ok");
    return;
  }
#endif
```

### Step 5: Add to the frontend dashboard

Edit `nanotech_website/components/exo/device-control.tsx`:

```tsx
const DEVICE_ICONS: Record<string, string> = {
  // ... existing ...
  pressure: "P",
}

const DEVICE_COMMANDS: Record<string, ...> = {
  // ... existing ...
  pressure: [
    { label: "Read", command: "read" },
    { label: "Zero", command: "zero" },
  ],
}
```

### Step 6: Add visualization to simulator

Edit `nanotech_website/app/portal/exo/simulator/page.tsx`:

```tsx
DEVICE_VISUALS.pressure = (s) => (
  <div className="flex flex-col items-center gap-2">
    <div className="w-16 h-16 rounded-full border-4 border-primary flex items-center justify-center">
      <span className="text-xs font-mono">{s.pressure_hpa?.toFixed(1)}</span>
    </div>
    <span className="text-xs text-muted-foreground">
      Alt: {s.altitude_m}m
    </span>
  </div>
)
```

### Step 7: Document it

Update:
- `pi_agent/DEVICES.md` — Add a pressure section
- `arduino/WIRING.md` — Add pressure wiring
- `README.md` — Add "Pressure" to the supported devices table

### Step 8: Test

```bash
# Start server
python3 server/app.py

# Start simulated agent
EXO_SIM_MODE=1 python3 pi_agent/agent.py

# Open browser
open http://localhost:3000/portal/exo
```

Your new pressure device should appear in the device manifest, be controllable, and show telemetry.

### Step 9: Submit a PR

```bash
git checkout -b feat/pressure-driver
git add .
git commit -m "Add pressure sensor driver"
git push origin feat/pressure-driver
# Open PR on GitHub
```

---

## Adding a New API Route

### Step 1: Create the route module

Create `server/routes/myroute.py`:

```python
"""My custom route — does X."""

from __future__ import annotations
from fastapi import APIRouter

router = APIRouter(prefix="/api/myroute", tags=["myroute"])


@router.get("/")
def hello():
    return {"message": "Hello from myroute"}
```

### Step 2: Register in app.py

```python
from routes import clients, commands, video, telemetry, auth, myroute

app.include_router(myroute.router)
```

### Step 3: Call from frontend

In `nanotech_website/lib/exo/api.ts`:

```typescript
export async function getMyThing() {
  return fetchJSON(`${BASE}/myroute/`)
}
```

---

## Code Style

### Python

- **Formatting:** [ruff](https://github.com/astral-sh/ruff) with default settings
- **Type hints:** Required for all function signatures
- **Imports:** Alphabetical, grouped (stdlib, third-party, local)
- **Docstrings:** One-liner for simple functions; Google style for complex
- **Line length:** 100 chars max

Example:

```python
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter

import config


def get_device(client_id: str, device_id: str) -> dict[str, Any] | None:
    """Return device info, or None if not found."""
    # ...
```

### TypeScript

- **Formatting:** Prettier with default settings
- **Strict mode:** Enabled (no implicit any)
- **Components:** `function` declarations, not arrow functions, for top-level
- **Imports:** Sorted by `@/lib/*` → `@/components/*` → relative
- **File names:** `kebab-case.tsx` for components

Example:

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { listClients, type PiClient } from "@/lib/exo/api"

export function MyComponent({ id }: { id: string }) {
  const [data, setData] = useState<PiClient | null>(null)
  // ...
}
```

### Arduino

- **Indentation:** 2 spaces (not tabs)
- **Naming:** `snake_case` for variables, `UPPER_CASE` for `#define`
- **Comments:** Describe *why*, not *what*
- **Compile flags:** Wrap device-specific code in `#if ENABLE_XYZ ... #endif`

---

## Testing

### Python (server and pi_agent)

```bash
cd server
python3 -m pytest tests/
```

Tests live in `tests/` alongside code. Use `pytest-asyncio` for async tests.

### Frontend

```bash
cd nanotech_website
pnpm test           # (when set up)
pnpm tsc --noEmit   # Type check
```

### Integration

Use the simulated agent to test end-to-end:

```bash
EXO_SIM_MODE=1 python3 pi_agent/agent.py
# Then in browser: verify commands round-trip
```

---

## Pull Request Checklist

Before opening a PR:

- [ ] Branch is up-to-date with `main`
- [ ] Code follows style guidelines
- [ ] Added/updated tests (if applicable)
- [ ] Added/updated documentation
- [ ] All existing tests pass
- [ ] Tested manually with simulated agent
- [ ] PR description explains WHY, not just WHAT
- [ ] Linked any related issues

### PR Template

```markdown
## Summary
Brief description of what this PR does.

## Motivation
Why is this change needed?

## Changes
- Added file X for purpose Y
- Modified Z to support A
- Deleted B because C

## Testing
How I verified this works:
1. ...
2. ...

## Screenshots (if UI change)
<!-- Attach -->

## Related Issues
Closes #XXX
```

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(devices): add pressure sensor driver
fix(server): handle EOF on telemetry channel
docs(readme): clarify port requirements
refactor(comm): extract message parsing
test(auth): add JWT expiration test
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `chore`.

---

## Project Governance

### Maintainers

- **Muhammad Talha Ijaz** — Lead developer
- **Dr. Waqas Khalid** — PI, Nanotech Lab, UC Berkeley

### Decision Making

For significant architecture changes, open a **GitHub Discussion** first before a PR.

### Code Review

- All PRs require at least one review
- Automated CI must pass (linting, type check, smoke tests)
- For device drivers: test on real hardware if possible before merging

---

## Reporting Bugs

Open an issue with:

1. **Environment** — OS, Python version, Pi model
2. **Steps to reproduce** — Exact commands
3. **Expected vs actual behavior**
4. **Logs** — Server logs, Pi agent logs, browser console
5. **Screenshots** — If UI bug

### Example Bug Report

> **Environment**: Raspberry Pi 4, Pi OS 64-bit, Python 3.11
>
> **Steps**:
> 1. Start server with `python3 app.py`
> 2. Start Pi agent with `EXO_SIM_MODE=0 python3 agent.py`
> 3. Open browser at http://localhost:3000/portal/exo/client/pi-01
> 4. Click "Step +100" on motor
>
> **Expected**: Command executes, ack received
> **Actual**: Nothing happens, no error shown
>
> **Logs**:
> ```
> [Pi] Connected to server with session_id=...
> [Server] Received command, forwarding...
> [Pi] No response
> ```

---

## Security

**Do not report security issues in public GitHub Issues.**

Email the maintainers privately with:
- Detailed description of the vulnerability
- Proof-of-concept code (if applicable)
- Suggested fix

We'll respond within 72 hours.

---

## License

By contributing, you agree that your contributions will be licensed under the same [MIT License](LICENSE) that covers the project.

---

## Thank You

Every contribution — from a typo fix to a new device driver — makes this project better. We appreciate your time.
