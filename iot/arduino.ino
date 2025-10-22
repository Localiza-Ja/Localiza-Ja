#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

#define SERIAL_BAUD 115200

// --- 1. CONFIGURAÇÕES PRINCIPAIS ---
const char* ssid = "123";               // SUBSTITUA PELO SEU SSID
const char* password = "********";      // SUBSTITUA PELA SUA SENHA

// IDs que o seu backend espera
const char* motoristaId = "a1b2c3d4-e5f6-7890-1234-567890abcdef";
const char* entregaId = "f0e9d8c7-b6a5-4321-fedc-ba9876543210";

// Endereço e Porta do Servidor Flask
const char* BACKEND_IP = "10.75.10.144";
const uint16_t BACKEND_PORT = 5000;
const char* ENDPOINT_PATH = "/localizacoes/iot";

// --- 2. CONFIGURAÇÃO DO GPS ---
TinyGPSPlus gps;
HardwareSerial SerialGPS(1); // Usando UART1 do ESP32
#define RXD2 16  // Pino RX do ESP32 conectado ao TX do GPS
#define TXD2 17  // Pino TX do ESP32 conectado ao RX do GPS

// --- 3. FUNÇÕES AUXILIARES ---

String backendUrl() {
  return String("http://") + BACKEND_IP + ":" + String(BACKEND_PORT) + String(ENDPOINT_PATH);
}

// Função que lê coordenadas reais do GPS
bool getGpsCoordinates(float &lat, float &lon) {
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  if (gps.location.isUpdated()) {
    lat = gps.location.lat();
    lon = gps.location.lng();
    return true;
  }
  return false;
}

// Função que gera timestamp real no formato YYYY-MM-DD HH:MM:SS
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
    // Retorno alternativo se GPS ainda não tiver hora válida
    time_t now;
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
      return "0000-00-00 00:00:00";
    }
    char buffer[25];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
    return String(buffer);
  }
}

// --- 4. FUNÇÃO PRINCIPAL DE ENVIO ---
void sendLocation() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi nao conectado — pulando envio.");
    return;
  }

  float currentLat, currentLon;
  bool hasFix = getGpsCoordinates(currentLat, currentLon);

  if (!hasFix) {
    Serial.println("Sem sinal GPS — aguardando coordenadas válidas.");
    return;
  }

  String dataHora = getFormattedTime();
  HTTPClient http;
  String url = backendUrl();
  Serial.print("Enviando POST para: ");
  Serial.println(url);

  http.begin(url);
  http.setTimeout(15000);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<400> doc;
  doc["entrega_id"] = entregaId;
  doc["motorista_id"] = motoristaId;
  doc["latitude"] = currentLat;
  doc["longitude"] = currentLon;
  doc["data_hora"] = dataHora;

  String payload;
  serializeJson(doc, payload);

  Serial.print("Payload: ");
  Serial.println(payload);

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    if (httpCode >= 200 && httpCode < 300) {
      Serial.print("Sucesso (");
      Serial.print(httpCode);
      Serial.println(").");
      Serial.println(http.getString());
    } else {
      Serial.print("Erro servidor (");
      Serial.print(httpCode);
      Serial.println("):");
      Serial.println(http.getString());
    }
  } else {
    Serial.print("Falha HTTP: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

// --- 5. SETUP E LOOP ---
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(1000);
  Serial.println("\nInicializando ESP32 com GPS...");

  // Inicializa GPS
  SerialGPS.begin(9600, SERIAL_8N1, RXD2, TXD2);
  Serial.println("GPS iniciado.");

  // Conecta WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi");
  unsigned long startAttemptTime = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 20000) {
    Serial.print(".");
    delay(500);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi conectado. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFalha ao conectar no WiFi.");
  }

  // Sincroniza hora via NTP (caso GPS ainda não tenha fix)
  configTime(-3 * 3600, 0, "pool.ntp.org");
}

void loop() {
  static unsigned long lastSend = 0;
  const unsigned long sendInterval = 30000;

  if (millis() - lastSend >= sendInterval) {
    sendLocation();
    lastSend = millis();
  }

  delay(10);
}
