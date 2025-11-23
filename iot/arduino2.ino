#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

#define SERIAL_BAUD 115200

// --- 1. CONFIGURAÇÕES PRINCIPAIS ---
const char* ssid = "123";
const char* password = "çççççççç";

const char* motoristaId = "a1b2c3d4-e5f6-7890-1234-567890abcdef";
const char* entregaId   = "f0e9d8c7-b6a5-4321-fedc-ba9876543210";

const char* BACKEND_IP = "10.75.10.144";
const uint16_t BACKEND_PORT = 5000;
const char* ENDPOINT_PATH = "/localizacoes/iot";

// --- 2. CONFIGURAÇÃO DO GPS ---
TinyGPSPlus gps;
HardwareSerial SerialGPS(1); 
#define RXD2 16
#define TXD2 17

// Última localização válida armazenada
float lastLat = 0.0;
float lastLon = 0.0;
bool hasLastFix = false;

// --- 3. FUNÇÕES AUXILIARES ---
String backendUrl() {
  return String("http://") + BACKEND_IP + ":" + String(BACKEND_PORT) + ENDPOINT_PATH;
}

// Captura coordenadas **de qualquer forma possível**
bool getGpsCoordinates(float &lat, float &lon) {
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  // Caso tenha atualização recente
  if (gps.location.isUpdated()) {
    lat = gps.location.lat();
    lon = gps.location.lng();
    lastLat = lat;
    lastLon = lon;
    hasLastFix = true;
    return true;
  }

  // Sem fix novo, mas há última posição válida → fornecer
  if (gps.location.isValid()) {
    lat = gps.location.lat();
    lon = gps.location.lng();
    lastLat = lat;
    lastLon = lon;
    hasLastFix = true;
    return true;
  }

  // Nenhuma posição atual, mas havia uma antiga → enviar mesmo assim
  if (hasLastFix) {
    lat = lastLat;
    lon = lastLon;
    return true;
  }

  return false;
}

// Formatação do horário
String getFormattedTime() {
  if (gps.date.isValid() && gps.time.isValid()) {
    char buffer[25];
    snprintf(buffer, sizeof(buffer),
      "%04d-%02d-%02d %02d:%02d:%02d",
      gps.date.year(), gps.date.month(), gps.date.day(),
      gps.time.hour(), gps.time.minute(), gps.time.second());
    return buffer;
  }

  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return "0000-00-00 00:00:00";

  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return buffer;
}

// --- 4. ENVIO DE DADOS ---
void sendLocation() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi não conectado — envio ignorado.");
    return;
  }

  float lat, lon;
  bool got = getGpsCoordinates(lat, lon);

  if (!got) {
    Serial.println("❌ Nenhuma posição disponível (nem última posição).");
    return;
  }

  String timestamp = getFormattedTime();

  StaticJsonDocument<400> doc;
  doc["entrega_id"] = entregaId;
  doc["motorista_id"] = motoristaId;
  doc["latitude"] = lat;
  doc["longitude"] = lon;
  doc["data_hora"] = timestamp;

  String payload;
  serializeJson(doc, payload);

  Serial.printf("⬆️ Enviando: %s\n", payload.c_str());

  HTTPClient http;
  http.begin(backendUrl());
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(payload);

  if (code > 0) {
    Serial.printf("📡 HTTP %d: %s\n", code, http.getString().c_str());
  } else {
    Serial.printf("❌ Erro HTTP: %s\n", http.errorToString(code).c_str());
  }

  http.end();
}

// --- 5. SETUP ---
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(1000);
  Serial.println("\nInicializando ESP32 + GPS...");

  SerialGPS.begin(9600, SERIAL_8N1, RXD2, TXD2);
  delay(1500);

  // Teste inicial NMEA
  Serial.println("Testando comunicação do GPS...");
  unsigned long start = millis();
  bool ok = false;

  while (millis() - start < 3000) {
    if (SerialGPS.available()) {
      Serial.write(SerialGPS.read());
      ok = true;
    }
  }

  Serial.println(ok ? "\n✅ GPS enviando NMEA!" : "\n⚠️ Nenhum dado recebido!");

  // Conexão WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\n✔️ WiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  configTime(-3 * 3600, 0, "pool.ntp.org");
}

// --- 6. LOOP ---
void loop() {
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  // Logs no monitor serial
  if (gps.location.isValid()) {
    Serial.printf("📍 Lat: %.6f | Lon: %.6f | Sat: %d\n",
      gps.location.lat(), gps.location.lng(), gps.satellites.value());
  } else {
    Serial.println("🔎 GPS sem fix ainda...");
  }

  static unsigned long lastSend = 0;
  const unsigned long sendInterval = 2000;  // ⏱️ Envia a cada 2s

  if (millis() - lastSend >= sendInterval) {
    sendLocation();
    lastSend = millis();
  }

  delay(200);
}
