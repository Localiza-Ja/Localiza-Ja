import { router, useLocalSearchParams } from "expo-router";
import { View, StyleSheet, Text, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker } from "react-native-maps";
import React, { useRef, useState, useEffect } from "react";
import { api, Delivery as APIDelivery } from "../services/api";
import AppHeader from "../components/AppHeader";
import DeliveryInRoute from "../components/DeliveryInRoute";
import DeliveryNotStarted from "../components/DeliveryNotStarted";

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
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const params = useLocalSearchParams<{ pedido: string }>();
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null
  );
  const [deliveriesData, setDeliveriesData] = useState<Delivery[]>([]);
  const [driverLocation, setDriverLocation] = useState<LocationObject | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [motoristaId, setMotoristaId] = useState<string | null>(null);

  // 1. CARREGAMENTO INICIAL DA ENTREGA
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

        // Geocodificar
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
        };

        setDeliveriesData([mappedDelivery]);
        setSelectedDelivery(mappedDelivery);
        setMotoristaId(entrega.motorista_id?.toString() || null);

        // Centralizar no destino
        mapRef.current?.animateToRegion(
          {
            latitude: deliveryCoords.latitude,
            longitude: deliveryCoords.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
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

  // 2. ATUALIZAÇÃO DO MOTORISTA A CADA 5 MINUTOS
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

  const handleLogout = () => router.push("/");
  const handleDeliveryPress = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    mapRef.current?.animateToRegion(
      {
        latitude: delivery.latitude,
        longitude: delivery.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000
    );
  };

  // LOADING
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Carregando entrega...</Text>
      </View>
    );
  }

  // ERRO
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
          {/* DESTINO */}
          <Marker
            key={`delivery-${selectedDelivery.id}`}
            coordinate={{
              latitude: selectedDelivery.latitude,
              longitude: selectedDelivery.longitude,
            }}
            pinColor="red"
            title="Destino da Entrega"
            description={selectedDelivery.addressStreet}
            onPress={() => handleDeliveryPress(selectedDelivery)}
          />

          {/* MOTORISTA */}
          {driverLocation && (
            <Marker
              key="driver"
              coordinate={{
                latitude: driverLocation.coords.latitude,
                longitude: driverLocation.coords.longitude,
              }}
              title="Motorista"
              description="Atualizado agora"
              pinColor="blue"
            />
          )}
        </MapView>
      </View>

      {/* HEADER */}
      <AppHeader logoSource={appLogo} onLogout={handleLogout} />

      {/* PAINEL */}
      <View style={styles.panelContainer}>
        {selectedDelivery.status === "Pendente" ? (
          <DeliveryNotStarted
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

// ESTILOS
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
