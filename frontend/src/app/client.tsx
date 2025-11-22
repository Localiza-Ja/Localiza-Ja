import { router, useLocalSearchParams } from "expo-router";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker } from "react-native-maps";
import React, { useRef, useState, useEffect } from "react";
import { api, Delivery as APIDelivery } from "../services/api";
import AppHeader from "../components/AppHeader";
import DeliveryInRoute from "../components/DeliveryInRoute";
import DeliveryNotStarted from "../components/DeliveryNotStarted";
import DeliveryDelivered from "../components/DeliveryDelivered";
import DeliveryNotDelivered from "../components/DeliveryNotDelivered";
import DeliveryCanceled from "../components/DeliveryCanceled";
import { Svg, Path } from "react-native-svg";

const appLogo = require("../../assets/images/lj-logo.png");

// OpenRouteService API Key
const ORS_API_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImUwZGJlZDIyODYzZjQ2MmNhYWFlY2EyNGQ1MWFjMDI0IiwiaCI6Im11cm11cjY0In0=";

// Mock de coordenadas (fallback)
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

// Geocodificação
const geocodeAddress = async (address: string) => {
  if (mockedCoordinates[address]) return mockedCoordinates[address];
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

// Tipos
type LocationObject = {
  coords: { latitude: number; longitude: number };
};

type Delivery = {
  id: string;
  client: string;
  addressStreet: string;
  addressCity: string;
  phone: string;
  orderNumber: string;
  status: string;
  latitude: number;
  longitude: number;
  motivo: string;
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const params = useLocalSearchParams<{ pedido: string }>();
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null
  );
  const [driverLocation, setDriverLocation] = useState<LocationObject | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [motoristaId, setMotoristaId] = useState<string | null>(null);

  // 1. CARREGAR ENTREGA
  useEffect(() => {
    const fetchDelivery = async () => {
      if (!params.pedido) {
        setError("Número do pedido não foi informado.");
        setIsLoading(false);
        return;
      }

      try {
        const entregaResponse = await api.get(
          `/entregas/numero_pedido/${params.pedido.trim()}`
        );
        const entrega: APIDelivery = entregaResponse.data.Entrega;

        if (!entrega) throw new Error("Entrega não encontrada.");

        // Geocodificar endereço
        let deliveryCoords = { latitude: -22.9056, longitude: -47.0608 };
        const geoResult = await geocodeAddress(entrega.endereco_entrega);
        if (geoResult) {
          deliveryCoords = geoResult;
        } else {
          Alert.alert(
            "Aviso",
            "Endereço não localizado. Usando posição aproximada."
          );
        }

        const statusMap: Record<string, string> = {
          pendente: "Pendente",
          em_rota: "Em rota",
          entregue: "Entregue",
          nao_entregue: "Não entregue",
          cancelada: "Cancelada",
        };

        const mappedDelivery: Delivery = {
          id: entrega.id,
          client: entrega.nome_cliente || "Cliente",
          addressStreet:
            entrega.endereco_entrega.split(",")[0]?.trim() ||
            entrega.endereco_entrega,
          addressCity: entrega.endereco_entrega.includes(",")
            ? entrega.endereco_entrega.split(",").slice(1).join(",").trim()
            : "Cidade não informada",
          phone: "Telefone não disponível",
          orderNumber: entrega.numero_pedido,
          status: statusMap[entrega.status] ?? "Desconhecido",
          latitude: deliveryCoords.latitude,
          longitude: deliveryCoords.longitude,
          motivo: entrega.motivo || "",
        };

        setSelectedDelivery(mappedDelivery);
        setMotoristaId(entrega.motorista_id?.toString() || null);

        // Centraliza no destino apenas na primeira carga
        mapRef.current?.animateToRegion(
          {
            latitude: deliveryCoords.latitude,
            longitude: deliveryCoords.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          },
          1000
        );
      } catch (err: any) {
        const msg = err.response?.data?.error || "Erro ao carregar entrega.";
        setError(msg);
        Alert.alert("Erro", msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDelivery();
  }, [params.pedido]);

  // 2. ATUALIZAR POSIÇÃO DO MOTORISTA + ZOOM AUTOMÁTICO NO MOTORISTA
  useEffect(() => {
    if (
      !motoristaId ||
      !selectedDelivery ||
      selectedDelivery.status !== "Em rota"
    )
      return;

    const updateDriverLocation = async () => {
      try {
        const locResponse = await api.get(
          `/localizacoes/motorista/${motoristaId}`
        );
        const localizacoes = locResponse.data.Localizacoes || [];

        if (localizacoes.length > 0) {
          const latest = localizacoes.sort(
            (a: any, b: any) =>
              new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
          )[0];

          const newLocation: LocationObject = {
            coords: {
              latitude: latest.latitude,
              longitude: latest.longitude,
            },
          };

          setDriverLocation(newLocation);

          // Centralizar no motorista
          mapRef.current?.animateToRegion(
            {
              latitude: latest.latitude,
              longitude: latest.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            },
            1000
          );
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.warn("Falha ao atualizar posição do motorista:", err.message);
        }
      }
    };

    // Atualiza imediatamente
    updateDriverLocation();

    // Atualiza a cada 5 minutos
    const interval = setInterval(updateDriverLocation, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [motoristaId, selectedDelivery?.status]);

  // Funções de clique nos marcadores (mantidas para uso manual)
  const goToDelivery = () => {
    if (!selectedDelivery) return;
    mapRef.current?.animateToRegion(
      {
        latitude: selectedDelivery.latitude,
        longitude: selectedDelivery.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      800
    );
  };

  const goToDriver = () => {
    if (!driverLocation) return;
    mapRef.current?.animateToRegion(
      {
        latitude: driverLocation.coords.latitude,
        longitude: driverLocation.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      800
    );
  };

  const handleLogout = () => router.push("/");

  // TELA DE LOADING
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FCA14E" />
        <Text style={styles.loadingText}>Carregando entrega...</Text>
      </View>
    );
  }

  // TELA DE ERRO
  if (error || !selectedDelivery) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || "Nenhuma entrega encontrada."}
        </Text>
        <Text style={styles.retryText} onPress={() => router.back()}>
          Voltar
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#21222D" />

      {/* MAPA */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: selectedDelivery.latitude,
            longitude: selectedDelivery.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
        >
          {/* MARCADOR DO DESTINO */}
          <Marker
            coordinate={{
              latitude: selectedDelivery.latitude,
              longitude: selectedDelivery.longitude,
            }}
            title="Destino da Entrega"
            description={selectedDelivery.addressStreet}
            onPress={goToDelivery}
          >
            <Svg width={40} height={40} viewBox="0 0 66 100" fill="none">
              <Path
                d="M32.9639 2.5C43.8413 2.50011 53.3954 8.12565 58.6084 17.5469V17.5479C63.8122 26.9677 63.4169 37.9322 57.5547 46.9609L43.1221 69.1855L41.0576 72.3643L44.793 73.0107C50.8953 74.0655 55.6846 75.8994 58.8789 78.125C62.0752 80.3521 63.4062 82.7515 63.4062 85.0156C63.4062 88.0506 61.0565 91.2789 55.5312 93.8838C50.1119 96.4387 42.2672 98.0361 32.9639 98.0361C23.6607 98.0361 15.8158 96.4389 10.3936 93.8838C4.86898 91.2804 2.51003 88.0525 2.5 85.0156C2.5 82.7722 3.83005 80.3758 7.03516 78.1406C10.2349 75.9092 15.0276 74.063 21.1201 72.9932L24.8418 72.3398L22.7842 69.1699L8.37305 46.9619C2.50455 37.9166 2.11479 26.9519 7.31738 17.5488L7.31836 17.5479C12.5256 8.12683 22.085 2.5 32.9639 2.5ZM24.9824 75.1211C18.9181 75.8376 14.248 77.2719 11.0205 78.8594C9.41563 79.6488 8.09525 80.5122 7.13379 81.4023C6.65335 81.8472 6.21104 82.3453 5.875 82.8955C5.54923 83.4289 5.23438 84.1584 5.23438 85.0156C5.23438 86.0373 5.67835 86.8887 6.09668 87.4785C6.53913 88.1022 7.12459 88.6765 7.77734 89.1973C9.08784 90.2428 10.916 91.2662 13.1875 92.167C17.751 93.9767 24.378 95.4014 32.9639 95.4014C41.5498 95.4013 48.1768 93.9768 52.7402 92.167C55.0116 91.2662 56.8399 90.2428 58.1504 89.1973C58.803 88.6766 59.3877 88.1021 59.8301 87.4785C60.2484 86.8887 60.6924 86.0373 60.6924 85.0156C60.6924 84.1589 60.378 83.4298 60.0527 82.8965C59.717 82.3461 59.2754 81.847 58.7949 81.4014C57.8335 80.5097 56.5122 79.6453 54.9062 78.8545C51.677 77.2643 47.0043 75.8297 40.9355 75.1211L39.3936 74.9414L38.5479 76.2441L33.1211 84.6143L33.1143 84.624L33.1074 84.6348C33.1023 84.6427 33.0955 84.6509 33.0801 84.6592C33.0639 84.6678 33.0273 84.6826 32.9639 84.6826C32.9143 84.6826 32.8817 84.6711 32.8633 84.6611C32.8458 84.6516 32.8314 84.6386 32.8184 84.6182L32.8115 84.6064L32.8047 84.5957L27.3721 76.2412L26.5254 74.9395L24.9824 75.1211ZM32.9639 13.5732C24.0672 13.5732 16.7765 20.7447 16.7764 29.6143C16.7764 38.4694 24.0734 45.6201 32.9639 45.6201C41.8542 45.6199 49.1514 38.4692 49.1514 29.6143C49.1512 20.7273 41.8585 13.5734 32.9639 13.5732Z"
                fill="#000000"
                fillOpacity="0.25"
                transform="translate(4, 6)"
              />
              <Path
                d="M32.9639 2.5C43.8413 2.50011 53.3954 8.12565 58.6084 17.5469V17.5479C63.8122 26.9677 63.4169 37.9322 57.5547 46.9609L43.1221 69.1855L41.0576 72.3643L44.793 73.0107C50.8953 74.0655 55.6846 75.8994 58.8789 78.125C62.0752 80.3521 63.4062 82.7515 63.4062 85.0156C63.4062 88.0506 61.0565 91.2789 55.5312 93.8838C50.1119 96.4387 42.2672 98.0361 32.9639 98.0361C23.6607 98.0361 15.8158 96.4389 10.3936 93.8838C4.86898 91.2804 2.51003 88.0525 2.5 85.0156C2.5 82.7722 3.83005 80.3758 7.03516 78.1406C10.2349 75.9092 15.0276 74.063 21.1201 72.9932L24.8418 72.3398L22.7842 69.1699L8.37305 46.9619C2.50455 37.9166 2.11479 26.9519 7.31738 17.5488L7.31836 17.5479C12.5256 8.12683 22.085 2.5 32.9639 2.5ZM24.9824 75.1211C18.9181 75.8376 14.248 77.2719 11.0205 78.8594C9.41563 79.6488 8.09525 80.5122 7.13379 81.4023C6.65335 81.8472 6.21104 82.3453 5.875 82.8955C5.54923 83.4289 5.23438 84.1584 5.23438 85.0156C5.23438 86.0373 5.67835 86.8887 6.09668 87.4785C6.53913 88.1022 7.12459 88.6765 7.77734 89.1973C9.08784 90.2428 10.916 91.2662 13.1875 92.167C17.751 93.9767 24.378 95.4014 32.9639 95.4014C41.5498 95.4013 48.1768 93.9768 52.7402 92.167C55.0116 91.2662 56.8399 90.2428 58.1504 89.1973C58.803 88.6766 59.3877 88.1021 59.8301 87.4785C60.2484 86.8887 60.6924 86.0373 60.6924 85.0156C60.6924 84.1589 60.378 83.4298 60.0527 82.8965C59.717 82.3461 59.2754 81.847 58.7949 81.4014C57.8335 80.5097 56.5122 79.6453 54.9062 78.8545C51.677 77.2643 47.0043 75.8297 40.9355 75.1211L39.3936 74.9414L38.5479 76.2441L33.1211 84.6143L33.1143 84.624L33.1074 84.6348C33.1023 84.6427 33.0955 84.6509 33.0801 84.6592C33.0639 84.6678 33.0273 84.6826 32.9639 84.6826C32.9143 84.6826 32.8817 84.6711 32.8633 84.6611C32.8458 84.6516 32.8314 84.6386 32.8184 84.6182L32.8115 84.6064L32.8047 84.5957L27.3721 76.2412L26.5254 74.9395L24.9824 75.1211ZM32.9639 13.5732C24.0672 13.5732 16.7765 20.7447 16.7764 29.6143C16.7764 38.4694 24.0734 45.6201 32.9639 45.6201C41.8542 45.6199 49.1514 38.4692 49.1514 29.6143C49.1512 20.7273 41.8585 13.5734 32.9639 13.5732Z"
                fill="#FCA14E"
                stroke="black"
                strokeWidth="5"
              />
            </Svg>
          </Marker>

          {/* MARCADOR DO MOTORISTA */}
          {driverLocation && (
            <Marker
              coordinate={{
                latitude: driverLocation.coords.latitude,
                longitude: driverLocation.coords.longitude,
              }}
              title="Motorista"
              description="Posição atual do motorista"
              onPress={goToDriver}
            >
              <Image
                source={require("../../assets/animations/truck.gif")}
                style={{ width: 70, height: 70 }}
                resizeMode="contain"
              />
            </Marker>
          )}
        </MapView>
      </View>

      {/* HEADER */}
      <AppHeader logoSource={appLogo} onLogout={handleLogout} />

      {/* PAINEL INFERIOR */}
      <View style={styles.panelContainer}>
        {selectedDelivery.status === "Entregue" ? (
          <DeliveryDelivered
            clientName={selectedDelivery.client}
            street={selectedDelivery.addressStreet}
            neighborhoodAndCity={selectedDelivery.addressCity}
            phone={selectedDelivery.phone}
            orderNumber={selectedDelivery.orderNumber}
            status={selectedDelivery.status}
            driverName="Motorista"
          />
        ) : selectedDelivery.status === "Em rota" ? (
          <DeliveryInRoute
            clientName={selectedDelivery.client}
            street={selectedDelivery.addressStreet}
            neighborhoodAndCity={selectedDelivery.addressCity}
            phone={selectedDelivery.phone}
            orderNumber={selectedDelivery.orderNumber}
            status={selectedDelivery.status}
            driverName="Motorista"
          />
        ) : selectedDelivery.status === "Não entregue" ? (
          <DeliveryNotDelivered
            clientName={selectedDelivery.client}
            street={selectedDelivery.addressStreet}
            neighborhoodAndCity={selectedDelivery.addressCity}
            phone={selectedDelivery.phone}
            orderNumber={selectedDelivery.orderNumber}
            status={selectedDelivery.status}
            motivo={selectedDelivery.motivo}
            driverName="Motorista"
          />
        ) : selectedDelivery.status === "Cancelada" ? (
          <DeliveryCanceled
            clientName={selectedDelivery.client}
            street={selectedDelivery.addressStreet}
            neighborhoodAndCity={selectedDelivery.addressCity}
            phone={selectedDelivery.phone}
            orderNumber={selectedDelivery.orderNumber}
            status={selectedDelivery.status}
            driverName="Motorista"
          />
        ) : (
          <DeliveryNotStarted
            clientName={selectedDelivery.client}
            street={selectedDelivery.addressStreet}
            neighborhoodAndCity={selectedDelivery.addressCity}
            phone={selectedDelivery.phone}
            orderNumber={selectedDelivery.orderNumber}
            status={selectedDelivery.status}
            driverName="Motorista"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  panelContainer: {
    backgroundColor: "#FFF",
    height: "40%",
    overflow: "hidden",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
  },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  errorText: {
    fontSize: 18,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 16,
  },
  retryText: {
    fontSize: 16,
    color: "#0066CC",
    textDecorationLine: "underline",
  },
});
