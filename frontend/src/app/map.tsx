/**
 * Tela principal do motorista com o mapa.
 * - Orquestra sessão, entregas, localização em tempo real e rotas.
 * - Renderiza o MapView com motorista, pinos de entrega, rota e trilha percorrida.
 * - Integra o painel inferior de entregas (DeliveryPanel) e o cabeçalho (AppHeader).
 *
 * A lógica pesada foi extraída para hooks em `src/hooks` e util em `src/utils/geocoding`,
 * mantendo este arquivo como "compositor" da tela, sem alterar o comportamento original.
 *
 * BLOCO DE SIMULAÇÃO:
 * - Toda a lógica de simulação foi isolada em:
 *   - `useSimulationController` (estado da simulação)
 *   - `useSimulatedNavigation` (motor de movimento)
 *   - `SimulationFab` (UI para ligar/desligar simulação)
 * - Se no futuro você quiser usar apenas GPS/IoT real, basta NÃO chamar
 *   os métodos de simulação e/ou ignorar `simulatedLocation` aqui.
 */

import {
  View,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  Platform,
  useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, Polyline, Circle, LatLng } from "react-native-maps";
import React, { useRef, useState, useEffect, memo, useMemo } from "react";
import { Delivery } from "../types";
import AppHeader from "../components/AppHeader";
import { ToastProvider, useToast } from "../components/Toast";
import DeliveryPanel from "../components/DeliveryPanel";
import {
  updateStatusEntrega,
  EntregaStatus,
  AtualizarStatusDetails,
} from "../services/api";
import { Feather } from "@expo/vector-icons";
import { useInitialMapData } from "../hooks/useInitialMapData";
import { useDriverLocation } from "../hooks/useDriverLocation";
import { useRouteToDelivery } from "../hooks/useRouteToDelivery";
import {
  useSimulatedNavigation,
  SimulatedLocation,
} from "../hooks/useSimulatedNavigation";
import { useSimulationController } from "../hooks/useSimulationController";
import SimulationFab from "../components/SimulationFab";

import mapStyleLight from "../styles/mapStyleLight";
import mapStyleDark from "../styles/mapStyleDark";
import { ORS_API_KEY } from "../utils/geocoding";

// Imagens do app (logo e seta do motorista).
const appLogo = require("../../assets/images/lj-logo.png");
const navigationArrow = require("../../assets/images/navigation-arrow.png");

// Estilos de rota desenhada no mapa.
const ROUTE_COLOR = "#4285F4";
const ROUTE_OUTLINE_COLOR = "#68C6FC";
const ROUTE_WIDTH = 6;
const ROUTE_OUTLINE_WIDTH = ROUTE_WIDTH + 4;

// Configuração de tema do mapa
const MAP_THEME_MODE: "autoSun" | "autoSystem" | "forceLight" | "forceDark" =
  "autoSun";

// noite entre 18h e 6h
function isNightByClock(date = new Date()) {
  const h = date.getHours();
  return h >= 18 || h < 6;
}

// Define zoom/câmera baseado na velocidade.
const getSmartZoomLevel = (speedMs: number): number => {
  const speedKmh = speedMs * 3.6;
  if (speedKmh > 60) return 16.5;
  if (speedKmh > 30) return 17;
  if (speedKmh > 10) return 17.5;
  return 18;
};

// Pino personalizado de entrega.
const CustomDeliveryMarker: React.FC<{ color: string }> = ({ color }) => (
  <View style={styles.deliveryPin}>
    <Feather name="map-pin" size={32} color={color} />
    <View style={[styles.deliveryPinDot, { backgroundColor: color }]} />
  </View>
);

// Indicador fixo do motorista quando navegando.
const DriverIndicator: React.FC = memo(
  () => {
    return (
      <Image source={navigationArrow} style={styles.fixedNavigationIcon} />
    );
  },
  () => true
);

function MapScreenInner() {
  const mapRef = useRef<MapView>(null);

  // Estado da UI da tela
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null
  );
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMapCentered, setIsMapCentered] = useState(true);
  const [sheetIndex, setSheetIndex] = useState(1); // índice do BottomSheet (10%, 60%, 95%)

  // --- BLOCO: estado de alto nível da SIMULAÇÃO (independente do mapa) ---
  const simulation = useSimulationController();

  // Dados iniciais: sessão do motorista + entregas + loading.
  const {
    motorista,
    deliveriesData,
    setDeliveriesData,
    isLoading,
    handleLogout,
  } = useInitialMapData();

  // Localização em tempo real e trilha já percorrida.
  const { driverLocation, pastCoordinates } = useDriverLocation();

  // Rota entre motorista e entrega selecionada.
  const { routeCoordinates, clearRoute } = useRouteToDelivery(
    driverLocation,
    selectedDelivery
  );

  // Rota alternativa para o modo "errar" (usa ORS com preference=shortest).
  const [wrongRouteCoordinates, setWrongRouteCoordinates] = useState<LatLng[]>(
    []
  );

  useEffect(() => {
    // Se não está no modo "errar", limpa a rota alternativa
    if (!simulation.isWrongRoute) {
      setWrongRouteCoordinates([]);
      return;
    }

    if (!driverLocation || !selectedDelivery || !selectedDelivery.latitude) {
      setWrongRouteCoordinates([]);
      return;
    }

    const fetchWrongRoute = async () => {
      try {
        const startCoords = `${driverLocation.coords.longitude},${driverLocation.coords.latitude}`;
        const endCoords = `${selectedDelivery.longitude},${selectedDelivery.latitude}`;

        const response = await fetch(
          `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startCoords}&end=${endCoords}&preference=shortest`
        );
        const json = await response.json();

        if (json.features && json.features.length > 0) {
          const points = json.features[0].geometry.coordinates.map(
            (p: number[]) => ({
              latitude: p[1],
              longitude: p[0],
            })
          );
          setWrongRouteCoordinates(points);
        } else {
          console.warn("ERRO NA API DE ROTAS ALTERNATIVAS:", json);
          setWrongRouteCoordinates([]);
        }
      } catch (error) {
        console.error("ERRO AO BUSCAR ROTA ALTERNATIVA DO ORS:", error);
        setWrongRouteCoordinates([]);
      }
    };

    fetchWrongRoute();
  }, [simulation.isWrongRoute, driverLocation, selectedDelivery]);

  // Rota "ativa" que será desenhada e usada pela simulação
  const activeRouteCoordinates =
    simulation.isWrongRoute && wrongRouteCoordinates.length > 1
      ? wrongRouteCoordinates
      : routeCoordinates;

  // --- BLOCO: motor de simulação (usa apenas rota + flags de simulação) ---
  const simulationPath = useMemo(() => {
    if (!simulation.isEnabled || activeRouteCoordinates.length < 2) return [];
    return activeRouteCoordinates as LatLng[];
  }, [simulation.isEnabled, activeRouteCoordinates]);

  const simulatedLocation = useSimulatedNavigation({
    enabled: simulation.isEnabled && simulationPath.length > 1, // 👈 NÃO desliga quando pausa
    paused: simulation.isPaused, // 👈 pausa só o avanço interno, sem resetar progresso
    path: simulationPath,
  });

  // Guarda a última posição simulada para usar quando PAUSAR
  const [frozenSimLocation, setFrozenSimLocation] =
    useState<SimulatedLocation | null>(null);

  useEffect(() => {
    if (simulatedLocation) {
      setFrozenSimLocation(simulatedLocation);
    }
  }, [simulatedLocation]);

  // Quando simulação é encerrada, limpamos a posição congelada
  useEffect(() => {
    if (!simulation.isEnabled) {
      setFrozenSimLocation(null);
    }
  }, [simulation.isEnabled]);

  // Localização base:
  // - Se simulação estiver ligada:
  //    - usa posição em movimento OU congelada do simulador
  //    - fallback para driverLocation se não tiver nenhuma
  // - Se simulação estiver desligada:
  //    - usa sempre driverLocation (GPS/IoT)
  const baseLocation = simulation.isEnabled
    ? simulatedLocation ?? frozenSimLocation ?? driverLocation
    : driverLocation;

  // Localização efetiva (após aplicar qualquer "erro de rota").
  // Agora NÃO aplicamos mais offset perpendicular, justamente
  // para não deixar o carro "no meio do quarteirão".
  // O "erro" é representado pela rota alternativa (activeRouteCoordinates).
  const effectiveLocation = baseLocation ?? driverLocation ?? null;

  const { showToast } = useToast();

  // Região inicial do mapa (Campinas).
  const initialRegion = {
    latitude: -22.9056,
    longitude: -47.0608,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  // Atualiza câmera conforme modo de navegação/posicionamento.
  useEffect(() => {
    if (effectiveLocation && mapRef.current && isMapCentered) {
      const currentZoom = getSmartZoomLevel(
        effectiveLocation.coords.speed || 0
      );
      const cameraSettings = {
        center: effectiveLocation.coords,
        heading: isNavigating ? effectiveLocation.coords.heading || 0 : 0,
        pitch: 0, // 2D sempre
        zoom: isNavigating ? currentZoom : 16,
      };
      mapRef.current.animateCamera(cameraSettings, { duration: 400 });
    }
  }, [isNavigating, effectiveLocation, isMapCentered]);

  // Seleção/deseleção de entrega com ajuste de câmera.
  function handleDeliveryPress(delivery: Delivery) {
    // Navegação (seguir carro) e simulação são independentes,
    // mas ao trocar de entrega desligamos o "seguir carro".
    setIsNavigating(false);

    if (selectedDelivery?.id === delivery.id) {
      setSelectedDelivery(null);
      clearRoute();
      setIsMapCentered(false);
    } else {
      setSelectedDelivery(delivery);
      setIsMapCentered(false);

      const fromCoord =
        effectiveLocation?.coords ?? driverLocation?.coords ?? null;

      if (mapRef.current && fromCoord && delivery.latitude) {
        mapRef.current.fitToCoordinates(
          [
            fromCoord,
            { latitude: delivery.latitude, longitude: delivery.longitude! },
          ],
          {
            edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
            animated: true,
          }
        );
      }
    }
  }

  // Auxiliar para mapa usar mensagens diferentes por status.
  const getToastForStatus = (status: EntregaStatus) => {
    switch (status) {
      case "em_rota":
        return {
          type: "info" as const,
          title: "Entrega iniciada",
        };
      case "entregue":
        return {
          type: "success" as const,
          title: "Entrega concluída",
        };
      case "cancelada":
        return {
          type: "warning" as const,
          title: "Entrega cancelada",
        };
      case "nao_entregue":
        return {
          type: "warning" as const,
          title: "Entrega não realizada",
        };
      default:
        return {
          type: "info" as const,
          title: "Status atualizado",
        };
    }
  };

  // Atualiza status de entrega com integração de API e UI.
  async function handleUpdateStatus(
    deliveryId: string,
    newStatus: EntregaStatus,
    details: AtualizarStatusDetails
  ) {
    try {
      if (newStatus === "em_rota") {
        const outraEmRota = deliveriesData.find(
          (d) => d.status === "em_rota" && d.id !== deliveryId
        );
        if (outraEmRota) {
          Alert.alert(
            "Entrega em andamento",
            "Você já possui uma entrega em rota. Finalize ou cancele antes de iniciar outra."
          );
          return;
        }
      }

      const detailsToSend: AtualizarStatusDetails = {
        ...(details as any),
      };

      await updateStatusEntrega(deliveryId, newStatus, detailsToSend);

      const updatedDeliveries = deliveriesData.map((d) => {
        if (d.id !== deliveryId) return d;

        const patch: Partial<Delivery> = {};

        if (
          newStatus === "entregue" &&
          "nome_recebido" in (detailsToSend as any)
        ) {
          patch.nome_recebido = (detailsToSend as any).nome_recebido ?? null;
        }

        if (
          (newStatus === "cancelada" || newStatus === "nao_entregue") &&
          "motivo" in (detailsToSend as any)
        ) {
          patch.motivo = (detailsToSend as any).motivo ?? null;
        }

        return { ...d, status: newStatus, ...patch };
      });

      setDeliveriesData(updatedDeliveries);

      const toastConfig = getToastForStatus(newStatus);
      showToast(toastConfig);

      // se entrou em rota, garante navegação e entrega selecionada
      if (newStatus === "em_rota") {
        const startedDelivery = updatedDeliveries.find(
          (d) => d.id === deliveryId
        );
        setSelectedDelivery(startedDelivery || null);
        setIsNavigating(true);
        setIsMapCentered(true);
      }

      if (selectedDelivery?.id === deliveryId) {
        if (["entregue", "cancelada", "nao_entregue"].includes(newStatus)) {
          clearRoute();
          const proximaEntrega = updatedDeliveries.find(
            (d) => d.status === "pendente"
          );
          setSelectedDelivery(proximaEntrega || null);
          setIsNavigating(false);
        }
      }
    } catch (error: any) {
      console.error(
        "Erro ao atualizar status:",
        error.response?.data || error.message
      );
      showToast({
        type: "error",
        title: "Erro ao atualizar",
        message:
          "Não foi possível atualizar o status. Tente novamente em instantes.",
      });
    }
  }

  // Início da navegação: habilita modo "carro central" e câmera seguindo.
  function handleStartNavigation() {
    if (selectedDelivery && effectiveLocation && mapRef.current) {
      setIsNavigating(true);
      setIsMapCentered(true);
    }
  }

  // Recentraliza o mapa na posição atual do motorista.
  const handleCenterMap = () => {
    if (effectiveLocation && mapRef.current) {
      setIsMapCentered(true);
    }
  };

  // Ícone do botão de recentralizar.
  const centerIconName = isNavigating ? "navigation" : "compass";

  const colorScheme = useColorScheme();

  const isNightTheme = useMemo(() => {
    switch (MAP_THEME_MODE) {
      case "forceDark":
        return true;
      case "forceLight":
        return false;
      case "autoSystem":
        return colorScheme === "dark";
      case "autoSun":
      default:
        return isNightByClock();
    }
  }, [colorScheme]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#21222D" />

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onPanDrag={() => {}}
        onRegionChangeComplete={(region, details) => {
          if (isMapCentered) {
            if (details && details.isGesture) {
              setIsMapCentered(false);
            }
          }
        }}
        rotateEnabled
        pitchEnabled={false}
        showsCompass={false}
        toolbarEnabled={false}
        customMapStyle={isNightTheme ? mapStyleDark : mapStyleLight}
      >
        {/* Pinos das entregas ativas */}
        {deliveriesData
          .filter((d) => {
            const hasCoordinates =
              typeof d.latitude === "number" && typeof d.longitude === "number";
            const isActive =
              d.status !== "cancelada" && d.status !== "entregue";
            return hasCoordinates && isActive;
          })
          .map((d) => {
            const color = selectedDelivery?.id === d.id ? "#34A853" : "#EA4335";
            return (
              <Marker
                key={`delivery-${d.id}`}
                coordinate={{ latitude: d.latitude!, longitude: d.longitude! }}
                onPress={() => handleDeliveryPress(d)}
                anchor={{ x: 0.5, y: 1 }}
              >
                <CustomDeliveryMarker color={color} />
              </Marker>
            );
          })}

        {/* Trilho de coordenadas já percorridas */}
        {pastCoordinates.length > 0 && (
          <Polyline
            coordinates={pastCoordinates}
            strokeColor="#AAAAAA"
            strokeWidth={3}
            lineDashPattern={[10, 10]}
            zIndex={0}
          />
        )}

        {/* Rota entre motorista e entrega selecionada (rota ativa: normal ou alternativa) */}
        {activeRouteCoordinates.length > 0 && selectedDelivery && (
          <>
            <Polyline
              coordinates={activeRouteCoordinates}
              strokeColor={ROUTE_OUTLINE_COLOR}
              strokeWidth={ROUTE_OUTLINE_WIDTH}
              zIndex={1}
            />
            <Polyline
              coordinates={activeRouteCoordinates}
              strokeColor={ROUTE_COLOR}
              strokeWidth={ROUTE_WIDTH}
              zIndex={2}
            />
          </>
        )}

        {/* Motorista (não navegando): ponto azul com círculo de precisão */}
        {effectiveLocation && !isNavigating && (
          <>
            <Circle
              center={effectiveLocation.coords}
              radius={effectiveLocation.coords.accuracy || 20}
              strokeWidth={1}
              strokeColor="rgba(26, 115, 232, 0.5)"
              fillColor="rgba(26, 115, 232, 0.1)"
              zIndex={1}
            />
            <Marker
              coordinate={effectiveLocation.coords}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={3}
              rotation={0} // ponteiro sempre para cima fora da navegação
            >
              <Image
                source={navigationArrow}
                style={styles.mapNavigationIcon}
              />
            </Marker>
          </>
        )}
      </MapView>

      {/* Indicador fixo quando navegando + mapa centrado */}
      {effectiveLocation && isNavigating && isMapCentered && (
        <DriverIndicator />
      )}

      <AppHeader logoSource={appLogo} onLogout={handleLogout} />

      {!isMapCentered && (
        <TouchableOpacity style={styles.centerButton} onPress={handleCenterMap}>
          <Feather name={centerIconName} size={24} color="#5F6368" />
        </TouchableOpacity>
      )}

      {/* Painel de entregas (BottomSheet) */}
      <DeliveryPanel
        deliveriesData={deliveriesData}
        selectedDelivery={selectedDelivery}
        onDeliveryPress={handleDeliveryPress}
        onUpdateStatus={handleUpdateStatus}
        onLogout={handleLogout}
        onStartNavigation={handleStartNavigation}
        isLoadingList={isLoading}
        onSheetIndexChange={setSheetIndex}
      />

      {/* FAB de simulação – agora aparece APENAS quando o sheet está no índice 0 (lista toda embaixo) */}
      <SimulationFab
        mode={simulation.mode}
        isPaused={simulation.isPaused}
        isWrongRoute={simulation.isWrongRoute}
        visible={sheetIndex === 0}
        onStart={simulation.start}
        onPause={simulation.pause}
        onResume={simulation.resume}
        onStop={simulation.stop}
        onToggleWrongRoute={simulation.toggleWrongRoute}
        isNightTheme={isNightTheme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  fixedNavigationIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 25,
    height: 25,
    marginLeft: -12.5,
    marginTop: -12.5,
    zIndex: 100,
  },

  mapNavigationIcon: {
    width: 20,
    height: 20,
  },

  centerButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.85)" : "white",
    borderRadius: 30,
    padding: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === "ios" ? 0.15 : 0.25,
    shadowRadius: 3.84,
  },

  deliveryPin: {
    justifyContent: "center",
    alignItems: "center",
    width: 35,
    height: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },

  deliveryPinDot: {
    position: "absolute",
    top: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
});

// Wrapper exportando com ToastProvider
export default function MapScreen() {
  return (
    <ToastProvider>
      <MapScreenInner />
    </ToastProvider>
  );
}
