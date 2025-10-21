// frontend/src/app/map.tsx

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
import MapView, { Marker, Polyline } from "react-native-maps";
import React, { useRef, useState, useEffect } from "react";
import * as Location from "expo-location";
import { Delivery } from "../types";
import AppHeader from "../components/AppHeader";
import DeliveryPanel from "../components/DeliveryPanel";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getSession,
  logoutMotorista,
  getEntregasPorMotorista,
  updateStatusEntrega,
} from "../services/api";
import { Feather } from "@expo/vector-icons";
// import { BlurView } from "expo-blur"; // <-- REMOVIDO

const appLogo = require("../../assets/images/lj-logo.png");
const navigationArrow = require("../../assets/images/navigation-arrow.png");

const ORS_API_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImUwZGJlZDIyODYzZjQ2MmNhYWFlY2EyNGQ1MWFjMDI0IiwiaCI6Im11cm11cjY0In0=";

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

export default function MapScreen() {
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapCentered, setIsMapCentered] = useState(true);
  // const [isPanelOpen, setIsPanelOpen] = useState(true); // <-- REMOVIDO

  useEffect(() => {
    const carregarDadosIniciais = async () => {
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
              latitude: coords?.latitude,
              longitude: coords?.longitude,
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
        setIsLoading(false);
      }
    };
    carregarDadosIniciais();
  }, []);

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

  useEffect(() => {
    if (isNavigating && driverLocation && mapRef.current && isMapCentered) {
      mapRef.current.animateCamera(
        {
          center: driverLocation.coords,
          heading: driverLocation.coords.heading || 0,
          pitch: 45,
          zoom: 18,
        },
        { duration: 1000 }
      );
    }
  }, [isNavigating, driverLocation, isMapCentered]);

  const initialRegion = {
    latitude: -22.9056,
    longitude: -47.0608,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

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

  function handleDeliveryPress(delivery: Delivery) {
    setIsNavigating(false);
    if (selectedDelivery?.id === delivery.id) {
      setSelectedDelivery(null);
    } else {
      setSelectedDelivery(delivery);
      setIsMapCentered(true);
    }
  }

  async function handleUpdateStatus(
    deliveryId: string,
    newStatus: string,
    details: any
  ) {
    try {
      await updateStatusEntrega(deliveryId, newStatus, details);
      const updatedDeliveries = deliveriesData.map((d) =>
        d.id === deliveryId ? { ...d, status: newStatus, ...details } : d
      );
      setDeliveriesData(updatedDeliveries);

      if (selectedDelivery?.id === deliveryId) {
        if (["entregue", "cancelada", "nao_entregue"].includes(newStatus)) {
          setRouteCoordinates([]);
          const proximaEntrega = updatedDeliveries.find(
            (d) => d.status === "pendente"
          );
          setSelectedDelivery(proximaEntrega || null);
        }
      }
    } catch (error: any) {
      console.error(
        "Erro ao atualizar status:",
        error.response?.data || error.message
      );
      Alert.alert("Erro", "Não foi possível atualizar o status.");
    }
  }

  function handleStartNavigation() {
    if (selectedDelivery) {
      setIsNavigating(true);
      setIsMapCentered(true);
    }
  }

  const handleCenterMap = () => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.coords.latitude,
        longitude: driverLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setIsMapCentered(true);
    }
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#21222D",
        }}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#21222D" />
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onPanDrag={() => setIsMapCentered(false)}
      >
        {deliveriesData
          .filter((d) => {
            const hasValidCoordinates =
              typeof d.latitude === "number" && typeof d.longitude === "number";
            const isPendingOrInRoute =
              d.status !== "cancelada" && d.status !== "entregue";
            return isPendingOrInRoute && hasValidCoordinates;
          })
          .map((delivery) => (
            <Marker
              key={`delivery-${delivery.id}`}
              coordinate={{
                latitude: delivery.latitude!,
                longitude: delivery.longitude!,
              }}
              pinColor={selectedDelivery?.id === delivery.id ? "green" : "red"}
              onPress={() => handleDeliveryPress(delivery)}
            />
          ))}
        {routeCoordinates.length > 0 && selectedDelivery && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#1E90FF"
            strokeWidth={5}
          />
        )}
        {isNavigating && driverLocation && (
          <Marker
            coordinate={driverLocation.coords}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={driverLocation.coords.heading || 0}
          >
            <Image source={navigationArrow} style={styles.navigationIcon} />
          </Marker>
        )}
        {!isNavigating && driverLocation && (
          <Marker
            coordinate={driverLocation.coords}
            pinColor="blue"
            title="Sua Posição"
          />
        )}
      </MapView>

      {/* BlurView REMOVIDO DAQUI */}

      <AppHeader logoSource={appLogo} onLogout={handleLogout} />

      {!isMapCentered && (
        <TouchableOpacity style={styles.centerButton} onPress={handleCenterMap}>
          <Feather name="navigation" size={24} color="black" />
        </TouchableOpacity>
      )}

      <DeliveryPanel
        deliveriesData={deliveriesData}
        selectedDelivery={selectedDelivery}
        onDeliveryPress={handleDeliveryPress}
        onUpdateStatus={handleUpdateStatus}
        onLogout={handleLogout}
        onStartNavigation={handleStartNavigation}
        // prop 'onPanelStateChange' REMOVIDA DAQUI
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  // estilo 'mapBlur' REMOVIDO DAQUI
  navigationIcon: { width: 30, height: 30 },
  centerButton: {
    position: "absolute",
    bottom: "40%",
    right: 20,
    backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.85)" : "white",
    borderRadius: Platform.OS === "ios" ? 20 : 30,
    padding: 15,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === "ios" ? 0.15 : 0.25,
    shadowRadius: 3.84,
  },
});
