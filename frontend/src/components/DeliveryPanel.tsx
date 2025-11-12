// frontend/src/components/DeliveryPanel.tsx

import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, View, Alert, Text } from "react-native";
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

// Header fixo que também funciona como "handle" do BottomSheet
const HeaderHandle = () => (
  <View style={styles.headerContainer}>
    <View style={styles.handleIndicator} />
    <Text style={styles.headerText}>Entregas do Dia</Text>
  </View>
);

export default function DeliveryPanel({
  deliveriesData,
  selectedDelivery,
  onDeliveryPress,
  onUpdateStatus,
  onLogout,
  onStartNavigation,
  isLoadingList,
}: DeliveryPanelProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [activeSnapIndex, setActiveSnapIndex] = useState(1);
  const snapPoints = useMemo(() => ["10%", "60%", "95%"], []);

  const handleItemClick = (delivery: Delivery) => {
    onDeliveryPress(delivery);
    if (activeSnapIndex === 0 && selectedDelivery?.id !== delivery.id) {
      bottomSheetRef.current?.snapToIndex(1);
    }
  };

  const handleStartAndCollapse = () => {
    bottomSheetRef.current?.snapToIndex(0);
    onStartNavigation();
  };

  // Wrapper para garantir foto_prova quando exigida
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
      handleComponent={HeaderHandle}
      backgroundStyle={styles.panelBackground}
      enableContentPanningGesture
      enableHandlePanningGesture
      activeOffsetY={[-10, 10]}
    >
      {/* Aqui dentro vem o "cartão" branco com a lista */}
      <DeliveriesList
        data={deliveriesData}
        focusedDelivery={selectedDelivery}
        onDeliveryPress={handleItemClick}
        onUpdateStatus={handleUpdateStatusWrapped}
        onLogout={onLogout}
        onStartNavigation={handleStartAndCollapse}
        waitFor={bottomSheetRef}
        isLoading={isLoadingList}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Fundo do bottom sheet: azul escuro com borda superior arredondada
  panelBackground: {
    backgroundColor: "#1F2937",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
  },

  // Header fixo (handle)
  headerContainer: {
    backgroundColor: "#1F2937",
    paddingTop: 12,
    paddingBottom: 20,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4B5563",
    marginBottom: 8,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F9FAFB",
    textAlign: "center",
  },
});
