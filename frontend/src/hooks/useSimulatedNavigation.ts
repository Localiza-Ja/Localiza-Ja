import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLng } from "react-native-maps";

type SimOptions = {
  enabled: boolean;
  path: LatLng[]; // polyline da rota
  speedKmh?: number; // velocidade média
  tickMs?: number; // frequência da simulação
  paused?: boolean; // 👈 NOVO: pausa a simulação sem resetar o progresso
};

export type SimulatedLocation = {
  coords: {
    latitude: number;
    longitude: number;
    speed: number; // m/s
    heading: number; // graus 0-360
    accuracy: number;
    altitude: number;
  };
};

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

function haversine(a: LatLng, b: LatLng) {
  const R = 6371000; // m
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const aa =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

// atraso visual em metros (puxa o carro um pouco para trás da rota)
const BACK_OFFSET_METERS = 25;

export function useSimulatedNavigation({
  enabled,
  path,
  speedKmh = 35,
  tickMs = 500,
  paused = false, // 👈 NOVO: valor padrão
}: SimOptions): SimulatedLocation | null {
  const [location, setLocation] = useState<SimulatedLocation | null>(null);

  // progresso total em metros ao longo da rota
  const progressRef = useRef(0);

  // pré-calcula segmentos + cumulativo
  const segments = useMemo(() => {
    if (!path || path.length < 2) return [];

    const segs: {
      from: LatLng;
      to: LatLng;
      length: number;
      cumStart: number; // distância acumulada até o início desse segmento
      cumEnd: number; // distância acumulada até o fim desse segmento
    }[] = [];

    let acc = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const len = haversine(from, to);
      if (len <= 0) continue;

      const cumStart = acc;
      const cumEnd = acc + len;
      segs.push({ from, to, length: len, cumStart, cumEnd });
      acc = cumEnd;
    }

    return segs;
  }, [path]);

  const totalLength = segments.length
    ? segments[segments.length - 1].cumEnd
    : 0;

  const speedMs = (speedKmh * 1000) / 3600;

  // ✅ reset só quando habilita/desabilita simulação ou muda velocidade
  useEffect(() => {
    progressRef.current = 0;

    if (!enabled || segments.length === 0) {
      setLocation(null);
      return;
    }

    // começa exatamente no primeiro ponto da rota
    setLocation({
      coords: {
        latitude: path[0].latitude,
        longitude: path[0].longitude,
        speed: speedMs,
        heading:
          segments.length > 0 ? bearing(segments[0].from, segments[0].to) : 0,
        accuracy: 5,
        altitude: 0,
      },
    });
  }, [enabled, speedMs, segments.length, path]); // mantive a lógica, só acrescentei deps relacionadas

  useEffect(() => {
    // 👇 se estiver pausado, NÃO cria/atualiza o intervalo de avanço
    if (!enabled || paused || segments.length === 0 || totalLength === 0) {
      return;
    }

    const id = setInterval(() => {
      // avança progresso real
      const step = speedMs * (tickMs / 1000);
      let progress = progressRef.current + step;

      if (progress > totalLength) {
        progress = totalLength; // trava no fim (não reinicia)
      }
      progressRef.current = progress;

      // aplica atraso visual
      let displayProgress = progress - BACK_OFFSET_METERS;
      if (displayProgress < 0) displayProgress = 0;
      if (displayProgress > totalLength) displayProgress = totalLength;

      // encontra o segmento em que o displayProgress está
      const seg =
        segments.find(
          (s) => displayProgress >= s.cumStart && displayProgress <= s.cumEnd
        ) ?? segments[segments.length - 1];

      const distOnSeg = displayProgress - seg.cumStart;
      const t = seg.length > 0 ? distOnSeg / seg.length : 0;

      const pos = interpolate(seg.from, seg.to, t);
      const hdg = bearing(seg.from, seg.to);

      setLocation({
        coords: {
          latitude: pos.latitude,
          longitude: pos.longitude,
          speed: speedMs,
          heading: hdg,
          accuracy: 5,
          altitude: 0,
        },
      });
    }, tickMs);

    return () => clearInterval(id);
  }, [enabled, paused, segments, totalLength, speedMs, tickMs]);

  return enabled ? location : null;
}
