// src/hooks/useMapScreen.ts
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Alert, useColorScheme } from "react-native";
import MapView, { LatLng } from "react-native-maps";
import type { LocationObject } from "expo-location";

import { Delivery } from "../types";
import {
  updateStatusEntrega,
  EntregaStatus,
  AtualizarStatusDetails,
} from "../services/api";

import { useToast } from "../components/Toast";
import { useInitialMapData } from "./useInitialMapData";
import { useDriverLocation } from "./useDriverLocation";
import { useRouteToDelivery } from "./useRouteToDelivery";
import {
  useSimulatedNavigation,
  SimulatedLocation,
} from "./useSimulatedNavigation";
import { useSimulationController } from "./useSimulationController";
import { useWrongRoute } from "./useWrongRoute";
import { useRecalculatedCorrectRoute } from "./useRecalculatedCorrectRoute";

// === Configuração de tema (igual ao monolito) ===
const MAP_THEME_MODE = "autoSun";

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

// Região inicial do mapa (Campinas).
const initialRegionConst = {
  latitude: -22.9056,
  longitude: -47.0608,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export function useMapScreen() {
  const mapRef = useRef<MapView>(null);
  const colorScheme = useColorScheme();
  const { showToast } = useToast();

  // --- Estado da UI da tela (igual ao monólito) ---
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null
  );
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMapCentered, setIsMapCentered] = useState(true);
  const [sheetIndex, setSheetIndex] = useState(1); // índice do BottomSheet (10%, 60%, 95%)
  const [sheetTargetIndex, setSheetTargetIndex] = useState<number | null>(null);

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

  // 🔒 Localização congelada para calcular a rota durante a simulação
  const [driverLocationFrozenForRoute, setDriverLocationFrozenForRoute] =
    useState<LocationObject | null>(null);

  useEffect(() => {
    if (simulation.isEnabled) {
      // congela a primeira driverLocation disponível
      if (!driverLocationFrozenForRoute && driverLocation) {
        setDriverLocationFrozenForRoute(driverLocation as LocationObject);
      }
    } else if (driverLocationFrozenForRoute) {
      // ao encerrar simulação, limpa
      setDriverLocationFrozenForRoute(null);
    }
  }, [simulation.isEnabled, driverLocation, driverLocationFrozenForRoute]);

  // Localização usada para calcular a rota principal:
  // - Simulação desligada → usa driverLocation real.
  // - Simulação ligada → usa a congelada (se existir).
  const driverLocationForRoute: LocationObject | null =
    simulation.isEnabled && driverLocationFrozenForRoute
      ? driverLocationFrozenForRoute
      : (driverLocation as LocationObject | null) ?? null;

  // Ponto onde o motorista estava quando clicou em "Errar"
  const [wrongRouteOrigin, setWrongRouteOrigin] = useState<LatLng | null>(null);

  // Rota entre motorista e entrega selecionada (rota CORRETA vinda da API principal).
  const { routeCoordinates, clearRoute } = useRouteToDelivery(
    driverLocationForRoute,
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

  // Atualiza câmera conforme modo de navegação/posicionamento (igual ao monolito)
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

  // Handler para onRegionChangeComplete (IDÊNTICO ao monolito)
  const handleRegionChangeComplete = useCallback(
    (_region: any, details?: { isGesture?: boolean }) => {
      if (isMapCentered) {
        if (details && details.isGesture) {
          setIsMapCentered(false);
        }
      }
    },
    [isMapCentered]
  );

  // Tema do mapa, igual ao monolito
  const isNightTheme = useMemo(() => {
    return isNightByClock();
  }, []);

  return {
    mapRef,

    motorista,
    deliveriesData,
    isLoading,
    driverLocation,
    effectiveLocation,
    pastCoordinates,
    displayedRouteCoordinates,

    selectedDelivery,
    isNavigating,
    isMapCentered,
    sheetIndex,
    setSheetIndex,
    sheetTargetIndex,
    setSheetTargetIndex,

    handleLogout,
    handleDeliveryPress,
    handleUpdateStatus,
    handleStartNavigation,
    handleCenterMap,

    simulation,
    handleSimulationStart,
    handleSimulationStop,
    handleToggleWrongRoute,

    initialRegion: initialRegionConst,
    isNightTheme,

    // 🔥 novo para o map.tsx separado, mas lógica igual ao monolito
    handleRegionChangeComplete,
  };
}
