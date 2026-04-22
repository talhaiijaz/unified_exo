# Pi Agent — Runs on Each Raspberry Pi

The agent that runs on every exoskeleton Raspberry Pi. Connects to the central server, registers its device manifest, streams video from cameras, reports sensor telemetry, and executes commands from the server by dispatching to pluggable device drivers.

---

## What Runs on the Pi

```
┌─────────────────────────────────────────────────────┐
│                    Raspberry Pi                      │
│                                                       │
│   ┌──────────────────────────────────────────┐      │
│   │           agent.py (main)                 │      │
│   │                                            │      │
│   │   ┌─────────────┐    ┌────────────────┐  │      │
│   │   │ Control     │    │ Heartbeat      │  │      │
│   │   │ thread      │    │ thread (5s)    │  │      │
│   │   └──────┬──────┘    └────────────────┘  │      │
│   │          │                                 │      │
│   │   ┌──────┴──────┐    ┌────────────────┐  │      │
│   │   │ Video       │    │ Telemetry      │  │      │
│   │   │ thread      │    │ thread (10Hz)  │  │      │
│   │   │ (15 fps)    │    │                │  │      │
│   │   └─────────────┘    └────────────────┘  │      │
│   └──────┬────────────────────────────────────┘      │
│          │                                            │
│   ┌──────▼──────────────────────────────────┐       │
│   │          Device Drivers                  │       │
│   │  motor │ oled │ camera │ temperature     │       │
│   │  gyro  │ ultrasonic │ vibration │ tens   │       │
│   └──────┬───────────────────────┬───────────┘       │
│          │                       │                    │
│          │ USB Serial            │ CSI / USB         │
└──────────┼───────────────────────┼────────────────────┘
           │                       │
       ┌───▼────┐           ┌─────▼─────┐
       │Arduino │           │  Camera   │
       │Teensy  │           │(Pi or USB)│
       └────────┘           └───────────┘
```

---

## Hardware Requirements

| Use Case | Recommended Pi | Notes |
|----------|---------------|-------|
| Exoskeleton with multiple devices + camera | **Pi 4 (4GB+)** or **Pi 5** | Enough RAM for video encoding + serial |
| OLED glasses only (headset display) | **Pi Zero 2 W** | Low-power; just OLED + light sensor |
| Dev/testing without hardware | Any Pi, or your laptop | Run with `EXO_SIM_MODE=1` |

**OS:** Raspberry Pi OS 64-bit (Bookworm or later recommended).

**Peripherals per device** — See [DEVICES.md](DEVICES.md) for exact wiring.

---

## Pi OS Preparation

Use the provided script for a fresh Pi:

```bash
curl -fsSL https://raw.githubusercontent.com/talhaiijaz/united_exo/main/scripts/setup_pi.sh | bash
```

Or do it manually:

### 1. Update system

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Enable hardware interfaces

```bash
sudo raspi-config nonint do_camera 0     # Enable camera
sudo raspi-config nonint do_i2c 0        # Enable I2C (for OLED, IMU)
sudo raspi-config nonint do_spi 0        # Enable SPI
sudo raspi-config nonint do_serial_hw 0  # Enable serial hardware
sudo raspi-config nonint do_serial_cons 1  # Disable serial console
```

### 3. Install system packages

```bash
sudo apt install -y \
  python3 python3-pip python3-venv \
  python3-picamera2 \
  python3-serial \
  python3-pil \
  i2c-tools
```

### 4. Add user to required groups

```bash
sudo usermod -aG dialout,i2c,spi,gpio,video $USER
# Log out and back in for groups to take effect
```

---

## Install the Agent

### Option A: Deploy from laptop (recommended)

From your laptop:

```bash
cd /Users/yourname/Desktop/exo-platform
./scripts/deploy_pi.sh pi@192.168.1.50
```

This SCPs the agent files to `~/exo_agent/` on the Pi and installs dependencies.

### Option B: Clone and install manually

On the Pi:

```bash
git clone https://github.com/talhaiijaz/united_exo.git
cd united_exo/pi_agent
pip3 install -r requirements.txt
```

---

## Configure Your Pi

### 1. Choose a unique client ID

Each Pi needs a unique identifier. Set via environment variable or hostname:

```bash
# Via env var (recommended for multi-Pi setups)
export EXO_CLIENT_ID=pi-arm-left

# Or just use hostname
sudo hostnamectl set-hostname pi-arm-left
```

### 2. Point to your server

```bash
export EXO_HOST=192.168.1.100   # Your laptop/server's LAN IP
```

### 3. Edit `devices.json`

This file declares which devices are attached to this Pi. Each Pi can have a different subset:

```json
{
  "devices": [
    {"type": "motor",       "id": "arm_motor", "port": "/dev/ttyUSB0", "baud": 115200},
    {"type": "oled",        "id": "glasses",   "port": "/dev/ttyACM0", "baud": 115200},
    {"type": "camera",      "id": "main_cam",  "resolution": [640, 480], "camera_index": 0},
    {"type": "camera",      "id": "eye_cam",   "resolution": [320, 240], "camera_index": 1},
    {"type": "gyroscope",   "id": "imu",       "port": "/dev/ttyUSB0", "baud": 115200},
    {"type": "temperature", "id": "temp1",     "port": "/dev/ttyUSB0", "baud": 115200},
    {"type": "ultrasonic",  "id": "us1",       "port": "/dev/ttyUSB0", "baud": 115200},
    {"type": "vibration",   "id": "vib1",      "port": "/dev/ttyUSB0", "baud": 115200},
    {"type": "tens",        "id": "tens1",     "port": "/dev/ttyUSB0", "baud": 115200,
                            "max_intensity": 100, "max_duration_s": 30}
  ]
}
```

**See [DEVICES.md](DEVICES.md) for the full config schema for each device type.**

### 4. Test the serial connection (if Arduino attached)

```bash
ls /dev/ttyUSB* /dev/ttyACM*   # Find which port Arduino is on
minicom -b 115200 -D /dev/ttyUSB0   # Open serial monitor
# Type: help <Enter>
# Should see the Arduino respond with a list of commands
```

---

## Run the Agent

### Foreground (for testing)

```bash
EXO_HOST=192.168.1.100 python3 agent.py
```

You should see:

```
[2026-04-22 14:32:15] [pi-arm-left] Starting client agent sim_mode=False
[2026-04-22 14:32:15] [pi-arm-left] Loaded device: arm_motor (motor)
[2026-04-22 14:32:15] [pi-arm-left] Loaded device: main_cam (camera)
...
[2026-04-22 14:32:16] [pi-arm-left] Connected to server with session_id=9f8e7d6c...
[telemetry] Connected to server
```

### Simulation mode (no hardware required)

```bash
EXO_SIM_MODE=1 EXO_HOST=192.168.1.100 python3 agent.py
```

All devices return simulated values. Perfect for testing the system end-to-end without wiring up actual hardware.

### Background (production)

Use systemd — see next section.

---

## Run as a Service (systemd)

Create `/etc/systemd/system/exo-agent.service`:

```ini
[Unit]
Description=Exo-Platform Pi Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/exo_agent
Environment=EXO_HOST=192.168.1.100
Environment=EXO_CLIENT_ID=pi-arm-left
ExecStart=/usr/bin/python3 /home/pi/exo_agent/agent.py
Restart=always
RestartSec=5
StandardOutput=append:/var/log/exo-agent.log
StandardError=append:/var/log/exo-agent.log

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable exo-agent
sudo systemctl start exo-agent
sudo systemctl status exo-agent
```

View logs:

```bash
sudo journalctl -u exo-agent -f
# or
tail -f /var/log/exo-agent.log
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EXO_HOST` | `127.0.0.1` | Server IP to connect to |
| `EXO_CONTROL_PORT` | `1863` | Server control port |
| `EXO_VIDEO_PORT` | `8612` | Server video port |
| `EXO_TELEMETRY_PORT` | `8613` | Server telemetry port |
| `EXO_CLIENT_ID` | hostname | Unique Pi identifier |
| `EXO_SIM_MODE` | `0` | Set to `1` for simulation mode |
| `EXO_HEARTBEAT_INTERVAL_S` | `5` | Heartbeat send rate |
| `EXO_CONNECT_RETRY_S` | `1` | Retry interval on connection failure |
| `EXO_VIDEO_FPS` | `15` | Frames per second to send |
| `EXO_TELEMETRY_HZ` | `10` | Sensor poll rate |
| `EXO_DEVICES_CONFIG` | `./devices.json` | Path to device manifest |

See `.env.example` for a template.

---

## Troubleshooting

### Can't connect to server

```
[agent] control connect failed: [Errno 111] Connection refused
```

Check:

- Server is running and listening on `EXO_HOST:1863`
- Pi can reach server: `ping $EXO_HOST`
- Server's firewall allows port 1863 from your Pi's subnet
- No typo in `EXO_HOST` (use IP, not hostname, unless mDNS is configured)

### Camera not detected

```
Failed to acquire Picamera2 — falling back to simulation
```

Fixes:

- Verify: `libcamera-hello --list-cameras`
- Enable camera: `sudo raspi-config nonint do_camera 0` then reboot
- Check the CSI ribbon cable is seated correctly (blue side facing Ethernet)
- For USB webcam: `ls /dev/video*`

### "Permission denied" on `/dev/ttyUSB0`

```
serial.serialutil.SerialException: [Errno 13] Permission denied
```

Add your user to the `dialout` group:

```bash
sudo usermod -aG dialout $USER
# Log out and back in
```

Or as a quick fix (not permanent):

```bash
sudo chmod 666 /dev/ttyUSB0
```

### I2C device not found

Scan the bus to verify address:

```bash
i2cdetect -y 1
```

If the device doesn't show up:
- Check wiring (SDA, SCL, power, ground)
- Verify I2C is enabled: `sudo raspi-config nonint do_i2c 0`
- Try pull-up resistors (4.7kΩ on SDA and SCL to 3.3V)

### High CPU usage

Lower the video FPS or telemetry rate:

```bash
export EXO_VIDEO_FPS=10
export EXO_TELEMETRY_HZ=5
```

---

## File Structure

```
pi_agent/
├── agent.py                 Main entry point — session lifecycle, 4 threads
├── config.py                Environment variable parsing
├── telemetry.py             Telemetry sender thread (connects to :8613)
├── devices.json             Per-Pi device manifest (edit this)
├── requirements.txt         Python dependencies
├── .env.example             Environment variable template
│
├── README.md                This file
├── DEVICES.md               Per-device wiring and config guide
│
└── devices/                 Pluggable device drivers
    ├── __init__.py          DEVICE_REGISTRY (type → class map)
    ├── base.py              DeviceDriver abstract base class
    ├── motor.py             Stepper motor driver
    ├── oled.py              OLED display driver
    ├── camera.py            Pi Camera + USB camera driver
    ├── temperature.py       Temp sensor (LM35 / DS18B20)
    ├── gyroscope.py         IMU driver (MPU6050 / LSM6DSL)
    ├── ultrasonic.py        Ultrasonic transducer (PWM)
    ├── vibration.py         Vibration motor (PWM)
    └── tens.py              TENS unit (with safety auto-stop)
```

---

## Adding a New Device Driver

1. Create `devices/mydevice.py`:

```python
from .base import DeviceDriver

class MyDeviceDriver(DeviceDriver):
    device_type = "mydevice"

    def execute_command(self, command, params=""):
        if command == "ping":
            return ("ok", "pong")
        return ("error", f"unknown command: {command}")

    def read_telemetry(self):
        return {"custom_metric": 42.0}
```

2. Register in `devices/__init__.py`:

```python
from .mydevice import MyDeviceDriver

DEVICE_REGISTRY = {
    ...
    "mydevice": MyDeviceDriver,
}
```

3. Add to `devices.json`:

```json
{"type": "mydevice", "id": "my1", "custom_config": "value"}
```

4. Restart the agent. The server will pick up the new device in the next hello message.

Full walkthrough in [../CONTRIBUTING.md](../CONTRIBUTING.md).

---

## See Also

- [DEVICES.md](DEVICES.md) — Per-device wiring and config
- [../arduino/WIRING.md](../arduino/WIRING.md) — Arduino wiring diagram
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — Protocol specification
- [../README.md](../README.md) — Project overview
