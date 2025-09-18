// src/components/DeliveryPanel.tsx

import React, { useMemo, useRef, useState } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import DeliveriesList from './DeliveriesList'; // Ele vai usar o DeliveriesList
import { Delivery } from '../types';

// As informações que o painel precisa receber do mapa
type DeliveryPanelProps = {
  deliveriesData: Delivery[];
  selectedDelivery: Delivery | null;
  onDeliveryPress: (delivery: Delivery) => void;
  onUpdateStatus: (deliveryId: number, newStatus: string) => void;
  onLogout: () => void;
};

export default function DeliveryPanel({
  deliveriesData,
  selectedDelivery,
  onDeliveryPress,
  onUpdateStatus,
  onLogout,
}: DeliveryPanelProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [activeSnapIndex, setActiveSnapIndex] = useState(1);

  const snapPoints = useMemo(() => ["15%", "60%", "95%"], []);

  // Função interna para comandar o painel para o meio quando um item é clicado
  const handleItemClick = (delivery: Delivery) => {
    onDeliveryPress(delivery); // Avisa o mapa para mover
    bottomSheetRef.current?.snapToIndex(1); // Manda o painel para o meio
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      onChange={(index) => setActiveSnapIndex(index)}
      handleIndicatorStyle={{ backgroundColor: '#010409ff', width: 50 }}
      backgroundStyle={{ backgroundColor: 'white' }}
    >
      <DeliveriesList
        data={deliveriesData}
        onDeliveryPress={handleItemClick} // Usa a função interna
        onUpdateStatus={onUpdateStatus}
        activeSnapIndex={activeSnapIndex}
        selectedDelivery={selectedDelivery}
        onLogout={onLogout}
      />
    </BottomSheet>
  );
}