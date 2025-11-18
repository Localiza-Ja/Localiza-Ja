// frontend/src/hooks/useWrongRoute.ts

/**
 * Hook responsável por gerar a ROTA ERRADA para o modo "Errar".
 *
 * - Usa um ponto de origem (origin) passado pelo mapa na hora que você clica em "Errar".
 * - Chama a API do ORS até um destino ERRADO fixo.
 * - Retorna um polyline (LatLng[]) que só o ponteiro vai seguir.
 * - NÃO desenha nada no mapa: o mapa continua mostrando apenas a rota correta.
 */

import { useEffect, useState } from "react";
import { LatLng } from "react-native-maps";
import { ORS_API_KEY } from "../utils/geocoding";

type UseWrongRouteParams = {
  isWrongRoute: boolean;
  origin: LatLng | null; // ponto onde o carro estava quando você clicou em "Errar"
};

export function useWrongRoute({
  isWrongRoute,
  origin,
}: UseWrongRouteParams): LatLng[] {
  const [wrongRouteCoordinates, setWrongRouteCoordinates] = useState<LatLng[]>(
    []
  );

  useEffect(() => {
    // Se saiu do modo "Errar", limpamos a rota errada.
    if (!isWrongRoute) {
      setWrongRouteCoordinates([]);
      return;
    }

    // Se não temos origem válida, não dá pra traçar rota.
    if (!origin) {
      console.warn(
        "[ERRAR] Origin inválida ou ausente, não será traçada rota errada."
      );
      setWrongRouteCoordinates([]);
      return;
    }

    const fetchWrongRoute = async () => {
      try {
        // DESTINO ERRADO FIXO
        // Ajuste esses valores para um ponto realmente "errado" no seu cenário.
        const WRONG_DESTINATION: LatLng = {
          latitude: -22.9056, // exemplo: centro de Campinas
          longitude: -47.0608,
        };

        const start = `${origin.longitude},${origin.latitude}`;
        const end = `${WRONG_DESTINATION.longitude},${WRONG_DESTINATION.latitude}`;

        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${start}&end=${end}`;

        console.log(
          "%c[ERRAR] Chamando ORS para rota errada:",
          "color:#ff9800;font-weight:bold;",
          { origin, WRONG_DESTINATION, url }
        );

        const response = await fetch(url);
        const text = await response.text();

        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
        }

        if (!response.ok) {
          const snippet = text.slice(0, 200);
          console.warn(
            "ERRO NA API DE ROTA ERRADA (status):",
            response.status,
            "| trecho da resposta:",
            snippet
          );

          if (
            response.status === 429 ||
            json?.error === "Rate Limit Exceeded"
          ) {
            console.warn(
              "ERRO NA API DE ROTA ERRADA: Rate Limit Exceeded. Mantendo rota errada vazia."
            );
          }

          setWrongRouteCoordinates([]);
          return;
        }

        if (!json || !json.features || !json.features[0]) {
          console.warn(
            "ERRO NA API DE ROTA ERRADA: resposta sem features:",
            json
          );
          setWrongRouteCoordinates([]);
          return;
        }

        const coords: LatLng[] = json.features[0].geometry.coordinates.map(
          (p: number[]) => ({
            latitude: p[1],
            longitude: p[0],
          })
        );

        console.log(
          "%c[ERRAR] Rota errada encontrada!",
          "color:#4caf50;font-weight:bold;",
          `(${coords.length} pontos)`
        );

        setWrongRouteCoordinates(coords);
      } catch (error) {
        console.error("ERRO AO BUSCAR ROTA ERRADA:", error);
        setWrongRouteCoordinates([]);
      }
    };

    fetchWrongRoute();
  }, [isWrongRoute, origin?.latitude, origin?.longitude]);
  return wrongRouteCoordinates;
}
