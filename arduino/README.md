# Arduino Firmware — Exo-Controller

Unified firmware that turns any Arduino/Teensy/ESP32 into a device controller for the exoskeleton platform. Receives serial commands from the Pi agent, executes them on attached devices (motors, OLED, sensors, stimulators), and streams telemetry back.

**A single firmware serves all 8 device types** — enable only what you need via compile-time flags.

---

## Supported Boards

| Board | Status | Notes |
|-------|:------:|-------|
| **Arduino Uno / Nano** | ✓ | Good for basic setups, limited PWM pins |
| **Arduino Mega 2560** | ✓ | More pins if you need many devices |
| **Teensy 3.2 / 4.0** | ✓✓ | Recommended — fast, more I/O, better PWM |
| **ESP32** | ✓ | Good option if you want WiFi alongside serial |
| **Raspberry Pi Pico** | ⚠️ | Should work; needs Arduino-Pico core |
| **STM32 Blue Pill** | ⚠️ | Works with STM32duino |

---

## Required Libraries

Install via Arduino IDE → Library Manager, or via `arduino-cli lib install`:

| Library | Why Needed | Install |
|---------|------------|---------|
| `Wire` | I2C (OLED, IMU) | Built-in |
| `Adafruit SSD1306` | OLED display | Library Manager |
| `Adafruit GFX` | Graphics primitives | Library Manager |
| `Adafruit_MPU6050` | IMU (optional) | Library Manager |
| `AccelStepper` | Advanced stepper control (optional) | Library Manager |

```bash
# Via arduino-cli
arduino-cli lib install "Adafruit SSD1306" "Adafruit GFX Library"
```

---

## Compile-Time Device Flags

The firmware uses `#define` flags to enable only the devices you've wired up. Open [`exo_controller.ino`](exo_controller/exo_controller.ino) and edit the top section:

```cpp
// ============ DEVICE FLAGS ============
#define ENABLE_MOTOR       1    // Stepper/DC motor
#define ENABLE_OLED        1    // SSD1306 OLED display
#define ENABLE_TEMP_SENSOR 1    // LM35 or similar analog temp
#define ENABLE_ULTRASONIC  1    // Piezo transducer (PWM)
#define ENABLE_VIBRATION   1    // ERM motor (PWM)
#define ENABLE_IMU         1    // MPU6050 / LSM6DSL
#define ENABLE_TENS        1    // TENS unit (with safety)
```

Set unused devices to `0` to save program space and avoid pin conflicts.

---

## Upload Instructions

### Option A: Arduino IDE

1. Open `arduino/exo_controller/exo_controller.ino`
2. Select your board: `Tools → Board → [Your Board]`
3. Select the port: `Tools → Port → /dev/ttyUSB0` (or similar)
4. Click Upload (Ctrl+U)

### Option B: arduino-cli

```bash
cd arduino/exo_controller

# Compile for Arduino Uno
arduino-cli compile --fqbn arduino:avr:uno

# Upload
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:uno
```

### Option C: PlatformIO

Create `platformio.ini`:

```ini
[env:uno]
platform = atmelavr
board = uno
framework = arduino
lib_deps =
    adafruit/Adafruit SSD1306@^2.5.9
    adafruit/Adafruit GFX Library@^1.11.9
```

Then: `pio run -t upload`

---

## Serial Protocol

### Setup

**Baud rate:** 115200
**Line ending:** Carriage return (`\r`) or newline (`\n`)

### Commands IN (Pi → Arduino)

Format: `{device}_{action} {params}\r`

| Command | Example | Description |
|---------|---------|-------------|
| `motor_step N` | `motor_step 100` | Step motor N times (negative = reverse) |
| `motor_speed N` | `motor_speed 60` | Set RPM |
| `motor_home` | `motor_home` | Return to zero |
| `motor_stop` | `motor_stop` | Halt motor |
| `oled_display I MSG` | `oled_display 0 Hello` | Show text at slot I |
| `oled_clear` | `oled_clear` | Blank display |
| `oled_dot X Y` | `oled_dot 64 32` | Draw dot at (X,Y) |
| `oled_message MSG` | `oled_message Look left` | Multi-line message |
| `temp_read` | `temp_read` | Report current temp |
| `temp_target T` | `temp_target 37` | Set control target (°C) |
| `temp_control on/off` | `temp_control on` | Enable/disable control |
| `us_pulse F D` | `us_pulse 40000 500` | Ultrasonic: F Hz, D ms |
| `us_freq F` | `us_freq 40000` | Set continuous frequency |
| `us_stop` | `us_stop` | Stop ultrasonic |
| `vib_set N` | `vib_set 128` | PWM intensity (0-255) |
| `vib_pattern NAME` | `vib_pattern pulse` | Named pattern |
| `vib_stop` | `vib_stop` | Stop vibration |
| `tens_set I F D` | `tens_set 50 40 10000` | Intensity, freq, duration ms |
| `tens_pattern NAME` | `tens_pattern burst` | Named pattern |
| `tens_stop` | `tens_stop` | Immediate stop |
| `imu_read` | `imu_read` | Get 6-axis reading |
| `imu_calibrate` | `imu_calibrate` | Zero bias |
| `telemetry_start` | `telemetry_start` | Enable periodic telemetry (200ms) |
| `telemetry_stop` | `telemetry_stop` | Disable telemetry |
| `help` | `help` | List all commands |

### Responses OUT (Arduino → Pi)

All responses are newline-terminated JSON:

**Ready signal (on boot):**
```json
{"type":"status","status":"ready"}
```

**Command acknowledgment:**
```json
{"type":"ack","cmd":"motor_step","status":"ok"}
```

**Error:**
```json
{"type":"error","cmd":"foo","detail":"unknown command"}
```

**Telemetry (on-demand or periodic):**
```json
{"type":"telemetry","sensor":"temp","value":25.4}
{"type":"telemetry","sensor":"imu","ax":0.01,"ay":0.02,"az":9.8,"gx":0.1,"gy":0.2,"gz":0.3}
```

**Batch telemetry (when `telemetry_start` is active):**
```json
{"type":"telemetry_batch","temp":25.4,"tens_active":false}
```

---

## Testing via Serial Monitor

After uploading, open the Arduino Serial Monitor (or `screen`, `minicom`, `picocom`):

```bash
# Using screen
screen /dev/ttyUSB0 115200
# Exit: Ctrl+A then K

# Using picocom
picocom -b 115200 /dev/ttyUSB0
# Exit: Ctrl+A then Ctrl+X
```

You should see:
```
{"type":"status","status":"ready"}
```

Type `help` and press Enter. The Arduino should respond with a JSON list of available commands.

Try a few:
```
motor_step 10
oled_display 0 Hello
temp_read
imu_read
vib_set 100
vib_stop
```

---

## Wiring

**See [WIRING.md](WIRING.md) for complete schematic diagrams and BOM.**

Quick reference — default pin assignments:

| Device | Arduino Pin | Notes |
|--------|------------|-------|
| Motor STEP | D2 | Digital out to stepper driver |
| Motor DIR | D3 | Direction pin |
| Motor EN | D4 | Enable (active low) |
| Temperature | A0 | Analog in (LM35) |
| Ultrasonic | D5 | PWM out to transducer driver |
| Vibration | D6 | PWM out to MOSFET |
| TENS PWM | D9 | PWM out to optocoupler |
| TENS EN | D10 | Enable relay (safety) |
| OLED (I2C) | SDA / SCL | A4/A5 on Uno, dedicated on Mega |
| IMU (I2C) | SDA / SCL | Shared with OLED |

Change pins at the top of `exo_controller.ino`.

---

## Adding a New Device Handler

Edit `exo_controller.ino`:

### 1. Add a compile flag

```cpp
#define ENABLE_MYDEVICE 1
```

### 2. Add pin definition

```cpp
#define MYDEVICE_PIN 11
```

### 3. Add setup code (in `setup()`)

```cpp
#if ENABLE_MYDEVICE
  pinMode(MYDEVICE_PIN, OUTPUT);
#endif
```

### 4. Add command handler (in `processCommand()`)

```cpp
#if ENABLE_MYDEVICE
  if (cmd.startsWith("mydevice_do ")) {
    int value = cmd.substring(12).toInt();
    analogWrite(MYDEVICE_PIN, value);
    sendAck("mydevice_do", "ok");
    return;
  }
#endif
```

### 5. Add a matching Pi-side driver

See [../pi_agent/README.md#adding-a-new-device-driver](../pi_agent/README.md#adding-a-new-device-driver).

---

## Power Considerations

**USB power from the Pi is insufficient for:**
- Stepper motors (use external 12V PSU)
- TENS units (needs isolated medical-grade supply)
- High-power ultrasonic transducers
- Multiple vibration motors

**Use common ground** across the Arduino, external PSU, and any devices. **Isolate** the TENS stage from digital ground via optocouplers.

See [WIRING.md](WIRING.md) for power budget calculations.

---

## Troubleshooting

### Arduino not detected

```bash
ls /dev/tty*
dmesg | tail    # See last-connected device
```

On Linux, add user to `dialout`:
```bash
sudo usermod -aG dialout $USER
# Log out and back in
```

### "Port not available" in Arduino IDE

- Close any open serial monitors (only one process can hold the port)
- Check no other program (Pi agent) is using it

### Commands seem to arrive garbled

- Check baud rate matches (115200 on both sides)
- Check line ending — firmware expects `\r` or `\n`
- Check USB cable (some are power-only)

### OLED shows nothing

- Verify I2C address via `i2cdetect` on the Pi, or add a scan routine in firmware
- Check wiring: SDA↔SDA, SCL↔SCL, VCC and GND
- Try 3.3V vs 5V — most SSD1306 modules accept both but some don't

### IMU reads zero or garbage

- Verify wiring (SDA/SCL)
- Check the I2C address (0x68 for MPU6050 default, 0x6A for LSM6DSL)
- Add pull-up resistors if long wires (4.7kΩ)
- Try `imu_calibrate` then `imu_read`

### Stepper not moving

- Check driver VMOT has 12V supply
- Verify STEP pin is actually pulsing (use a multimeter)
- Check ENABLE pin is LOW (A4988 enable is active-low)
- Ensure microstepping jumpers (MS1/MS2/MS3) are configured

---

## File Structure

```
arduino/
├── README.md                   This file
├── WIRING.md                   Complete schematic + BOM
└── exo_controller/
    └── exo_controller.ino      The unified firmware
```

---

## See Also

- [WIRING.md](WIRING.md) — Circuit diagrams, pin assignments, BOM
- [../pi_agent/DEVICES.md](../pi_agent/DEVICES.md) — Pi-side device reference
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — Full protocol specification
- [../README.md](../README.md) — Project overview
