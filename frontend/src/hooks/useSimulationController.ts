// frontend/src/hooks/useSimulationController.ts
import { useCallback, useState } from "react";

export type SimulationMode = "off" | "running" | "paused" | "wrongRoute";

type SimulationState = {
  enabled: boolean;
  paused: boolean;
  wrongRoute: boolean;
};

/**
 * Controla o estado de alto nível da simulação de rota.
 *
 * - Agora usamos flags internas (enabled/paused/wrongRoute)
 *   para permitir que "Pausar/Retomar" e "Errar/Correta" sejam
 *   independentes.
 * - `mode` continua existindo para facilitar integração com a UI
 *   (ícone, estados visuais).
 */
export function useSimulationController() {
  const [state, setState] = useState<SimulationState>({
    enabled: false,
    paused: false,
    wrongRoute: false,
  });

  const start = useCallback(() => {
    // Liga simulação, despausa e volta para rota correta
    setState({
      enabled: true,
      paused: false,
      wrongRoute: false,
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (!prev.enabled || prev.paused) return prev;
      return { ...prev, paused: true };
    });
  }, []);

  const resume = useCallback(() => {
    setState((prev) => {
      if (!prev.enabled || !prev.paused) return prev;
      return { ...prev, paused: false };
    });
  }, []);

  const stop = useCallback(() => {
    // Desliga toda a simulação
    return setState({
      enabled: false,
      paused: false,
      wrongRoute: false,
    });
  }, []);

  const toggleWrongRoute = useCallback(() => {
    setState((prev) => {
      if (!prev.enabled) return prev;
      return { ...prev, wrongRoute: !prev.wrongRoute };
    });
  }, []);

  // Deriva o "mode" a partir das flags internas
  const mode: SimulationMode = !state.enabled
    ? "off"
    : state.paused
    ? "paused"
    : state.wrongRoute
    ? "wrongRoute"
    : "running";

  const isEnabled = state.enabled;
  const isPaused = state.paused;
  const isWrongRoute = state.wrongRoute;

  return {
    mode,
    isEnabled,
    isPaused,
    isWrongRoute,
    start,
    pause,
    resume,
    stop,
    toggleWrongRoute,
  };
}
