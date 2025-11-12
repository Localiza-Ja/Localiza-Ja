// frontend/src/app/map.tsx

/**
 * Tela principal do motorista com o mapa.
 * - Orquestra sessão, entregas, localização em tempo real e rotas.
 * - Renderiza o MapView com motorista, pinos de entrega, rota e trilha percorrida.
 * - Integra o painel inferior de entregas (DeliveryPanel) e o cabeçalho (AppHeader).
 *
 * A lógica pesada foi extraída para hooks em `src/hooks` e util em `src/utils/geocoding`,
 * mantendo este arquivo como "compositor" da tela, sem alterar o comportamento original.
 */

import {
  View,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, Polyline, Circle } from "react-native-maps";
import React, { useRef, useState, useEffect, memo } from "react";
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

// Imagens do app (logo e seta do motorista).
const appLogo = require("../../assets/images/lj-logo.png");
const navigationArrow = require("../../assets/images/navigation-arrow.png");

// Estilos de rota desenhada no mapa.
const ROUTE_COLOR = "#4285F4";
const ROUTE_OUTLINE_COLOR = "#FFFFFF";
const ROUTE_WIDTH = 6;
const ROUTE_OUTLINE_WIDTH = ROUTE_WIDTH + 4;

// Define zoom/câmera baseado na velocidade.
const getSmartZoomLevel = (speed: number): number => {
  const speedKmh = speed * 3.6;
  if (speedKmh > 80) return 17;
  else if (speedKmh > 40) return 17;
  else if (speedKmh > 10) return 18;
  else return 17;
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

  // Dados iniciais: sessão do motorista + entregas + loading.
  const {
    motorista,
    deliveriesData,
    setDeliveriesData,
    isLoading,
    handleLogout,
  } = useInitialMapData();

  // Localização em tempo real e trilha percorrida.
  const { driverLocation, pastCoordinates } = useDriverLocation();

  // Rota entre motorista e entrega selecionada.
  const { routeCoordinates, clearRoute } = useRouteToDelivery(
    driverLocation,
    selectedDelivery
  );

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
    if (driverLocation && mapRef.current && isMapCentered) {
      const currentZoom = getSmartZoomLevel(driverLocation.coords.speed || 0);
      const cameraSettings = {
        center: driverLocation.coords,
        heading: driverLocation.coords.heading || 0,
        pitch: 0, // 2D sempre
        zoom: isNavigating ? currentZoom : 16,
      };
      mapRef.current.animateCamera(cameraSettings, { duration: 400 });
    }
  }, [isNavigating, driverLocation, isMapCentered]);

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
      if (mapRef.current && driverLocation && delivery.latitude) {
        mapRef.current.fitToCoordinates(
          [
            driverLocation.coords,
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

  // Helper de toast POR STATUS.
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

  // Atualiza status no backend e sincroniza o state local.
  async function handleUpdateStatus(
    deliveryId: string,
    newStatus: EntregaStatus,
    details: AtualizarStatusDetails
  ) {
    try {
      // Impede duas entregas simultâneas "em_rota".
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

      const detailsToSend: AtualizarStatusDetails = { ...(details as any) };

      // Chama API de atualização.
      await updateStatusEntrega(deliveryId, newStatus, detailsToSend);

      // Atualiza state local sem duplicar 'status'.
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

      // Pós-ação quando finaliza/cancela a entrega selecionada.
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

  // Inicia modo navegação (trava câmera no motorista).
  function handleStartNavigation() {
    if (selectedDelivery && driverLocation && mapRef.current) {
      setIsNavigating(true);
      setIsMapCentered(true);
    }
  }

  // Re-centraliza a câmera no motorista.
  const handleCenterMap = () => {
    if (driverLocation && mapRef.current) {
      setIsMapCentered(true);
    }
  };

  // Ícone do botão de recentralizar.
  const centerIconName = isNavigating ? "navigation" : "compass";

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
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {deliveriesData
          .filter((d) => {
            const hasValidCoordinates =
              typeof d.latitude === "number" && typeof d.longitude === "number";
            const isPendingOrInRoute =
              d.status !== "cancelada" && d.status !== "entregue";
            return isPendingOrInRoute && hasValidCoordinates;
          })
          .map((delivery) => {
            const markerColor =
              selectedDelivery?.id === delivery.id ? "#34A853" : "#EA4335";
            return (
              <Marker
                key={`delivery-${delivery.id}`}
                coordinate={{
                  latitude: delivery.latitude!,
                  longitude: delivery.longitude!,
                }}
                onPress={() => handleDeliveryPress(delivery)}
                anchor={{ x: 0.5, y: 1 }}
              >
                <CustomDeliveryMarker color={markerColor} />
              </Marker>
            );
          })}

        {pastCoordinates.length > 0 && (
          <Polyline
            coordinates={pastCoordinates}
            strokeColor="#AAAAAA"
            strokeWidth={3}
            lineDashPattern={[10, 10]}
            zIndex={0}
          />
        )}

        {routeCoordinates.length > 0 && selectedDelivery && (
          <>
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={ROUTE_OUTLINE_COLOR}
              strokeWidth={ROUTE_OUTLINE_WIDTH}
              zIndex={1}
            />
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={ROUTE_COLOR}
              strokeWidth={ROUTE_WIDTH}
              zIndex={2}
            />
          </>
        )}

        {driverLocation && !isNavigating && (
          <>
            <Circle
              center={driverLocation.coords}
              radius={driverLocation.coords.accuracy || 20}
              strokeWidth={1}
              strokeColor="rgba(26, 115, 232, 0.5)"
              fillColor="rgba(26, 115, 232, 0.1)"
              zIndex={1}
            />
            <Marker
              coordinate={driverLocation.coords}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={3}
              rotation={driverLocation.coords.heading || 0}
            >
              <Image
                source={navigationArrow}
                style={styles.mapNavigationIcon}
              />
            </Marker>
          </>
        )}
      </MapView>

      {driverLocation && isNavigating && isMapCentered && <DriverIndicator />}

      <AppHeader logoSource={appLogo} onLogout={handleLogout} />

      {!isMapCentered && (
        <TouchableOpacity style={styles.centerButton} onPress={handleCenterMap}>
          <Feather name={centerIconName} size={24} color="#5F6368" />
        </TouchableOpacity>
      )}

      <DeliveryPanel
        deliveriesData={deliveriesData}
        selectedDelivery={selectedDelivery}
        onDeliveryPress={handleDeliveryPress}
        onUpdateStatus={handleUpdateStatus}
        onLogout={handleLogout}
        onStartNavigation={handleStartNavigation}
        isLoadingList={isLoading}
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
    marginTop: -12.5 - 50,
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