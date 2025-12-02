# 🚚 Localiza-Já – Frontend (Aplicativo do Motorista)
Aplicativo mobile desenvolvido em **React Native (Expo)** para rastreamento de entregas em tempo real.  
Ele integra **GPS real**, **IoT embarcado (ESP32 + GPS)** e **Simulador de rota**, oferecendo uma experiência semelhante a apps profissionais como Google Maps, Loggi, 99Entrega e iFood Entregador.

O projeto foi criado com foco em:
- **Escalabilidade**,  
- **Arquitetura limpa e modular**,  
- **Demonstração profissional**,  
- **Alta fidelidade visual ao comportamento de navegação real**.

---

# 📱 Funcionalidades principais

### ✔ Login do motorista (CNH + Placa)  
Com animações suaves utilizando **react-native-reanimated**.

### ✔ Mapa em tempo real  
- Marcador do motorista com **orientação (heading)** dinâmica.  
- Estilo **light/dark** automático ou manual.  
- Rota até a entrega (com cálculo e recálculo).  
- Trilho de coordenadas percorridas.

### ✔ Três fontes de localização
1. **GPS real do celular**  
2. **IoT (ESP32 + GPS)** consumindo `/localizacoes/motorista/:id`  
3. **Simulação completa**, com:
   - Velocidade real,
   - Cálculo automático de heading,
   - Modo “errar rota”,
   - Rota alternativa,
   - Controle via FAB animado.

### ✔ Painel inferior de entregas (Bottom Sheet)
- Lista de entregas do dia com skeletons.  
- Status: pendente, em rota, entregue, não entregue, cancelada.  
- Ações automáticas de negócio (ex.: apenas uma entrega em rota).

### ✔ Prova de entrega com foto  
- Captura pela câmera ou galeria.  
- Conversão para Base64 automaticamente.  
- Enviada junto com:
  - status,
  - nome de quem recebeu,
  - motivo de não entrega,
  - coordenadas da entrega.

### ✔ Alerts e Toasts personalizados  
Sistema próprio visualmente consistente:
- `CustomAlert` → janelas modais  
- `Toast` → avisos não intrusivos (sucesso, warning, erro)

---

# 🧱 Arquitetura do Projeto

A organização segue o padrão **“feature → domínio → camada”**, garantindo separação entre:

- **UI** (componentes)  
- **Estado e lógica** (hooks)  
- **Serviços externos** (API)  
- **Utilidades** (helpers, geocodificação, conversões)

## 📦 Estrutura de Pastas do Frontend

```text
frontend/
├── src/
│   ├── app/
│   │   ├── index.tsx                 # Tela de login
│   │   └── map.tsx                   # Tela principal com o mapa
│   │
│   ├── components/
│   │   ├── AppHeader.tsx
│   │   ├── DeliveryPanel.tsx
│   │   ├── DeliveriesList.tsx
│   │   ├── DeliveryListItem.tsx
│   │   ├── DeliveryNotDelivered.tsx
│   │   ├── ConfirmationModal.tsx
│   │   ├── ConfirmationActionModal.tsx
│   │   ├── SimulationFab.tsx
│   │   ├── CustomAlert.tsx
│   │   ├── Toast.tsx
│   │   ├── CustomDropdown.tsx
│   │   ├── InputField.tsx
│   │   └── ShimmerBlock.tsx
│   │
│   ├── hooks/
│   │   ├── useMapScreen.ts
│   │   ├── useInitialMapData.ts
│   │   ├── useDriverLocation.ts
│   │   ├── useIotLocation.ts
│   │   ├── useSimulatedNavigation.ts
│   │   ├── useRouteToDelivery.ts
│   │   ├── useRecalculatedCorrectRoute.ts
│   │   ├── useSimulationController.ts
│   │   ├── useWrongRoute.ts
│   │   └── useDeliveryStatusActions.ts
│   │
│   ├── services/
│   │   ├── api.ts
│   │   └── deliveries.ts
│   │
│   ├── utils/
│   │   ├── geocoding.ts
│   │   └── pickProofPhotoBase64.ts
│   │
│   ├── styles/
│   │   ├── mapStyleLight.ts
│   │   ├── mapStyleDark.ts
│   │   └── theme.ts
│   │
│   └── types.ts                     # Modelos de domínio
│
└── package.json
```



---

# 🔧 Descrição técnica das principais partes

## 1. Autenticação & Sessão (Tela `index.tsx`)
- Login por **CNH e placa**.  
- Animações suaves com `react-native-reanimated`.  
- Token JWT salvo em `AsyncStorage` (`@user_token`).  
- Navegação automática para `/map` via Expo Router.

---

## 2. Tela de Mapa (`map.tsx`)
É o **compositor** da interface – a UI principal do motorista.

Renderiza:
- `MapView`
- `AppHeader`
- `SimulationFab`
- `DeliveryPanel`
- `ToastProvider`
- `CustomAlertProvider`

Toda a lógica pesada fica abstraída no hook **`useMapScreen`**.

---

## 3. Hook principal: `useMapScreen`

Centraliza:

### 🔹 Sessão do motorista
`useInitialMapData`

### 🔹 Lista de entregas
`deliveries.ts`

### 🔹 Fonte de localização ativa
- **GPS real** → `useDriverLocation`
- **IoT embarcado** → `useIotLocation`
- **Simulação** → `useSimulatedNavigation`

### 🔹 Rotas
- Rota principal → `useRouteToDelivery`
- Recalcular rota correta → `useRecalculatedCorrectRoute`
- Desvio (“errar rota”) → `useWrongRoute`

### 🔹 Regras de negócio de entrega
`useDeliveryStatusActions`

Ex.:  
> Apenas uma entrega pode estar “em rota” por vez.

### 🔹 Integração com mapa
- trilha (`pastCoordinates`)
- rota (`displayedRouteCoordinates`)
- posição do motorista (`realLocation` ou `simulatedLocation`)

---

## 4. Fontes de Localização

### 📍 4.1 GPS real (`useDriverLocation`)
- Alta precisão  
- Heading real do dispositivo  
- Lista de coordenadas → trilha  
- Alertas de permissão negada  

---

### 📡 4.2 IoT via backend (`useIotLocation`)
Recebe coordenadas enviadas pelo **ESP32 + GPS** para o backend.

- GET periódico `/localizacoes/motorista/:id`
- Armazena o último ponto
- Calcula:
  - **heading** real via fórmula de bearing
  - **speed** via distância / tempo (Haversine)
- Retorna um `LocationObject` compatível com Expo

---

### 🎮 4.3 Simulação (`useSimulatedNavigation`)
Simula o movimento do motorista:

- bate ponto a ponto pela rota  
- calcula heading e velocidade  
- permite:
  - iniciar  
  - pausar/retomar  
  - errar rota  
  - encerrar  

Controlado via **`SimulationFab`** com animações suaves.

---

## 5. Painel de Entregas (`DeliveryPanel`)
Bottom sheet completo contendo:

- lista de entregas
- skeletons de carregamento (`ShimmerBlock`)
- integração com status da entrega
- sincronização com a UI (aparecimento/desaparecimento do topo)

Renderiza `DeliveriesList`, que usa `DeliveryListItem` para cada entrega.

---

## 6. Prova de Entrega (Foto)

### `ConfirmationModal.tsx`
Modal para finalizar entrega:

- entregue → nome + foto  
- não entregue → motivo + foto  

### `pickProofPhotoBase64.ts`
Cuida de:

- abrir câmera,
- abrir galeria,
- permissões,
- conversão para base64,
- retorno formatado para o backend.

---

## 7. Alerts e Toasts Personalizados

### `CustomAlert.tsx`
- modal estilizado
- botões customizados
- usado em validações e erros importantes

### `Toast.tsx`
- toasts animados
- 4 tipos: success, warning, error, info
- barra animada com LinearGradient

---

## 8. Comunicação com o Backend (`api.ts`)
Integração com o backend Flask:

- Axios configurado com baseURL  
- Timeout de 15s  
- Interceptor adiciona token automaticamente  

Principais operações:
- login  
- sessão  
- lista de entregas  
- atualizar status (entrega, não entrega, cancelada)  
- buscar localizações do IoT  

---

# 🗺 Geocodificação e Rotas
### `geocoding.ts`
- Mapa de endereços → coordenadas (mock)  
- Fallback usando **OpenRouteService (ORS)** via `ORS_API_KEY`

### Hooks:
- `useRouteToDelivery`  
- `useRecalculatedCorrectRoute`


## 🧭 Fonte de localização e prioridade (GPS, IoT e Simulação)

A tela do mapa trabalha sempre com **uma única posição “oficial” do motorista**, mas essa posição pode vir de três fontes diferentes, com a seguinte prioridade:

1. **Simulação de rota** (quando o simulador está ligado)
2. **IoT (ESP32 + GPS do veículo)** — misturando dados do IoT com dados do celular
3. **GPS do celular** (quando IoT está desligado ou indisponível)

O comportamento é:

### 1. Quando a simulação está ATIVA
- A localização exibida no mapa vem de `useSimulatedNavigation`.
- Tanto o **GPS do celular** quanto o **IoT** são ignorados para desenhar o ponteiro.
- É o cenário usado para **apresentações e testes controlados**.

### 2. Quando a simulação está DESLIGADA e o IoT está ATIVO (`iotActive = true`)
- O app passa a usar a localização vinda do **IoT** para a posição do motorista:
  - **latitude / longitude** → IoT (`useIotLocation`)
- E combina isso com as informações de movimento do **celular**:
  - **heading (direção)** e **speed (velocidade)** → GPS do celular (`useDriverLocation`)
- Ou seja:
  - *“onde o veículo está”* vem do hardware embarcado (ESP32 + GPS),
  - *“como o ponteiro gira e se move”* usa os dados de movimento do smartphone.
- Isso deixa a experiência visual mais fluida e parecida com um app de navegação real, mesmo usando coordenadas IoT que chegam em intervalos maiores.

### 3. Quando a simulação está DESLIGADA e o IoT está DESATIVADO (`iotActive = false`)
- Toda a localização vem apenas do **GPS do celular**:
  - latitude, longitude, heading e speed são lidos em tempo real por `useDriverLocation`.
- É o modo **100% smartphone**, sem depender do dispositivo IoT.

Em resumo:

- **Simulador ligado** → fonte única é a simulação.  
- **Simulador desligado + IoT ligado** → posição = IoT, movimento = celular.  
- **Simulador desligado + IoT desligado** → tudo vem do GPS do celular.


---


# ▶ Como Rodar o Frontend

> ⚠️ É necessário que o **backend esteja rodando** antes do app.

---

## 1. Subir o Backend (Flask)

```powershell
PS C:\dev\Localiza-Ja> cd .\backend\        
PS C:\dev\Localiza-Ja\backend> venv\Scripts\activate
(venv) PS> flask --app main seed-db

(venv) PS> python main.py
```

Saída esperada:

```powershell
Backend em: http://192.168.X.X:5000 (LAN) | http://127.0.0.1:5000 (localhost)
```

Certifique-se de que o baseURL do Axios aponta para o IP local correto.

---

## 2. Subir o Front (Expo)

```powershell
PS C:\dev\Localiza-Ja> cd .\frontend\
PS C:\dev\Localiza-Ja\frontend> npx expo start --clear
```

- Abra o app Expo Go no Android
- Escaneie o QR Code
- Faça login com CNH/placa cadastradas