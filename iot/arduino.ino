#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define SERIAL_BAUD 115200

// --- 1. CONFIGURAÇÕES PRINCIPAIS ---
const char* ssid = "123";               // SUBSTITUA PELO SEU SSID
const char* password = "********";      // SUBSTITUA PELA SUA SENHA

// IDs que o seu backend espera (UUIDs válidos)
// Estes IDs são obrigatórios para o seu modelo 'Localizacao'
const char* motoristaId = "********-e5f6-7890-1234-567890abcdef"; // Exemplo UUID
const char* entregaId = "********-b6a5-4321-fedc-ba9876543210";   // Exemplo UUID

// Endereço e Porta do Servidor Flask
const char* BACKEND_IP = "192.168.168.100";
const uint16_t BACKEND_PORT = 5000;
const char* ENDPOINT_PATH = "/localizacoes/iot"; // Rota no Flask para receber o POST

// --- 2. FUNÇÕES AUXILIARES DE TESTE (DADOS ESTÁTICOS) ---

// **SIMULAÇÃO**: Retorna coordenadas estáticas (para teste)
void getGpsCoordinates(float &lat, float &lon) {
    // Coordenadas simuladas (Exemplo: São Paulo)
    lat = -23.5678901; 
    lon = -46.6789012; 
    // Em produção, esta função leria um módulo GPS (e.g., NEO-6M)
}

// **SIMULAÇÃO**: Retorna um timestamp estático no formato ISO 8601 exigido pelo backend
String getNtpTimeFormatted() {
    // O backend (PostgreSQL/SQLAlchemy) espera este formato: YYYY-MM-DD hh:mm:ss
    return "2025-10-01 10:30:00"; 
    // Em produção, esta função usaria NTP ou um RTC (Real-Time Clock)
}

// Compõe URL completa
String backendUrl() {
    return String("http://") + BACKEND_IP + ":" + String(BACKEND_PORT) + String(ENDPOINT_PATH);
}

// --- 3. FUNÇÃO PRINCIPAL DE ENVIO ---

void sendLocation() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi nao conectado — pulando envio.");
        return;
    }

    HTTPClient http;
    String url = backendUrl();
    Serial.print("Enviando POST para: ");
    Serial.println(url);

    http.begin(url);
    // Ajustado para 15s de timeout.
    http.setTimeout(15000); 
    http.addHeader("Content-Type", "application/json");

    // 1. Obter dados estáticos (coordenadas e timestamp)
    float currentLat, currentLon;
    getGpsCoordinates(currentLat, currentLon);
    String dataHora = getNtpTimeFormatted();

    // 2. Buffer para JSON: 400 bytes é seguro para dois UUIDs, coordenadas e timestamp.
    StaticJsonDocument<400> doc; 

    // 3. Incluir TODOS os campos exigidos pelo modelo 'Localizacao' do backend
    doc["entrega_id"] = entregaId;
    doc["motorista_id"] = motoristaId;
    doc["latitude"] = currentLat;
    doc["longitude"] = currentLon;
    doc["data_hora"] = dataHora; // Enviando o timestamp

    String payload;
    // O tamanho do payload será menor que 400, mas o buffer é um limite.
    size_t size = serializeJson(doc, payload);

    Serial.print("Payload (");
    Serial.print(size);
    Serial.print(" bytes): ");
    Serial.println(payload);

    // 4. Envio HTTP
    int httpCode = http.POST(payload);

    if (httpCode > 0) {
        if (httpCode >= 200 && httpCode < 300) {
            // Sucesso (2xx)
            String response = http.getString();
            Serial.print("HTTP Code: ");
            Serial.println(httpCode);
            Serial.print("Resposta servidor (Sucesso): ");
            Serial.println(response);
        } else {
            // Erro do Servidor (4xx, 5xx)
            Serial.print("HTTP Code (Erro Servidor): ");
            Serial.println(httpCode);
            Serial.print("Resposta servidor (Detalhes): ");
            Serial.println(http.getString());
        }
    } else {
        // Erro de Conexão (Timeout, DNS, etc.)
        Serial.print("Erro ao enviar HTTP. Código: ");
        Serial.println(httpCode);
        Serial.print("Descrição: ");
        Serial.println(http.errorToString(httpCode));
    }

    http.end();
}

// --- 4. ARDUINO SETUP E LOOP ---

void setup() {
    Serial.begin(SERIAL_BAUD);
    delay(500);
    Serial.println();
    Serial.println("ESP32 iniciando...");

    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    Serial.print("Conectando ao WiFi");
    unsigned long t0 = millis();
    // Tenta conectar por no máximo 20 segundos
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
        Serial.println("Falha ao conectar no WiFi (timeout). Verifique SSID/senha.");
    }
}

void loop() {
    // Variável 'last' deve ser estática para manter o valor entre chamadas de loop()
    static unsigned long lastSend = 0; 
    // Intervalo de 60 segundos (10000 ms)
    const unsigned long sendInterval = 60000; 

    if (millis() - lastSend >= sendInterval) {
        // CHAMADA CORRIGIDA para a função sendLocation()
        sendLocation(); 
        lastSend = millis();
    }

    // Pequeno delay no final do loop para evitar watchdog timer
    delay(10); 
}
