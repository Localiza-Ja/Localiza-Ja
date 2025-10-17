// frontend/src/components/DeliveriesList.tsx (VERSÃO FINAL UNIFICADA)

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  GestureResponderEvent,
  Alert,
} from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Delivery } from "../types";
import { Feather } from "@expo/vector-icons";
import ConfirmationModal from "./ConfirmationModal";

type DeliveriesListProps = {
  data: Delivery[];
  focusedDelivery: Delivery | null;
  onDeliveryPress: (delivery: Delivery) => void;
  onUpdateStatus: (deliveryId: string, newStatus: string, details: any) => void;
  onStartNavigation: () => void;
  onLogout: () => void;
};

export default function DeliveriesList({
  data,
  focusedDelivery,
  onDeliveryPress,
  onUpdateStatus,
  onStartNavigation,
  onLogout,
}: DeliveriesListProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [deliveryToConfirm, setDeliveryToConfirm] = useState<Delivery | null>(
    null
  );
  const handleStart = (event: GestureResponderEvent, item: Delivery) => {
    event.stopPropagation();
    Alert.alert(
      "Iniciar Entrega",
      `Tem certeza que deseja iniciar a entrega para "${item.nome_cliente}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, Iniciar",
          onPress: () => {
            onUpdateStatus(item.id, "em_rota", {});
            onStartNavigation();
          },
        },
      ]
    );
  };

  const handleFinish = (event: GestureResponderEvent, item: Delivery) => {
    event.stopPropagation();
    setDeliveryToConfirm(item);
    setIsModalVisible(true);
  };

  const handleConfirmDelivery = (details: {
    status: "entregue" | "nao_entregue";
    nome_recebido: string;
    motivo: string;
  }) => {
    if (deliveryToConfirm) {
      onUpdateStatus(deliveryToConfirm.id, details.status, details);
    }
    setIsModalVisible(false);
    setDeliveryToConfirm(null);
  };

  const handleCancel = (event: GestureResponderEvent, item: Delivery) => {
    event.stopPropagation();
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
              motivo: "Cancelado pelo motorista",
            }),
        },
      ]
    );
  };

  const renderItem = ({ item, index }: { item: Delivery; index: number }) => {
    const isExpanded = item.id === focusedDelivery?.id;
    const isActive = item.status === "em_rota";
    const isFinished = item.status === "entregue";
    const isCancelled = item.status === "cancelada";
    const isNotCompleted = item.status === "nao_entregue";
    const isDone = isFinished || isCancelled || isNotCompleted;
    const itemOpacity = isDone ? "opacity-50" : "opacity-100";

    let circleBgColor;
    if (isFinished) circleBgColor = "bg-green-500";
    else if (isCancelled) circleBgColor = "bg-red-500";
    else if (isNotCompleted) circleBgColor = "bg-yellow-500";
    else if (isActive) circleBgColor = "bg-orange-500";
    else circleBgColor = "bg-gray-800";

    const circleTextColor = "text-white";

    const statusColorClass = isActive
      ? "text-orange-500"
      : isFinished
      ? "text-green-600"
      : isCancelled
      ? "text-red-600"
      : isNotCompleted
      ? "text-yellow-600"
      : "text-gray-800";

    return (
      <View className={`px-4 bg-white ${itemOpacity}`}>
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => onDeliveryPress(item)}
            className="items-center mr-4 pt-4"
          >
            <View
              className={`w-8 h-8 rounded-full justify-center items-center z-10 ${circleBgColor}`}
            >
              <Text className={`font-bold ${circleTextColor}`}>
                {index + 1}
              </Text>
            </View>
            {index < data.length - 1 && (
              <View className="absolute top-[52px] bottom-0 left-[50%] -translate-x-px w-px bg-orange-500" />
            )}
          </TouchableOpacity>

          <View className="flex-1 border-b border-gray-200 py-4">
            <TouchableOpacity
              onPress={() => onDeliveryPress(item)}
              activeOpacity={0.7}
            >
              {isExpanded ? (
                <View className="space-y-4">
                  <View>
                    <Text className="text-lg font-bold text-gray-800">
                      {item.endereco_entrega}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-4">
                    <View className="p-2 bg-gray-100 rounded-full mr-3">
                      <Feather name="user" size={24} color="#1f2937" />
                    </View>
                    <Text className="text-lg font-bold text-gray-900">
                      {item.nome_cliente}
                    </Text>
                  </View>
                  <View className="space-y-2 pl-1">
                    {item.observacao && (
                      <Text className="text-sm text-gray-500">
                        Obs.:{" "}
                        <Text className="text-base text-gray-700">
                          {item.observacao}
                        </Text>
                      </Text>
                    )}
                    <Text className="text-sm text-gray-500">
                      Número do Pedido:{" "}
                      <Text className="text-base text-gray-700">
                        {item.numero_pedido}
                      </Text>
                    </Text>
                    <Text className="text-sm text-gray-500">
                      Status da entrega:{" "}
                      <Text
                        className={`text-base font-bold ${statusColorClass}`}
                      >
                        {item.status}
                      </Text>
                    </Text>
                  </View>
                  <View className="pt-4 mt-3">
                    {!isDone && (
                      <View className="flex-row space-x-2">
                        {item.status === "pendente" && (
                          <TouchableOpacity
                            className="bg-orange-500 h-12 rounded-full flex-1 flex-row justify-center items-center"
                            onPress={(e) => handleStart(e, item)}
                          >
                            <Feather name="truck" size={18} color="white" />
                            <Text className="text-white text-center font-bold ml-2">
                              Iniciar Entrega
                            </Text>
                          </TouchableOpacity>
                        )}
                        {item.status === "em_rota" && (
                          <TouchableOpacity
                            className="bg-green-600 h-12 rounded-full flex-1 flex-row justify-center items-center"
                            onPress={(e) => handleFinish(e, item)}
                          >
                            <Feather
                              name="check-circle"
                              size={18}
                              color="white"
                            />
                            <Text className="text-white text-center font-bold ml-2">
                              Finalizar Entrega
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          className="bg-red-600 h-12 rounded-full flex-1 flex-row justify-center items-center"
                          onPress={(e) => handleCancel(e, item)}
                        >
                          <Feather name="x-circle" size={18} color="white" />
                          <Text className="text-white text-center font-bold ml-2">
                            Cancelar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View>
                  <Text className="text-lg font-bold text-gray-800">
                    {item.nome_cliente}
                  </Text>
                  <Text className="text-base text-gray-600">
                    {item.endereco_entrega}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <BottomSheetFlatList<Delivery>
        data={data}
        keyExtractor={(item: Delivery) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View className="bg-white">
            <Text className="text-xl font-bold p-4 text-center text-gray-800">
              Entregas do Dia
            </Text>
          </View>
        }
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: 50, backgroundColor: "white" }}
      />

      <ConfirmationModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleConfirmDelivery}
      />
    </>
  );
}
