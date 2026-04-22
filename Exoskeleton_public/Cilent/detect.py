"""
Object detection using YOLOv3-tiny + OpenCV DNN.
Captures frames from picamera2, detects objects, sends top detections
to the Pico OLED via serial: display <line> <label>
"""
from __future__ import annotations

import io
import os
import time
import urllib.request
from pathlib import Path

import cv2
import numpy as np
import serial

# ── Config ─────────────────────────────────────────────────────────────────
MODEL_DIR   = Path(__file__).parent.parent / "models"
CFG         = str(MODEL_DIR / "yolov3-tiny.cfg")
WEIGHTS     = str(MODEL_DIR / "yolov3-tiny.weights")
LABELS_FILE = str(MODEL_DIR / "coco.names")

OLED_PORT    = os.getenv("EXO_OLED_PORT", "/dev/ttyACM0")
OLED_BAUD    = 9600
CONFIDENCE   = float(os.getenv("EXO_DETECT_CONF", "0.10"))
INTERVAL     = float(os.getenv("EXO_DETECT_INTERVAL", "1"))
MAX_DISPLAY  = 3
SIM_MODE     = os.getenv("EXO_SIM_MODE", "0") == "1"
# Grab frames from the server MJPEG stream instead of opening camera directly
SERVER_HOST  = os.getenv("EXO_HOST", "127.0.0.1")
CLIENT_ID    = os.getenv("EXO_CLIENT_ID", "exo-pi-1")
VIDEO_URL    = f"http://{SERVER_HOST}:5050/video_feed/{CLIENT_ID}"
# ───────────────────────────────────────────────────────────────────────────


def load_model():
    print("Loading YOLO model...")
    net = cv2.dnn.readNet(WEIGHTS, CFG)
    net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
    net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
    with open(LABELS_FILE) as f:
        labels = [line.strip() for line in f.readlines()]
    layer_names = net.getLayerNames()
    out_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]
    print(f"Model loaded. {len(labels)} classes.")
    return net, labels, out_layers


def detect(net, labels, out_layers, frame_bgr):
    h, w = frame_bgr.shape[:2]
    blob = cv2.dnn.blobFromImage(frame_bgr, 1/255.0, (416, 416), swapRB=True, crop=False)
    net.setInput(blob)
    outputs = net.forward(out_layers)

    boxes, confidences, class_ids = [], [], []
    for output in outputs:
        for detection in output:
            scores = detection[5:]
            class_id = int(np.argmax(scores))
            confidence = float(scores[class_id])
            if confidence >= CONFIDENCE:
                cx, cy = int(detection[0] * w), int(detection[1] * h)
                bw, bh = int(detection[2] * w), int(detection[3] * h)
                x, y = cx - bw // 2, cy - bh // 2
                boxes.append([x, y, bw, bh])
                confidences.append(confidence)
                class_ids.append(class_id)

    indices = cv2.dnn.NMSBoxes(boxes, confidences, CONFIDENCE, 0.3)
    detected = []
    if len(indices) > 0:
        for i in indices.flatten():
            label = labels[class_ids[i]]
            conf  = confidences[i]
            detected.append((label, conf))

    # Sort by confidence descending, deduplicate labels
    seen, unique = set(), []
    for label, conf in sorted(detected, key=lambda x: -x[1]):
        if label not in seen:
            seen.add(label)
            unique.append((label, conf))

    return unique


def send_to_oled(ser, objects):
    # Clear lines first
    for i in range(MAX_DISPLAY):
        cmd = f"display {i} \r"
        ser.write(cmd.encode())
        time.sleep(0.05)

    if not objects:
        ser.write(b"display 0 Nothing\r")
        return

    for i, (label, conf) in enumerate(objects[:MAX_DISPLAY]):
        text = f"{label} {int(conf*100)}%"
        cmd = f"display {i} {text}\r"
        print(f"  OLED line {i}: {text}")
        ser.write(cmd.encode())
        time.sleep(0.05)


def grab_frame_from_stream() -> np.ndarray | None:
    """Read one JPEG frame from the server MJPEG stream."""
    try:
        req = urllib.request.urlopen(VIDEO_URL, timeout=5)
        buf = b""
        while True:
            chunk = req.read(4096)
            if not chunk:
                break
            buf += chunk
            # Look for a complete JPEG (starts with FFD8, ends with FFD9)
            start = buf.find(b'\xff\xd8')
            end   = buf.find(b'\xff\xd9')
            if start != -1 and end != -1 and end > start:
                jpg = buf[start:end+2]
                req.close()
                data = np.frombuffer(jpg, dtype=np.uint8)
                return cv2.imdecode(data, cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"Frame grab error: {e}")
    return None


def main():
    net, labels, out_layers = load_model()

    # Init serial
    ser = None
    if not SIM_MODE:
        try:
            ser = serial.Serial(OLED_PORT, OLED_BAUD, timeout=1)
            time.sleep(2)
            print(f"Serial connected: {OLED_PORT}")
        except Exception as e:
            print(f"Serial error: {e} — display output disabled.")

    print(f"Detection loop started (interval={INTERVAL}s, confidence>={CONFIDENCE})")
    print(f"Reading frames from: {VIDEO_URL}")

    frame_count = 0
    last_objects = []  # keep last detection on screen
    try:
        while True:
            t0 = time.time()

            frame = grab_frame_from_stream()
            if frame is None:
                print(f"[{frame_count}] Could not grab frame, retrying...")
                time.sleep(1)
                continue

            objects = detect(net, labels, out_layers, frame)

            if objects:
                names = ", ".join(f"{l}({int(c*100)}%)" for l, c in objects[:MAX_DISPLAY])
                print(f"[{frame_count}] Detected: {names}")
                if ser and objects != last_objects:
                    send_to_oled(ser, objects)
                last_objects = objects
            else:
                # Nothing new - keep showing last detection, just print status
                if last_objects:
                    last_names = ", ".join(f"{l}" for l, c in last_objects[:MAX_DISPLAY])
                    print(f"[{frame_count}] Still showing: {last_names}")
                else:
                    print(f"[{frame_count}] Nothing detected.")

            frame_count += 1
            elapsed = time.time() - t0
            sleep_for = max(0, INTERVAL - elapsed)
            time.sleep(sleep_for)

    except KeyboardInterrupt:
        print("Stopped.")
    finally:
        if ser:
            ser.close()


if __name__ == "__main__":
    main()
