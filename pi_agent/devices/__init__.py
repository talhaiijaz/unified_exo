from .base import DeviceDriver
from .motor import MotorDriver
from .oled import OLEDDriver
from .camera import CameraDriver
from .temperature import TemperatureDriver
from .gyroscope import GyroscopeDriver
from .ultrasonic import UltrasonicDriver
from .vibration import VibrationDriver
from .tens import TENSDriver

DEVICE_REGISTRY: dict[str, type[DeviceDriver]] = {
    "motor": MotorDriver,
    "oled": OLEDDriver,
    "camera": CameraDriver,
    "temperature": TemperatureDriver,
    "gyroscope": GyroscopeDriver,
    "ultrasonic": UltrasonicDriver,
    "vibration": VibrationDriver,
    "tens": TENSDriver,
}

__all__ = [
    "DeviceDriver", "DEVICE_REGISTRY",
    "MotorDriver", "OLEDDriver", "CameraDriver",
    "TemperatureDriver", "GyroscopeDriver", "UltrasonicDriver",
    "VibrationDriver", "TENSDriver",
]
