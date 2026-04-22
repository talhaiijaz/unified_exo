// eeg_teensy.ino
// UC Berkeley Nanotechnology Lab — EEG Acquisition Firmware
// Last updated for EEG Lab v1.0 web system
//
// Changes from original:
//  - CSVEn defaults to FALSE (backend sends csv_on to start)
//  - READY banner on startup (machine-readable)
//  - All commands return ok/err acknowledgements
//  - No human-readable header row during streaming
//  - pi_on / pi_off still supported for Serial8 path

#include <Arduino.h>

// ── Pin config ─────────────────────────────────────────────────────────
const int analogPins[] = {A0, A1, A2, A3, A4, A5, A6, A7, A8, A9};
const int csPins[]     = {12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2};
const int numAnalog    = sizeof(analogPins) / sizeof(analogPins[0]);  // 10
const int numCs        = sizeof(csPins)     / sizeof(csPins[0]);      // 11
const int sckPin       = 13;

#define SERIAL_PI Serial8  // Teensy Serial8: TX pin 35

// ── State ──────────────────────────────────────────────────────────────
bool RaspOutEn = false;
bool CSVEn     = false;    // ← CHANGED: default off, backend sends csv_on

const unsigned long sampleIntervalMs = 4;  // 250 Hz
unsigned long lastSampleTime = 0;

// ── Setup ──────────────────────────────────────────────────────────────
void setup() {
  analogReadResolution(12);
  analogReadAveraging(1);

  for (int i = 0; i < numCs; i++) {
    pinMode(csPins[i], OUTPUT);
    digitalWrite(csPins[i], LOW);
  }

  pinMode(sckPin, OUTPUT);
  digitalWrite(sckPin, LOW);

  Serial.begin(115200);
  SERIAL_PI.begin(115200);

  // ── READY banner (machine-readable, parsed by backend) ──────────────
  // No human text after this — only data lines and ok/err responses
  delay(200);  // let USB enumeration settle
  Serial.println("READY protocol=v1 fs=250 channels=10 format=csv fields=timestamp,A0,A1,A2,A3,A4,A5,A6,A7,A8,A9");
}

// ── Main loop ──────────────────────────────────────────────────────────
void loop() {
  handleCommands();

  unsigned long now = millis();
  if (now - lastSampleTime >= sampleIntervalMs) {
    lastSampleTime = now;

    int vals[numAnalog];
    for (int i = 0; i < numAnalog; i++) {
      vals[i] = analogRead(analogPins[i]);
    }

    // SCK sync pulse
    digitalWrite(sckPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(sckPin, LOW);

    // USB serial CSV output
    if (CSVEn) {
      Serial.print(now);
      for (int i = 0; i < numAnalog; i++) {
        Serial.print(',');
        Serial.print(vals[i]);
      }
      Serial.println();
    }

    // Raspberry Pi serial output
    if (RaspOutEn) {
      SERIAL_PI.print(now);
      for (int i = 0; i < numAnalog; i++) {
        SERIAL_PI.print(',');
        SERIAL_PI.print(vals[i]);
      }
      SERIAL_PI.println();
    }
  }
}

// ── Command handler ─────────────────────────────────────────────────────
// All responses are machine-readable: "ok key=val" or "err unknown=cmd"
void handleCommands() {
  if (!Serial.available()) return;

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd.equalsIgnoreCase("csv_on")) {
    CSVEn = true;
    Serial.println("ok csv=on");

  } else if (cmd.equalsIgnoreCase("csv_off")) {
    CSVEn = false;
    Serial.println("ok csv=off");

  } else if (cmd.equalsIgnoreCase("pi_on")) {
    RaspOutEn = true;
    Serial.println("ok pi=on");

  } else if (cmd.equalsIgnoreCase("pi_off")) {
    RaspOutEn = false;
    Serial.println("ok pi=off");

  } else if (cmd.equalsIgnoreCase("status")) {
    Serial.print("ok fs=250 channels=10 csv=");
    Serial.print(CSVEn ? "on" : "off");
    Serial.print(" pi=");
    Serial.println(RaspOutEn ? "on" : "off");

  } else if (cmd.length() > 0) {
    Serial.print("err unknown=");
    Serial.println(cmd);
  }
}
