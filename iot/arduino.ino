#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

#define SERIAL_BAUD 115200

// --- 1. CONFIGURAÇÕES PRINCIPAIS ---
const char* ssid = "123";               // SUBSTITUA PELO SEU SSID
const char* password = "çççççççç";      // SUBSTITUA PELA SUA SENHA

// IDs que o seu backend espera
const char* motoristaId = "c7c64635-4a1d-4bc7-b4c5-8c0286df31f8";

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

// Considera fix "fresco" se a última atualização tiver até 3 segundos
bool getGpsCoordinates(float &lat, float &lon) {
  // drena um pouco de serial para atualizar o parser
  unsigned long t0 = millis();
  while (millis() - t0 < 50) {          // ~50ms de leitura leve
    while (SerialGPS.available() > 0) {
      gps.encode(SerialGPS.read());
    }
    delay(1);
  }

  if (gps.location.isValid() && gps.location.age() <= 3000) {
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
  doc["motorista_id"] = motoristaId;
  doc["latitude"] = currentLat;
  doc["longitude"] = currentLon;

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

  // Inicializa GPS — ajuste automático de baud rate se necessário
  SerialGPS.setRxBufferSize(1024);
  SerialGPS.begin(9600, SERIAL_8N1, RXD2, TXD2);
  Serial.println("GPS iniciado em 9600 baud.");

  delay(2000); // dá tempo para o módulo inicializar

// Teste de recepção de dados NMEA
  Serial.println("Verificando comunicação com o GPS...");
  unsigned long startTest = millis();
  bool gpsRespondendo = false;

  while (millis() - startTest < 5000) { // testa por 5 segundos
    if (SerialGPS.available()) {
      char c = SerialGPS.read();
      Serial.write(c);
      gpsRespondendo = true;
    }
  }

  if (gpsRespondendo) {
    Serial.println("\n✅ GPS está enviando dados NMEA!");
  } else {
    Serial.println("\n⚠️ Nenhum dado recebido. Tente outro baud rate (4800 ou 38400).");
  }

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
  // 1) Alimenta o parser o tempo todo (crítico!)
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  // 2) Mensagem de status (a cada 1s)
  static unsigned long lastStatus = 0;
  if (millis() - lastStatus >= 1000) {
    if (gps.location.isValid()) {
      Serial.printf("Lat: %.6f | Lon: %.6f | Satélites: %d | age=%lums\n",
                    gps.location.lat(),
                    gps.location.lng(),
                    gps.satellites.value(),
                    gps.location.age());
    } else {
      Serial.println("Aguardando fix GPS...");
    }
    lastStatus = millis();
  }

  // 3) Envio periódico (ex.: a cada 30s)
  static unsigned long lastSend = 0;
  const unsigned long sendInterval = 30000;
  if (millis() - lastSend >= sendInterval) {
    sendLocation();          // usa getGpsCoordinates() com isValid+age
    lastSend = millis();
  }

  // 4) Micro pausa para cooperar com WiFi/RTOS (não bloqueante)
  delay(1);
}
