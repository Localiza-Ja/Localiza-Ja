// src/app/map.tsx

import { router } from "expo-router";
import { View, StyleSheet } from "react-native";
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker } from "react-native-maps";
import React, { useRef, useState, useEffect } from "react";
import * as Location from 'expo-location';

import { deliveries } from "../data/deliveries";
import { Delivery } from "../types";
import AppHeader from "../components/AppHeader";
import DeliveryPanel from "../components/DeliveryPanel"; // <-- A ÚNICA PEÇA DO PAINEL AQUI

const appLogo = require("../../assets/images/nt2-logo.png");

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(deliveries[0] || null);
  const [deliveriesData, setDeliveriesData] = useState<Delivery[]>(deliveries);
  const [driverLocation, setDriverLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    const startWatching = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permissão de localização negada');
        return;
      }
      subscription = await Location.watchPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 10,
      }, (location) => {
        setDriverLocation(location);
      });
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
    mapRef.current?.animateToRegion({
      latitude: delivery.latitude,
      longitude: delivery.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  }

  function handleUpdateStatus(deliveryId: number, newStatus: string) {
    const updatedDeliveries = deliveriesData.map((d) => (d.id === deliveryId ? { ...d, status: newStatus } : d));
    setDeliveriesData(updatedDeliveries);
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#21222D" />
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        {deliveriesData.map((delivery) => (
          <Marker
            key={`delivery-${delivery.id}`}
            coordinate={{ latitude: delivery.latitude, longitude: delivery.longitude }}
            pinColor="red"
          />
        ))}
        {driverLocation && (
          <Marker
            key="driver"
            coordinate={{ latitude: driverLocation.coords.latitude, longitude: driverLocation.coords.longitude }}
            title="Sua Posição"
            pinColor="blue"
          />
        )}
      </MapView>

      <AppHeader logoSource={appLogo} onLogout={handleLogout} />

      {/* AGORA SIM: A tela do mapa só se preocupa em renderizar o painel */}
      <DeliveryPanel
        deliveriesData={deliveriesData}
        selectedDelivery={selectedDelivery}
        onDeliveryPress={handleDeliveryPress}
        onUpdateStatus={handleUpdateStatus}
        onLogout={handleLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, map: { ...StyleSheet.absoluteFillObject } });