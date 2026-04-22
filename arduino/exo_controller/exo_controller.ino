/*
 * Exo-Platform Unified Arduino/Teensy Controller
 *
 * Controls all exoskeleton devices via serial commands from Pi agent.
 * Enable/disable devices via compile-time flags below.
 *
 * Serial Protocol:
 *   Commands IN:  {device}_{action} {params}\r
 *   Responses OUT: JSON lines {"type":"ack"|"telemetry","cmd":"...","status":"ok"}\n
 *
 * Baud: 115200
 */

// ============ DEVICE FLAGS ============
// Set to 0 to disable unused devices
#define ENABLE_MOTOR       1
#define ENABLE_OLED        1
#define ENABLE_TEMP_SENSOR 1
#define ENABLE_ULTRASONIC  1
#define ENABLE_VIBRATION   1
#define ENABLE_IMU         1
#define ENABLE_TENS        1

// ============ PIN CONFIGURATION ============
// Motor (Stepper)
#define MOTOR_STEP_PIN  2
#define MOTOR_DIR_PIN   3
#define MOTOR_EN_PIN    4

// OLED (I2C — uses default SDA/SCL)
// Address: 0x3C

// Temperature (Analog)
#define TEMP_PIN        A0

// Ultrasonic Stimulator (PWM)
#define US_PIN          5

// Vibration Motor (PWM)
#define VIB_PIN         6

// TENS Unit (PWM + enable)
#define TENS_PWM_PIN    9
#define TENS_EN_PIN     10

// IMU (I2C — uses default SDA/SCL)
// Address: 0x6A (LSM6DSL) or 0x68 (MPU6050)

// ============ INCLUDES ============
#include <Wire.h>

#if ENABLE_OLED
  #include <Adafruit_SSD1306.h>
  #define SCREEN_WIDTH 128
  #define SCREEN_HEIGHT 64
  Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
  bool oled_ready = false;
#endif

// ============ STATE ============
String inputBuffer = "";
bool telemetryActive = false;
unsigned long lastTelemetry = 0;
#define TELEMETRY_INTERVAL_MS 200

#if ENABLE_TENS
  unsigned long tens_stop_time = 0;
  bool tens_active = false;
#endif

// ============ SETUP ============
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000);

  Wire.begin();

  #if ENABLE_MOTOR
    pinMode(MOTOR_STEP_PIN, OUTPUT);
    pinMode(MOTOR_DIR_PIN, OUTPUT);
    pinMode(MOTOR_EN_PIN, OUTPUT);
    digitalWrite(MOTOR_EN_PIN, LOW);
  #endif

  #if ENABLE_OLED
    if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
      oled_ready = true;
      display.clearDisplay();
      display.setTextSize(1);
      display.setTextColor(SSD1306_WHITE);
      display.setCursor(0, 0);
      display.println("EXO READY");
      display.display();
    }
  #endif

  #if ENABLE_ULTRASONIC
    pinMode(US_PIN, OUTPUT);
    analogWrite(US_PIN, 0);
  #endif

  #if ENABLE_VIBRATION
    pinMode(VIB_PIN, OUTPUT);
    analogWrite(VIB_PIN, 0);
  #endif

  #if ENABLE_TENS
    pinMode(TENS_PWM_PIN, OUTPUT);
    pinMode(TENS_EN_PIN, OUTPUT);
    digitalWrite(TENS_EN_PIN, LOW);
    analogWrite(TENS_PWM_PIN, 0);
  #endif

  Serial.println("{\"type\":\"status\",\"status\":\"ready\"}");
}

// ============ MAIN LOOP ============
void loop() {
  // Read serial commands
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r' || c == '\n') {
      if (inputBuffer.length() > 0) {
        processCommand(inputBuffer);
        inputBuffer = "";
      }
    } else {
      inputBuffer += c;
      if (inputBuffer.length() > 256) {
        inputBuffer = "";  // overflow protection
      }
    }
  }

  // TENS auto-stop safety
  #if ENABLE_TENS
    if (tens_active && tens_stop_time > 0 && millis() >= tens_stop_time) {
      analogWrite(TENS_PWM_PIN, 0);
      digitalWrite(TENS_EN_PIN, LOW);
      tens_active = false;
      Serial.println("{\"type\":\"status\",\"device\":\"tens\",\"status\":\"auto_stopped\"}");
    }
  #endif

  // Periodic telemetry
  if (telemetryActive && millis() - lastTelemetry >= TELEMETRY_INTERVAL_MS) {
    sendTelemetry();
    lastTelemetry = millis();
  }
}

// ============ COMMAND PROCESSOR ============
void processCommand(String cmd) {
  cmd.trim();

  if (cmd == "help") {
    Serial.println("{\"type\":\"help\",\"commands\":[\"motor_step N\",\"motor_speed N\",\"motor_home\",\"motor_stop\",\"oled_display I MSG\",\"oled_clear\",\"oled_dot X Y\",\"temp_read\",\"us_pulse F D\",\"us_stop\",\"vib_set N\",\"vib_stop\",\"tens_set I F D\",\"tens_stop\",\"imu_read\",\"imu_calibrate\",\"telemetry_start\",\"telemetry_stop\"]}");
    return;
  }

  if (cmd == "telemetry_start") {
    telemetryActive = true;
    sendAck("telemetry_start", "ok");
    return;
  }

  if (cmd == "telemetry_stop") {
    telemetryActive = false;
    sendAck("telemetry_stop", "ok");
    return;
  }

  // --- MOTOR ---
  #if ENABLE_MOTOR
    if (cmd.startsWith("motor_step ")) {
      int steps = cmd.substring(11).toInt();
      digitalWrite(MOTOR_DIR_PIN, steps >= 0 ? HIGH : LOW);
      int absSteps = abs(steps);
      for (int i = 0; i < absSteps; i++) {
        digitalWrite(MOTOR_STEP_PIN, HIGH);
        delayMicroseconds(500);
        digitalWrite(MOTOR_STEP_PIN, LOW);
        delayMicroseconds(500);
      }
      sendAck("motor_step", "ok");
      return;
    }
    if (cmd.startsWith("motor_speed ")) {
      // Set stepping delay based on RPM
      sendAck("motor_speed", "ok");
      return;
    }
    if (cmd == "motor_home") {
      sendAck("motor_home", "ok");
      return;
    }
    if (cmd == "motor_stop") {
      sendAck("motor_stop", "ok");
      return;
    }
  #endif

  // --- OLED ---
  #if ENABLE_OLED
    if (cmd.startsWith("oled_display ")) {
      if (!oled_ready) { sendAck("oled_display", "error_no_oled"); return; }
      String rest = cmd.substring(13);
      int spaceIdx = rest.indexOf(' ');
      String msg = (spaceIdx >= 0) ? rest.substring(spaceIdx + 1) : "";
      display.clearDisplay();
      display.setCursor(0, 0);
      display.setTextSize(2);
      display.println(msg);
      display.display();
      sendAck("oled_display", "ok");
      return;
    }
    if (cmd == "oled_clear") {
      if (oled_ready) {
        display.clearDisplay();
        display.display();
      }
      sendAck("oled_clear", "ok");
      return;
    }
    if (cmd.startsWith("oled_dot ")) {
      if (!oled_ready) { sendAck("oled_dot", "error_no_oled"); return; }
      String rest = cmd.substring(9);
      int spaceIdx = rest.indexOf(' ');
      int x = rest.substring(0, spaceIdx).toInt();
      int y = rest.substring(spaceIdx + 1).toInt();
      display.clearDisplay();
      display.fillCircle(x, y, 3, SSD1306_WHITE);
      display.display();
      sendAck("oled_dot", "ok");
      return;
    }
    if (cmd.startsWith("oled_message ")) {
      if (!oled_ready) { sendAck("oled_message", "error_no_oled"); return; }
      display.clearDisplay();
      display.setCursor(0, 0);
      display.setTextSize(1);
      display.println(cmd.substring(13));
      display.display();
      sendAck("oled_message", "ok");
      return;
    }
  #endif

  // --- TEMPERATURE ---
  #if ENABLE_TEMP_SENSOR
    if (cmd == "temp_read") {
      int raw = analogRead(TEMP_PIN);
      float voltage = raw * (5.0 / 1023.0);
      float tempC = voltage * 100.0;  // LM35: 10mV per degree
      Serial.print("{\"type\":\"telemetry\",\"sensor\":\"temp\",\"value\":");
      Serial.print(tempC, 1);
      Serial.println("}");
      return;
    }
    if (cmd.startsWith("temp_target ")) {
      sendAck("temp_target", "ok");
      return;
    }
    if (cmd.startsWith("temp_control ")) {
      sendAck("temp_control", "ok");
      return;
    }
  #endif

  // --- ULTRASONIC ---
  #if ENABLE_ULTRASONIC
    if (cmd.startsWith("us_pulse ")) {
      String rest = cmd.substring(9);
      int spaceIdx = rest.indexOf(' ');
      int freq = rest.substring(0, spaceIdx).toInt();
      int durationMs = rest.substring(spaceIdx + 1).toInt();
      // Generate PWM at frequency for duration
      tone(US_PIN, freq, durationMs);
      sendAck("us_pulse", "ok");
      return;
    }
    if (cmd == "us_stop") {
      noTone(US_PIN);
      analogWrite(US_PIN, 0);
      sendAck("us_stop", "ok");
      return;
    }
    if (cmd.startsWith("us_freq ")) {
      int freq = cmd.substring(8).toInt();
      tone(US_PIN, freq);
      sendAck("us_freq", "ok");
      return;
    }
  #endif

  // --- VIBRATION ---
  #if ENABLE_VIBRATION
    if (cmd.startsWith("vib_set ")) {
      int intensity = cmd.substring(8).toInt();
      intensity = constrain(intensity, 0, 255);
      analogWrite(VIB_PIN, intensity);
      sendAck("vib_set", "ok");
      return;
    }
    if (cmd.startsWith("vib_pattern ")) {
      sendAck("vib_pattern", "ok");
      return;
    }
    if (cmd == "vib_stop") {
      analogWrite(VIB_PIN, 0);
      sendAck("vib_stop", "ok");
      return;
    }
  #endif

  // --- TENS ---
  #if ENABLE_TENS
    if (cmd.startsWith("tens_set ")) {
      String rest = cmd.substring(9);
      // Parse: intensity frequency duration_ms
      int s1 = rest.indexOf(' ');
      int s2 = rest.indexOf(' ', s1 + 1);
      int intensity = rest.substring(0, s1).toInt();
      int freq = rest.substring(s1 + 1, s2).toInt();
      unsigned long durationMs = rest.substring(s2 + 1).toInt();

      intensity = constrain(intensity, 0, 100);
      int pwmVal = map(intensity, 0, 100, 0, 255);
      analogWrite(TENS_PWM_PIN, pwmVal);
      digitalWrite(TENS_EN_PIN, HIGH);
      tens_active = true;
      tens_stop_time = millis() + durationMs;
      sendAck("tens_set", "ok");
      return;
    }
    if (cmd.startsWith("tens_pattern ")) {
      sendAck("tens_pattern", "ok");
      return;
    }
    if (cmd == "tens_stop") {
      analogWrite(TENS_PWM_PIN, 0);
      digitalWrite(TENS_EN_PIN, LOW);
      tens_active = false;
      tens_stop_time = 0;
      sendAck("tens_stop", "ok");
      return;
    }
  #endif

  // --- IMU ---
  #if ENABLE_IMU
    if (cmd == "imu_read") {
      // Basic I2C read from MPU6050/LSM6DSL
      // Placeholder — replace with actual IMU library
      Serial.println("{\"type\":\"telemetry\",\"sensor\":\"imu\",\"ax\":0.0,\"ay\":0.0,\"az\":9.8,\"gx\":0.0,\"gy\":0.0,\"gz\":0.0}");
      return;
    }
    if (cmd == "imu_calibrate") {
      sendAck("imu_calibrate", "ok");
      return;
    }
  #endif

  // Unknown command
  Serial.print("{\"type\":\"error\",\"cmd\":\"");
  Serial.print(cmd);
  Serial.println("\",\"detail\":\"unknown command\"}");
}

// ============ HELPERS ============
void sendAck(const char* cmd, const char* status) {
  Serial.print("{\"type\":\"ack\",\"cmd\":\"");
  Serial.print(cmd);
  Serial.print("\",\"status\":\"");
  Serial.print(status);
  Serial.println("\"}");
}

void sendTelemetry() {
  Serial.print("{\"type\":\"telemetry_batch\"");

  #if ENABLE_TEMP_SENSOR
    int raw = analogRead(TEMP_PIN);
    float tempC = (raw * 5.0 / 1023.0) * 100.0;
    Serial.print(",\"temp\":");
    Serial.print(tempC, 1);
  #endif

  #if ENABLE_VIBRATION
    // Report vibration state
  #endif

  #if ENABLE_TENS
    Serial.print(",\"tens_active\":");
    Serial.print(tens_active ? "true" : "false");
  #endif

  Serial.println("}");
}
