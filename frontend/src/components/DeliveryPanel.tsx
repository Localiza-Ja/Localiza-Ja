import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import DeliveriesList from './DeliveriesList';
import { Delivery } from '../types';

type DeliveryPanelProps = {
  deliveriesData: Delivery[];
  selectedDelivery: Delivery | null;
  onDeliveryPress: (delivery: Delivery) => void;
  onUpdateStatus: (deliveryId: number, newStatus: string) => void;
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

  // ALTERADO: Mudei o primeiro valor de "15%" para "10%"
  const snapPoints = useMemo(() => ["10%", "60%", "95%"], []);

  const handleItemClick = (delivery: Delivery) => {
    onDeliveryPress(delivery);
    bottomSheetRef.current?.snapToIndex(1);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      onChange={(index) => setActiveSnapIndex(index)}
      handleIndicatorStyle={{ backgroundColor: '#010409ff', width: 50 }}
      backgroundStyle={styles.bottomSheetBackground}
    >
      <DeliveriesList
        data={deliveriesData}
        onDeliveryPress={handleItemClick}
        onUpdateStatus={onUpdateStatus}
        onLogout={onLogout}
        onStartNavigation={onStartNavigation}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: 'white',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6.00,
    elevation: 30,
  }
});