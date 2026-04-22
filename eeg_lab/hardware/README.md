# EEG Lab — Hardware Accessories

Physical hardware files (3D models, PCB layouts, wiring jigs) for the EEG Lab setup.

---

## Cable Cutting Jig

**Purpose:** Cuts electrode cable bundles to precise lengths for the EEG helmet, ensuring each wire reaches its electrode with minimal slack and clean routing.

**Designed by:** Yuxiang Tian (Berkeley Nanotech Lab)
**Date received:** 2026-03-31

### Two Versions

| File | Size | Use Case | Notes |
|------|------|----------|-------|
| [`cable-cutting-jig.stl`](cable-cutting-jig.stl) | 1.3 MB | Clean, neater cut results | Standard version — recommended for most cuts |
| [`cable-cutting-jig-aligned.stl`](cable-cutting-jig-aligned.stl) | 1.3 MB | Cleaner printed surface | Better print finish; slightly less precise for cable routing |

> Both STL files are included in this directory and ready to print.

### How to Use

1. **Print** the STL file on any standard FDM 3D printer (PLA or PETG).
2. **Separate** the wires of the electrode cable bundle.
3. **Bend** each wire where the jig ends.
4. **Cut** at the bends.
5. Wires will now reach each electrode at the correct length.

### Cable Routing (Helmet)

- Each helmet has **two halves** (left and right).
- The cable bundle is attached from the **very top of the helmet**.
- One bundle routes to each half.

```
        [Cable bundle top]
               │
        ┌──────┴──────┐
        │             │
   ┌────┴────┐   ┌────┴────┐
   │ Left    │   │ Right   │
   │ half    │   │ half    │
   │         │   │         │
   │ 5 elect │   │ 5 elect │
   └─────────┘   └─────────┘
```

### Printing Recommendations

- **Material:** PLA (standard) or PETG (more heat-resistant)
- **Infill:** 20–30% — jig doesn't need high strength
- **Layer height:** 0.2 mm for standard, 0.15 mm for the "aligned" version
- **Supports:** Check STL orientation; may be needed depending on printer

---

## Teensy EEG Board

The Teensy microcontroller that samples EEG signals is documented in:
- Firmware: [`../eeg_teensy/eeg_teensy.ino`](../eeg_teensy/eeg_teensy.ino)
- Protocol: See [`../README.md`](../README.md) for serial format

No physical CAD files for the Teensy itself — it's an off-the-shelf Teensy 3.2 or 4.0 with a custom shield (shield design TBD).

---

## Adding Hardware Files

When you receive new hardware files (STL, STEP, PCB, etc.), place them here organized by purpose:

```
eeg_lab/hardware/
├── README.md (this file)
├── cable-cutting-jig.stl              Standard jig
├── cable-cutting-jig-aligned.stl      Aligned version
├── helmet/                             (future) Helmet CAD files
├── teensy-shield/                      (future) PCB design files
└── electrodes/                         (future) Electrode holder designs
```

Update this README when new files are added.

---

## Related Documents

- [../README.md](../README.md) — EEG Lab overview and setup
- [../../README.md](../../README.md) — Project overview
- [../../STRUCTURE.md](../../STRUCTURE.md) — Full project map
