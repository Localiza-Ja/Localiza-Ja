# Documentação Técnica: API de Gerenciamento de Entregas

## Table of Contents

- [1. Visão Geral e Arquitetura](#1-visão-geral-e-arquitetura)
- [2. Configuração do Ambiente](#2-configuração-do-ambiente)
  - [Requisitos](#requisitos)
  - [Variáveis de Ambiente](#variáveis-de-ambiente)
  - [Passos de Setup](#passos-de-setup)
  - [Execução](#execução)
  - [Considerações para Produção](#considerações-para-produção)
- [3. Referência de Rotas (Endpoints)](#3-referência-de-rotas-endpoints)
  - [General](#general)
  - [Autenticação](#autenticação)
  - [Usuários](#usuários)
  - [Entregas](#entregas)
  - [Localizações](#localizações)
- [4. Retornos da API](#4-retornos-da-api)
  - [Formato Geral das Respostas](#formato-geral-das-respostas)
  - [Códigos de Status HTTP](#códigos-de-status-http)
  - [Respostas de Sucesso](#respostas-de-sucesso)
  - [Respostas de Erro](#respostas-de-erro)
  - [Boas Práticas para Lidar com Respostas](#boas-práticas-para-lidar-com-respostas)
  - [Observações](#observações)
- [5. Testes e Contribuição](#5-testes-e-contribuição)
- [6. Exemplos de Uso](#6-exemplos-de-uso)
- [7. Erros Comuns](#7-erros-comuns)

## 1. Visão Geral e Arquitetura

Esta API RESTful (versão 1.0) é projetada para gerenciar entregas, usuários (motoristas), localizações geográficas e autenticação. Ela suporta operações como cadastro de motoristas, criação e atualização de entregas com status, rastreamento de localizações em tempo real e autenticação segura. A aplicação é ideal para um MVP de logística, com foco em rastreamento de entregas via coordenadas GPS.

### Tecnologias Core

- **Python/Flask**: Framework principal para o desenvolvimento da API, fornecendo roteamento e gerenciamento de requisições.
- **Flask-RESTful**: Extensão para criar endpoints RESTful de forma estruturada e modular.
- **Persistência de Dados em PostgreSQL**: Utiliza **Flask-SQLAlchemy** para modelagem ORM (Object-Relational Mapping) e interações com o banco de dados PostgreSQL, garantindo escalabilidade e integridade de dados.

Outras bibliotecas incluem Flask-JWT-Extended para autenticação, Flask-Migrate para migrações de banco de dados e Flask-Limiter para controle de taxa de requisições.

### Segurança

A API utiliza **JWT (JSON Web Tokens)** para autenticação. Todos os endpoints protegidos exigem um header `Authorization: Bearer <token>`, exceto os de login (`/usuarios/login`) e cadastro inicial de usuários (`POST /usuarios`). Tokens expirados ou na blacklist (implementada em memória via `utils.py`) são rejeitados. Em produção, recomenda-se integrar com Redis para persistir a blacklist.

A aplicação também inclui validações de dados (ex.: formato de CNH, placa de veículo) e limites de taxa para prevenir abusos.

## 2. Configuração do Ambiente

### Requisitos

- **Python 3.10+**: Versão mínima para compatibilidade com as bibliotecas.
- **PostgreSQL**: Banco de dados relacional para armazenamento persistente. Instale e configure um servidor local ou em nuvem (ex.: PostgreSQL 14+).
- **Git** (opcional): Para clonar o repositório.
- **Ambiente Virtual** (recomendado): Use `venv` para isolar dependências.

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis. Elas são carregadas via `python-dotenv`.

| Variável         | Descrição                                                                                 | Exemplo/Explicação                                                                                             | Obrigatória |
| ---------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------- |
| `DATABASE_URL`   | URI de conexão com o PostgreSQL. Formato: `postgresql://user:password@host:port/db_name`. | `postgresql://postgres:senha@localhost:5432/entregas_db`. Certifique-se de criar o banco de dados vazio antes. | Sim         |
| `SECRET_KEY`     | Chave secreta para sessões Flask. Gere uma string aleatória segura.                       | `my_super_secret_key` (use `secrets.token_hex(16)` para gerar).                                                | Sim         |
| `JWT_SECRET_KEY` | Chave secreta para assinatura de JWT. Gere uma string aleatória segura.                   | `jwt_super_secret_key` (use `secrets.token_hex(32)` para gerar).                                               | Sim         |

### Passos de Setup

1. **Clone o Repositório** (se aplicável):

   ```
   git clone <url-do-repositorio>
   cd <nome-do-projeto>
   ```

2. **Crie um Ambiente Virtual**:

   ```
   python -m venv venv
   source venv/bin/activate  # No Windows: venv\Scripts\activate
   ```

3. **Instale Dependências**:

   ```
   pip install -r requirements.txt
   ```

4. **Configure o Banco de Dados**:

   - Crie o banco de dados PostgreSQL (ex.: via pgAdmin ou CLI: `createdb entregas_db`).
   - Inicialize as migrações:

     ```
     export FLASK_AP=main.py # No Windows: set FLASK_AP=main.py
     flask db init  # Apenas na primeira vez
     flask db migrate
     flask db upgrade
     ```

   - **Troubleshooting**: Se ocorrer erro de conexão, verifique a `DATABASE_URL` e certifique-se de que o PostgreSQL está rodando.

### Execução

Rode a aplicação em modo de desenvolvimento:

```
python main.py
```

A API estará disponível em `http://localhost:5000`. Para produção, defina `debug=False` em `main.py` e use um servidor como Gunicorn.

### Considerações para Produção

- Use HTTPS para endpoints sensíveis.
- Migre a blacklist JWT para Redis (atual em memória).
- Monitore com ferramentas como New Relic ou logs via Flask.
- Escala horizontal: Use containers (Docker) e orquestração (Kubernetes).

## 3. Referência de Rotas (Endpoints)

Os endpoints são organizados por módulo. Todos os endpoints protegidos requerem autenticação via JWT, exceto onde indicado. Respostas de erro seguem o formato: `{"error": "mensagem", "status": false}` com códigos HTTP apropriados.

### General

#### GET /ping

- **Descrição**: Verifica a conectividade da API.
- **Parâmetros de Requisição (Body)**: Nenhum.
- **Headers**: Nenhum (endpoint público).
- **Exemplo de Requisição cURL**:
  ```
  curl -X GET http://localhost:5000/ping
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "pong": true,
    "message": "API está no ar com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**: Geralmente não aplica, mas 500 para erro interno: `{"message": "Erro interno no servidor: <detalhe>", "status": false}`

### Autenticação

#### POST /usuarios/login

- **Descrição**: Realiza login e retorna um token JWT.
- **Parâmetros de Requisição (Body)**:

| Nome            | Tipo   | Obrigatório | Descrição                              |
| --------------- | ------ | ----------- | -------------------------------------- |
| `cnh`           | string | **Sim**     | Número da CNH (exatamente 11 dígitos). |
| `placa_veiculo` | string | **Sim**     | Placa do veículo (formato XXX-1234).   |

- **Headers**: Nenhum (endpoint público).
- **Exemplo de Requisição cURL**:
  ```
  curl -X POST http://localhost:5000/usuarios/login \
  -H "Content-Type: application/json" \
  -d '{"cnh": "12345678901", "placa_veiculo": "XYZ-9876"}'
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "Login realizado com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Credenciais inválidas", "status": false}`
  - **400**: `{"error": "CNH deve ter exatamente 11 dígitos numéricos", "status": false}`
- **Regras de Negócio**: Credenciais inválidas retornam 401. Limite de tentativas não implementado (TODO).

#### POST /usuarios/logout

- **Descrição**: Invalida o token JWT atual (adiciona à blacklist).
- **Parâmetros de Requisição**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X POST http://localhost:5000/usuarios/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "message": "Logout realizado com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`

#### GET /usuarios/session

- **Descrição**: Verifica a sessão e retorna dados do usuário logado.
- **Parâmetros de Requisição**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X GET http://localhost:5000/usuarios/session \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Usuario": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nome": "Motorista Teste",
      "placa_veiculo": "XYZ-9876",
      "cnh": "12345678901",
      "criado_em": "YYYY-MM-DDTHH:MM:SS",
      "atualizado_em": "YYYY-MM-DDTHH:MM:SS"
    },
    "message": "Sessão válida.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`

### Usuários

#### POST /usuarios

- **Descrição**: Cria um novo usuário (motorista). Endpoint público para cadastro inicial.
- **Parâmetros de Requisição (Body)**:

| Nome            | Tipo   | Obrigatório | Descrição                                |
| --------------- | ------ | ----------- | ---------------------------------------- |
| `nome`          | string | **Sim**     | Nome do motorista (máx. 255 caracteres). |
| `placa_veiculo` | string | **Sim**     | Placa do veículo (formato XXX-1234).     |
| `cnh`           | string | **Sim**     | CNH (exatamente 11 dígitos).             |
| `telefone`      | string | **Sim**     | Telefone (exatamente 11 dígitos).        |

- **Headers**: Nenhum.
- **Exemplo de Requisição cURL**:
  ```
  curl -X POST http://localhost:5000/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nome": "Motorista Teste", "placa_veiculo": "XYZ-9876", "cnh": "12345678901", "telefone": "11999999999"}'
  ```
- **Resposta JSON de Sucesso (201)**:
  ```json
  {
    "Usuario": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nome": "Motorista Teste",
      "placa_veiculo": "XYZ-9876",
      "cnh": "12345678901",
      "criado_em": "YYYY-MM-DDTHH:MM:SS",
      "atualizado_em": "YYYY-MM-DDTHH:MM:SS"
    },
    "message": "Usuário criado com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **400**: `{"error": "CNH deve ter exatamente 11 dígitos numéricos", "status": false}`
  - **400**: `{"error": "Placa deve seguir o formato XXX-1234", "status": false}`
- **Regras de Negócio**: Validações de formato em CNH, placa e telefone.

#### GET /usuarios

- **Descrição**: Lista todos os usuários.
- **Parâmetros de Requisição**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X GET http://localhost:5000/usuarios \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Usuarios": [
      {
        "id": "uuid1",
        "nome": "Motorista1",
        "placa_veiculo": "ABC-1234",
        "cnh": "98765432101",
        "criado_em": "YYYY-MM-DDTHH:MM:SS",
        "atualizado_em": "YYYY-MM-DDTHH:MM:SS"
      },
      ...
    ],
    "message": "Usuários encontrados com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Nenhum usuário encontrado", "status": false}`

#### GET /usuarios/<user_id>

- **Descrição**: Obtém um usuário por ID (UUID).
- **Parâmetros de Requisição (Path)**: `user_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X GET http://localhost:5000/usuarios/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Usuario": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nome": "Motorista Teste",
      "placa_veiculo": "XYZ-9876",
      "cnh": "12345678901",
      "criado_em": "YYYY-MM-DDTHH:MM:SS",
      "atualizado_em": "YYYY-MM-DDTHH:MM:SS"
    },
    "message": "Usuário encontrado com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Usuário com ID <user_id> não encontrado", "status": false}`

#### PUT /usuarios/<user_id>

- **Descrição**: Atualiza um usuário existente.
- **Parâmetros de Requisição (Path)**: `user_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**:

| Nome            | Tipo   | Obrigatório | Descrição                                |
| --------------- | ------ | ----------- | ---------------------------------------- |
| `nome`          | string | Não         | Nome do motorista (máx. 255 caracteres). |
| `placa_veiculo` | string | Não         | Placa do veículo (formato XXX-1234).     |
| `cnh`           | string | Não         | CNH (exatamente 11 dígitos).             |
| `telefone`      | string | Não         | Telefone (exatamente 11 dígitos).        |

- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X PUT http://localhost:5000/usuarios/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"nome": "Novo Nome Motorista"}'
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Usuario": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nome": "Novo Nome Motorista",
      "placa_veiculo": "XYZ-9876",
      "cnh": "12345678901",
      "criado_em": "YYYY-MM-DDTHH:MM:SS",
      "atualizado_em": "YYYY-MM-DDTHH:MM:SS"
    },
    "message": "Usuário atualizado com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Usuário com ID <user_id> não encontrado", "status": false}`
  - **400**: `{"error": "Dados inválidos: <detalhe>", "status": false}`
- **Regras de Negócio**: Atualização parcial permitida. Validações aplicam-se aos campos fornecidos.

#### DELETE /usuarios/<user_id>

- **Descrição**: Deleta um usuário (com cascata para entregas e localizações associadas).
- **Parâmetros de Requisição (Path)**: `user_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X DELETE http://localhost:5000/usuarios/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "message": "Usuário deletado com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Usuário com ID <user_id> não encontrado", "status": false}`
  - **500**: `{"message": "Erro interno no servidor: <detalhe>", "status": false}`

### Entregas

#### POST /entregas

- **Descrição**: Cria uma nova entrega.
- **Parâmetros de Requisição (Body)**:

| Nome               | Tipo   | Obrigatório | Descrição                                                                                                         |
| ------------------ | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `motorista_id`     | UUID   | **Sim**     | ID do motorista associado.                                                                                        |
| `endereco_entrega` | string | **Sim**     | Endereço de entrega (máx. 255 caracteres).                                                                        |
| `nome_cliente`     | string | **Sim**     | Nome do cliente (máx. 255 caracteres).                                                                            |
| `observacao`       | string | Não         | Observações (máx. 255 caracteres).                                                                                |
| `foto_prova`       | string | Não         | Caminho da foto de prova.                                                                                         |
| `motivo`           | string | Não         | Motivo para status negativos (máx. 255 caracteres).                                                               |
| `nome_recebido`    | string | Não         | Nome do recebedor (máx. 255 caracteres).                                                                          |
| `status`           | enum   | Não         | Status da entrega (default: "pendente"). Valores: "pendente", "em_rota", "entregue", "cancelada", "nao_entregue". |

- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X POST http://localhost:5000/entregas \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"motorista_id": "550e8400-e29b-41d4-a716-446655440000", "endereco_entrega": "Rua Teste, 123", "nome_cliente": "Cliente Teste"}'
  ```
- **Resposta JSON de Sucesso (201)**:
  ```json
  {
    "Entrega": {
      "id": "uuid-string",
      "motorista_id": "550e8400-e29b-41d4-a716-446655440000",
      "endereco_entrega": "Rua Teste, 123",
      "numero_pedido": "ABC123",
      "status": "pendente",
      "nome_cliente": "Cliente Teste",
      "nome_recebido": null,
      "observacao": null,
      "foto_prova": null,
      "motivo": null,
      "criado_em": "YYYY-MM-DDTHH:MM:SS",
      "atualizado_em": "YYYY-MM-DDTHH:MM:SS"
    },
    "message": "Entrega criada com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **400**: `{"error": "Dados inválidos: <detalhe>", "status": false}`
  - **404**: `{"error": "Motorista não encontrado", "status": false}`
- **Regras de Negócio**: Número do pedido gerado automaticamente (único, 6 alfanuméricos). Status usa Enum. Campos condicionais: `nome_recebido` e `foto_prova` para "entregue"; `motivo` para "cancelada" ou "nao_entregue".

#### GET /entregas

- **Descrição**: Lista todas as entregas.
- **Parâmetros de Requisição**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X GET http://localhost:5000/entregas \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Entregas": [
      {
        "id": "uuid1",
        "motorista_id": "uuid-motorista",
        "endereco_entrega": "Rua 1",
        "numero_pedido": "ABC123",
        "status": "pendente",
        ...
      },
      ...
    ],
    "message": "Entregas encontradas com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Nenhuma entrega encontrada", "status": false}`

#### GET /entregas/<entrega_id>

- **Descrição**: Obtém uma entrega por ID (UUID).
- **Parâmetros de Requisição (Path)**: `entrega_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X GET http://localhost:5000/entregas/uuid-string \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Entrega": {
      "id": "uuid-string",
      "motorista_id": "uuid-motorista",
      "endereco_entrega": "Rua Teste, 123",
      "numero_pedido": "ABC123",
      "status": "pendente",
      ...
    },
    "message": "Entrega encontrada com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Entrega com ID <entrega_id> não encontrada", "status": false}`

#### PUT /entregas/<entrega_id>

- **Descrição**: Atualiza uma entrega existente (suporta upload de foto via multipart/form-data).
- **Parâmetros de Requisição (Path)**: `entrega_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**: Mesmos do POST (parcial; use JSON ou form-data para foto).

| Nome               | Tipo   | Obrigatório | Descrição               |
| ------------------ | ------ | ----------- | ----------------------- |
| `motorista_id`     | UUID   | Não         | ID do motorista.        |
| `endereco_entrega` | string | Não         | Endereço de entrega.    |
| `nome_cliente`     | string | Não         | Nome do cliente.        |
| `observacao`       | string | Não         | Observações.            |
| `foto_prova`       | file   | Não         | Foto de prova (upload). |
| `motivo`           | string | Não         | Motivo.                 |
| `nome_recebido`    | string | Não         | Nome do recebedor.      |
| `status`           | enum   | Não         | Status da entrega.      |

- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL** (com foto):
  ```
  curl -X PUT http://localhost:5000/entregas/uuid-string \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "status=entregue" \
  -F "nome_recebido=Recebedor Teste" \
  -F "foto_prova=@/path/to/foto.jpg"
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Entrega": {
      "id": "uuid-string",
      "status": "entregue",
      ...
    },
    "message": "Entrega atualizada com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Entrega com ID <entrega_id> não encontrada", "status": false}`
  - **400**: `{"error": "Dados inválidos: <detalhe>", "status": false}`
- **Regras de Negócio**: Atualização parcial. Validações condicionais baseadas em status.

#### DELETE /entregas/<entrega_id>

- **Descrição**: Deleta uma entrega.
- **Parâmetros de Requisição (Path)**: `entrega_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X DELETE http://localhost:5000/entregas/uuid-string \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "message": "Entrega deletada com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Entrega com ID <entrega_id> não encontrada", "status": false}`
  - **500**: `{"message": "Erro interno no servidor: <detalhe>", "status": false}`

#### GET /entregas/numero_pedido/<numero_pedido>

- **Descrição**: Obtém uma entrega por número de pedido.
- **Parâmetros de Requisição (Path)**: `numero_pedido` (string, **obrigatório**).
- **Parâmetros de Requisição (Body)**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X GET http://localhost:5000/entregas/numero_pedido/ABC123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Entrega": {
      "id": "uuid-string",
      "numero_pedido": "ABC123",
      ...
    },
    "message": "Entrega encontrada com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Entrega com número de pedido <numero_pedido> não encontrada", "status": false}`

#### GET /entregas/motorista/<motorista_id>

- **Descrição**: Lista entregas associadas a um motorista.
- **Parâmetros de Requisição (Path)**: `motorista_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X GET http://localhost:5000/entregas/motorista/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Entregas": [
      {
        "id": "uuid1",
        "motorista_id": "550e8400-e29b-41d4-a716-446655440000",
        ...
      },
      ...
    ],
    "message": "Entregas encontradas com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Nenhuma entrega encontrada para este motorista", "status": false}`

#### PUT /entregas/<entrega_id>/status

- **Descrição**: Atualiza apenas o status de uma entrega (com campos condicionais).
- **Parâmetros de Requisição (Path)**: `entrega_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**:

| Nome            | Tipo   | Obrigatório | Descrição                                                                    |
| --------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `status`        | enum   | **Sim**     | Novo status: "pendente", "em_rota", "entregue", "cancelada", "nao_entregue". |
| `nome_recebido` | string | Não         | Obrigatório se status="entregue".                                            |
| `foto_prova`    | string | Não         | Foto de prova se status="entregue".                                          |
| `motivo`        | string | Não         | Obrigatório se status="cancelada" ou "nao_entregue".                         |

- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X PUT http://localhost:5000/entregas/uuid-string/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"status": "entregue", "nome_recebido": "Recebedor Teste"}'
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Entrega": {
      "id": "uuid-string",
      "status": "entregue",
      ...
    },
    "message": "Status da entrega atualizado com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Entrega com ID <entrega_id> não encontrada", "status": false}`
  - **400**: `{"error": "Motivo obrigatório para status cancelada", "status": false}`
- **Regras de Negócio**: Validações condicionais baseadas no novo status.

### Localizações

#### POST /localizacoes

- **Descrição**: Cria uma nova localização associada a entrega ou motorista.
- **Parâmetros de Requisição (Body)**:

| Nome           | Tipo     | Obrigatório | Descrição                     |
| -------------- | -------- | ----------- | ----------------------------- |
| `entrega_id`   | UUID     | Não         | ID da entrega associada.      |
| `motorista_id` | UUID     | Não         | ID do motorista associado.    |
| `latitude`     | numeric  | **Sim**     | Latitude (-90 a 90).          |
| `longitude`    | numeric  | **Sim**     | Longitude (-180 a 180).       |
| `data_hora`    | datetime | Não         | Data e hora (default: atual). |

- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X POST http://localhost:5000/localizacoes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"entrega_id": "uuid-entrega", "motorista_id": "uuid-motorista", "latitude": -23.55, "longitude": -46.63}'
  ```
- **Resposta JSON de Sucesso (201)**:
  ```json
  {
    "Localizacao": {
      "id": "uuid-string",
      "entrega_id": "uuid-entrega",
      "motorista_id": "uuid-motorista",
      "latitude": -23.55,
      "longitude": -46.63,
      "data_hora": "YYYY-MM-DDTHH:MM:SS",
      "criado_em": "YYYY-MM-DDTHH:MM:SS",
      "atualizado_em": "YYYY-MM-DDTHH:MM:SS"
    },
    "message": "Localização criada com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **400**: `{"error": "Latitude deve ser entre -90 e 90", "status": false}`
- **Regras de Negócio**: Coordenadas em Numeric(10,7). Pelo menos uma associação (entrega ou motorista) recomendada.

#### GET /localizacoes

- **Descrição**: Lista todas as localizações.
- **Parâmetros de Requisição**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X GET http://localhost:5000/localizacoes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Localizacoes": [
      {
        "id": "uuid1",
        "latitude": -23.55,
        "longitude": -46.63,
        ...
      },
      ...
    ],
    "message": "Localizações encontradas com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Nenhuma localização encontrada", "status": false}`

#### GET /localizacoes/<loc_id>

- **Descrição**: Obtém uma localização por ID (UUID).
- **Parâmetros de Requisição (Path)**: `loc_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X GET http://localhost:5000/localizacoes/uuid-string \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Localizacao": {
      "id": "uuid-string",
      "latitude": -23.55,
      "longitude": -46.63,
      ...
    },
    "message": "Localização encontrada com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Localização com ID <loc_id> não encontrada", "status": false}`

#### PUT /localizacoes/<loc_id>

- **Descrição**: Atualiza uma localização existente.
- **Parâmetros de Requisição (Path)**: `loc_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**: Mesmos do POST (parcial).

| Nome           | Tipo     | Obrigatório | Descrição        |
| -------------- | -------- | ----------- | ---------------- |
| `entrega_id`   | UUID     | Não         | ID da entrega.   |
| `motorista_id` | UUID     | Não         | ID do motorista. |
| `latitude`     | numeric  | Não         | Latitude.        |
| `longitude`    | numeric  | Não         | Longitude.       |
| `data_hora`    | datetime | Não         | Data e hora.     |

- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X PUT http://localhost:5000/localizacoes/uuid-string \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"latitude": -23.56, "longitude": -46.64}'
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Localizacao": {
      "id": "uuid-string",
      "latitude": -23.56,
      "longitude": -46.64,
      ...
    },
    "message": "Localização atualizada com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Localização com ID <loc_id> não encontrada", "status": false}`
  - **400**: `{"error": "Dados inválidos: <detalhe>", "status": false}`

#### DELETE /localizacoes/<loc_id>

- **Descrição**: Deleta uma localização.
- **Parâmetros de Requisição (Path)**: `loc_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X DELETE http://localhost:5000/localizacoes/uuid-string \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "message": "Localização deletada com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Localização com ID <loc_id> não encontrada", "status": false}`
  - **500**: `{"message": "Erro interno no servidor: <detalhe>", "status": false}`

#### POST /localizacoes/iot

- **Descrição**: Cria uma localização simplificada via IoT (sem associações).
- **Parâmetros de Requisição (Body)**:

| Nome        | Tipo    | Obrigatório | Descrição               |
| ----------- | ------- | ----------- | ----------------------- |
| `latitude`  | numeric | **Sim**     | Latitude (-90 a 90).    |
| `longitude` | numeric | **Sim**     | Longitude (-180 a 180). |

- **Headers**: Nenhum (endpoint público).
- **Exemplo de Requisição cURL**:
  ```
  curl -X POST http://localhost:5000/localizacoes/iot \
  -H "Content-Type: application/json" \
  -d '{"latitude": -23.55, "longitude": -46.63}'
  ```
- **Resposta JSON de Sucesso (201)**:
  ```json
  {
    "Localizacao": {
      "id": "uuid-string",
      "latitude": -23.55,
      "longitude": -46.63,
      "data_hora": "YYYY-MM-DDTHH:MM:SS",
      ...
    },
    "message": "Localização recebida com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **400**: `{"error": "Dados inválidos: <detalhe>", "status": false}`
  - **500**: `{"message": "Erro interno no servidor: <detalhe>", "status": false}`
- **Regras de Negócio**: Endpoint para dispositivos IoT; não requer autenticação.

#### GET /localizacoes/entrega/<entrega_id>

- **Descrição**: Lista localizações associadas a uma entrega.
- **Parâmetros de Requisição (Path)**: `entrega_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X GET http://localhost:5000/localizacoes/entrega/uuid-entrega \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Localizacao": [
      {
        "id": "uuid1",
        "entrega_id": "uuid-entrega",
        ...
      },
      ...
    ],
    "message": "Localizações encontradas com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Nenhuma localização encontrada para este entrega", "status": false}`

#### GET /localizacoes/motorista/<motorista_id>

- **Descrição**: Lista localizações associadas a um motorista.
- **Parâmetros de Requisição (Path)**: `motorista_id` (UUID, **obrigatório**).
- **Parâmetros de Requisição (Body)**: Nenhum.
- **Headers**: `Authorization: Bearer <token>` (**obrigatório**).
- **Exemplo de Requisição cURL**:
  ```
  curl -X GET http://localhost:5000/localizacoes/motorista/uuid-motorista \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **Resposta JSON de Sucesso (200)**:
  ```json
  {
    "Localizacao": [
      {
        "id": "uuid1",
        "motorista_id": "uuid-motorista",
        ...
      },
      ...
    ],
    "message": "Localizações encontradas com sucesso.",
    "status": true
  }
  ```
- **Respostas de Erro**:
  - **401**: `{"error": "Token de autenticação ausente ou inválido", "status": false}`
  - **404**: `{"error": "Nenhuma localização encontrada para este motorista", "status": false}`

## 4. Retornos da API

### Formato Geral das Respostas

Todas as respostas da API são retornadas em formato JSON. O formato inclui:

- **Chaves principais**:
  - `status` (boolean): Indica se a requisição foi bem-sucedida (`true`) ou falhou (`false`).
  - `message` (string): Mensagem descritiva do resultado, em português (usando `flask-babel` com locale `pt_BR`).
  - Dados específicos do endpoint (ex.: `Usuario`, `Entrega`, `Localizacao`): Contêm os dados retornados, quando aplicável.
  - `error` (string): Presente apenas em respostas de erro, detalhando a causa.

### Códigos de Status HTTP

Os seguintes códigos de status HTTP são usados pela API, com suas respectivas finalidades:

| Código                        | Descrição                                                      | Quando Usado                                                                                      |
| ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **200 OK**                    | Requisição bem-sucedida, com dados retornados.                 | Consultas (`GET`) ou atualizações (`PUT`) bem-sucedidas. Ex.: Listar usuários, atualizar entrega. |
| **201 Created**               | Recurso criado com sucesso.                                    | Criação de recursos (`POST`). Ex.: Criar usuário, entrega ou localização.                         |
| **400 Bad Request**           | Dados de entrada inválidos ou mal formatados.                  | Validações falham (ex.: CNH inválida, latitude fora do intervalo).                                |
| **401 Unauthorized**          | Autenticação falhou (token ausente, inválido ou na blacklist). | Requisições protegidas sem token válido.                                                          |
| **404 Not Found**             | Recurso não encontrado.                                        | IDs ou números de pedido inválidos.                                                               |
| **500 Internal Server Error** | Erro interno no servidor.                                      | Exceções não tratadas ou falhas inesperadas.                                                      |

### Respostas de Sucesso

Respostas de sucesso sempre incluem `status: true` e uma mensagem descritiva. O conteúdo varia conforme o endpoint.

#### Exemplo: Sucesso em `POST /usuarios/login` (200 OK)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login realizado com sucesso.",
  "status": true
}
```

#### Exemplo: Sucesso em `POST /entregas` (201 Created)

```json
{
  "Entrega": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "motorista_id": "uuid-string",
    "endereco_entrega": "Rua Teste, 123",
    "numero_pedido": "ABC123",
    "status": "pendente",
    "nome_cliente": "Cliente Teste",
    "nome_recebido": null,
    "observacao": null,
    "foto_prova": null,
    "motivo": null,
    "criado_em": "YYYY-MM-DDTHH:MM:SS",
    "atualizado_em": "YYYY-MM-DDTHH:MM:SS"
  },
  "message": "Entrega criada com sucesso.",
  "status": true
}
```

### Respostas de Erro

Respostas de erro incluem `status: false` e uma chave `error` (ou `message` em erros 500) com detalhes. Abaixo estão exemplos comuns para cada código de erro.

#### 400 Bad Request

- **Causa**: Dados inválidos, como formato incorreto ou valores fora do intervalo.
- **Exemplo**: `POST /localizacoes` com latitude inválida.
  ```json
  {
    "error": "O valor mínimo permitido é -90",
    "status": false
  }
  ```
- **Outros Casos**:
  - CNH com menos de 11 dígitos: `"CNH deve ter exatamente 11 dígitos numéricos"`.
  - Placa inválida: `"Placa deve seguir o formato XXX-1234"`.

#### 401 Unauthorized

- **Causa**: Token JWT ausente, inválido ou na blacklist.
- **Exemplo**: `GET /usuarios` sem token.
  ```json
  {
    "error": "Token de autenticação ausente ou inválido",
    "status": false
  }
  ```

#### 404 Not Found

- **Causa**: Recurso (usuário, entrega, localização) não encontrado.
- **Exemplo**: `GET /entregas/invalid-uuid`.
  ```json
  {
    "error": "Entrega com ID invalid-uuid não encontrada",
    "status": false
  }
  ```

#### 500 Internal Server Error

- **Causa**: Exceções não tratadas ou falhas no servidor.
- **Exemplo**: Erro genérico.
  ```json
  {
    "message": "Erro interno no servidor: <detalhe>",
    "status": false
  }
  ```
- **Nota**: Verifique os logs do servidor para detalhes. Em produção, use ferramentas como Sentry para monitoramento.

### Boas Práticas para Lidar com Respostas

- **Validação de Entrada**: Sempre valide os dados antes de enviar (ex.: formato de UUID, intervalo de coordenadas).
- **Autenticação**: Armazene o token JWT retornado pelo login e inclua-o no header `Authorization: Bearer <token>` para endpoints protegidos.
- **Tratamento de Erros**: Implemente tratamento de erros no cliente para lidar com 400, 401, e 404. Para 500, notifique administradores.
- **Logs**: Em caso de erros 500, verifique logs no servidor (ex.: stdout no modo debug ou arquivos de log em produção).

### Observações

- **Mensagens Internacionalizadas**: As mensagens usam `flask-babel` (locale padrão: `pt_BR`). Para outros idiomas, ajuste o header `Accept-Language`.
- **Consistência**: Todos os endpoints retornam `status` e uma mensagem descritiva, mesmo em erros.
- **Endpoints IoT**: O endpoint `/localizacoes/iot` é público e simplificado, retornando apenas erros 400 ou 500.

## 5. Testes e Contribuição

### Como Testar

Os testes de integração estão em `test_api.py` e usam `pytest` com fixtures para criar/deletar dados de teste, garantindo isolamento e limpeza automática. Rode os testes com:

```
pytest test_api.py -v
```

Os testes cobrem CRUD, autenticação e regras de negócio, executando em ordem via `pytest-order`. Certifique-se de que a API esteja rodando em `http://localhost:5000`.

- **Integração com Postman**: Importe a coleção `API_Entregas.postman_collection.json` do código-fonte para testes manuais.

### Utilitários

- **Blacklist JWT**: Implementada em memória (`utils.py` com `set()`). Funciona para MVP, mas em produção, migre para Redis ou banco persistente para escalabilidade e consistência em múltiplas instâncias.
- **Contribuição**: Fork o repositório, crie branches para features/bugs, e submeta pull requests. Adicione testes para novas funcionalidades. Para internacionalização, use Flask-Babel (configurado para pt_BR por default).

## 6. Exemplos de Uso

### Fluxo Completo: Criar e Rastrear uma Entrega

1. Cadastre um usuário: `POST /usuarios` (público).
2. Login: `POST /usuarios/login` → Obtenha token.
3. Crie entrega: `POST /entregas` com token.
4. Atualize status: `PUT /entregas/<id>/status`.
5. Adicione localização: `POST /localizacoes`.
6. Consulte: `GET /entregas/numero_pedido/<numero>`.

Exemplo em script Python (usando requests):

```python
import requests

# Login
response = requests.post('http://localhost:5000/usuarios/login', json={'cnh': '12345678901', 'placa_veiculo': 'XYZ-9876'})
token = response.json()['access_token']

# Criar entrega
headers = {'Authorization': f'Bearer {token}'}
data = {'motorista_id': '550e8400-e29b-41d4-a716-446655440000', 'endereco_entrega': 'Rua Teste', 'nome_cliente': 'Cliente'}
response = requests.post('http://localhost:5000/entregas', json=data, headers=headers)
print(response.json())
```

## 7. Erros Comuns

- **400 Bad Request**: Dados inválidos (ex.: CNH com menos de 11 dígitos). Exemplo: `{"error": "CNH deve ter exatamente 11 dígitos numéricos", "status": false}`.
- **401 Unauthorized**: Token inválido ou ausente.
- **404 Not Found**: Recurso não existe (ex.: ID inválido).
- **500 Internal Server Error**: Erro no servidor; verifique logs.

## Dependências (requirements.txt)

```
alembic==1.16.5
aniso8601==10.0.1
babel==2.17.0
blinker==1.9.0
certifi==2025.8.3
charset-normalizer==3.4.3
click==8.3.0
colorama==0.4.6
Deprecated==1.2.18
Flask==3.1.2
flask-babel==4.0.0
Flask-JWT-Extended==4.7.1
Flask-Limiter==4.0.0
Flask-Migrate==4.1.0
Flask-RESTful==0.3.10
Flask-SQLAlchemy==3.1.1
greenlet==3.2.4
idna==3.10
iniconfig==2.1.0
itsdangerous==2.2.0
Jinja2==3.1.6
limits==5.6.0
Mako==1.3.10
markdown-it-py==4.0.0
MarkupSafe==3.0.3
mdurl==0.1.2
ordered-set==4.1.0
packaging==25.0
pluggy==1.6.0
psycopg2-binary==2.9.10
Pygments==2.19.2
PyJWT==2.10.1
pytest==8.4.2
pytest-order==1.3.0
python-dotenv==1.1.1
pytz==2025.2
requests==2.32.5
rich==14.1.0
six==1.17.0
SQLAlchemy==2.0.43
typing_extensions==4.15.0
urllib3==2.5.0
Werkzeug==3.1.3
wrapt==1.17.3
```
