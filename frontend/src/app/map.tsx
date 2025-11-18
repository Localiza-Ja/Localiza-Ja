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
import React, {
  useRef,
  useState,
  useEffect,
  memo,
  useMemo,
  useCallback,
} from "react";
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
import { useWrongRoute } from "../hooks/useWrongRoute";
import { useRecalculatedCorrectRoute } from "../hooks/useRecalculatedCorrectRoute";

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

  // Ponto onde o motorista estava quando clicou em "Errar"
  const [wrongRouteOrigin, setWrongRouteOrigin] = useState<LatLng | null>(null);

  // Rota entre motorista e entrega selecionada (rota CORRETA vinda da API principal).
  const { routeCoordinates, clearRoute } = useRouteToDelivery(
    driverLocation,
    selectedDelivery
  );

  // Rota ERRADA para o modo "errar" (apenas para o ponteiro).
  const wrongRouteCoordinates = useWrongRoute({
    isWrongRoute: simulation.isWrongRoute,
    origin: wrongRouteOrigin,
  });

  // --- BLOCO: motor de simulação (usa apenas rota + flags de simulação) ---
  const [frozenSimLocation, setFrozenSimLocation] =
    useState<SimulatedLocation | null>(null);

  // Rota correta recalculada que será usada como "oficial" depois de errar
  const [savedCorrectPathAfterError, setSavedCorrectPathAfterError] = useState<
    LatLng[] | null
  >(null);

  const simulationPath = useMemo(() => {
    if (!simulation.isEnabled) return [];

    // 1) Modo ERRAR → segue rota errada fixa se existir
    if (simulation.isWrongRoute && wrongRouteCoordinates.length > 1) {
      return wrongRouteCoordinates as LatLng[];
    }

    // 2) Saiu do ERRAR → se temos rota correta recalculada salva, usa ela
    if (
      !simulation.isWrongRoute &&
      savedCorrectPathAfterError &&
      savedCorrectPathAfterError.length > 1
    ) {
      return savedCorrectPathAfterError as LatLng[];
    }

    // 3) Caso padrão → usa rota correta original da API principal
    if (routeCoordinates.length > 1) {
      return routeCoordinates as LatLng[];
    }

    return [];
  }, [
    simulation.isEnabled,
    simulation.isWrongRoute,
    wrongRouteCoordinates,
    savedCorrectPathAfterError,
    routeCoordinates,
  ]);

  const simulatedLocation = useSimulatedNavigation({
    enabled: simulation.isEnabled && simulationPath.length > 1,
    paused: simulation.isPaused,
    path: simulationPath,
  });

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

  // Rota CORRETA recalculada de forma leve ENQUANTO estiver errando,
  // usando a posição do simulador (ou a real, se não tiver simulador ainda).
  const recalculatedRouteCoordinates = useRecalculatedCorrectRoute({
    enabled: simulation.isEnabled && simulation.isWrongRoute,
    currentLocation: simulatedLocation ?? driverLocation,
    selectedDelivery,
  });

  // Guarda a última rota correta recalculada enquanto está errando
  useEffect(() => {
    if (simulation.isWrongRoute && recalculatedRouteCoordinates.length > 1) {
      setSavedCorrectPathAfterError(recalculatedRouteCoordinates);
    }
  }, [simulation.isWrongRoute, recalculatedRouteCoordinates]);

  // Rota que será desenhada no MAPA (sempre a CORRETA: original ou recalculada)
  const displayedRouteCoordinates = useMemo(() => {
    // Enquanto estiver errando, mostramos a rota correta recalculada se existir
    if (simulation.isWrongRoute) {
      if (recalculatedRouteCoordinates.length > 1) {
        return recalculatedRouteCoordinates;
      }
      return routeCoordinates;
    }

    // Depois que voltou pra "Correta", se temos uma rota correta nova salva,
    // usamos ela como a rota oficial.
    if (savedCorrectPathAfterError && savedCorrectPathAfterError.length > 1) {
      return savedCorrectPathAfterError;
    }

    // Caso padrão: rota original
    return routeCoordinates;
  }, [
    simulation.isWrongRoute,
    recalculatedRouteCoordinates,
    savedCorrectPathAfterError,
    routeCoordinates,
  ]);

  // Localização efetiva (não aplicamos offset perpendicular).
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

  // --- ALERTAS DE DIAGNÓSTICO DA SIMULAÇÃO / ERRAR ---

  const wrongRouteAlertShownRef = useRef(false);
  useEffect(() => {
    if (!simulation.isEnabled || !simulation.isWrongRoute) {
      wrongRouteAlertShownRef.current = false;
      return;
    }

    if (wrongRouteCoordinates.length < 2 && !wrongRouteAlertShownRef.current) {
      wrongRouteAlertShownRef.current = true;
    }
  }, [
    simulation.isEnabled,
    simulation.isWrongRoute,
    wrongRouteCoordinates.length,
  ]);

  const correctRouteAlertShownRef = useRef(false);
  useEffect(() => {
    if (!simulation.isEnabled) {
      correctRouteAlertShownRef.current = false;
      return;
    }

    if (
      displayedRouteCoordinates.length < 2 &&
      !correctRouteAlertShownRef.current
    ) {
      correctRouteAlertShownRef.current = true;
    }
  }, [simulation.isEnabled, displayedRouteCoordinates.length]);

  // Seleção/deseleção de entrega com ajuste de câmera.
  function handleDeliveryPress(delivery: Delivery) {
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

  function handleStartNavigation() {
    if (selectedDelivery && effectiveLocation && mapRef.current) {
      setIsNavigating(true);
      setIsMapCentered(true);
    }
  }

  const handleCenterMap = () => {
    if (effectiveLocation && mapRef.current) {
      setIsMapCentered(true);
    }
  };

  // Handlers da simulação para controlar também a navegação/câmera
  const handleSimulationStart = useCallback(() => {
    simulation.start();
    setWrongRouteOrigin(null);
    setSavedCorrectPathAfterError(null); // começa sempre "limpo"

    if (selectedDelivery && effectiveLocation && mapRef.current) {
      setIsNavigating(true);
      setIsMapCentered(true);
    }
  }, [simulation, selectedDelivery, effectiveLocation]);

  const handleSimulationStop = useCallback(() => {
    simulation.stop();
    setWrongRouteOrigin(null);
    setSavedCorrectPathAfterError(null);
    setIsNavigating(false);
    setIsMapCentered(true);
  }, [simulation]);

  const handleToggleWrongRoute = useCallback(() => {
    // Não deixa errar se a simulação não estiver ligada
    if (!simulation.isEnabled) {
      Alert.alert(
        "Simulação",
        "Para errar o caminho, primeiro inicie a simulação."
      );
      return;
    }

    // Ativando o modo ERRAR
    if (!simulation.isWrongRoute) {
      const loc =
        simulatedLocation?.coords ??
        frozenSimLocation?.coords ??
        driverLocation?.coords ??
        null;

      if (loc) {
        setWrongRouteOrigin({
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      } else {
        setWrongRouteOrigin(null);
      }
    } else {
      // Voltando para a CORRETA → não limpamos savedCorrectPathAfterError,
      // apenas a origem da rota errada. A rota correta recalculada já está salva.
      setWrongRouteOrigin(null);
    }

    simulation.toggleWrongRoute();
  }, [
    simulation,
    simulatedLocation,
    frozenSimLocation,
    driverLocation?.coords,
  ]);

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

        {/* Rota entre motorista e entrega selecionada (SEMPRE a rota CORRETA: original ou recalculada) */}
        {displayedRouteCoordinates.length > 0 && selectedDelivery && (
          <>
            <Polyline
              coordinates={displayedRouteCoordinates}
              strokeColor={ROUTE_OUTLINE_COLOR}
              strokeWidth={ROUTE_OUTLINE_WIDTH}
              zIndex={1}
            />
            <Polyline
              coordinates={displayedRouteCoordinates}
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

      {/* FAB de simulação */}
      <SimulationFab
        mode={simulation.mode}
        isPaused={simulation.isPaused}
        isWrongRoute={simulation.isWrongRoute}
        visible={sheetIndex === 0}
        onStart={handleSimulationStart}
        onPause={simulation.pause}
        onResume={simulation.resume}
        onStop={handleSimulationStop}
        onToggleWrongRoute={handleToggleWrongRoute}
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
