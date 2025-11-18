// frontend/src/hooks/useRecalculatedCorrectRoute.ts


/**
 * Recalcula a ROTA CORRETA (sem mostrar rota nova) de forma leve:
 *
 * - Só roda quando `enabled === true` (ou seja, quando a simulação estiver ligada
 *   e você quiser recalcular — no nosso caso: simulação + modo ERRAR).
 * - Usa a localização "efetiva" (no seu cenário, a posição do ponteiro/driver).
 * - Chama a ORS num intervalo fixo (ex: 30s) e também uma vez logo no início.
 * - Se der erro ou faltar dados, simplesmente mantém o que já tinha ou limpa.
 *
 * A rota retornada será usada APENAS para atualizar a rota correta desenhada em azul.
 */

import { useEffect, useState } from "react";
import { LatLng } from "react-native-maps";
import { ORS_API_KEY } from "../utils/geocoding";
import { Delivery } from "../types";

type LocationLike = {
  coords: {
    latitude: number;
    longitude: number;
  };
};

type UseRecalculatedCorrectRouteParams = {
  enabled: boolean;
  currentLocation: LocationLike | null;
  selectedDelivery: Delivery | null;
};

export function useRecalculatedCorrectRoute({
  enabled,
  currentLocation,
  selectedDelivery,
}: UseRecalculatedCorrectRouteParams): LatLng[] {
  const [recalculatedCoordinates, setRecalculatedCoordinates] = useState<
    LatLng[]
  >([]);

  useEffect(() => {
    // Se recálculo não estiver habilitado, limpa e não faz nada.
    if (!enabled) {
      if (recalculatedCoordinates.length > 0) {
        setRecalculatedCoordinates([]);
      }
      return;
    }

    if (
      !currentLocation ||
      !selectedDelivery ||
      !selectedDelivery.latitude ||
      !selectedDelivery.longitude
    ) {
      if (recalculatedCoordinates.length > 0) {
        setRecalculatedCoordinates([]);
      }
      return;
    }

    let cancelled = false;

    const fetchRoute = async () => {
      try {
        const startLat = currentLocation.coords.latitude;
        const startLng = currentLocation.coords.longitude;
        const endLat = selectedDelivery.latitude!;
        const endLng = selectedDelivery.longitude!;

        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startLng},${startLat}&end=${endLng},${endLat}`;

        const response = await fetch(url);
        const json = await response.json();

        if (cancelled) return;

        if (json.features && json.features.length > 0) {
          const points: LatLng[] = json.features[0].geometry.coordinates.map(
            (p: number[]) => ({
              latitude: p[1],
              longitude: p[0],
            })
          );

          if (points.length > 1) {
            setRecalculatedCoordinates(points);
          }
        }
      } catch (error) {
        // Em caso de erro, não travamos nada: mantemos o que já existe.
      }
    };
    fetchRoute();

    // E depois vai recalculando a cada 30 segundos (pode ajustar se quiser).
    const intervalId = setInterval(fetchRoute, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [
    enabled,
    currentLocation?.coords.latitude,
    currentLocation?.coords.longitude,
    selectedDelivery?.id,
    selectedDelivery?.latitude,
    selectedDelivery?.longitude,
    recalculatedCoordinates.length,
  ]);

  return recalculatedCoordinates;
}
