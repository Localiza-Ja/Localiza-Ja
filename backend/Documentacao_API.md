# Documentação da API de Sensores

Este documento fornece instruções detalhadas sobre como utilizar a **API de Sensores**, uma API RESTful construída com Flask para gerenciamento de dados de sensores. A API permite recuperar informações de sensores, com endpoints protegidos por autenticação JWT, além de um endpoint para verificar a conectividade. As seções a seguir descrevem a configuração, os endpoints, formatos de requisição/resposta e exemplos de uso.

## Sumário

1. [Visão Geral](#visão-geral)
2. [Configuração e Instalação](#configuração-e-instalação)
3. [Autenticação](#autenticação)
4. [Status Codes](#status-codes)
5. [Responses](#responses)
6. [Endpoints](#endpoints)
   - [GET /ping](#get-ping)
   - [GET /sensor_api](#get-sensor_api)
   - [GET /sensor_api/<id>](#get-sensor_apiid)
7. [Exemplo de Uso](#exemplo-de-uso)
8. [Dependências](#dependências)

## Configuração e Instalação

Para executar a API localmente, siga os passos abaixo:

1. **Clonar o Repositório**:

   ```bash
   git clone <url-do-repositório>
   cd <diretório-do-repositório>
   ```

2. **Criar um Ambiente Virtual**:

   ```bash
   python -m venv venv
   venv\Scripts\activate  # No Linux ou MacOS: source venv/bin/activate
   ```

3. **Desativar um Ambiente Virtual**:

   ```bash
   deactivate
   ```

4. **Instalar Dependências**:
   Instale os pacotes listados no arquivo `requirements.txt`:

   ```bash
   pip install -r requirements.txt
   ```

5. **Configurar Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis (Há um copia `copia.env`):

   ```bash
   DATABASE_URL=postgresql://<usuário>:<senha>@<host>:<porta>/<banco-de-dados>
   SECRET_KEY=<sua-chave-secreta>
   JWT_SECRET_KEY=<sua-chave-jwt>
   ```

6. **Executar a Aplicação**:
   Inicie o servidor de desenvolvimento do Flask:

   ```bash
   python main.py
   ```

   A API estará disponível em `http://0.0.0.0:5000` por padrão.

7. **Configurar o Banco de Dados**:
   Certifique-se de que um banco de dados PostgreSQL está em execução e acessível. A API usa o SQLAlchemy para criar automaticamente a tabela `sensor` ao iniciar, desde que o `DATABASE_URL` esteja corretamente configurado.

## Status Codes

Os status de respostas possíveis para esta API são:

| Status Code | Descrição                                          |
| ----------- | -------------------------------------------------- |
| 200         | `OK`                                               |
| 400         | `BAD REQUEST (REQUISIÇÃO FALHOU)`                  |
| 404         | `NOT FOUND (NÃO ENCONTRADO)`                       |
| 422         | `UNPROCESSABLE ENTITY (ENTIDADE NÃO PROCESSADA)`   |
| 500         | `INTERNAL SERVER ERROR (ERRO DO SERVIDOR INTERNO)` |

## Responses

Os endpoints da API sempre retornam uma das três estruturas de resposta abaixo, além de atributos específicos do endpoint:

1. **Erro interno (500)**:

   ```json
   {
     "message": "string"
   }
   ```

2. **Erro na requisição (400, 404, 422)**:

   ```json
   {
     "error": "string",
     "status": false
   }
   ```

3. **Sucesso na requisição (200)**:
   ```json
   {
     "status": true,
     "...": "..."
   }
   ```

- O atributo `message` é retornado quando a requisição encontra uma condição inesperada, resultando em um erro interno (Status Code: 500).
- Os atributos `error` e `status` são retornados quando a requisição não é concluída com sucesso, indicando o motivo do erro e o status `false`.
- Atributos adicionais específicos (como `Sensor` ou `pong`) são incluídos na resposta, dependendo do endpoint.

## Endpoints

### GET /ping

Verifica se a API está em funcionamento.

#### Requisição

- **Método**: GET
- **URL**: `/ping`
- **Cabeçalhos**: Nenhum
- **Parâmetros**: Nenhum
- **Corpo**: Nenhum

#### Resposta

- **Código de Status**: 200 OK
- **Tipo de Conteúdo**: application/json
- **Corpo**:
  ```json
  {
    "pong": true,
    "status": true
  }
  ```
- **Em caso de erro** (Status Code: 500):
  ```json
  {
    "message": "Erro interno no servidor"
  }
  ```

#### Exemplo de Resposta

```json
{
  "pong": true,
  "status": true
}
```

### GET /sensor_api

Recupera a lista de todos os sensores armazenados no banco de dados.

#### Requisição

- **Método**: GET
- **URL**: `/sensor_api`
- **Cabeçalhos**: Nenhum
- **Parâmetros**: Nenhum
- **Corpo**: Nenhum

#### Resposta

- **Código de Status**: 200 OK
- **Tipo de Conteúdo**: application/json
- **Corpo**:
  ```json
  {
    "Sensor": [
      {
        "id": "<uuid-string>",
        "tipo": "<tipo-do-sensor>",
        "dados": "<dados-do-sensor>"
      },
      ...
    ],
    "status": true
  }
  ```
- **Em caso de erro** (Status Code: 400, 404, 422):
  ```json
  {
    "error": "mensagem de erro",
    "status": false
  }
  ```
- **Em caso de erro interno** (Status Code: 500):
  ```json
  {
    "message": "Erro interno no servidor"
  }
  ```

#### Exemplo de Resposta

```json
{
  "Sensor": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "tipo": "temperatura",
      "dados": "25.5"
    },
    {
      "id": "987fcdeb-51a2-43f8-bcde-426614174001",
      "tipo": "umidade",
      "dados": "60%"
    }
  ],
  "status": true
}
```

### GET /sensor_api/<id>

Recupera os dados de um sensor específico com base no seu ID.

#### Requisição

- **Método**: GET
- **URL**: `/sensor_api/<id>`
- **Cabeçalhos**: Nenhum
- **Parâmetros de URL**:
  | Parâmetro | Tipo | Descrição |
  |-----------|------|-----------|
  | `id` | `string` | **Obrigatório**. ID (UUID) do sensor a ser recuperado. |
- **Parâmetros de Consulta**: Nenhum
- **Corpo**: Nenhum

#### Resposta

- **Código de Status**: 200 OK
- **Tipo de Conteúdo**: application/json
- **Corpo**:
  ```json
  {
    "Sensor": {
      "id": "<uuid-string>",
      "tipo": "<tipo-do-sensor>",
      "dados": "<dados-do-sensor>"
    },
    "status": true
  }
  ```
- **Em caso de erro** (Status Code: 400, 404, 422):
  ```json
  {
    "error": "mensagem de erro",
    "status": false
  }
  ```
- **Em caso de erro interno** (Status Code: 500):
  ```json
  {
    "message": "Erro interno no servidor"
  }
  ```

#### Exemplo de Resposta

```json
{
  "Sensor": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "tipo": "temperatura",
    "dados": "25.5"
  },
  "status": true
}
```

## Dependências

A API depende dos seguintes pacotes Python principais (conforme especificado no `requirements.txt`):

- **Flask==3.1.2**: Framework web para construção da API.
- **Flask-RESTful==0.3.10**: Extensão para criação de APIs REST.
- **Flask-SQLAlchemy==3.1.1**: ORM para interações com o banco de dados.
- **Flask-JWT-Extended==4.7.1**: Autenticação com JWT.
- **psycopg2-binary==2.9.10**: Adaptador para banco de dados PostgreSQL.
- **python-dotenv==1.1.1**: Gerenciamento de variáveis de ambiente.

Para a lista completa, consulte o arquivo `requirements.txt`.

## Observações

- Certifique-se de que o banco de dados PostgreSQL esteja configurado e acessível antes de executar a API.

Esta documentação deve ajudar desenvolvedores a integrar a API de Sensores em suas aplicações de forma eficaz. Para mais assistência, entre em contato com os mantenedores da API.
