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

import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { api } from "../services/api"; // usa sua api.ts (export const api = ...)

type LocationObject = Location.LocationObject;

type LocalizacaoApi = {
  latitude: number;
  longitude: number;
  data_hora?: string;
};

type LocalizacoesResponse = {
  Localizacoes?: LocalizacaoApi[];
};

export function useIotLocation(
  motoristaId: string | null | undefined,
  iotActive: boolean
) {
  const [iotLocation, setIotLocation] = useState<LocationObject | null>(null);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!motoristaId || !iotActive) {
      setIotLocation(null);
      setHasData(false);
      setError(null);
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
            setHasData(false);
            setError("Nenhuma localização recebida do IoT.");
          }
          return;
        }

        const last = locs[locs.length - 1];
        const lat = Number(last.latitude);
        const lng = Number(last.longitude);

        if (isNaN(lat) || isNaN(lng)) {
          if (!cancelled) {
            setHasData(false);
            setError("Localização do IoT inválida.");
          }
          return;
        }

        const location: LocationObject = {
          coords: {
            latitude: lat,
            longitude: lng,
            accuracy: 5,
            altitude: 0,
            altitudeAccuracy: null,
            heading: 0,
            speed: 0,
          },
          timestamp: last.data_hora
            ? new Date(last.data_hora).getTime()
            : Date.now(),
        };

        if (!cancelled) {
          setIotLocation(location);
          setHasData(true);
          setError(null);
        }
      } catch (err) {
        console.log("[IOT] Erro ao buscar localização:", err);
        if (!cancelled) {
          setHasData(false);
          setError("Falha ao buscar localização do IoT.");
        }
      }
    };

    // primeira vez
    fetchLocation();
    const intervalId = setInterval(fetchLocation, 5000); //50 segundos

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [motoristaId, iotActive]);

  return { iotLocation, hasData, error };
}
