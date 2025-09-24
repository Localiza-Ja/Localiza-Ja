import { router } from "expo-router";
import { View, StyleSheet, Dimensions, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker } from "react-native-maps";
import React, { useRef, useState, useEffect } from "react";
import * as Location from "expo-location";

import { deliveries } from "../data/deliveries";
import { Delivery } from "../types";
import AppHeader from "../components/AppHeader";

import DeliveryInRoute from "../components/DeliveryInRoute";
import DeliveryNotStarted from "../components/DeliveryNotStarted";

const appLogo = require("../../assets/images/nt2-logo.png");

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    deliveries[0] || null
  );
  const [deliveriesData, setDeliveriesData] = useState<Delivery[]>(deliveries);
  const [driverLocation, setDriverLocation] =
    useState<Location.LocationObject | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    const startWatching = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permissão de localização negada");
        return;
      }
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          setDriverLocation(location);
        }
      );
    };
    startWatching();
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const initialRegion = {
    latitude: deliveries[0]?.latitude || -22.9056,
    longitude: deliveries[0]?.longitude || -47.0608,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  const handleLogout = () => router.push("/");

  function handleDeliveryPress(delivery: Delivery) {
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
  }

  function handleUpdateStatus(deliveryId: number, newStatus: string) {
    const updatedDeliveries = deliveriesData.map((d) =>
      d.id === deliveryId ? { ...d, status: newStatus } : d
    );
    setDeliveriesData(updatedDeliveries);
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#21222D" />

      <View style={styles.mapContainer}>
        <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
          {deliveriesData.map((delivery) => (
            <Marker
              key={`delivery-${delivery.id}`}
              coordinate={{
                latitude: delivery.latitude,
                longitude: delivery.longitude,
              }}
              pinColor="red"
              onPress={() => handleDeliveryPress(delivery)}
            />
          ))}
          {driverLocation && (
            <Marker
              key="driver"
              coordinate={{
                latitude: driverLocation.coords.latitude,
                longitude: driverLocation.coords.longitude,
              }}
              title="Sua Posição"
              pinColor="blue"
            />
          )}
        </MapView>
      </View>

      <AppHeader logoSource={appLogo} onLogout={handleLogout} />

      <View style={styles.panelContainer}>
        {selectedDelivery ? (
          selectedDelivery.status === "Pendente" ? (
            <DeliveryInRoute
              clientName={selectedDelivery.client}
              street={selectedDelivery.addressStreet}
              neighborhoodAndCity={selectedDelivery.addressCity}
              phone={selectedDelivery.phone}
              orderNumber={selectedDelivery.orderNumber}
              status={selectedDelivery.status}
              driverName="Roberval Gomes"
            />
          ) : selectedDelivery.status === "Entrega Não Iniciada" ? (
            <DeliveryNotStarted
              clientName={selectedDelivery.client}
              street={selectedDelivery.addressStreet}
              neighborhoodAndCity={selectedDelivery.addressCity}
              phone={selectedDelivery.phone}
              orderNumber={selectedDelivery.orderNumber}
              status={selectedDelivery.status}
              driverName="Astolfo Pereira"
            />
          ) : null
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  panelContainer: {
    backgroundColor: "#FFF",
    height: "40%",
    overflow: "hidden",
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noSelectionText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
});
