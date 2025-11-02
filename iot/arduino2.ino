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
const char* entregaId = "f0e9d8c7-b6a5-4321-fedc-ba9876543210";

const char* BACKEND_IP = "10.75.10.144";
const uint16_t BACKEND_PORT = 5000;
const char* ENDPOINT_PATH = "/localizacoes/iot";

// --- 2. CONFIGURAÇÃO DO GPS ---
TinyGPSPlus gps;
HardwareSerial SerialGPS(1);
#define RXD2 16
#define TXD2 17

// --- 3. FUNÇÕES AUXILIARES ---
String backendUrl() {
  return String("http://") + BACKEND_IP + ":" + String(BACKEND_PORT) + String(ENDPOINT_PATH);
}

// Retorna qualquer coordenada válida, mesmo sem fix
bool getGpsCoordinates(float &lat, float &lon) {
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  // Se houver nova localização, usa ela
  if (gps.location.isUpdated()) {
    lat = gps.location.lat();
    lon = gps.location.lng();
    return true;
  }

  // Se não houver nova, mas já existe alguma anterior válida, também envia
  if (gps.location.isValid()) {
    lat = gps.location.lat();
    lon = gps.location.lng();
    return true;
  }

  // Nenhuma coordenada legível
  return false;
}

// Gera timestamp GPS ou local
String getFormattedTime() {
  if (gps.date.isValid() && gps.time.isValid()) {
    char buffer[25];
    snprintf(buffer, sizeof(buffer), "%04d-%02d-%02d %02d:%02d:%02d",
             gps.date.year(),
             gps.date.month(),
             gps.date.day(),
             gps.time.hour(),
             gps.time.minute(),
             gps.time.second());
    return String(buffer);
  } else {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) return "0000-00-00 00:00:00";
    char buffer[25];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
    return String(buffer);
  }
}

// --- 4. ENVIO DE DADOS ---
void sendLocation() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi não conectado — pulando envio.");
    return;
  }

  float lat, lon;
  bool gotCoords = getGpsCoordinates(lat, lon);

  if (!gotCoords) {
    Serial.println("❌ Nenhuma coordenada válida disponível.");
    return;
  }

  String timestamp = getFormattedTime();
  String url = backendUrl();
  Serial.printf("📡 Enviando para %s\n", url.c_str());

  StaticJsonDocument<400> doc;
  doc["entrega_id"] = entregaId;
  doc["motorista_id"] = motoristaId;
  doc["latitude"] = lat;
  doc["longitude"] = lon;
  doc["data_hora"] = timestamp;

  String payload;
  serializeJson(doc, payload);
  Serial.println("Payload:");
  Serial.println(payload);

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(payload);
  if (code > 0) {
    Serial.printf("Resposta HTTP %d: %s\n", code, http.getString().c_str());
  } else {
    Serial.printf("Erro HTTP: %s\n", http.errorToString(code).c_str());
  }
  http.end();
}

// --- 5. SETUP ---
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(1000);
  Serial.println("\nInicializando ESP32 com GPS...");

  SerialGPS.begin(9600, SERIAL_8N1, RXD2, TXD2);
  Serial.println("GPS iniciado em 9600 baud.");
  delay(2000);

  // Teste inicial de comunicação
  Serial.println("Verificando comunicação com o GPS...");
  unsigned long start = millis();
  bool ok = false;
  while (millis() - start < 5000) {
    if (SerialGPS.available()) {
      char c = SerialGPS.read();
      Serial.write(c);
      ok = true;
    }
  }
  if (ok) Serial.println("\n✅ GPS enviando dados NMEA!");
  else Serial.println("\n⚠️ Nenhum dado recebido. Verifique conexões ou baud rate.");

  // WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi");
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) {
    Serial.print(".");
    delay(500);
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? "\n✅ WiFi conectado!" : "\n❌ Falha ao conectar no WiFi.");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  }

  configTime(-3 * 3600, 0, "pool.ntp.org");
}

// --- 6. LOOP ---
void loop() {
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  if (gps.location.isValid()) {
    Serial.printf("📍 Lat: %.6f | Lon: %.6f | Satélites: %d\n",
                  gps.location.lat(),
                  gps.location.lng(),
                  gps.satellites.value());
  } else {
    Serial.println("🔎 Nenhum fix ainda...");
  }

  static unsigned long lastSend = 0;
  const unsigned long interval = 15000; // 15s
  if (millis() - lastSend > interval) {
    sendLocation();
    lastSend = millis();
  }

  delay(2000);
}
