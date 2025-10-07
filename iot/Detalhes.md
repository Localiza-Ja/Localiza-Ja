📚 Documentação do Projeto: Cliente GPS (ESP32)
Este módulo é o cliente de hardware responsável por coletar dados simulados de GPS, serializá-los no formato JSON aninhado e enviá-los via HTTP POST para a API Flask.

🎯 Objetivo do Código
O código principal do ESP32 tem três funções principais e sequenciais:

Gerenciar a conexão Wi-Fi de forma resiliente (WiFiMulti).

Construir um payload JSON complexo (GPS aninhado dentro de uma string) para satisfazer a validação da API Flask.

Estabelecer uma conexão HTTP POST para enviar os dados.

⚙️ Bibliotecas Essenciais
Biblioteca	Propósito
WiFi.h & WiFiMulti.h	Gerenciamento da conexão Wi-Fi do ESP32. O WiFiMulti permite configurar múltiplas redes para maior robustez.
HTTPClient.h	Criação e gerenciamento das requisições HTTP (GET/POST/PUT) para a API.
ArduinoJson.h	Ferramenta fundamental para construir, serializar e manipular estruturas de dados JSON de forma eficiente no ESP32.

Exportar para as Planilhas
🛠 Configuração Inicial (void setup())
O bloco void setup() é responsável por inicializar a comunicação serial e configurar a rede.

Inicialização Serial: USE_SERIAL.begin(115200); define a taxa de comunicação para monitoramento.

Conexão Wi-Fi: O bloco wifiMulti.addAP(ssid, password); armazena as credenciais de rede, que serão usadas no void loop().

Pinos: Os pinos do LED (ledPin) e do botão (pinoBotao) são inicializados, embora a lógica do botão tenha sido ignorada para focar no teste de GPS.

🚀 Lógica de Execução (void loop())
O void loop() contém a lógica de rede e envio de dados. Ele executa a cada 10 segundos (delay(10000);).

1. Verificação de Conexão
C++

if ((wifiMulti.run() == WL_CONNECTED)) {
    // ... lógica de envio
} else {
    Serial.println("Conexão com o WIFI perdida");
}
O código só prossegue com a requisição HTTP se houver uma conexão Wi-Fi ativa.

2. Configuração HTTP
C++

HTTPClient client;
const char* api_url = "http://192.168.168.100:5000/sensor_api";
client.begin(api_url); 
client.addHeader("Content-Type","application/json");
client.setTimeout(10000); // Timeout de 10s para estabilidade
Define a URL completa com o endpoint /sensor_api.

Configura o cabeçalho Content-Type como application/json.

Define um Timeout de 10 segundos para prevenir o erro HTTP Code: -1 em casos de lentidão na rede.

3. Construção do Payload JSON (Aninhamento Crítico)
Esta é a parte mais importante, garantindo que o JSON atenda à validação do backend (reqparse).

O formato final esperado pelo Flask é: {"tipo":"gps", "dados":"{\"latitude\":..., \"longitude\":...}"}.

Passo	Código	Propósito
A. Objeto GPS	StaticJsonDocument<100> gpsDoc;	Cria um buffer para o JSON interno de GPS.
gpsDoc["latitude"] = -23.5505;	Popula as coordenadas.
B. Serialização	char gpsString[100]; serializeJson(gpsDoc, gpsString);	Transforma o objeto GPS em uma STRING pura, que é o formato exigido pelo campo dados do Flask.
C. Objeto Principal	StaticJsonDocument<CAPACITY> doc; JsonObject object = doc.to<JsonObject>();	Cria o buffer principal.
D. Montagem Final	object["tipo"] = "gps"; object["dados"] = gpsString;	Insere a string JSON de GPS no campo dados do JSON principal.
E. Buffer de Envio	serializeJson(doc, jsonOutput);	Salva o JSON completo (já formatado para o backend) no buffer que será enviado.

Exportar para as Planilhas
4. Envio e Tratamento de Resposta
C++

int httpCode = client.POST(String(jsonOutput));

if (httpCode > 0){
    // ... Statuscode 201 (Sucesso)
} else {
    // ... Tratamento de erros (incluindo o famoso 'connection refused' -1)
    Serial.println("Client Error: " + client.errorToString(httpCode)); 
}

client.end(); // Libera os recursos HTTP
A função client.POST() envia o jsonOutput.

O código verifica se o httpCode é positivo (sucesso) ou negativo (erro de conexão).

Em caso de sucesso (201), ele imprime a resposta JSON do Flask (confirmando que o dado foi salvo).

Crucial: client.end(); é chamado para fechar a conexão e liberar a memória do ESP32, garantindo que o próximo ciclo possa ocorrer sem falhas de recursos.

O delay(10000); no final pausa o ciclo por 10 segundos.
