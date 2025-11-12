// frontend/src/hooks/useInitialMapData.ts

/**
 * Hook responsável por carregar os dados iniciais da tela do mapa:
 * - Recupera a sessão do motorista.
 * - Busca as entregas do motorista.
 * - Faz geocoding dos endereços (usando mocks + ORS).
 * - Controla o estado de loading inicial.
 * - Exponde a função de logout para a tela.
 */

import { useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Delivery } from "../types";
import {
  getSession,
  logoutMotorista,
  getEntregasPorMotorista,
} from "../services/api";
import { geocodeAddress } from "../utils/geocoding";

const MIN_INITIAL_LOADING_MS = 1050;

type UseInitialMapDataReturn = {
  motorista: any;
  deliveriesData: Delivery[];
  setDeliveriesData: React.Dispatch<React.SetStateAction<Delivery[]>>;
  isLoading: boolean;
  handleLogout: (forceLogout?: boolean) => Promise<void>;
};

export function useInitialMapData(): UseInitialMapDataReturn {
  const [motorista, setMotorista] = useState<any>(null);
  const [deliveriesData, setDeliveriesData] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Faz logout e limpa token.
  const handleLogout = async (forceLogout = false) => {
    if (!forceLogout) {
      try {
        await logoutMotorista();
      } catch (error) {
        console.error("Erro no logout:", error);
      }
    }
    await AsyncStorage.removeItem("@user_token");
    router.replace("/");
  };

  // Carrega sessão e entregas + geocode inicial.
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      const startTime = Date.now();
      try {
        const sessionResponse = await getSession();
        const motoristaLogado = sessionResponse.data.Usuario;
        setMotorista(motoristaLogado);

        const todasEntregasResponse = await getEntregasPorMotorista(
          motoristaLogado.id
        );
        const todasEntregas = todasEntregasResponse.data.Entregas || [];

        const entregasComCoordenadas = await Promise.all(
          todasEntregas.map(async (entrega: Delivery) => {
            const coords = await geocodeAddress(entrega.endereco_entrega);
            return {
              ...entrega,
              latitude: coords?.latitude ?? null,
              longitude: coords?.longitude ?? null,
            };
          })
        );

        setDeliveriesData(entregasComCoordenadas);
      } catch (error: any) {
        console.error(
          "Erro ao carregar dados:",
          error.response?.data || error.message
        );
        Alert.alert("Sessão Expirada", "Faça login novamente.");
        await handleLogout(true);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_INITIAL_LOADING_MS - elapsed);
        setTimeout(() => setIsLoading(false), remaining);
      }
    };

    carregarDadosIniciais();
  }, []);

  return {
    motorista,
    deliveriesData,
    setDeliveriesData,
    isLoading,
    handleLogout,
  };
}
