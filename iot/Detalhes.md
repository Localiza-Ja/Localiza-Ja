# 📡 Localiza-Já – Firmware IoT (ESP32 + GPS)

Este diretório contém o código do **dispositivo IoT** usado no projeto **Localiza-Já**.  
O firmware roda em um **ESP32** conectado a um módulo **GPS**, e é responsável por enviar, periodicamente, a localização do veículo para o backend Flask do sistema.

---

## 🎯 Objetivo do dispositivo IoT

O firmware do ESP32 foi desenvolvido para:

1. Ler as coordenadas de **latitude** e **longitude** vindas do módulo GPS (sentenças NMEA).
2. Monitorar se o GPS já possui **fix** (posição válida) e quantidade de satélites.
3. Sincronizar o horário via **NTP** para ter um `data_hora` consistente.
4. Conectar o ESP32 a uma rede **WiFi** configurada no código.
5. Montar um JSON com os dados de localização e identificação do motorista/entrega.
6. Enviar esse JSON periodicamente para o backend, no endpoint:
   - `POST /localizacoes/iot`
7. Exibir no **Serial Monitor** logs detalhados de:
   - status do GPS,
   - status da conexão WiFi,
   - requisições HTTP,
   - respostas do servidor.

---

## 📁 Estrutura da pasta

```text
iot/
└── arduino2.ino   # Sketch completo do ESP32 + GPS para o projeto Localiza-Já
```

---

# 🧩 Tecnologias e Bibliotecas Utilizadas

### 📶 **WiFi.h**
Conexão do ESP32 à rede WiFi em modo station.

### 🌐 **HTTPClient.h**
Cliente HTTP usado para enviar as requisições POST.

### 📦 **ArduinoJson.h**
Montagem do JSON contendo latitude/longitude/IDs.

### 🛰️ **TinyGPSPlus.h**
Responsável por interpretar as sentenças NMEA e gerar:
- latitude  
- longitude  
- idade das coordenadas (age)  
- número de satélites  

### 🔌 **HardwareSerial.h**
Cria uma serial separada para o GPS, independente da USB.

---

# ⚙️ Configurações Importantes no Código

No topo do **arduino2.ino**, ajuste:

---

### 🔐 **Configuração de WiFi**

```cpp
const char* ssid     = "NOME_DA_REDE";
const char* password = "SENHA_DA_REDE";
```


### 🧍 Identificação (IDs precisam ser os mesmos do backend)
```cpp
const char* motoristaId = "ID_DO_MOTORISTA";
const char* entregaId   = "ID_DA_ENTREGA";
```

### 🌐 Backend API

No código, existe uma URL/endpoint para onde a requisição HTTP é enviada, algo como:

```cpp
const char* apiUrl = "http://SEU_IP_BACKEND:5000/localizacoes/iot";
```

- Substitua SEU_IP_BACKEND pelo IP onde o backend Flask está rodando.
- Certifique-se que o ESP32 está na mesma rede que esse IP.

---

# 🧠 Funcionamento do firmware

## Setup

 ### 🐞 Inicializa a serial de debug

```cpp
 Serial.begin(115200);
```

 ### 🛰️ Inicializa a serial do GPS

 ```cpp
 SerialGPS.begin(baudrateGPS, SERIAL_8N1, RX_PIN, TX_PIN);
 ```

 ### 📡 Conecta no WiFi

 ```cpp
 WiFi.mode(WIFI_STA);
 WiFi.begin(ssid, password);
 ```

 ### Logs do Serial:

 ```cpp
 Conectando ao WiFi...
 Conectado! IP: 192.168.x.x
 ```

 ### ⏰ Sincroniza horário via NTP

 ```cpp
 configTime(-3 * 3600, 0, "pool.ntp.org");
 ```
 - Usado para preencher o campo data_hora.

## Loop

O loop executa três tarefas principais:

### - 1 Ler continuamente o GPS

```cpp
while (SerialGPS.available() > 0) {
  gps.encode(SerialGPS.read());
}
```

Atualiza:
- Localização
- Satélites
- Age da posição

### - 2 Exibir status (a cada X ms)

Exemplo:
```cpp
Lat: -22.90912 | Lon: -47.075901 | Satélites: 5 | age=1200ms
```
Sem fix:
```cpp
GPS sem fix ainda...
Nenhuma posição disponível...
```

### - 3 Envio periódico ao backend

```cpp
static unsigned long lastSend = 0;
const unsigned long sendInterval = 2000;

if (millis() - lastSend > sendInterval) {
  sendLocation();
  lastSend = millis();
}
```

## sendLocation() – O núcleo do firmware

### 🔍 Validação da posição

Valida:
- se localização é válida
- número de satélites
- idade (ms)

Se inválido → não envia.

---

# 🧱 Montagem do JSON

```cpp
{
  "entrega_id": "f0e9d8c7-b6a5-4321-fedc-ba9876543210",
  "motorista_id": "be5b1814-31f5-443b-8496-f7a3aafb145b",
  "latitude": -22.9092,
  "longitude": -47.07591,
  "data_hora": "2025-11-25 23:13:56"
}
```

---

# 🌐 Envio HTTP
No serial:
```cpp
Enviando: { ...JSON... }
HTTP 201
Corpo: {"status": true, "message": "Localização recebida com sucesso."}
```

---

# ⚠️ Tratamento de erros

Exemplos:
```cpp
[HTTP] Falha ao conectar
WiFi desconectado
Erro de DNS
```

---

# 🔁 Integração com Backend Flask

O endpoint:
```cpp
POST /localizacoes/iot
```

Retorna:
```cpp
{
  "Localizacao": {
    "id": "e09d2afe-b5df-4def-a888-88bf0aa1f63f",
    "entrega_id": "457799d2-84b0-410a-8f98-fcd9d61fc5ce",
    "motorista_id": "be5b1814-31f5-443b-8496-f7a3aafb145b",
    "latitude": -22.9092,
    "longitude": -47.07591,
    "data_hora": "2025-11-25 20:13:56.245028",
    "criado_em": "2025-11-25 20:13:56.245028",
    "atualizado_em": "2025-11-25 20:13:56.245028"
  },
  "message": "Localização recebida com sucesso.",
  "status": true
}
```

O frontend lê isso via useIotLocation.

---

# 🖥️ Como rodar o firmware IoT (Arduino IDE)

## 1️⃣ **Preparar ambiente**

- Instalar Arduino IDE 2.x
- Instalar ESP32 Boards
- Conectar ESP32
- Abrir arduino2.ino

## 2️⃣ **Selecionar Board e Porta**

```cpp
Board: ESP32 Dev Module
Port: COMx (Windows)
Port: /dev/ttyUSBx (Linux/macOS)
```

## 3️⃣ **Compilar e enviar**

- Compilar: ✓
- Enviar: →

Saída típica:

```cpp
Writing at 0x00001000...
Wrote 1047472 bytes...
Hard resetting via RTS pin...
```

## 4️⃣ **Abrir Serial Monitor (115200)**

Exemplo:

```cpp
Conectando ao WiFi...
Conectado!

GPS sem fix ainda...
Lat: -22.90912 | Lon: -47.075901 | Satélites: 5

Enviando...
HTTP 201
Localização recebida com sucesso.
```

---

# 🧪 Dicas de Teste e Diagnóstico

## 📡 GPS sem fix?
- Ir próximo a janela/área aberta
- Conferir antena
- Primeiro fix pode levar minutos

## 📶 Problemas de WiFi?

- Conferir ssid/password
- Rede precisa ser 2.4 GHz

## ❌ Sem resposta HTTP?

- Confirmar backend Flask rodando
- Testar endpoint no navegador/Postman

---

# ✅ Resumo Final

O firmware transforma o **ESP32 + GPS** em um **rastreador IoT** integrado ao Localiza-Já.

Ele:

- ✔️ lê e valida coordenadas
- ✔️ sincroniza horário
- ✔️ conecta ao WiFi
- ✔️ envia JSONs periódicos
- ✔️ exibe logs completos
- ✔️ alimenta o app mobile com dados reais

O app pode alternar entre:

- 📱 GPS do celular
- 📡 IoT (ESP32)
- ⚙️ Simulação