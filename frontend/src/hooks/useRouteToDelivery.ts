// frontend/src/hooks/useRouteToDelivery.ts

/**
 * Hook responsável por calcular e manter a rota entre o motorista
 * e a entrega selecionada usando a API OpenRouteService.
 * - Sempre que localização do motorista ou entrega selecionada mudam,
 *   busca uma nova rota.
 * - Permite limpar a rota manualmente (ex.: ao deselecionar entrega).
 */

import { useEffect, useState } from "react";
import { Delivery } from "../types";
import { ORS_API_KEY } from "../utils/geocoding";
import * as Location from "expo-location";

type LatLng = { latitude: number; longitude: number };

export function useRouteToDelivery(
  driverLocation: Location.LocationObject | null,
  selectedDelivery: Delivery | null
) {
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);

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

  const clearRoute = () => setRouteCoordinates([]);

  return {
    routeCoordinates,
    clearRoute,
  };
}
