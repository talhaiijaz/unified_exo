# Device Reference

Per-device wiring, configuration, commands, and safety notes for all 8 device types supported by the Pi agent.

For the overall agent setup, see [README.md](README.md). For the Arduino firmware that many of these devices talk to, see [../arduino/WIRING.md](../arduino/WIRING.md).

---

## Device Overview

| Device Type | Connects To | Protocol | Safety Level |
|-------------|-------------|----------|:------------:|
| [motor](#motor) | Arduino via USB serial | Text commands | Medium |
| [oled](#oled) | Pi I2C or Arduino via serial | I2C (0x3C) / serial | Low |
| [camera](#camera) | Pi CSI or USB | libcamera / V4L2 | Low |
| [temperature](#temperature) | Arduino analog or Pi I2C | Analog read / I2C | Low |
| [gyroscope](#gyroscope) | Pi I2C or Arduino | I2C (0x68/0x6A) | Low |
| [ultrasonic](#ultrasonic-stimulator) | Arduino PWM | PWM via driver transistor | High |
| [vibration](#vibration-motor) | Arduino PWM | PWM via MOSFET | Low |
| [tens](#tens-unit) | Arduino via PWM + enable | PWM + digital | **CRITICAL** |

---

## motor

Controls stepper motors, servos, or DC motors via an Arduino-connected driver. Supports jointed actuation and linear stages.

### Config

```json
{
  "type": "motor",
  "id": "arm_motor",
  "port": "/dev/ttyUSB0",
  "baud": 115200,
  "steps_per_rev": 200,
  "max_speed_rpm": 120
}
```

| Field | Description |
|-------|-------------|
| `port` | USB serial device on Pi |
| `baud` | Serial baud rate (match Arduino firmware) |
| `steps_per_rev` | Optional; stepper-specific |
| `max_speed_rpm` | Optional safety limit |

### Commands

| Command | Params | Example | Description |
|---------|--------|---------|-------------|
| `step` | `N` | `step 100` | Step N times (negative for reverse) |
| `speed` | `N` | `speed 60` | Set RPM |
| `home` | — | `home` | Return to zero position |
| `stop` | — | `stop` | Immediate halt |

### Wiring (with stepper + A4988 driver)

```
       Arduino              A4988 Stepper Driver          NEMA 17 Motor
       ───────              ───────────────────           ─────────────
       Pin 2  ─────────────>   STEP
       Pin 3  ─────────────>   DIR
       Pin 4  ─────────────>   ENABLE (active low)
       GND    ─────────────>   GND
                               VMOT  <────── 12V PSU
                               VDD   <────── 5V from Arduino
                               1A, 1B, 2A, 2B ─────────── Motor coils
```

Wire A4988's `RESET` and `SLEEP` together, pulled to VDD.

**See [../arduino/WIRING.md](../arduino/WIRING.md) for full schematic.**

---

## oled

OLED display for AR glasses or info HUD. Supports the SSD1306 via I2C (128x64 default).

### Config

```json
{
  "type": "oled",
  "id": "glasses",
  "port": "/dev/ttyACM0",
  "baud": 115200,
  "i2c_address": "0x3C",
  "width": 128,
  "height": 64
}
```

| Field | Description |
|-------|-------------|
| `port` | If using Arduino bridge (via serial); omit for direct I2C |
| `i2c_address` | Typically `0x3C` or `0x3D` |
| `width`, `height` | Display resolution |

### Commands

| Command | Params | Example | Description |
|---------|--------|---------|-------------|
| `display` | `INDEX TEXT` | `display 0 Hello` | Show text at position INDEX |
| `clear` | — | `clear` | Blank the display |
| `blank` | — | `blank` | Same as clear |
| `dot` | `X Y` or `sweep` | `dot 64 32` or `dot sweep` | Show a dot (for eye tracking) |
| `message` | `TEXT` | `message Look left` | Multi-line text |

### Wiring (I2C, direct to Pi)

```
  Pi Zero 2 (GPIO)               SSD1306 OLED
  ───────────────                ────────────
  3.3V (Pin 1)    ──────────>    VCC
  GND  (Pin 6)    ──────────>    GND
  SDA  (Pin 3)    ──────────>    SDA
  SCL  (Pin 5)    ──────────>    SCL
```

Verify it's detected: `i2cdetect -y 1` — should show `3c` or `3d`.

---

## camera

Video capture from Pi Camera Module (CSI) or USB webcams. Supports multiple cameras per Pi.

### Config

```json
{
  "type": "camera",
  "id": "main_cam",
  "resolution": [640, 480],
  "camera_index": 0,
  "fps": 15
}
```

| Field | Description |
|-------|-------------|
| `resolution` | `[width, height]` |
| `camera_index` | 0 for first camera, 1 for second, etc. |
| `fps` | Capture rate (server streams at configured FPS) |

### Commands

| Command | Params | Example | Description |
|---------|--------|---------|-------------|
| `start` | — | `start` | Activate camera |
| `stop` | — | `stop` | Deactivate camera |
| `snapshot` | — | `snapshot` | Capture single frame |
| `record_start` | — | `record_start` | Begin recording frames to disk |
| `record_stop` | — | `record_stop` | End recording |

### Setup

**Pi Camera Module (CSI):**
```bash
# Enable in raspi-config
sudo raspi-config nonint do_camera 0
sudo reboot
# Verify
libcamera-hello --list-cameras
```

**USB Webcam:**
```bash
# Plug it in
lsusb
ls /dev/video*
```

### Multiple cameras

Just add multiple entries in `devices.json`:

```json
{"type": "camera", "id": "main_cam", "camera_index": 0},
{"type": "camera", "id": "eye_cam",  "camera_index": 1, "resolution": [320, 240]}
```

---

## temperature

Reads temperature from analog sensors (LM35, TMP36) via Arduino, or from I2C sensors (BMP280, SHT31) directly.

### Config

```json
{
  "type": "temperature",
  "id": "temp1",
  "port": "/dev/ttyUSB0",
  "baud": 115200,
  "sensor_type": "LM35"
}
```

### Commands

| Command | Params | Example | Description |
|---------|--------|---------|-------------|
| `read` | — | `read` | Return current temperature |
| `set_target` | `TEMP_C` | `set_target 37.0` | Set target for PID control |
| `control` | `on`/`off` | `control on` | Enable/disable active control |

### Telemetry (sent every 10Hz)

```json
{
  "temperature_c": 25.4,
  "target_c": 37.0,
  "control_active": true
}
```

### Wiring (LM35 — analog)

```
       LM35 TO-92               Arduino
       ───────────              ───────
       Pin 1 (VCC)  ──────────> 5V
       Pin 2 (Out)  ──────────> A0
       Pin 3 (GND)  ──────────> GND
```

Formula: `°C = (analog_reading / 1023) * 5.0 * 100`

---

## gyroscope

6-axis IMU providing acceleration and angular velocity readings. Supports MPU6050 and LSM6DSL over I2C.

### Config

```json
{
  "type": "gyroscope",
  "id": "imu",
  "i2c_address": "0x68",
  "sensor_type": "MPU6050"
}
```

| Sensor | I2C Address | Notes |
|--------|-------------|-------|
| MPU6050 | `0x68` (or `0x69` if AD0 high) | Most common; cheap |
| LSM6DSL | `0x6A` (or `0x6B`) | Higher quality, newer |

### Commands

| Command | Params | Example | Description |
|---------|--------|---------|-------------|
| `read` | — | `read` | Get current readings |
| `calibrate` | — | `calibrate` | Zero out bias |

### Telemetry

```json
{
  "accel_x": 0.01,
  "accel_y": -0.02,
  "accel_z": 9.81,
  "gyro_x": 0.001,
  "gyro_y": 0.002,
  "gyro_z": -0.001,
  "calibrated": true
}
```

### Wiring (MPU6050 — direct I2C)

```
  Pi (GPIO)                     MPU6050
  ─────────                     ───────
  3.3V                  ────>   VCC
  GND                   ────>   GND
  SDA (Pin 3)           <──>    SDA
  SCL (Pin 5)           <──>    SCL
```

---

## ultrasonic stimulator

Drives a piezo ultrasonic transducer for neuromodulation research. **Not** an HC-SR04 distance sensor.

> **Safety:** Ultrasonic stimulation can damage tissue at high intensities or certain frequencies. Always follow IRB protocols, use current limiting, and include a hardware kill switch.

### Config

```json
{
  "type": "ultrasonic",
  "id": "us1",
  "port": "/dev/ttyUSB0",
  "baud": 115200,
  "max_frequency_hz": 1000000,
  "max_duration_ms": 5000
}
```

### Commands

| Command | Params | Example | Description |
|---------|--------|---------|-------------|
| `pulse` | `FREQ DURATION_MS` | `pulse 40000 500` | Single pulse |
| `set_frequency` | `FREQ` | `set_frequency 40000` | Set continuous freq |
| `stop` | — | `stop` | Stop immediately |

### Wiring

Piezo transducer driven by Arduino PWM via MOSFET and step-up transformer. See [../arduino/WIRING.md#ultrasonic](../arduino/WIRING.md).

---

## vibration motor

Haptic vibration feedback using an eccentric rotating mass (ERM) motor driven by PWM.

### Config

```json
{
  "type": "vibration",
  "id": "vib1",
  "port": "/dev/ttyUSB0",
  "baud": 115200,
  "pwm_pin": 6
}
```

### Commands

| Command | Params | Example | Description |
|---------|--------|---------|-------------|
| `set` | `INTENSITY` | `set 128` | PWM duty (0–255) |
| `pattern` | `NAME` | `pattern pulse` | Preset pattern (pulse, sos, wave) |
| `stop` | — | `stop` | Stop vibration |

### Wiring (with MOSFET driver)

```
  Arduino Pin 6 ──[100Ω]──> MOSFET Gate (2N7000 or similar)
                                Drain ──> Motor (-)
                                Source ─> GND
  5V ────────────────> Motor (+)
  Flyback diode (1N4007) across motor terminals.
```

---

## TENS unit

Transcutaneous Electrical Nerve Stimulation for muscle activation research.

> **CRITICAL SAFETY:**
> - Always use medical-grade isolated electrodes
> - Never apply near heart, head, or mucous membranes
> - Include physical e-stop accessible to subject
> - Auto-stop timer enforced by driver (default 30s max)
> - Requires IRB approval and informed consent
> - Do not use on subjects with pacemakers or implanted devices

### Config

```json
{
  "type": "tens",
  "id": "tens1",
  "port": "/dev/ttyUSB0",
  "baud": 115200,
  "max_intensity": 100,
  "max_duration_s": 30,
  "safety_enable_pin": 7
}
```

| Field | Description |
|-------|-------------|
| `max_intensity` | Hard cap (0–100) — software enforced |
| `max_duration_s` | Auto-stop timer — software enforced |
| `safety_enable_pin` | Digital pin; must be pulsed to keep TENS active (watchdog) |

### Commands

| Command | Params | Example | Description |
|---------|--------|---------|-------------|
| `set` | `INTENSITY FREQ DURATION` | `set 50 40 10` | Start at INTENSITY (0–100), FREQ Hz, for DURATION sec |
| `pattern` | `NAME` | `pattern burst` | Named pattern (burst, continuous, ramp) |
| `stop` | — | `stop` | Immediate stop |

### Auto-Stop

The Pi driver starts a `threading.Timer` for the duration and auto-stops when it expires. If the timer fails or the process crashes, the Arduino should also auto-stop after a missed watchdog pulse.

### Wiring

```
  Arduino PWM ──> Opto-isolator ──> TENS power stage ──> Isolation transformer ──> Electrodes
  Arduino EN  ──> Relay coil ─────> TENS power stage enable
```

See [../arduino/WIRING.md#tens](../arduino/WIRING.md) for the full isolated circuit.

---

## Choosing Devices for Your Pi

Not every Pi needs every device. Common configurations:

### Configuration A: Arm Exoskeleton Pi

```json
{"devices": [
  {"type": "motor", "id": "shoulder"},
  {"type": "motor", "id": "elbow"},
  {"type": "gyroscope", "id": "imu"},
  {"type": "camera", "id": "env_cam"},
  {"type": "vibration", "id": "feedback"}
]}
```

### Configuration B: Eye Tracker Glasses (Pi Zero)

```json
{"devices": [
  {"type": "camera", "id": "eye_cam"},
  {"type": "oled", "id": "display"}
]}
```

### Configuration C: Stimulation Station

```json
{"devices": [
  {"type": "ultrasonic", "id": "us1"},
  {"type": "tens", "id": "tens1"},
  {"type": "temperature", "id": "skin_temp"}
]}
```

---

## Finding Serial Ports

```bash
ls -la /dev/tty*     # List all serial devices
dmesg | grep tty     # See which one was just connected
```

Common patterns:

- `/dev/ttyUSB0` — USB-to-serial adapter (CH340, FTDI, CP2102)
- `/dev/ttyACM0` — Arduino Uno or similar (USB-CDC)
- `/dev/ttyAMA0` — Pi's built-in UART
- `/dev/serial0` — Default UART alias

To make a port persistent across reboots, use udev rules:

```bash
# /etc/udev/rules.d/99-exo.rules
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", SYMLINK+="exo_motor"
```

Then reference `/dev/exo_motor` in `devices.json`.

---

## See Also

- [README.md](README.md) — Pi agent overview and setup
- [../arduino/WIRING.md](../arduino/WIRING.md) — Complete Arduino wiring diagrams
- [../arduino/README.md](../arduino/README.md) — Firmware reference
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — How to add new device types
