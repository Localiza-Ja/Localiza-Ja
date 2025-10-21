#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>

// --- 1. CONFIGURAÇÕES PRINCIPAIS ---
#define SERIAL_BAUD 115200

const char* ssid = "123";               // SUBSTITUA PELO SEU SSID
const char* password = "********";      // SUBSTITUA PELA SUA SENHA

// Endereço e Porta do Servidor Flask
const char* BACKEND_IP = "192.168.168.100";
const uint16_t BACKEND_PORT = 5000;
const char* ENDPOINT_PATH = "/localizacoes/iot"; // Rota no Flask para receber o POST

// --- 2. CONFIGURAÇÃO DO GPS ---
#include <HardwareSerial.h>
HardwareSerial gpsSerial(2); // UART2
TinyGPSPlus gps;

static const int RXPin = 16; // GPS TX -> ESP32 RX2
static const int TXPin = 17; // GPS RX -> ESP32 TX2
static const uint32_t GPSBaud = 9600;

// --- 3. FUNÇÃO PARA OBTER COORDENADAS DO GPS ---
bool getGpsCoordinates(float &lat, float &lon) {
    unsigned long start = millis();
    while (millis() - start < 5000) { // tenta ler por até 5 segundos
        while (gpsSerial.available() > 0) {
            gps.encode(gpsSerial.read());
            if (gps.location.isUpdated()) {
                lat = gps.location.lat();
                lon = gps.location.lng();
                return true;
            }
        }
    }
    return false; // sem dados válidos ainda
}

// --- 4. TIMESTAMP (mantido) ---
String getNtpTimeFormatted() {
    time_t now;
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        return "1970-01-01 00:00:00";
    }
    char buffer[25];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
    return String(buffer);
}

// --- 5. COMPÕE URL COMPLETA ---
String backendUrl() {
    return String("http://") + BACKEND_IP + ":" + String(BACKEND_PORT) + String(ENDPOINT_PATH);
}

// --- 6. ENVIO DE LOCALIZAÇÃO ---
void sendLocation() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi nao conectado — pulando envio.");
        return;
    }

    float currentLat, currentLon;
    if (!getGpsCoordinates(currentLat, currentLon)) {
        Serial.println("Sem fix de GPS — aguardando próximo ciclo.");
        return;
    }

    String dataHora = getNtpTimeFormatted();

    HTTPClient http;
    String url = backendUrl();
    http.begin(url);
    http.setTimeout(15000);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<400> doc;
    doc["latitude"] = currentLat;
    doc["longitude"] = currentLon;
    doc["data_hora"] = dataHora;

    String payload;
    size_t size = serializeJson(doc, payload);

    Serial.print("Payload (");
    Serial.print(size);
    Serial.print(" bytes): ");
    Serial.println(payload);

    int httpCode = http.POST(payload);

    if (httpCode > 0) {
        if (httpCode >= 200 && httpCode < 300) {
            String response = http.getString();
            Serial.print("HTTP Code: ");
            Serial.println(httpCode);
            Serial.print("Resposta servidor (Sucesso): ");
            Serial.println(response);
        } else {
            Serial.print("HTTP Code (Erro Servidor): ");
            Serial.println(httpCode);
            Serial.print("Resposta servidor: ");
            Serial.println(http.getString());
        }
    } else {
        Serial.print("Erro ao enviar HTTP. Código: ");
        Serial.println(httpCode);
        Serial.print("Descrição: ");
        Serial.println(http.errorToString(httpCode));
    }

    http.end();
}

// --- 7. SETUP ---
void setup() {
    Serial.begin(SERIAL_BAUD);
    gpsSerial.begin(GPSBaud, SERIAL_8N1, RXPin, TXPin);

    Serial.println();
    Serial.println("ESP32 com módulo GPS iniciando...");

    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    Serial.print("Conectando ao WiFi");
    unsigned long t0 = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) {
        Serial.print('.');
        delay(500);
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.print("WiFi OK. IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println();
        Serial.println("Falha ao conectar no WiFi (timeout).");
    }
}

// --- 8. LOOP ---
void loop() {
    static unsigned long lastSend = 0;
    const unsigned long sendInterval = 60000; // 60 segundos

    if (millis() - lastSend >= sendInterval) {
        sendLocation();
        lastSend = millis();
    }

    delay(10);
}
