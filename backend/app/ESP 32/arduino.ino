#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

// -------- CONFIGURAÇÕES --------
const char* ssid = "123";
const char* password = "********";

// URL do backend (substitua pelo IP da sua máquina rodando o backend)
const char* backendURL = "http://192.168.0.100:8000/sensores"; 

// UART para o tracker (Serial2)
const int RX_PIN = 16;
const int TX_PIN = 17;
const unsigned long TRACKER_BAUD = 9600;

// Web
WebServer server(80);

// Estado GPS lido / simulado
String lastRawLine = "";
String lastGPRMC = "";
String lastGPGGA = "";

volatile String currentLine = "";

double latitude = 0.0;
double longitude = 0.0;
String fixTime = "";
int numSatellites = 0;
double altitudeMeters = 0.0;
bool haveFix = false;
unsigned long lastUpdateMillis = 0;

// ---------- SIMULAÇÃO DE DADOS ----------
void simulateGPS() {
  latitude = -23.5505;   // SP
  longitude = -46.6333;
  haveFix = true;
  fixTime = "123519";
  numSatellites = 7;
  altitudeMeters = 760.5;
  lastRawLine = "$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A";
  lastUpdateMillis = millis();
}

// ---------- Envio para o Backend ----------
void sendToBackend() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(backendURL);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["latitude"] = latitude;
    doc["longitude"] = longitude;
    doc["haveFix"] = haveFix;
    doc["fixTime"] = fixTime;
    doc["numSatellites"] = numSatellites;
    doc["altitude"] = altitudeMeters;
    String json;
    serializeJson(doc, json);

    int httpResponseCode = http.POST(json);
    if (httpResponseCode > 0) {
      Serial.print("Enviado ao backend. Código: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Erro ao enviar: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }
}

// ---------- Web handlers ----------
void handleRoot() {
  String page = "<!doctype html><html><head><meta charset='utf-8'><title>Tracker</title>";
  page += "<style>body{font-family:Arial;margin:16px} .k{font-weight:bold}</style></head><body>";
  page += "<h1>ESP32 - SinoTrack ST-901 (visualização)</h1>";
  page += "<div id='content'>Carregando...</div>";
  page += "<script>\nasync function fetchData(){try{let r=await fetch('/data');let j=await r.json();let html='';";
  page += "html += '<p><b>Latitude:</b> '+ j.latitude +'</p>';";  
  page += "html += '<p><b>Longitude:</b> '+ j.longitude +'</p>';";  
  page += "html += '<p><b>Fix:</b> '+ (j.haveFix? 'SIM':'NAO') + '  <b>Time:</b> '+ j.fixTime +'</p>';";  
  page += "html += '<p><b>Sats:</b> '+ j.numSatellites + ' <b>Altitude:</b> ' + j.altitude + ' m</p>';";  
  page += "html += '<p><b>Última RAW:</b> <pre>'+ j.lastRaw +'</pre></p>';";  
  page += "html += '<p><a href=\"/data\" target=\"_blank\">Ver JSON cru</a></p>';";  
  page += "document.getElementById('content').innerHTML = html;}catch(e){document.getElementById('content').innerText='Erro: '+e}}";  
  page += "setInterval(fetchData,2000); fetchData();</script></body></html>";
  server.send(200, "text/html", page);
}

void handleData() {
  StaticJsonDocument<256> doc;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["haveFix"] = haveFix;
  doc["fixTime"] = fixTime;
  doc["numSatellites"] = numSatellites;
  doc["altitude"] = altitudeMeters;
  doc["lastRaw"] = lastRawLine;
  doc["lastUpdateMillis"] = lastUpdateMillis;
  String out;
  serializeJson(doc, out);
  server.send(200, "application/json", out);
}

// ---------- Setup & Loop ----------
void setup() {
  Serial.begin(115200);
  delay(100);

  // Inicializa UART (mesmo sem tracker físico, não dá problema)
  Serial2.begin(TRACKER_BAUD, SERIAL_8N1, RX_PIN, TX_PIN);
  Serial.println("Iniciando ESP32 Tracker interface...");

  // Conecta WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Conectando WiFi");
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
    Serial.println("Falha WiFi (timeout). Verifique SSID/senha.");
  }

  // Web endpoints
  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.begin();
  Serial.println("Servidor web iniciado.");
}

void loop() {
  // Simula GPS (enquanto não tiver o ST-901 real)
  simulateGPS();

  // Web
  server.handleClient();

  // Envia para backend a cada 30s
  static unsigned long lastSend = 0;
  if (millis() - lastSend > 30000) {
    sendToBackend();
    lastSend = millis();
  }

  delay(1);
}
