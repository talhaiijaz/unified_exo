#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

// --- OLED 1 (SPI) ---
#define OLED1_MOSI 3
#define OLED1_CLK 2
#define OLED1_DC 15
#define OLED1_CS 13
#define OLED1_RESET 14
Adafruit_SSD1306 display1(SCREEN_WIDTH, SCREEN_HEIGHT, OLED1_MOSI, OLED1_CLK, OLED1_DC, OLED1_RESET, OLED1_CS);

// --- OLED 2 (SPI) ---
#define OLED2_MOSI 3
#define OLED2_CLK 2
#define OLED2_DC 7
#define OLED2_CS 5
#define OLED2_RESET 6
Adafruit_SSD1306 display2(SCREEN_WIDTH, SCREEN_HEIGHT, OLED2_MOSI, OLED2_CLK, OLED2_DC, OLED2_RESET, OLED2_CS);

#define BUF_LENGTH 128
#define MAX_LINES 6

// Each display holds up to MAX_LINES lines of text
String lines1[MAX_LINES];
String lines2[MAX_LINES];
bool needsRedraw1 = true;
bool needsRedraw2 = true;

void redraw(Adafruit_SSD1306 &disp, String lines[], bool &dirty) {
  if (!dirty) return;
  disp.clearDisplay();
  disp.setTextSize(1);
  disp.setTextColor(SSD1306_WHITE);
  for (int i = 0; i < MAX_LINES; i++) {
    if (lines[i].length() > 0) {
      disp.setCursor(0, i * 10 + 2);
      disp.print(lines[i]);
    }
  }
  disp.display();
  dirty = false;
}

void setup() {
  Serial.begin(9600);

  if (!display1.begin(SSD1306_SWITCHCAPVCC, OLED1_CS)) {
    Serial.println(F("OLED1 init failed"));
    for (;;);
  }
  if (!display2.begin(SSD1306_SWITCHCAPVCC, OLED2_CS)) {
    Serial.println(F("OLED2 init failed"));
    for (;;);
  }

  display1.setRotation(3);
  display2.setRotation(3);

  // Show ready message
  lines1[0] = "JADOO";
  lines1[1] = "Ready";
  lines2[0] = "JADOO";
  lines2[1] = "Ready";

  redraw(display1, lines1, needsRedraw1);
  redraw(display2, lines2, needsRedraw2);
}

void loop() {
  // Read serial commands
  if (Serial.available()) {
    static char buffer[BUF_LENGTH];
    static int length = 0;

    int data = Serial.read();
    if (data == '\b' || data == '\177') {
      if (length) length--;
    } else if (data == '\r') {
      buffer[length] = '\0';
      if (length) exec(buffer);
      length = 0;
    } else if (length < BUF_LENGTH - 1) {
      buffer[length++] = data;
    }
  }

  redraw(display1, lines1, needsRedraw1);
  redraw(display2, lines2, needsRedraw2);
}

static void exec(char *cmdline) {
  char *command = strsep(&cmdline, " ");

  if (strcmp_P(command, PSTR("help")) == 0) {
    Serial.println(F(
      "Commands:\r\n"
      "  display <0-5> <text>     - set line on both displays\r\n"
      "  display1 <0-5> <text>    - set line on display 1 only\r\n"
      "  display2 <0-5> <text>    - set line on display 2 only\r\n"
      "  clear                    - clear both displays\r\n"
      "  clear1                   - clear display 1\r\n"
      "  clear2                   - clear display 2\r\n"
    ));
  }
  else if (strcmp_P(command, PSTR("display")) == 0) {
    int ind = atoi(strsep(&cmdline, " "));
    if (ind < 0 || ind >= MAX_LINES) ind = 0;
    String text = (cmdline != NULL) ? cmdline : "";
    lines1[ind] = text;
    lines2[ind] = text;
    needsRedraw1 = true;
    needsRedraw2 = true;
  }
  else if (strcmp_P(command, PSTR("display1")) == 0) {
    int ind = atoi(strsep(&cmdline, " "));
    if (ind < 0 || ind >= MAX_LINES) ind = 0;
    String text = (cmdline != NULL) ? cmdline : "";
    lines1[ind] = text;
    needsRedraw1 = true;
  }
  else if (strcmp_P(command, PSTR("display2")) == 0) {
    int ind = atoi(strsep(&cmdline, " "));
    if (ind < 0 || ind >= MAX_LINES) ind = 0;
    String text = (cmdline != NULL) ? cmdline : "";
    lines2[ind] = text;
    needsRedraw2 = true;
  }
  else if (strcmp_P(command, PSTR("clear")) == 0) {
    for (int i = 0; i < MAX_LINES; i++) { lines1[i] = ""; lines2[i] = ""; }
    needsRedraw1 = true;
    needsRedraw2 = true;
  }
  else if (strcmp_P(command, PSTR("clear1")) == 0) {
    for (int i = 0; i < MAX_LINES; i++) lines1[i] = "";
    needsRedraw1 = true;
  }
  else if (strcmp_P(command, PSTR("clear2")) == 0) {
    for (int i = 0; i < MAX_LINES; i++) lines2[i] = "";
    needsRedraw2 = true;
  }
  else {
    Serial.print(F("Error: Unknown command: "));
    Serial.println(command);
  }
}
