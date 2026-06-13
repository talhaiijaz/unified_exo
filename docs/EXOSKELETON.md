# Exoskeleton Guide

**Paths:** `Exoskeleton_public/`, `arduino/`, `pi_agent/devices/exoskeleton.py`

## Components

| Path | Purpose |
|------|---------|
| `Exoskeleton_public/` | Public exoskeleton docs and firmware references |
| `arduino/` | Arduino controller sketch (`exo_controller.ino`) |
| `pi_agent/devices/exoskeleton.py` | Pi-side device driver |

## Wiring

See `arduino/WIRING.md` and `arduino/README.md`.

## Submitting changes

Hardware changes often need coordinated updates across `arduino/`, `pi_agent/devices/`, and frontend controls in `nanotech_website/components/exo/`. Note all affected paths in your PR.
