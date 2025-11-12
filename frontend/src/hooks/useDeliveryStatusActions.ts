// frontend/src/components/useDeliveryStatusActions.ts

/**
 * Hook responsável por encapsular as regras de negócio relacionadas ao status das entregas.
 * - Garante que apenas uma entrega possa estar "em rota" por vez.
 * - Controla o modal de confirmação e coleta de foto de prova de entrega.
 * - Expõe funções para iniciar, finalizar, cancelar e confirmar entregas.
 *
 * Este hook separa completamente a lógica de domínio da camada de UI,
 * tornando o componente `DeliveriesList` mais limpo e de fácil manutenção.
 */

import { useState } from "react";
import { Alert, GestureResponderEvent } from "react-native";
import { Delivery } from "../types";
import { EntregaStatus, AtualizarStatusDetails } from "../services/api";
import { pickProofPhotoBase64 } from "../utils/pickProofPhotoBase64";

type UseDeliveryStatusActionsParams = {
  data: Delivery[];
  onUpdateStatus: (
    deliveryId: string,
    newStatus: EntregaStatus,
    details: AtualizarStatusDetails
  ) => void;
  onStartNavigation: () => void;
};

type ConfirmDetails = {
  status: "entregue" | "nao_entregue";
  nome_recebido: string;
  motivo: string;
  foto_prova: string | null;
  observacao: string;
};

export const useDeliveryStatusActions = ({
  data,
  onUpdateStatus,
  onStartNavigation,
}: UseDeliveryStatusActionsParams) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [deliveryToConfirm, setDeliveryToConfirm] = useState<Delivery | null>(
    null
  );

  const handleStart = (event: GestureResponderEvent, item: Delivery) => {
    const jaTemEmRota = data.some((d) => d.status === "em_rota");
    if (jaTemEmRota) {
      Alert.alert(
        "Entrega em andamento",
        "Você já possui uma entrega em rota. Finalize ou cancele antes de iniciar outra."
      );
      return;
    }

    Alert.alert(
      "Iniciar Entrega",
      `Tem certeza que deseja iniciar a entrega para "${item.nome_cliente}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, Iniciar",
          onPress: () => {
            onUpdateStatus(item.id, "em_rota", { kind: "em_rota" } as any);
            onStartNavigation();
          },
        },
      ]
    );
  };

  const handleFinish = (event: GestureResponderEvent, item: Delivery) => {
    setDeliveryToConfirm(item);
    setIsModalVisible(true);
  };

  const askForPhotoBase64 = () => pickProofPhotoBase64();

  const handleConfirmDelivery = async (details: ConfirmDetails) => {
    if (!deliveryToConfirm) return;

    if (details.status === "entregue") {
      if (!details.nome_recebido?.trim()) {
        Alert.alert("Atenção", "Informe o nome de quem recebeu.");
        return;
      }
      let foto = details.foto_prova || (await askForPhotoBase64());
      if (!foto) return;

      onUpdateStatus(deliveryToConfirm.id, "entregue", {
        kind: "entregue",
        nome_recebido: details.nome_recebido,
        foto_prova: foto,
      } as any);
    } else {
      if (!details.motivo?.trim()) {
        Alert.alert("Atenção", "Informe o motivo da não entrega.");
        return;
      }
      let foto = details.foto_prova || (await askForPhotoBase64());
      if (!foto) return;

      onUpdateStatus(deliveryToConfirm.id, "nao_entregue", {
        kind: "nao_entregue",
        motivo: details.motivo,
        foto_prova: foto,
      } as any);
    }

    setIsModalVisible(false);
    setDeliveryToConfirm(null);
  };

  const handleCancel = (event: GestureResponderEvent, item: Delivery) => {
    Alert.alert(
      "Cancelar Entrega",
      `Tem certeza que deseja CANCELAR a entrega para "${item.nome_cliente}"?`,
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, Cancelar",
          style: "destructive",
          onPress: () =>
            onUpdateStatus(item.id, "cancelada", {
              kind: "cancelada",
              motivo: "Cancelado pelo motorista",
            } as any),
        },
      ]
    );
  };

  return {
    isModalVisible,
    setIsModalVisible,
    handleStart,
    handleFinish,
    handleCancel,
    handleConfirmDelivery,
  };
};
