// frontend/src/hooks/useDriverLocation.ts

/**
 * Hook responsável por gerenciar a localização em tempo real do motorista.
 * - Solicita permissões de localização (foreground e background).
 * - Inicia um watch de localização com alta precisão.
 * - Mantém o último LocationObject e o histórico de coordenadas percorridas.
 */

import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { useCustomAlert } from "../components/CustomAlert";

export function useDriverLocation() {
  const [driverLocation, setDriverLocation] =
    useState<Location.LocationObject | null>(null);
  const [pastCoordinates, setPastCoordinates] = useState<
    Location.LocationObject["coords"][]
  >([]);

  const { showAlert } = useCustomAlert();

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const requestPermissionsAndStartWatching = async () => {
      let { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== "granted") {
        showAlert({
          title: "Permissão negada",
          message: "A permissão de localização é necessária.",
          type: "warning",
        });
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
  }, [showAlert]);

  return {
    driverLocation,
    pastCoordinates,
  };
}
