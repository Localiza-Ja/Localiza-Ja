//frontend/src/app/map.tsx

import { router } from "expo-router";
import {
  View,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, Polyline, Circle } from "react-native-maps";
import React, { useRef, useState, useEffect, memo } from "react";
import * as Location from "expo-location";
import { Delivery } from "../types";
import AppHeader from "../components/AppHeader";
import { ToastProvider, useToast } from "../components/Toast";
import DeliveryPanel from "../components/DeliveryPanel";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getSession,
  logoutMotorista,
  getEntregasPorMotorista,
  updateStatusEntrega,
  EntregaStatus,
  AtualizarStatusDetails,
} from "../services/api";
import { Feather } from "@expo/vector-icons";

// Imagens do app (logo e seta do motorista).
const appLogo = require("../../assets/images/lj-logo.png");
const navigationArrow = require("../../assets/images/navigation-arrow.png");

// Tipos utilitários.
type LocationCoords = Location.LocationObject["coords"];

// Estilos de rota desenhada no mapa.
const ROUTE_COLOR = "#4285F4";
const ROUTE_OUTLINE_COLOR = "#FFFFFF";
const ROUTE_WIDTH = 6;
const ROUTE_OUTLINE_WIDTH = ROUTE_WIDTH + 4;

const MIN_INITIAL_LOADING_MS = 1050;

// Chave da OpenRouteService para geocode e rotas.
const ORS_API_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImUwZGJlZDIyODYzZjQ2MmNhYWFlY2EyNGQ1MWFjMDI0IiwiaCI6Im11cm11cjY0In0=";

// Coordenadas mockadas para alguns endereços.
const mockedCoordinates: {
  [key: string]: { latitude: number; longitude: number };
} = {
  "Rua Dr. Salles de Oliveira, 1380, Vila Industrial, Campinas, SP": {
    latitude: -22.91506,
    longitude: -47.08155,
  },
  "Avenida da Amizade, 2300, Vila Carlota, Sumaré, SP": {
    latitude: -22.81308,
    longitude: -47.25197,
  },
  "Rua Luiz Camilo de Camargo, 585, Centro, Hortolândia, SP": {
    latitude: -22.8596,
    longitude: -47.22013,
  },
  "Av. Iguatemi, 777, Vila Brandina, Campinas, SP": {
    latitude: -22.89531,
    longitude: -47.02115,
  },
  "Rua Antônio de Castro, 123, Sousas, Campinas, SP": {
    latitude: -22.88045,
    longitude: -46.96695,
  },
  "Avenida Olivo Callegari, 789, Centro, Sumaré, SP": {
    latitude: -22.82223,
    longitude: -47.27137,
  },
  "Rua Sete de Setembro, 50, Centro, Valinhos, SP": {
    latitude: -22.97126,
    longitude: -46.99616,
  },
  "Avenida Francisco Glicério, 1000, Centro, Campinas, SP": {
    latitude: -22.90565,
    longitude: -47.05837,
  },
  "Rua Rosina Zagatti, 204, Jardim Amanda II, Hortolândia, SP": {
    latitude: -22.89426,
    longitude: -47.2346,
  },
  "Avenida John Boyd Dunlop, 3900, Jardim Ipaussurama, Campinas, SP": {
    latitude: -22.9234,
    longitude: -47.11211,
  },
};

// Geocoding: usa mock ou consulta ORS.
const geocodeAddress = async (address: string) => {
  if (mockedCoordinates[address]) {
    return mockedCoordinates[address];
  }
  try {
    const response = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(
        address
      )}`
    );
    const json = await response.json();
    if (json.features && json.features.length > 0) {
      const [longitude, latitude] = json.features[0].geometry.coordinates;
      return { latitude, longitude };
    }
    return null;
  } catch (error) {
    console.error("Erro no Geocoding:", error);
    return null;
  }
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

// Define zoom/câmera baseado na velocidade.
const getSmartZoomLevel = (speed: number): number => {
  const speedKmh = speed * 3.6;
  if (speedKmh > 80) return 17;
  else if (speedKmh > 40) return 17;
  else if (speedKmh > 10) return 18;
  else return 17;
};

function MapScreenInner() {
  // Refs/estados principais do mapa e dados.
  const mapRef = useRef<MapView>(null);
  const [motorista, setMotorista] = useState<any>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null
  );
  const [deliveriesData, setDeliveriesData] = useState<Delivery[]>([]);
  const [driverLocation, setDriverLocation] =
    useState<Location.LocationObject | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [pastCoordinates, setPastCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapCentered, setIsMapCentered] = useState(true);

  const { showToast } = useToast();

  // Carrega sessão e entregas + geocode inicial.
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      const startTime = Date.now();
      try {
        const sessionResponse = await getSession();
        const motoristaLogado = sessionResponse.data.Usuario;
        setMotorista(motoristaLogado);

        const todasEntregasResponse = await getEntregasPorMotorista(
          motoristaLogado.id
        );
        const todasEntregas = todasEntregasResponse.data.Entregas || [];
        const entregasComCoordenadas = await Promise.all(
          todasEntregas.map(async (entrega: Delivery) => {
            const coords = await geocodeAddress(entrega.endereco_entrega);
            return {
              ...entrega,
              latitude: coords?.latitude ?? null,
              longitude: coords?.longitude ?? null,
            };
          })
        );
        setDeliveriesData(entregasComCoordenadas);
        setSelectedDelivery(null);
      } catch (error: any) {
        console.error(
          "Erro ao carregar dados:",
          error.response?.data || error.message
        );
        Alert.alert("Sessão Expirada", "Faça login novamente.");
        await handleLogout(true);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_INITIAL_LOADING_MS - elapsed);
        setTimeout(() => setIsLoading(false), remaining);
      }
    };
    carregarDadosIniciais();
  }, []);

  // Solicita permissões e observa posição do motorista.
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    const requestPermissionsAndStartWatching = async () => {
      let { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== "granted") {
        Alert.alert(
          "Permissão Negada",
          "A permissão de localização é necessária."
        );
        return;
      }
      let { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== "granted") {
        console.warn("Permissão de localização em segundo plano negada.");
      }
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 10,
        },
        (location) => {
          setDriverLocation(location);
          setPastCoordinates((prev) => [...prev, location.coords]);
        }
      );
    };
    requestPermissionsAndStartWatching();
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Busca rota ORS entre motorista e entrega selecionada.
  useEffect(() => {
    if (!driverLocation || !selectedDelivery || !selectedDelivery.latitude) {
      setRouteCoordinates([]);
      return;
    }
    const fetchRoute = async () => {
      try {
        const startCoords = `${driverLocation.coords.longitude},${driverLocation.coords.latitude}`;
        const endCoords = `${selectedDelivery.longitude},${selectedDelivery.latitude}`;
        const response = await fetch(
          `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startCoords}&end=${endCoords}`
        );
        const json = await response.json();
        if (json.features && json.features.length > 0) {
          const points = json.features[0].geometry.coordinates.map(
            (p: number[]) => ({ latitude: p[1], longitude: p[0] })
          );
          setRouteCoordinates(points);
        } else {
          console.error("ERRO NA API DE ROTAS:", json);
        }
      } catch (error) {
        console.error("ERRO AO BUSCAR ROTA DO ORS:", error);
      }
    };
    fetchRoute();
  }, [driverLocation, selectedDelivery]);

  // Atualiza câmera conforme modo de navegação/posicionamento.
  useEffect(() => {
    if (driverLocation && mapRef.current && isMapCentered) {
      const currentZoom = getSmartZoomLevel(driverLocation.coords.speed || 0);
      const cameraSettings = isNavigating
        ? {
            center: driverLocation.coords,
            heading: driverLocation.coords.heading || 0,
            pitch: 45,
            zoom: currentZoom,
          }
        : {
            center: driverLocation.coords,
            heading: 0,
            pitch: 0,
            zoom: 16,
          };
      mapRef.current.animateCamera(cameraSettings, { duration: 400 });
    }
  }, [isNavigating, driverLocation, isMapCentered]);

  // Região inicial do mapa (Campinas).
  const initialRegion = {
    latitude: -22.9056,
    longitude: -47.0608,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  // Faz logout e limpa token.
  const handleLogout = async (forceLogout = false) => {
    if (!forceLogout) {
      try {
        await logoutMotorista();
      } catch (error) {
        console.error("Erro no logout:", error);
      }
    }
    await AsyncStorage.removeItem("@user_token");
    router.replace("/");
  };

  // Seleção/deseleção de entrega com ajuste de câmera.
  function handleDeliveryPress(delivery: Delivery) {
    setIsNavigating(false);

    if (selectedDelivery?.id === delivery.id) {
      setSelectedDelivery(null);
      setRouteCoordinates([]);
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

  // Verifica se um status exige coordenadas.
  const statusExigeCoordenadas = (s: EntregaStatus) =>
    s === "em_rota" ||
    s === "entregue" ||
    s === "cancelada" ||
    s === "nao_entregue";

  // 🔹 Helper de toast POR STATUS (fora da função pra não dar erro de hoisting)
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

      // Injeta lat/long quando exigido.
      let detailsToSend: AtualizarStatusDetails = { ...(details as any) };
      if (statusExigeCoordenadas(newStatus)) {
        if (!driverLocation) {
          Alert.alert(
            "Localização indisponível",
            "Não foi possível obter sua localização atual."
          );
          return;
        }
        const { latitude, longitude } = driverLocation.coords;
        (detailsToSend as any).latitude = latitude;
        (detailsToSend as any).longitude = longitude;
      }

      // Chama API de atualização.
      await updateStatusEntrega(deliveryId, newStatus, detailsToSend);

      // Atualiza state local sem duplicar 'status'.
      const updatedDeliveries = deliveriesData.map((d) => {
        if (d.id !== deliveryId) return d;

        const patch: Partial<Delivery> = {};
        if ("latitude" in (detailsToSend as any)) {
          patch.latitude = (detailsToSend as any).latitude;
        }
        if ("longitude" in (detailsToSend as any)) {
          patch.longitude = (detailsToSend as any).longitude;
        }
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

      // 👉 agora a função já existe antes, não dá erro
      const toastConfig = getToastForStatus(newStatus);
      showToast(toastConfig);

      // Pós-ação quando finaliza/cancela a entrega selecionada.
      if (selectedDelivery?.id === deliveryId) {
        if (["entregue", "cancelada", "nao_entregue"].includes(newStatus)) {
          setRouteCoordinates([]);
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
              console.log(
                "RASTREAMENTO DESLIGADO POR INTERAÇÃO MANUAL (pan/zoom/tilt)"
              );
            }
          }
        }}
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

// 🔚 Wrapper exportando com ToastProvider
export default function MapScreen() {
  return (
    <ToastProvider>
      <MapScreenInner />
    </ToastProvider>
  );
}
