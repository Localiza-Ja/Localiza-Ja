// frontend/src/components/DeliveryPanel.tsx

import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import DeliveriesList from "./DeliveriesList";
import { Delivery } from "../types";

type DeliveryPanelProps = {
  deliveriesData: Delivery[];
  selectedDelivery: Delivery | null;
  onDeliveryPress: (delivery: Delivery) => void;
  onUpdateStatus: (deliveryId: string, newStatus: string, details: any) => void;
  onLogout: () => void;
  onStartNavigation: () => void;
};

// Handle Vazio Removido
// const EmptyHandle = () => <View />; // Não mais necessário

export default function DeliveryPanel({
  deliveriesData,
  selectedDelivery,
  onDeliveryPress,
  onUpdateStatus,
  onLogout,
  onStartNavigation,
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

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      onChange={(index) => setActiveSnapIndex(index)}
      // *** CORREÇÃO: Remove completamente o handle e sua área ***
      handleComponent={() => null}
      // handleIndicatorStyle removido
      // containerStyle removido
      backgroundStyle={styles.panelBackground} // Fundo cinza claro
    >
      <DeliveriesList
        data={deliveriesData}
        focusedDelivery={selectedDelivery}
        onDeliveryPress={handleItemClick}
        onUpdateStatus={onUpdateStatus}
        onLogout={onLogout}
        onStartNavigation={handleStartAndCollapse}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  panelBackground: {
    backgroundColor: "rgba(230, 230, 230, 0.92)",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    // *** Adicionado overflow hidden aqui também para garantir o corte no topo ***
    overflow: "hidden",
  },
});
