// frontend/src/components/DeliveryPanel.tsx (VERSÃO FINAL CORRIGIDA)

import React, { useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";
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
    bottomSheetRef.current?.snapToIndex(1);
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
      handleIndicatorStyle={{ backgroundColor: "#010409ff", width: 50 }}
      backgroundStyle={styles.bottomSheetBackground}
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
  bottomSheetBackground: {
    backgroundColor: "white",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6.0,
    elevation: 30,
  },
});
