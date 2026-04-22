
import os
import yaml
from dataclasses import dataclass, field

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config.yaml")


@dataclass
class SerialConfig:
    port: str = "/dev/ttyACM0"
    baud: int = 115200
    channels: int = 10
    fs: float = 250.0


@dataclass
class ProcessingConfig:
    notch_freq: float = 60.0
    bandpass_low: float = 0.5
    bandpass_high: float = 40.0
    history_seconds: float = 120.0


@dataclass
class ServerConfig:
    host: str = "0.0.0.0"
    port: int = 8000


@dataclass
class StorageConfig:
    captures_dir: str = "captures"


@dataclass
class AppConfig:
    serial: SerialConfig = field(default_factory=SerialConfig)
    processing: ProcessingConfig = field(default_factory=ProcessingConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    storage: StorageConfig = field(default_factory=StorageConfig)


def load_config() -> AppConfig:
    cfg = AppConfig()
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH) as f:
            data = yaml.safe_load(f) or {}
        if "serial" in data:
            for k, v in data["serial"].items():
                if hasattr(cfg.serial, k):
                    setattr(cfg.serial, k, v)
        if "processing" in data:
            for k, v in data["processing"].items():
                if hasattr(cfg.processing, k):
                    setattr(cfg.processing, k, v)
        if "server" in data:
            for k, v in data["server"].items():
                if hasattr(cfg.server, k):
                    setattr(cfg.server, k, v)
        if "storage" in data:
            for k, v in data["storage"].items():
                if hasattr(cfg.storage, k):
                    setattr(cfg.storage, k, v)
    return cfg


# Singleton
CONFIG = load_config()
