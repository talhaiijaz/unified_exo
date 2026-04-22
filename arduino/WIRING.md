# Hardware Wiring Guide

Complete schematics, pin assignments, bill of materials, and safety notes for the Exo-Platform hardware stack.

---

## Table of Contents

1. [Master Pin Assignment](#master-pin-assignment)
2. [System Block Diagram](#system-block-diagram)
3. [Per-Device Schematics](#per-device-schematics)
   - [Motor (Stepper + A4988)](#motor---stepper--a4988)
   - [OLED Display (SSD1306)](#oled---ssd1306-i2c)
   - [Temperature Sensor (LM35)](#temperature---lm35-analog)
   - [IMU (MPU6050)](#imu---mpu6050-i2c)
   - [Ultrasonic Stimulator](#ultrasonic---piezo-transducer)
   - [Vibration Motor](#vibration---erm-motor-with-mosfet)
   - [TENS Unit (Isolated)](#tens---isolated-medical-stage)
4. [Power Budget](#power-budget)
5. [Bill of Materials (BOM)](#bill-of-materials)
6. [PCB Layout Suggestions](#pcb-layout-suggestions)
7. [Safety Checklist](#safety-checklist)

---

## Master Pin Assignment

Default pin mapping (Arduino Uno / Nano). Adjust for your board at the top of `exo_controller.ino`.

| Pin | Function | Device | Direction | Notes |
|:---:|----------|--------|:---------:|-------|
| D0 | RX | USB Serial | IN | Do not use — serial to Pi |
| D1 | TX | USB Serial | OUT | Do not use — serial to Pi |
| D2 | STEP | Motor | OUT | Pulse for stepper step |
| D3 | DIR | Motor | OUT | Direction for stepper |
| D4 | ENABLE | Motor | OUT | Active-low (LOW = enabled) |
| D5 | PWM | Ultrasonic | OUT | Driver transistor gate |
| D6 | PWM | Vibration | OUT | MOSFET gate |
| D7 | — | Reserved | — | Spare |
| D8 | — | Reserved | — | Spare |
| D9 | PWM | TENS | OUT | Via optocoupler |
| D10 | DIGITAL | TENS Enable | OUT | Via relay coil (safety) |
| D11 | — | Reserved | — | Spare |
| D12 | — | Reserved | — | Spare |
| D13 | LED | Status | OUT | Built-in onboard LED |
| A0 | Analog | Temperature | IN | LM35 / TMP36 |
| A1-A3 | — | Reserved | — | Spare analog |
| A4 (SDA) | I2C Data | OLED + IMU | BIDIR | Shared bus |
| A5 (SCL) | I2C Clock | OLED + IMU | OUT | Shared bus |

**Power rails:**
- `5V` — From Arduino or external PSU
- `3.3V` — From Arduino regulator (limited current)
- `VIN` — External power input (7-12V recommended)
- `GND` — Common ground (critical for multi-device setups)

---

## System Block Diagram

```
                    ┌──────────────────────────────────────────┐
                    │       Raspberry Pi (Pi 4 / Pi 5)          │
                    │                                           │
                    │  agent.py ← devices.json                 │
                    │         │                                 │
                    └─────────┼─────────────────────────────────┘
                              │ USB Serial @ 115200
                              │
                              ▼
       ┌────────────────────────────────────────────────────┐
       │              Arduino / Teensy                       │
       │            (exo_controller.ino)                     │
       │                                                      │
       │   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐            │
       │   │ STEP │  │ DIR  │  │ EN   │  │ PWM  │            │
       │   │  D2  │  │  D3  │  │  D4  │  │ D5-6 │            │
       │   └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘            │
       │      │         │         │         │                 │
       │   ┌──▼─────────▼─────────▼┐   ┌───▼────────┐       │
       │   │      Motor Driver     │   │  PWM       │       │
       │   │       (A4988)         │   │  Drivers   │       │
       │   └────────┬──────────────┘   └─┬──────────┘       │
       │            │                     │                   │
       │  I2C (SDA/SCL) ─────┐           │                   │
       │                     │           │                   │
       │   ┌────▼───┐  ┌────▼───┐       │                   │
       │   │ OLED   │  │ IMU    │       │                   │
       │   │ 0x3C   │  │ 0x68   │       │                   │
       │   └────────┘  └────────┘       │                   │
       └───────────────────────────────────────────────────┘
                │            │            │       │       │
                ▼            ▼            ▼       ▼       ▼
          ┌────────┐   ┌────────┐   ┌────────┐ ┌─────┐ ┌────────┐
          │ Stepper│   │ OLED   │   │ IMU    │ │ ERM │ │ TENS   │
          │ Motor  │   │ Display│   │ Sensor │ │Motor│ │ Stage  │
          └────────┘   └────────┘   └────────┘ └─────┘ └────────┘
                                                            │
                                                            ▼
                                                     ┌─────────────┐
                                                     │ Electrodes  │
                                                     │ (Isolated)  │
                                                     └─────────────┘
```

---

## Per-Device Schematics

### Motor — Stepper + A4988

Controls a NEMA 17 stepper motor using the popular A4988 driver.

```
            Arduino                      A4988 Driver                  NEMA 17 Motor
            ───────                      ────────────                  ─────────────

             +5V ───────────────────┬── VDD                             ┌─┐
                                    │                                   │ │
             D2 (STEP) ──────────┬──────── STEP                         │M│
                                 │  │                                   │ │
             D3 (DIR)   ─────────┼──┼───── DIR                          └┬┘
                                 │  │                                    │
             D4 (EN)    ─────────┼──┼───── ENABLE (active low)           │
                                 │  │                                    │
             GND ────────────────┼──┼───── GND ──────────┐               │
                                 │  │                    │               │
                                 │  └───── MS1  ─┐       │       ┌──── 1A ─┘ (coil A+)
                                 │      MS2  ─┼─ to VDD │       ├──── 1B   (coil A-)
                                 │      MS3  ─┘         │       ├──── 2A   (coil B+)
                                 │                       │       └──── 2B ─┐ (coil B-)
                                 │                       │                  │
                                 └─── RESET ── to SLEEP ─┘                  │
                                                                            │
                                       ┌────────────────────────────────────┘
                                       │
                                       ├── 100µF cap ── GND
                                       │
                                       VMOT ────── 12V DC PSU (+)
                                                   (at least 1A, 2A for big steppers)

                                       PSU GND ─── Common GND
```

**Notes:**
- Set microstepping: connect MS1/MS2/MS3 to VDD for 1/16 stepping (smooth)
- 100µF capacitor across VMOT/GND is required to prevent voltage spikes
- Adjust current limit on A4988 with the onboard potentiometer (typically 1A for NEMA 17)
- Use a **separate PSU** for VMOT — do NOT power from Arduino

**Status LED indication:** Built-in LED on D13 pulses with each step (if enabled in firmware).

---

### OLED — SSD1306 I2C

128x64 monochrome OLED display (for AR glasses, status HUD).

```
            Arduino                         SSD1306 OLED
            ───────                         ────────────

            +3.3V ──────────────────>  VCC    [most modules accept 3.3-5V]
            GND   ──────────────────>  GND
            A4 (SDA) ───────────────>  SDA
            A5 (SCL) ───────────────>  SCL
```

**Detection:** Run `i2cdetect -y 1` on the Pi (if OLED connected via Pi directly) or use firmware's I2C scan. Default address is `0x3C`. Some modules use `0x3D`.

**Pull-ups:** Most SSD1306 breakout boards include 10kΩ pull-ups on SDA/SCL. If you're using a bare chip, add them manually.

**Long wires:** I2C is not designed for long cables. Keep under 30cm or use an I2C extender.

---

### Temperature — LM35 (Analog)

Linear analog temperature sensor, 10 mV/°C.

```
            Arduino                  LM35 (TO-92 package)
            ───────                  ────────────────────

            +5V    ─────────────>    Pin 1 (VCC)
            A0     <─────────────    Pin 2 (Vout)
            GND    ─────────────>    Pin 3 (GND)


                     LM35 pinout (flat side facing you):
                                                ┌──────┐
                                                │ LM35 │
                                                └┬┬┬───┘
                                                 │││
                                                VCC OUT GND
```

**Reading formula** (in firmware):
```cpp
float voltage = (analogRead(A0) / 1023.0) * 5.0;   // 0-5V
float tempC   = voltage * 100.0;                    // 10mV/°C
```

**Alternative sensors:**
- **TMP36** — Similar, 10 mV/°C with 500 mV offset (subtract in formula)
- **DS18B20** — Digital 1-Wire, needs a library; better accuracy
- **SHT31** — I2C, measures humidity too; ±0.2°C accuracy

---

### IMU — MPU6050 (I2C)

6-axis accelerometer + gyroscope. Shares the I2C bus with OLED.

```
            Arduino                     MPU6050 Breakout
            ───────                     ────────────────

            +3.3V  ─────────────>   VCC    [5V tolerant on most breakouts]
            GND    ─────────────>   GND
            A4 (SDA) ───────────>   SDA    (shared with OLED)
            A5 (SCL) ───────────>   SCL    (shared with OLED)
            [Optional] D2 <─────    INT    (interrupt pin — for advanced use)
            [Optional] GND <────    AD0    (pulls address to 0x68; remove for 0x69)
```

**I2C address:** Default `0x68`. Short AD0 to VCC to change to `0x69` (useful if you have two IMUs).

**Library:** Install `Adafruit_MPU6050` or use raw I2C reads in firmware. For LSM6DSL, use `SparkFun_LSM6DSO` or `Adafruit_LSM6DSOX`.

---

### Ultrasonic — Piezo Transducer

Drives a 40kHz (or higher) piezo transducer for neuromodulation. **Not** an HC-SR04 distance sensor.

```
                              +12V PSU
                                 │
                                 │
                           ┌─────┴─────┐
                           │           │
                   ┌───────┤  Ferrite  │
                   │       │   Bead    │
                   │       └─────┬─────┘
                   │             │
             100nF │             │
               cap ──┤├──────────┤
                   │             │
                   │          Drain
            Arduino                │
            D5 (PWM) ──[470Ω]── Gate
                                   │
                                 ┌─┘
                                 │  MOSFET (IRLZ44N or similar)
                                 └─┐
                                   │
                                Source
                                   │
                                   ├──── Piezo Transducer ──── GND
                                   │                            │
                                   └─── (TVS diode 15V) ────────┘

```

**Notes:**
- Use a **logic-level MOSFET** (IRLZ44N, 2N7000, or similar) that fully turns on at 5V gate drive
- The **TVS diode** across the piezo protects against inductive kickback
- **Ferrite bead** on VCC reduces EMI
- Generate PWM with Arduino's `tone()` function or use `analogWrite()` for duty control

**Firmware example:**
```cpp
tone(US_PIN, 40000, 500);   // 40kHz for 500ms
```

**Safety:**
- Use current limiting in series with the transducer if driving hard
- Monitor temperature — piezo transducers can overheat with continuous excitation
- Follow IRB protocols for human exposure

---

### Vibration — ERM Motor with MOSFET

Simple PWM-driven eccentric rotating mass (ERM) motor for haptic feedback.

```
            Arduino                        ERM Vibration Motor
            ───────                        ───────────────────

                                            ┌──────(+)
            +5V ──────────────────────────┤
                                          └──────(-) ─┐
                                                      │
                                        1N4007        │
                                      ┌──────┐        │
                                      │  ▷│ │        │
                                      └──────┘        │
                                                      │
                                                   Drain
            D6 (PWM) ──[100Ω]── Gate                  │
                                  │   MOSFET          │
                                  └─── (2N7000        │
                                          or IRLZ44N) │
                                        Source        │
                                         │            │
                                        GND ──────────┘

```

**Notes:**
- **Flyback diode** (1N4007) across the motor prevents voltage spikes when PWM switches off
- **Gate resistor** (100Ω) protects the Arduino pin
- For multiple motors, wire each in parallel with its own MOSFET
- PWM values: 0-50 = just audible, 100-150 = medium, 200-255 = strong

---

### TENS — Isolated Medical Stage

**SAFETY-CRITICAL.** This circuit applies electrical current to human skin. Proceed only with IRB approval, informed consent, and appropriate safety measures.

```
                                       !!! GALVANIC ISOLATION !!!
                                        ─────────────────────────
  Digital Side                                                          Analog (Isolated) Side
  (Grounded to Arduino)                                                 (Separate medical ground)

                                            ┌───────────┐
     D9 (PWM) ──[470Ω]── LED ◁┤├── GND  ────┤ Opto      │
                                            │ Isolator  │── PWM (isolated) ──> Gate
                                            │ (6N137)   │
                                            └───────────┘                     ┌───────────────┐
                                                                              │ TENS Power    │
     D10 (EN) ──────────> Relay Coil (5V)                                     │ Stage         │
                              │                                               │ (current-     │
                             GND                                              │  limited      │
                                                                              │  square wave) │
                          Relay contacts──>  Enable line to Power Stage       └───────┬───────┘
                                                                                      │
                                                                                      │
                                                                              Isolation Transformer
                                                                              (1:1, medical grade)
                                                                                      │
                                                                                      │
                                                                                ┌─── Electrode 1
                                                                                │
                                                                                └─── Electrode 2
```

**Required components:**

- **Optocoupler** (6N137 or similar high-speed) — Isolates digital PWM from analog side
- **Relay** (5V coil, medical-grade contacts) — Hardware enable, controlled by D10
- **Isolation transformer** — Medical grade (UL 60601), 1:1 or step-up ratio
- **Current limiter** — Series resistor or constant-current source (max 100mA for safety)
- **Medical-grade electrodes** — Hydrogel pads, NOT bare wires
- **Physical e-stop switch** — In series with the enable relay, within easy reach of the subject

**Firmware enforces** (in [`tens.py`](../pi_agent/devices/tens.py) and [`exo_controller.ino`](exo_controller/exo_controller.ino)):
- Max intensity cap (0-100, maps to PWM 0-255)
- Auto-stop timer (default 30 seconds)
- Watchdog: Arduino must receive keep-alive; otherwise auto-stops

**Do not deploy without:**
- [ ] IRB protocol approval
- [ ] Subject informed consent
- [ ] Operator trained in emergency procedures
- [ ] Medical supervision available
- [ ] Verified isolation (megger test on transformer)
- [ ] Physical e-stop tested and accessible to subject

---

## Power Budget

Calculating how much current your setup draws (helps size PSU):

| Device | Typical Current @ 5V | Peak | Notes |
|--------|:-------------------:|:----:|-------|
| Arduino Uno (idle) | 50 mA | 100 mA | |
| OLED (full on) | 20 mA | 30 mA | @ 3.3V or 5V |
| MPU6050 IMU | 4 mA | 10 mA | @ 3.3V |
| LM35 Temp | 0.06 mA | 1 mA | Negligible |
| Stepper Motor | — | — | External 12V PSU @ 1-2A |
| ERM Vibration Motor | 75 mA | 120 mA | Per motor |
| Ultrasonic Transducer | 100 mA | 500 mA | Peaks during pulse |
| TENS Stage | — | — | External isolated PSU |

**Recommendation:** Use a **USB power supply rated ≥2A** for the Arduino + low-power devices. Use a **separate 12V 3A PSU** for motors and ultrasonic.

---

## Bill of Materials

### Minimum Setup (Single Exoskeleton)

| Qty | Part | Approx. Price | Source |
|:---:|------|:-------------:|--------|
| 1 | Raspberry Pi 4 (4GB) | $55 | [Adafruit #4296](https://www.adafruit.com/product/4296) |
| 1 | Pi Camera Module 3 | $25 | [Adafruit #5657](https://www.adafruit.com/product/5657) |
| 1 | Arduino Uno R3 | $28 | [Adafruit #50](https://www.adafruit.com/product/50) |
| 1 | A4988 Stepper Driver | $4 | [Pololu #1182](https://www.pololu.com/product/1182) |
| 1 | NEMA 17 Stepper Motor | $15 | [Adafruit #324](https://www.adafruit.com/product/324) |
| 1 | SSD1306 OLED 128x64 I2C | $8 | [Adafruit #938](https://www.adafruit.com/product/938) |
| 1 | MPU6050 Breakout | $5 | [Adafruit #3886](https://www.adafruit.com/product/3886) |
| 1 | LM35 Temp Sensor | $2 | Digikey `LM35DZ-ND` |
| 1 | ERM Vibration Motor | $3 | [SparkFun ROB-08449](https://www.sparkfun.com/products/8449) |
| 1 | 12V 3A PSU | $15 | Any standard barrel-jack |
| 1 | Breadboard + Jumpers | $10 | — |
| — | **Subtotal** | **~$170** | |

### Additional for Full Setup

| Qty | Part | Approx. Price | Source |
|:---:|------|:-------------:|--------|
| 1 | Piezo Ultrasonic 40kHz | $5 | eBay / AliExpress |
| 1 | IRLZ44N MOSFETs (5-pack) | $4 | Digikey |
| 1 | Medical TENS Unit (modify) | $40-200 | **Research only — do NOT use on humans without IRB** |
| 1 | 6N137 Optocouplers | $2 | Digikey |
| 1 | 5V Relay Module | $3 | — |
| 1 | Medical isolation transformer | $50-200 | Digikey `595-1651-ND` |
| 1 | Hydrogel electrodes (pack) | $15 | — |

### Tools You'll Need

- Soldering iron
- Multimeter
- Oscilloscope (recommended for ultrasonic work)
- Logic analyzer (helpful for I2C debugging)
- Wire strippers, side cutters
- Heat shrink tubing

---

## PCB Layout Suggestions

For production deployment (replacing the breadboard):

1. **Separate analog and digital ground planes**, joined at a single point
2. **Keep I2C traces short** (< 10 cm) and avoid running parallel to PWM traces
3. **Place decoupling caps** (100nF ceramic + 10µF electrolytic) close to each IC's power pins
4. **Use ground-pour** between high-speed traces to reduce crosstalk
5. **Include a kill switch** — hard-wired to cut power to all output stages
6. **Add test points** on every important signal for debugging
7. **Label connectors** clearly — a pin-mixed-up TENS cable is dangerous
8. **Fuse each rail** — 5V fuse for logic, separate fuse for motor PSU

**Recommended design tools:**
- KiCad (free, open-source)
- EasyEDA (browser-based, integrated with JLCPCB)

---

## Safety Checklist

Before running the system with a human subject:

### Electrical
- [ ] All power supplies are medical grade (UL 60601) OR properly isolated
- [ ] No exposed conductors can touch the subject
- [ ] Fuses installed on all power rails
- [ ] Ground loop check done (single-point grounding verified)

### Mechanical
- [ ] No pinch points in exoskeleton joints at any position
- [ ] Motor torque limited (via current limiting) to safe levels
- [ ] Hard stops prevent joints from exceeding physiological range
- [ ] Quick-release mechanisms on all straps

### Software
- [ ] Firmware watchdog enabled (auto-stop if Pi loses connection)
- [ ] TENS auto-stop tested (duration limit enforced)
- [ ] Physical e-stop tested — must cut power immediately
- [ ] Emergency stop command (`*_stop`) tested for every device

### Protocol
- [ ] IRB approval obtained
- [ ] Informed consent signed
- [ ] Operator training completed
- [ ] Medical supervisor available

### Documentation
- [ ] Device schematic archived
- [ ] Firmware version logged
- [ ] Calibration data recorded
- [ ] Experiment parameters documented

---

## See Also

- [README.md](README.md) — Arduino firmware reference
- [../pi_agent/DEVICES.md](../pi_agent/DEVICES.md) — Pi-side device config
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — Communication protocol
- [../LICENSE](../LICENSE) — MIT + safety notice
