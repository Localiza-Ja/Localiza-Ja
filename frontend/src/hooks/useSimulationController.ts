// frontend/src/hooks/useSimulationController.ts


/**
 * Controla o estado de alto nível da simulação de rota.
 *
 * IMPORTANTE:
 * - Esta lógica é independente do mapa.
 * - O mapa apenas consome `mode` e flags derivadas.
 * - Para desativar a simulação no futuro, basta nunca chamar `start()`
 *   e ignorar os dados simulados no map.tsx.
 */

import { useCallback, useState } from "react";

export type SimulationMode = "off" | "running" | "paused" | "wrongRoute";
export function useSimulationController() {
  const [enabled, setEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  const [wrongRoute, setWrongRoute] = useState(false);

  /**
   * Inicia a simulação:
   * - Liga simulação
   * - Despausa
   * - Garante que começa na rota correta (sem erro ativo)
   */
  const start = useCallback(() => {
    setEnabled(true);
    setPaused(false);
    setWrongRoute(false);
  }, []);

  /**
   * Pausa a simulação:
   * - NÃO desliga
   * - NÃO mexe no “errando” ou não, só congela o movimento
   */
  const pause = useCallback(() => {
    setPaused(true);
  }, []);

  /**
   * Retoma a simulação:
   * - Volta a andar de onde parou
   * - Mantém se estava em rota correta ou errada
   */
  const resume = useCallback(() => {
    setPaused(false);
  }, []);

  /**
   * Encerra totalmente a simulação:
   * - Desliga
   * - Reseta pausa
   * - Reseta rota errada
   */
  const stop = useCallback(() => {
    setEnabled(false);
    setPaused(false);
    setWrongRoute(false);
  }, []);

  /**
   * Alterna entre:
   * - Rota correta  → Rota errada
   * - Rota errada   → Rota correta
   *
   * Não pausa nem desliga a simulação.
   * Só muda a forma que o mapa vai desenhar/mover o ponteiro.
   */
  const toggleWrongRoute = useCallback(() => {
    setWrongRoute((prev) => !prev);
  }, []);

  const isEnabled = enabled;
  const isPaused = paused;
  const isWrongRoute = wrongRoute;

  const mode: SimulationMode = !enabled
    ? "off"
    : paused
    ? "paused"
    : wrongRoute
    ? "wrongRoute"
    : "running";

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
