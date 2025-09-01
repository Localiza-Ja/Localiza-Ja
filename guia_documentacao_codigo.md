# Guia de Padrões de Documentação de Código

Este documento define o padrão oficial para a criação de comentários e documentação no código-fonte do projeto. O objetivo é garantir que o código seja claro, legível e de fácil manutenção para todos os membros da equipe.

## Princípios Gerais

Estas diretrizes aplicam-se a todas as tecnologias do projeto.

### 1. Linguagem

Todos os comentários e documentações devem ser escritos em **Português**.

### 2. Marcadores de Atenção (Action Tags)

Utilize marcadores padronizados para sinalizar pontos que exigem atenção.

- **TODO**: Descreve uma funcionalidade futura ou uma tarefa pendente.  
  Exemplo: `// TODO: Adicionar paginação na lista de sensores.`

- **FIXME**: Indica um problema ou bug conhecido que precisa ser corrigido.  
  Exemplo: `# FIXME: A validação de e-mail não está a tratar domínios de topo longos.`

- **NOTE**: Fornece uma observação importante sobre uma lógica de negócio ou implementação específica.  
  Exemplo: `// NOTE: Este cálculo de média é temporário até a API ser atualizada.`

## Conventional Commits

O **Conventional Commits** é uma convenção para estruturar mensagens de commit de forma clara, legível e consistente, facilitando a manutenção do histórico de mudanças e a automação de processos como geração de changelogs e versionamento semântico (SemVer). A convenção define uma estrutura para mensagens de commit que comunicam a intenção das alterações de forma compreensível para humanos e ferramentas automatizadas.

### Estrutura do Commit

As mensagens de commit devem seguir o formato:

```
<tipo>[escopo opcional]: <descrição>

[corpo opcional]

[rodapé(s) opcional(is)]
```

- **Tipo**: Indica o tipo de alteração realizada. Os tipos suportados são:

  - **feat**: Introduz uma nova funcionalidade (correlaciona-se com `MINOR` no SemVer).
  - **fix**: Corrige um bug (correlaciona-se com `PATCH` no SemVer).
  - **docs**: Alterações na documentação, como README ou arquivos de API.
  - **style**: Mudanças de formatação ou estilo (ex.: lint, indentação, remoção de comentários).
  - **refactor**: Refatoração de código sem alterar comportamento.
  - **perf**: Melhorias de desempenho.
  - **test**: Adição ou modificação de testes.
  - **chore**: Tarefas que não afetam o código-fonte ou testes (ex.: atualização de dependências, .gitignore).
  - **ci**: Alterações em configurações de CI/CD (ex.: GitHub Actions, GitLab CI).
  - **revert**: Reversão de um commit anterior.

- **Escopo (opcional)**: Contexto da alteração, como o módulo ou componente afetado (ex.: `frontend`, `api`, `database`). Útil em repositórios monorepo para diferenciar áreas como front-end ou back-end. Exemplo: `feat(frontend): adicionar tela de login`.

- **Descrição**: Resumo curto e claro da alteração, começando com verbo no infinitivo (ex.: `adicionar`, `corrigir`). Deve ser concisa, idealmente com até 50-72 caracteres.

- **Corpo (opcional)**: Fornece detalhes adicionais sobre a alteração, como motivação, links para issues ou mudanças em pacotes. Não há limite de caracteres.

- **Rodapé (opcional)**: Inclui informações adicionais, como:
  - **BREAKING CHANGE**: Indica uma mudança que quebra a compatibilidade (correlaciona-se com `MAJOR` no SemVer). Exemplo: `BREAKING CHANGE: remover suporte à API v1`.
  - Referências a issues (ex.: `Refs: #123`) ou fechamento automático de issues (ex.: `Closes: #123`, se suportado pelo repositório remoto).
  - Outros metadados, como `Reviewed-by: Nome`.

**Nota**: Se um rodapé for incluído, o corpo do commit é obrigatório. A palavra `BREAKING CHANGE` deve ser escrita em letras maiúsculas.

### Indicador de Breaking Change

Mudanças que quebram compatibilidade podem ser sinalizadas de duas formas:

- **No rodapé**: `BREAKING CHANGE: <descrição>`.
- **No tipo/escopo**: Adicionando `!` antes do `:` (ex.: `feat(api)!: alterar formato de resposta`). Nesse caso, a descrição do commit deve explicar a mudança que quebra compatibilidade, e o rodapé `BREAKING CHANGE` pode ser omitido.

### Exemplos

1. **Novo recurso com escopo**:

   ```
   feat(api): adicionar endpoint para listagem de sensores

   Implementa o endpoint GET /sensor_api para recuperar todos os sensores.
   Inclui validação de parâmetros via reqparse.

   Refs: #45
   ```

2. **Correção de bug**:

   ```
   fix: corrigir validação de UUID em /sensor_api/<id>

   Ajusta a validação para aceitar apenas UUIDs válidos, retornando erro 400 em caso de falha.
   ```

3. **Mudança com breaking change**:

   ```
   feat(api)!: alterar formato de resposta do endpoint /sensor_api

   O endpoint agora retorna 'Sensor' em vez de 'sensors' como chave principal.

   BREAKING CHANGE: clientes devem atualizar a chave usada na integração.
   ```

4. **Documentação**:

   ```
   docs: atualizar README com instruções de instalação
   ```

5. **Estilização**:

   ```
   style: ajustar indentação em routes.py

   Aplica regras de lint para padronizar espaços e quebras de linha.
   ```

6. **Refatoração**:

   ```
   refactor(api): reorganizar classes SensorList e SensorDetail

   Separa lógica de listagem e detalhe de sensores para maior clareza.
   ```

7. **Melhoria de desempenho**:

   ```
   perf: otimizar consulta ao banco em /sensor_api

   Adiciona índice ao campo 'tipo' na tabela sensor para consultas mais rápidas.
   ```

8. **Testes**:

   ```
   test: adicionar testes unitários para validação de UUID

   Inclui cenários de teste para entradas válidas e inválidas no endpoint /sensor_api/<id>.
   ```

9. **Tarefa de manutenção**:

   ```
   chore: atualizar dependências no requirements.txt

   Atualiza Flask para versão 3.1.2 e Flask-RESTful para 0.3.10.
   ```

10. **Configuração de CI/CD**:

    ```
    ci: configurar GitHub Actions para testes automáticos

    Adiciona workflow para rodar testes unitários em cada push.
    ```

11. **Reversão**:

    ```
    revert: desfazer adição de endpoint /sensor_api

    Reverte o commit que adicionou o endpoint devido a problemas de performance.

    Refs: 676104e
    ```

### Diretrizes

- **Tipos**: Use `feat` para novas funcionalidades, `fix` para correções de bugs, e outros tipos (`docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`) conforme apropriado.
- **Escopo**: Deve ser um substantivo que descreve a seção do código afetada (ex.: `api`, `frontend`, `database`).
- **Descrição**: Deve ser clara, concisa e começar com um verbo no infinitivo.
- **Corpo e Rodapé**: Use para fornecer contexto adicional ou metadados, como referências a issues ou breaking changes.
- **Tamanho**: A descrição deve ter até 72 caracteres. O corpo não tem limite.
- **Case Sensitivity**: Tipos e escopos não são sensíveis a maiúsculas/minúsculas, exceto `BREAKING CHANGE`, que deve ser em maiúsculas.
- **Múltiplos Commits**: Se uma alteração abrange mais de um tipo, divida em commits separados para maior clareza.
- **Reversão**: Use o tipo `revert` com um rodapé `Refs` indicando o SHA do commit revertido.
- **Breaking Changes**: Indique com `!` no tipo/escopo ou `BREAKING CHANGE:` no rodapé.

### Observações

- **Fase Inicial**: Mesmo em fases iniciais, use Conventional Commits para manter o histórico organizado.
- **Ferramentas**: Ferramentas como Commitlint podem validar mensagens de commit. Em fluxos de squash, mantenedores podem ajustar mensagens durante o merge.
- **Erros de Tipo**: Se um tipo errado for usado (ex.: `feet` em vez de `feat`), ferramentas baseadas na especificação podem ignorar o commit, mas não há impacto crítico.

## Padrões por Tecnologia

### 🟦 React Native (JavaScript / TypeScript)

#### Como Deve Ser Feito

Adotaremos o padrão **JSDoc** para garantir a documentação automática e o auxílio do IntelliSense nas IDEs.

- **Componentes**: O cabeçalho deve documentar a finalidade do componente, suas props com `@param`, o que ele retorna com `@returns` e um exemplo de uso prático.
- **Funções e Hooks**: Toda função deve ter uma descrição clara, documentando seus parâmetros (`@param`) e o valor de retorno (`@returns`).

#### Exemplo Prático

```javascript
/**
 * Renderiza um cartão de exibição para os dados climáticos de uma cidade.
 *
 * @component
 * @author  Ana Sousa
 * @date    30/08/2025
 *
 * @param {object} props - As propriedades do componente.
 * @param {string} props.cidade - Nome da cidade a ser exibida.
 * @param {number} props.temperatura - Temperatura atual em graus Celsius.
 * @param {string} props.icone - Identificador do ícone de clima (ex: 'sunny', 'rainy').
 * @returns {JSX.Element} O elemento JSX do cartão de clima.
 *
 * @example
 * // Exemplo de como usar o componente
 * <CardClima cidade="Lisboa" temperatura={25} icone="sunny" />
 */
const CardClima = ({ cidade, temperatura, icone }) => {
  // ... lógica de renderização
  return (
    <div>
      {/* NOTE: O ícone será implementado no próximo sprint */}
      <h1>{cidade}</h1>
      <p>{temperatura}°C</p>
    </div>
  );
};
```

---

### 🐍 Flask API (Python)

#### Como Deve Ser Feito

Utilizaremos o formato de **docstring do Google Python Style Guide**, que é estruturado e compatível com ferramentas de geração de documentação.

- **Módulos**: Todo ficheiro `.py` deve iniciar com uma docstring que descreve sua finalidade geral.
- **Endpoints e Funções**: A docstring deve ter um resumo, seguido por seções detalhadas para **Args** (argumentos) e **Returns** (retornos).

#### Exemplo Prático

```python
"""
Módulo: api_sensores.py
Descrição: Define os endpoints da API para receber e consultar dados de sensores.
Autor: Rui Costa
Data: 30/08/2025
"""

from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/api/clima", methods=["POST"])
def receber_dados_clima():
    """
    Recebe e armazena dados climáticos enviados por um dispositivo IoT.

    O corpo da requisição deve ser um JSON contendo o ID do dispositivo,
    a temperatura e a humidade.

    Args:
        JSON Body:
            deviceId (str): O identificador único do dispositivo.
            temperatura (float): A temperatura medida em graus Celsius.
            humidade (float): A humidade relativa em percentagem.

    Returns:
        Response: JSON com mensagem de sucesso e status 201 (Created).
        Response: JSON com mensagem de erro e status 400 (Bad Request)
                  se os dados forem inválidos ou estiverem em falta.
    """
    # FIXME: Adicionar validação de schema para o JSON recebido.
    dados = request.get_json()
    if not dados or "deviceId" not in dados:
        return jsonify({"erro": "Dados inválidos"}), 400

    # TODO: Implementar a lógica para guardar os dados na base de dados.
    print(f"Dados recebidos de {dados['deviceId']}: {dados}")

    return jsonify({"mensagem": "Dados recebidos com sucesso"}), 201
```

---

### 🔌 ESP32 (C++ / Arduino)

#### Como Deve Ser Feito

A documentação em código embarcado é crucial para a replicação e manutenção. O cabeçalho do ficheiro principal é obrigatório.

- **Cabeçalho Detalhado**: O ficheiro `.ino` principal deve conter um bloco de comentário no topo com:

  - Projeto
  - Descrição
  - Hardware Utilizado
  - Mapeamento de Pinos
  - Bibliotecas Externas

- **Funções**: Use o estilo **Doxygen** (`@brief`, `@param`, `@return`) para documentar o propósito de cada função.

#### Exemplo Prático

```cpp
/**
 * =====================================================================
 * @file    EstacaoClimatica.ino
 * @brief   Firmware para uma estação climática com ESP32.
 *
 * @project Estação Climática IoT
 * @author  Mariana Ferreira
 * @date    30/08/2025
 * @version 1.0
 *
 * @hardware
 * - Placa: ESP32 DEVKIT V1
 * - Sensor: DHT22 (Temperatura e Humidade)
 *
 * @pinout
 * - Pino de dados do DHT22 -> GPIO 4
 * - LED de status WiFi -> GPIO 2
 *
 * @libraries
 * - WiFi.h
 * - DHT.h (da Adafruit)
 * - ArduinoJson.h
 * =====================================================================
 */

#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

/**
 * @brief Inicializa as configurações do microcontrolador.
 *
 * Configura a comunicação serial, inicializa o sensor DHT
 * e conecta à rede WiFi.
 */
void setup() {
  Serial.begin(115200);
  dht.begin();
  // TODO: Implementar a lógica de conexão WiFi com reconexão automática.
}

/**
 * @brief Lê o valor da humidade do sensor DHT22.
 *
 * @return A humidade relativa em percentagem (float).
 * Retorna -1.0 em caso de falha na leitura.
 */
float lerHumidade() {
  float humidade = dht.readHumidity();
  if (isnan(humidade)) {
    Serial.println("Erro ao ler a humidade do sensor DHT!");
    return -1.0;
  }
  return humidade;
}

void loop() {
  // ...
}
```
