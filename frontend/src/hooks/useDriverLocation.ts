// frontend/src/hooks/useDriverLocation.ts

/**
 * Hook responsável por gerenciar a localização em tempo real do motorista.
 * - Solicita permissões de localização (foreground e background).
 * - Inicia um watch de localização com alta precisão.
 * - Mantém o último LocationObject e o histórico de coordenadas percorridas.
 */

import { useEffect, useState } from "react";
import { Alert } from "react-native";
import * as Location from "expo-location";

export function useDriverLocation() {
  const [driverLocation, setDriverLocation] =
    useState<Location.LocationObject | null>(null);
  const [pastCoordinates, setPastCoordinates] = useState<
    Location.LocationObject["coords"][]
  >([]);

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

  return {
    driverLocation,
    pastCoordinates,
  };
}
