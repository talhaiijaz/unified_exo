## Berkeley Nanotech Research Portal

Next.js 15 + React 19 app for interactive nanotechnology tools, simulations, and internal control panels.

### Docs

- **Calculations portal** – Structure of `/portal/calculations` and how to add new tools. See `docs/CALCULATIONS_GUIDE.md`.
- **NiTRO simulator (overview)** – UX and high-level integration of the NiTRO app. See `docs/NITRO_INTEGRATION.md`.
- **NiTRO simulator (technical)** – Full TypeScript port, math, and data flow for NiTRO. See `docs/NITRO_WORKING.md`.
- **LMP91000 potentiostat** – Teensy + LMP91000 bridge API expected by `LMP91000Tool`. See `docs/LMP91000_INTEGRATION.md`.
- **Microfluidics calculator** – Implementation details for the capillary-flow calculator. See `docs/MICROFLUIDICS_IMPLEMENTATION.md`.
- **Microfluidics notes** – Physics background, requirements, and design notes. See `docs/MICROFLUIDICS_NOTES.md`.
- **Syringe pump control** – Raspberry Pi + Arduino Nano backend and `/api/pump/*` contracts. See `docs/SYRINGE_PUMP_RPI_SETUP.md`.
- **Team section** – How to edit the team grid and images. See `docs/TEAM_SECTION_INFO.md`.

### Raspberry Pi plan (short)

- **Phase 1 – Vercel + Pi backends**: Keep the web app on Vercel; run hardware bridge services (LMP91000, syringe pump, etc.) on a Pi or lab machine, exposing simple HTTP APIs.
- **Phase 2 – Pi-hosted portal**: Run this Next.js app directly on a Raspberry Pi (Node or Docker), pointing existing frontend code at local HTTP services with the same JSON contracts.
- **Phase 3 – Consolidate services**: Gradually fold device backends into a unified Pi stack (shared logging, auth, monitoring) while keeping `/api/*` shapes stable so the UI doesn’t need rewrites.
