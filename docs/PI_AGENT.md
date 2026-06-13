# Pi Agent Guide

**Path:** `pi_agent/`  
**Runs on:** Raspberry Pi exoskeletons

## Add a new device driver

1. Create `pi_agent/devices/my_device.py` extending `DeviceDriver`
2. Register in `pi_agent/devices/__init__.py`
3. Add entry to `pi_agent/devices.json` for each Pi

See `CONTRIBUTING.md` for a full walkthrough and `pi_agent/DEVICES.md` for wiring.

## Configure a Pi

Set on the Pi (`.env` or systemd):

```bash
EXO_HOST=<server-ip>    # e.g. 192.168.0.29 or nanotechserver.ddns.net
```

Default ports: control 1863, video 8612, telemetry 8613.

## Run locally (simulated)

```bash
EXO_SIM_MODE=1 EXO_HOST=127.0.0.1 python3 pi_agent/agent.py
```

## Deploy to a Pi

```bash
./scripts/deploy_pi.sh
# Or see pi_agent/README.md
```

## Submitting changes

Pi agent changes deploy to Pis separately from the main server deploy. Document in your PR which Pis need updating.
