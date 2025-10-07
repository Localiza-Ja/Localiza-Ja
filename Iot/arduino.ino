#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define USE_SERIAL Serial

WiFiMulti wifiMulti;

const int pinoBotao = 15;     
const int ledPin =    2; 

const char* ssid = "123";
const char* password =  "********"; // Substitua por sua senha real

char jsonOutput[1100];

void setup() {

  USE_SERIAL.begin(115200);

  USE_SERIAL.println();
  USE_SERIAL.println();
  USE_SERIAL.println();

  for (uint8_t t = 4; t > 0; t--) {
    USE_SERIAL.printf("[SETUP] WAIT %d...\n", t);
    USE_SERIAL.flush();
    delay(1000);
  }

  wifiMulti.addAP( ssid, password);

  pinMode(ledPin, OUTPUT);  
  pinMode(pinoBotao, INPUT_PULLUP);  

}

void loop() {
  // A leitura do botão é mantida, mas a lógica de Presença é ignorada para focar no teste de GPS
  int botaoEstado = digitalRead(pinoBotao); 

  // wait for WiFi connection
if ((wifiMulti.run() == WL_CONNECTED)) {

    Serial.println("WiFi conectado com sucesso!");
    Serial.println(WiFi.localIP());

    HTTPClient client;

    // --- CORREÇÃO AQUI ---
    const char* api_url = "http://192.168.168.100:5000/sensor_api";

    Serial.println("Enviando para: ");
    Serial.println(api_url);
    
    // Agora o client.begin() usa a rota correta
    client.begin(api_url);  //HTTP
    client.addHeader("Content-Type","application/json");

    // CORREÇÃO: Aumenta o timeout para 10 segundos
    client.setTimeout(10000); 

    // O tamanho do buffer é suficiente para o JSON de GPS
    const size_t CAPACITY = JSON_OBJECT_SIZE(2) + JSON_OBJECT_SIZE(3) + 50; 
    StaticJsonDocument<CAPACITY> doc;
    JsonObject object = doc.to<JsonObject>();

    // ----------------------------------------------------------------------------------
    // LÓGICA DE GPS: Serializa o objeto complexo de GPS para uma STRING para
    // satisfazer o validador 'reqparse' do backend.
    // ----------------------------------------------------------------------------------
    
    // 1. Cria o objeto GPS interno
    StaticJsonDocument<100> gpsDoc;
    gpsDoc["latitude"] = -23.5505;
    gpsDoc["longitude"] = -46.6333;
    gpsDoc["status"] = "fix";

    // 2. Serializa o objeto GPS para uma STRING
    char gpsString[100];
    serializeJson(gpsDoc, gpsString);
    
    // 3. Monta o JSON FINAL para a API Flask
    object["tipo"] = "gps";
    object["dados"] = gpsString; // Envia o JSON de GPS como uma STRING
    
    // 4. Serializa o documento principal para o buffer de envio
    serializeJson(doc, Serial); // Imprime para o Serial Monitor
    Serial.println(); // Nova linha após o JSON
    serializeJson(doc, jsonOutput); // Salva no buffer de envio 'jsonOutput'

    // O JSON FINAL que o ESP32 enviará para o Flask será:
    // {"tipo":"gps", "dados":"{\"latitude\":-23.5505,\"longitude\":-46.6333,\"status\":\"fix\"}"}

    // 5. Envia a requisição POST (APENAS UMA VEZ)
    int httpCode = client.POST(String(jsonOutput));

    if (httpCode > 0){
      String payload = client.getString();
      Serial.println("\nStatuscode: " + String(httpCode));
      Serial.println("Resposta do Servidor: " + payload);
    }
    else{
      Serial.println("Erro na requisição do HTTP");
      Serial.println("HTTP Code: " + String(httpCode));
      // Se for -1, vamos tentar imprimir o erro, embora o -1 já seja a falha de conexão.
      Serial.println("Client Error: " + client.errorToString(httpCode)); 
    }
    
    // Libere o cliente em todas as circunstâncias
    client.end(); 
  }
  else{
    Serial.println("Conexão com o WIFI perdida");
  }

  // Aumente o atraso para 10 segundos para dar tempo para a rede se estabilizar
  delay(10000); 
}
