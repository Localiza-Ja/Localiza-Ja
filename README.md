# Localiza-Ja

## Visão Geral do Projeto

O Localiza-Ja é um sistema abrangente projetado para otimizar o gerenciamento de entregas, rastreamento de motoristas e localização em tempo real. Ideal para um MVP (Produto Mínimo Viável) no setor de logística, o projeto integra um backend robusto em Python/Flask, um frontend móvel desenvolvido com Expo/React Native e um cliente de hardware IoT baseado em ESP32 para coleta e envio de dados de GPS simulados.

## Componentes do Sistema

O sistema Localiza-Ja é composto por três módulos principais que trabalham em conjunto para fornecer uma solução completa de rastreamento e gerenciamento:

### 1. Backend (API RESTful)

Desenvolvido em **Python** utilizando o framework **Flask**, esta API RESTful (versão 1.0) é o coração do sistema. Ela gerencia usuários (motoristas), entregas, localizações geográficas e autenticação. A API suporta operações como cadastro de motoristas, criação e atualização de entregas com status, e rastreamento de localizações em tempo real.

#### Tecnologias Principais:

*   **Python/Flask**: Framework principal para o desenvolvimento da API.
*   **Flask-RESTful**: Extensão para construção de endpoints RESTful.
*   **PostgreSQL**: Banco de dados relacional para persistência de dados, com **Flask-SQLAlchemy** para ORM.
*   **Flask-JWT-Extended**: Para autenticação segura via JSON Web Tokens (JWT).
*   **Flask-Migrate**: Gerenciamento de migrações de banco de dados.
*   **Flask-Limiter**: Controle de taxa de requisições para prevenir abusos.

#### Segurança:

A API utiliza **JWT (JSON Web Tokens)** para autenticação. Todos os endpoints protegidos exigem um cabeçalho `Authorization: Bearer <token>`. Uma blacklist de tokens (atualmente em memória, com recomendação de uso de Redis em produção) garante a invalidação de tokens após o logout.

### 2. Frontend (Aplicação Móvel)

A interface do usuário é uma aplicação móvel desenvolvida com **Expo** e **React Native**, proporcionando uma experiência nativa em dispositivos iOS e Android. O frontend permite que os motoristas façam login, visualizem suas entregas e, presumivelmente, interajam com o sistema de rastreamento.

#### Tecnologias Principais:

*   **Expo**: Plataforma para desenvolvimento universal de aplicações React Native.
*   **React Native**: Framework para construção de interfaces de usuário móveis.
*   **TailwindCSS** (potencialmente): Para estilização, com base na presença de `tailwind.config.js` e `nativewind-env.d.ts`.

### 3. IoT (Cliente de Hardware ESP32)

Este módulo é o cliente de hardware responsável por coletar dados de GPS (simulados) e enviá-los para a API Flask. Desenvolvido para **ESP32**, ele garante a comunicação em tempo real da localização dos dispositivos.

#### Funcionalidades Principais:

*   **Conexão Wi-Fi**: Gerenciamento resiliente da conexão Wi-Fi (via `WiFiMulti`).
*   **Construção de Payload JSON**: Serialização de dados de GPS em formato JSON aninhado, conforme exigido pela API Flask.
*   **Envio HTTP POST**: Comunicação com a API Flask para envio dos dados de localização.

#### Bibliotecas Essenciais:

*   `WiFi.h` & `WiFiMulti.h`: Gerenciamento da conexão Wi-Fi.
*   `HTTPClient.h`: Para requisições HTTP.
*   `ArduinoJson.h`: Para manipulação eficiente de JSON no ESP32.

## Como Começar

Para configurar e executar o projeto Localiza-Ja, siga as instruções detalhadas para cada módulo:

### Pré-requisitos

*   **Python 3.10+**
*   **PostgreSQL** (servidor local ou em nuvem)
*   **Node.js e npm/yarn** (para o frontend)
*   **Git** (opcional, para clonar o repositório)
*   **Arduino IDE** (para o módulo IoT, se for compilar o código do ESP32)

### Configuração do Backend

1.  **Clone o Repositório**:
    ```bash
    git clone https://github.com/Localiza-Ja/Localiza-Ja.git
    cd Localiza-Ja/backend
    ```
2.  **Crie e Ative um Ambiente Virtual**:
    ```bash
    python -m venv venv
    source venv/bin/activate # No Windows: .\venv\Scripts\activate
    ```
3.  **Instale as Dependências**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Configure as Variáveis de Ambiente**:
    Crie um arquivo `.env` na raiz do diretório `backend` (baseado em `copia.env`) com as seguintes variáveis:
    *   `DATABASE_URL`: URI de conexão com o PostgreSQL (ex: `postgresql://user:password@host:5432/db_name`).
    *   `SECRET_KEY`: Chave secreta para sessões Flask.
    *   `JWT_SECRET_KEY`: Chave secreta para assinatura de JWT.
5.  **Configure o Banco de Dados**:
    *   Crie o banco de dados PostgreSQL (ex: `createdb entregas_db`).
    *   Execute as migrações:
        ```bash
        export FLASK_APP=main.py # No Windows: set FLASK_APP=main.py
        flask db init
        flask db migrate
        flask db upgrade
        ```
6.  **Execute a Aplicação**:
    ```bash
    python main.py
    ```
    A API estará disponível em `http://localhost:5000`.

### Configuração do Frontend

1.  **Navegue até o Diretório do Frontend**:
    ```bash
    cd ../frontend
    ```
2.  **Instale as Dependências**:
    ```bash
    npm install # ou yarn install
    ```
3.  **Execute a Aplicação Expo**:
    ```bash
    npx expo start
    ```
    Siga as instruções no terminal para abrir o aplicativo em um emulador, simulador ou no Expo Go.

### Configuração do Módulo IoT (ESP32)

1.  **Navegue até o Diretório IoT**:
    ```bash
    cd ../iot
    ```
2.  **Abra o Projeto no Arduino IDE**:
    Abra o arquivo `arduino.ino` no Arduino IDE.
3.  **Instale as Bibliotecas Necessárias**:
    Certifique-se de ter as bibliotecas `WiFi`, `WiFiMulti`, `HTTPClient` e `ArduinoJson` instaladas no seu Arduino IDE.
4.  **Configure as Credenciais Wi-Fi**:
    No código `arduino.ino`, atualize as credenciais Wi-Fi (`ssid` e `password`) para a sua rede local.
5.  **Configure a URL da API**:
    Verifique se a constante `api_url` no `arduino.ino` aponta para o endereço correto da sua API Flask (ex: `http://<IP_DA_SUA_MAQUINA>:5000/sensor_api`).
6.  **Compile e Faça o Upload**:
    Compile o código e faça o upload para o seu dispositivo ESP32.

## Uso da API (Exemplos de Endpoints)

### `GET /ping`

Verifica a conectividade da API.

```bash
curl -X GET http://localhost:5000/ping
```

### `POST /usuarios/login`

Realiza login e retorna um token JWT.

**Body da Requisição (JSON)**:

```json
{
  "cnh": "12345678901",
  "placa_veiculo": "XYZ-9876"
}
```

**Exemplo cURL**:

```bash
curl -X POST http://localhost:5000/usuarios/login \
-H "Content-Type: application/json" \
-d '{"cnh": "12345678901", "placa_veiculo": "XYZ-9876"}'
```

### `POST /usuarios/logout`

Invalida o token JWT atual (adiciona à blacklist).

**Headers**:

`Authorization: Bearer <token>`

**Exemplo cURL**:

```bash
curl -X POST http://localhost:5000/usuarios/logout \
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Contribuição

Contribuições são bem-vindas! Para contribuir, por favor, siga os seguintes passos:

1.  Faça um fork do repositório.
2.  Crie uma nova branch para sua feature (`git checkout -b feature/minha-feature`).
3.  Faça suas alterações e commit (`git commit -m 'feat: Adiciona nova funcionalidade'`).
4.  Envie para o branch original (`git push origin feature/minha-feature`).
5.  Abra um Pull Request.

## Licença

Este projeto está licenciado sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes. (Assumindo licença MIT padrão, verificar se existe um arquivo LICENSE no repositório).

## Autores

*   **Localiza-Ja Team**

---

*Este README foi gerado automaticamente por Manus AI.*
