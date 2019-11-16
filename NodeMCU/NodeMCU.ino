#include <ACS712.h>
#include <ESP8266WiFi.h>
#include <WiFiManager.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <FirebaseArduino.h>
#include <SimpleTimer.h>
#include <Bounce2.h>

#define AP_SSID "Unfied-Socket"

#define FIREBASE_HOST "unified-home.firebaseio.com"
#define FIREBASE_AUTH "CiUsJ5C3mKYJ1TaSMm2vRw3THcO1uzIf5p7Lypdc"

#define relayPin D5
#define sensorPin A0
#define errorLEDPin D6
#define successLEDPin D8
#define switchPin D1
#define configPin D3

bool deviceState = 0;
bool switchState = 0;
bool wentOffline = 0;
float iPower = 0;

SimpleTimer timer;
Bounce debouncer = Bounce();

ACS712 sensor(ACS712_05B,sensorPin);

void setup() {
  sensor.calibrate();
  //Init Serial Communication
  //Serial.begin(9600);

  //Init Pins
  pinMode(relayPin, OUTPUT);
  debouncer.attach(switchPin, INPUT_PULLUP);
  debouncer.interval(25);
  pinMode(configPin, INPUT_PULLUP);
  pinMode(successLEDPin, OUTPUT);
  digitalWrite(successLEDPin, LOW);
  pinMode(errorLEDPin, OUTPUT);
  digitalWrite(errorLEDPin, HIGH);

  //Init Switch
  switchState = digitalRead(switchPin);

  //Init WiFi
  WiFiManager wifiManager;

  //Init Firebase
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.setBool("Socket/OnOff", deviceState);

  //Init Timer
  timer.setInterval(30000, sendStats);
}

void loop() {
  checkConfig();
  timer.run();
  if (debouncer.update()) syncSwitch();
  if (WiFi.status() == WL_CONNECTED) syncFirebase();
}

void checkConfig() {
  if (digitalRead(configPin) == LOW) {
    WiFiManager wifiManager;
    wifiManager.setAPCallback(configModeCallback);
    if (!wifiManager.startConfigPortal(AP_SSID)) {
      Serial.println("Failed to connect and Hit timeout");
      delay(3000);
      ESP.reset();
      delay(5000);
    }
  }
}

void configModeCallback (WiFiManager *myWiFiManager) {
  Serial.println("Entered config mode");
  Serial.println(WiFi.softAPIP());
  Serial.println(myWiFiManager->getConfigPortalSSID());
  digitalWrite(errorLEDPin, HIGH);
  digitalWrite(successLEDPin, HIGH);
}

void syncSwitch() {
  Serial.print("switch toggled ->");
  Serial.println(switchState);
  digitalWrite(relayPin, switchState);
  Firebase.setBool("Socket/OnOff", switchState);
  if (Firebase.failed()) wentOffline = 1;
  switchState = !switchState;
}

void syncFirebase() {
  FirebaseObject Socket = Firebase.get("Socket");
  if (Firebase.failed()) {
    digitalWrite(successLEDPin, LOW);
    digitalWrite(errorLEDPin, HIGH);
  } else {
    deviceState = Socket.getBool("OnOff");
    if (wentOffline) {
      deviceState = (!switchState);
      Firebase.setBool("Socket/OnOff", deviceState);
      wentOffline = 0;
    }
    digitalWrite(relayPin, deviceState);
    digitalWrite(successLEDPin, HIGH);
    digitalWrite(errorLEDPin, LOW);
  }
}

void sendStats() {
  iPower = sensor.getCurrentAC(50)*220/1000;
  Firebase.setFloat("Socket-Stats/iPower_temp", deviceState ? iPower : 0);
}
