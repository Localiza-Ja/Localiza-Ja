// src/hooks/useIotLocation.ts
/**
 * Hook responsável por buscar periodicamente a última localização vinda do IoT.
 *
 * Ele NÃO mexe em nada do mapa sozinho.
 * Só expõe:
 *  - iotLocation → última posição válida (LocationObject) ou null
 *  - hasData → se já recebeu pelo menos 1 localização
 *  - error → mensagem de erro caso falhe ou não haja dados
 */

import { useEffect, useState, useRef } from "react";
import * as Location from "expo-location";
import { api } from "../services/api";

type LocationObject = Location.LocationObject;

type LocalizacaoApi = {
  latitude: number;
  longitude: number;
  data_hora?: string;
};

type LocalizacoesResponse = {
  Localizacoes?: LocalizacaoApi[];
};

// --- Helpers para distância e heading (somente front, sem banco/back) ---
const EARTH_RADIUS_M = 6371000; // raio médio da Terra em metros

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Distância em metros entre 2 pontos (lat/lng)
function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

// Bearing em graus (0–360) de um ponto para o outro
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  let θ = Math.atan2(y, x); // radianos
  let bearing = (θ * 180) / Math.PI; // graus

  // normaliza para 0–360
  bearing = (bearing + 360) % 360;
  return bearing;
}

/**
 * useIotLocation
 *
 * @param motoristaId id do motorista para buscar localizações no IoT
 * @param iotActive se true, ativa a leitura do IoT; se false, desliga e zera estado
 */
export function useIotLocation(
  motoristaId: string | number | null | undefined,
  iotActive: boolean
) {
  const [iotLocation, setIotLocation] = useState<LocationObject | null>(null);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guarda o último ponto IoT em memória somente no front
  const previousPointRef = useRef<{
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    // se não tem motorista ou o IoT não está ativo, limpamos tudo
    if (!motoristaId || !iotActive) {
      setIotLocation(null);
      setHasData(false);
      setError(null);
      previousPointRef.current = null;
      return;
    }

    let cancelled = false;

    const fetchLocation = async () => {
      try {
        console.log("[IOT] Buscando localização do motorista", motoristaId);

        const res = await api.get<LocalizacoesResponse>(
          `/localizacoes/motorista/${motoristaId}`
        );

        const locs = res.data?.Localizacoes;

        if (!locs || !Array.isArray(locs) || locs.length === 0) {
          if (!cancelled) {
            setError("Nenhuma localização do IoT encontrada.");
            setHasData(false);
            setIotLocation(null);
            previousPointRef.current = null;
          }
          return;
        }

        // pega o último registro retornado pelo back (mais recente)
        const last = locs[locs.length - 1];

        const lat = Number(last.latitude);
        const lng = Number(last.longitude);

        if (Number.isNaN(lat) || Number.isNaN(lng) || lat === 0 || lng === 0) {
          if (!cancelled) {
            setError("Localização IoT inválida (lat/lng).");
            setHasData(false);
            setIotLocation(null);
          }
          return;
        }

        const timestampMs = last.data_hora
          ? new Date(last.data_hora).getTime()
          : Date.now();

        // valores padrão para o primeiro ponto
        let heading = 0;
        let speed = 0;

        // se já temos um ponto anterior, calculamos heading e speed
        const previous = previousPointRef.current;
        if (previous) {
          const distance = haversineDistanceMeters(
            previous.latitude,
            previous.longitude,
            lat,
            lng
          );

          const deltaTimeSec = (timestampMs - previous.timestamp) / 1000;

          if (deltaTimeSec > 0 && distance > 0) {
            // velocidade em m/s
            speed = distance / deltaTimeSec;
            // heading em graus, 0–360
            heading = calculateBearing(
              previous.latitude,
              previous.longitude,
              lat,
              lng
            );
          }
        }

        // atualiza o ref para o próximo ciclo (mesmo no primeiro ponto)
        previousPointRef.current = {
          latitude: lat,
          longitude: lng,
          timestamp: timestampMs,
        };

        const location: LocationObject = {
          coords: {
            latitude: lat,
            longitude: lng,
            accuracy: 5,
            altitude: 0,
            altitudeAccuracy: null,
            heading,
            speed,
          },
          timestamp: timestampMs,
        };

        if (!cancelled) {
          setIotLocation(location);
          setHasData(true);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Erro ao buscar localização IoT:", err);
          setError("Erro ao buscar localização do IoT.");
          setIotLocation(null);
          setHasData(false);
          previousPointRef.current = null;
        }
      }
    };

    // primeira vez
    fetchLocation();
    const intervalId = setInterval(fetchLocation, 5000); // 5 segundos

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [motoristaId, iotActive]);

  return { iotLocation, hasData, error };
}
