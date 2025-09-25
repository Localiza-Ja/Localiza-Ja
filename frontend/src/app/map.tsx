import { router } from "expo-router";
import { View, StyleSheet, Image } from "react-native";
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker, Polyline } from "react-native-maps"; 
import React, { useRef, useState, useEffect } from "react";
import * as Location from 'expo-location';
import { deliveries } from "../data/deliveries";
import { Delivery } from "../types";
import AppHeader from "../components/AppHeader";
import DeliveryPanel from "../components/DeliveryPanel";

const appLogo = require("../../assets/images/lj-logo.png");
const navigationArrow = require("../../assets/images/navigation-arrow.png");

// Lembre-se de colocar sua chave de API aqui
const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY4ODY5ZTE2NzU2YjRjYTJiNDE0NzFmMDhjMmJlZjg1IiwiaCI6Im11cm11cjY0In0="; 

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(deliveries.find(d => d.status !== 'Finalizada' && d.status !== 'Cancelada') || null);
  const [deliveriesData, setDeliveriesData] = useState<Delivery[]>(deliveries);
  const [driverLocation, setDriverLocation] = useState<Location.LocationObject | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number; }[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
  
    const requestPermissionsAndStartWatching = async () => {
      let { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.error('Permissão de localização em primeiro plano negada');
        return;
      }
  
      let { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('Permissão de localização em segundo plano negada. Funcionalidade no Android Auto pode ser limitada.');
      }
      
      subscription = await Location.watchPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 10,
      }, (location) => {
        setDriverLocation(location);
      });
    };
  
    requestPermissionsAndStartWatching();
  
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);
  
  useEffect(() => {
    if (!driverLocation || !selectedDelivery) {
      setRouteCoordinates([]);
      return;
    }
    const fetchRoute = async () => {
      try {
        const startCoords = `${driverLocation.coords.longitude},${driverLocation.coords.latitude}`;
        const endCoords = `${selectedDelivery.longitude},${selectedDelivery.latitude}`;
        const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startCoords}&end=${endCoords}`);
        const json = await response.json();
        if (json.features && json.features.length > 0) {
          const coordinates = json.features[0].geometry.coordinates;
          const points = coordinates.map((point: number[]) => ({ latitude: point[1], longitude: point[0] }));
          setRouteCoordinates(points);
        }
      } catch (error) {
        console.error("Erro ao buscar rota do ORS:", error);
      }
    };
    fetchRoute();
  }, [driverLocation, selectedDelivery]);

  useEffect(() => {
    if (isNavigating && driverLocation && mapRef.current) {
      mapRef.current.animateCamera({
        center: driverLocation.coords,
        heading: driverLocation.coords.heading || 0,
        pitch: 45,
        zoom: 18,
      }, { duration: 1000 });
    }
  }, [isNavigating, driverLocation]);

  const initialRegion = {
    latitude: deliveries[0]?.latitude || -22.9056,
    longitude: deliveries[0]?.longitude || -47.0608,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };
  
  const handleLogout = () => router.push("/");

  function handleDeliveryPress(delivery: Delivery) {
    setIsNavigating(false);
    setSelectedDelivery(delivery);
  }

  function handleUpdateStatus(deliveryId: number, newStatus: string) {
    const updatedDeliveries = deliveriesData.map((d) => (d.id === deliveryId ? { ...d, status: newStatus } : d));
    setDeliveriesData(updatedDeliveries);
    
    if (selectedDelivery?.id === deliveryId && (newStatus === 'Finalizada' || newStatus === 'Cancelada')) {
      setSelectedDelivery(null);
      setRouteCoordinates([]);
    }
  }

  function handleStartNavigation() {
    if (selectedDelivery) {
      setIsNavigating(true);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#21222D" />
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        
        {deliveriesData
          .filter(delivery => delivery.status !== 'Finalizada' && delivery.status !== 'Cancelada')
          .map((delivery) => (
            <Marker
              key={`delivery-${delivery.id}`}
              coordinate={{ latitude: delivery.latitude, longitude: delivery.longitude }}
              pinColor="red"
            />
        ))}

        {routeCoordinates.length > 0 && selectedDelivery && (
          <Polyline coordinates={routeCoordinates} strokeColor="#1E90FF" strokeWidth={5} />
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
            <Marker coordinate={driverLocation.coords} pinColor="blue" title="Sua Posição" />
        )}
      </MapView>

      <AppHeader logoSource={appLogo} onLogout={handleLogout} />

      <DeliveryPanel
        deliveriesData={deliveriesData}
        selectedDelivery={selectedDelivery}
        onDeliveryPress={handleDeliveryPress}
        onUpdateStatus={handleUpdateStatus}
        onLogout={handleLogout}
        onStartNavigation={handleStartNavigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  navigationIcon: {
    width: 30,
    height: 30,
  },
});