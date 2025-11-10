//frontend/src/components/DeliveryPanel.tsx

import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, View, Alert } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import DeliveriesList from "./DeliveriesList";
import { Delivery } from "../types";
import { EntregaStatus, AtualizarStatusDetails } from "../services/api";
import { pickProofPhotoBase64 } from "../utils/pickProofPhotoBase64";

type DeliveryPanelProps = {
  deliveriesData: Delivery[];
  selectedDelivery: Delivery | null;
  onDeliveryPress: (delivery: Delivery) => void;
  onUpdateStatus: (
    deliveryId: string,
    newStatus: EntregaStatus,
    details: AtualizarStatusDetails
  ) => void;
  onLogout: () => void;
  onStartNavigation: () => void;
  isLoadingList: boolean;
};

export default function DeliveryPanel({
  deliveriesData,
  selectedDelivery,
  onDeliveryPress,
  onUpdateStatus,
  onLogout,
  onStartNavigation,
  isLoadingList,
}: DeliveryPanelProps) {
  // BottomSheet: controle de posição/abertura.
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [activeSnapIndex, setActiveSnapIndex] = useState(1);
  const snapPoints = useMemo(() => ["10%", "60%", "95%"], []);

  // Seleciona item e ajusta snap quando necessário.
  const handleItemClick = (delivery: Delivery) => {
    onDeliveryPress(delivery);
    if (activeSnapIndex === 0 && selectedDelivery?.id !== delivery.id) {
      bottomSheetRef.current?.snapToIndex(1);
    }
  };

  // Inicia navegação e recolhe o painel.
  const handleStartAndCollapse = () => {
    bottomSheetRef.current?.snapToIndex(0);
    onStartNavigation();
  };

  // Wrapper: garante foto_prova quando exigida pelo backend.
  const handleUpdateStatusWrapped = async (
    deliveryId: string,
    newStatus: EntregaStatus,
    details: AtualizarStatusDetails
  ) => {
    try {
      const exigeFoto =
        newStatus === "entregue" || newStatus === "nao_entregue";
      if (exigeFoto) {
        const temFoto =
          (details as any)?.foto_prova &&
          typeof (details as any).foto_prova === "string";
        if (!temFoto) {
          const foto_prova = await pickProofPhotoBase64();
          if (!foto_prova) {
            Alert.alert(
              "Foto obrigatória",
              "É necessário anexar a foto de comprovação."
            );
            return;
          }
          details = {
            ...(details as any),
            foto_prova,
          } as AtualizarStatusDetails;
        }
      }
      await onUpdateStatus(deliveryId, newStatus, details);
    } catch {
      // Erros já são tratados na tela do mapa.
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      onChange={(index) => setActiveSnapIndex(index)}
      handleComponent={() => null}
      backgroundStyle={styles.panelBackground}
      enableContentPanningGesture
      enableHandlePanningGesture
      activeOffsetY={[-10, 10]}
    >
      <DeliveriesList
        data={deliveriesData}
        focusedDelivery={selectedDelivery}
        onDeliveryPress={handleItemClick}
        onUpdateStatus={handleUpdateStatusWrapped}
        onLogout={onLogout}
        onStartNavigation={handleStartAndCollapse}
        simultaneousHandlers={bottomSheetRef}
        isLoading={isLoadingList}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  panelBackground: {
    backgroundColor: "#1F2937",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
  },
});
