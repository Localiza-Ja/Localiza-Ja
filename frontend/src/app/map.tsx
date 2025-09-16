
import { router } from "expo-router";
import { View, StyleSheet } from "react-native";
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker } from "react-native-maps";
import React, { useMemo, useRef, useState, useEffect } from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import * as Location from 'expo-location';

import { deliveries } from "../data/deliveries";
import { Delivery } from "../types";
import DeliveriesList from "../components/DeliveriesList";
import AppHeader from "../components/AppHeader";

const appLogo = require("../../assets/images/nt2-logo.png");

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(deliveries[0] || null);
  const [deliveriesData, setDeliveriesData] = useState<Delivery[]>(deliveries);
  const [driverLocation, setDriverLocation] = useState<Location.LocationObject | null>(null);
  
 
  const [activeSnapIndex, setActiveSnapIndex] = useState(1); 
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
  

  const snapPoints = useMemo(() => ["15%", "60%", "95%"], []);
  
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
    const updatedDeliveries = deliveriesData.map((delivery) => {
      if (delivery.id === deliveryId) {
        return { ...delivery, status: newStatus };
      }
      return delivery;
    });
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
            coordinate={{
              latitude: driverLocation.coords.latitude,
              longitude: driverLocation.coords.longitude,
            }}
            title="Sua Posição"
            pinColor="blue"
          />
        )}
      </MapView>

      <AppHeader logoSource={appLogo} onLogout={handleLogout} />

      <BottomSheet 
        index={1} 
        snapPoints={snapPoints} 
        onChange={(index) => setActiveSnapIndex(index)} 
        handleIndicatorStyle={{ backgroundColor: '#010409ff', width: 50 }} 
        backgroundStyle={{ backgroundColor: 'white' }}
      >
        
        <DeliveriesList
          data={deliveriesData}
          onDeliveryPress={handleDeliveryPress}
          onUpdateStatus={handleUpdateStatus}
          activeSnapIndex={activeSnapIndex}
          selectedDelivery={selectedDelivery}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, map: { ...StyleSheet.absoluteFillObject } });