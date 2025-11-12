// frontend/src/components/DeliveriesList.tsx

/**
 * Componente principal responsável por exibir a lista de entregas dentro do painel inferior.
 * - Controla o layout da lista e o container com bordas arredondadas ("card branco").
 * - Usa o hook `useDeliveryStatusActions` para lidar com regras de negócio (iniciar, finalizar, cancelar entregas).
 * - Renderiza os itens da lista através do componente `DeliveryListItem`.
 * - Exibe o `ConfirmationModal` para confirmação de entrega.
 *
 * Este componente é essencialmente a camada de UI da lista — toda a lógica de status e modal está isolada no hook.
 */


import React from "react";
import {
  View,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
  LayoutAnimationConfig,
} from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Delivery } from "../types";
import ConfirmationModal from "./ConfirmationModal";
import DeliveryListItem from "./DeliveryListItem";
import { useDeliveryStatusActions } from "../hooks/useDeliveryStatusActions";
import { EntregaStatus, AtualizarStatusDetails } from "../services/api";

// Habilita animações no Android.
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Layout animation linear para expandir/contrair itens.
const CustomLayoutLinear: LayoutAnimationConfig = {
  duration: 400,
  create: {
    type: LayoutAnimation.Types.linear,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.linear,
    property: LayoutAnimation.Properties.opacity,
  },
  delete: {
    type: LayoutAnimation.Types.linear,
    property: LayoutAnimation.Properties.opacity,
  },
};

type DeliveriesListProps = {
  data: Delivery[];
  focusedDelivery: Delivery | null;
  onDeliveryPress: (delivery: Delivery) => void;
  onUpdateStatus: (
    deliveryId: string,
    newStatus: EntregaStatus,
    details: AtualizarStatusDetails
  ) => void;
  isLoading: boolean;
  onStartNavigation: () => void;
  onLogout: () => void;
  waitFor?: any;
};

export default function DeliveriesList({
  data,
  focusedDelivery,
  onDeliveryPress,
  onUpdateStatus,
  onStartNavigation,
  onLogout,
  isLoading,
  waitFor,
}: DeliveriesListProps) {
  const {
    isModalVisible,
    setIsModalVisible,
    handleStart,
    handleFinish,
    handleCancel,
    handleConfirmDelivery,
  } = useDeliveryStatusActions({
    data,
    onUpdateStatus,
    onStartNavigation,
  });

  const handleItemPress = (item: Delivery) => {
    LayoutAnimation.configureNext(CustomLayoutLinear);
    onDeliveryPress(item);
  };

  return (
    <>
      {/* Cartão branco com borda "para dentro" que contém a lista */}
      <View style={styles.innerCard}>
        <BottomSheetFlatList<Delivery>
          data={data}
          keyExtractor={(item: Delivery) => item.id}
          renderItem={({ item, index }: { item: Delivery; index: number }) => (
            <DeliveryListItem
              item={item}
              index={index}
              isExpanded={item.id === focusedDelivery?.id}
              onItemPress={handleItemPress}
              handleStart={handleStart}
              handleFinish={handleFinish}
              handleCancel={handleCancel}
              isLastItem={index === data.length - 1}
              isLoading={isLoading}
            />
          )}
          style={styles.flatListStyle}
          contentContainerStyle={styles.listContentContainer}
          removeClippedSubviews={false}
          extraData={focusedDelivery}
          waitFor={waitFor}
          overScrollMode="always"
          keyboardShouldPersistTaps="handled"
        />
      </View>

      <ConfirmationModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleConfirmDelivery}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Card branco "pra dentro" com borda arredondada em cima
  innerCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 8,
  },

  flatListStyle: {
    flex: 1,
  },
  listContentContainer: {
    paddingBottom: 50,
    backgroundColor: "transparent",
  },
});
