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
    // garante que temos localização válida e entrega com coordenadas
    if (
      !driverLocation ||
      !selectedDelivery ||
      typeof selectedDelivery.latitude !== "number" ||
      typeof selectedDelivery.longitude !== "number"
    ) {
      setRouteCoordinates([]);
      return;
    }

    const fetchRoute = async () => {
      try {
        const startCoords = `${driverLocation.coords.longitude},${driverLocation.coords.latitude}`;
        const endCoords = `${selectedDelivery.longitude},${selectedDelivery.latitude}`;
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startCoords}&end=${endCoords}`;

        const response = await fetch(url);

        const contentType = response.headers.get("content-type") || "";
        const text = await response.text();

        // se status não for 2xx, loga e não tenta parsear
        if (!response.ok) {
          console.error(
            "ERRO NA API DE ROTAS (status):",
            response.status,
            response.statusText,
            "| trecho da resposta:",
            text.slice(0, 200)
          );
          setRouteCoordinates([]);
          return;
        }

        if (!contentType.toLowerCase().includes("json")) {
          console.error(
            "ERRO NA API DE ROTAS (content-type sem json):",
            contentType,
            "| trecho da resposta:",
            text.slice(0, 200)
          );
          setRouteCoordinates([]);
          return;
        }

        let json: any;
        try {
          json = JSON.parse(text);
        } catch (parseError) {
          console.error(
            "ERRO AO PARSEAR JSON DO ORS:",
            parseError,
            "| trecho da resposta:",
            text.slice(0, 200)
          );
          setRouteCoordinates([]);
          return;
        }

        if (json.features && json.features.length > 0) {
          const points = json.features[0].geometry.coordinates.map(
            (p: number[]) => ({
              latitude: p[1],
              longitude: p[0],
            })
          );
          setRouteCoordinates(points);
        } else {
          console.error("ERRO NA API DE ROTAS (sem features):", json);
          setRouteCoordinates([]);
        }
      } catch (error) {
        console.error("ERRO AO BUSCAR ROTA DO ORS:", error);
        setRouteCoordinates([]);
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
