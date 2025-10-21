// frontend/src/components/DeliveriesList.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  GestureResponderEvent,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
  Alert,
  LayoutAnimationConfig,
} from "react-native";
// *** MUDANÇA: Importar BottomSheetView ***
import { BottomSheetFlatList, BottomSheetView } from "@gorhom/bottom-sheet";
import { Delivery } from "../types";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Line } from "react-native-svg";
import ConfirmationModal from "./ConfirmationModal";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Config e Tipos (sem alterações)
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
  onUpdateStatus: (deliveryId: string, newStatus: string, details: any) => void;
  onStartNavigation: () => void;
  onLogout: () => void;
};
type DeliveryListItemProps = {
  item: Delivery;
  index: number;
  isExpanded: boolean;
  onItemPress: (item: Delivery) => void;
  handleStart: (event: GestureResponderEvent, item: Delivery) => void;
  handleFinish: (event: GestureResponderEvent, item: Delivery) => void;
  handleCancel: (event: GestureResponderEvent, item: Delivery) => void;
  isLastItem: boolean;
};

// Componente Filho DeliveryListItem (sem alterações)
const DeliveryListItem: React.FC<DeliveryListItemProps> = React.memo(
  ({
    item,
    index,
    isExpanded,
    onItemPress,
    handleStart,
    handleFinish,
    handleCancel,
    isLastItem,
  }) => {
    const isActive = item.status === "em_rota";
    const isFinished = item.status === "entregue";
    const isCancelled = item.status === "cancelada";
    const isNotCompleted = item.status === "nao_entregue";
    const isDone = isFinished || isCancelled || isNotCompleted;
    const itemOpacity = isDone ? "opacity-60" : "opacity-100";
    let circleBgColor = "bg-gray-500";
    let statusColorCode = "#6B7280";
    if (isFinished) {
      circleBgColor = "bg-green-600";
      statusColorCode = "#16A34A";
    } else if (isCancelled || isNotCompleted) {
      circleBgColor = "bg-red-600";
      statusColorCode = "#DC2626";
    } else if (isActive) {
      circleBgColor = "bg-orange-500";
      statusColorCode = "#F97316";
    } else if (item.status === "pendente") {
      circleBgColor = "bg-gray-500";
      statusColorCode = "#6B7280";
    }
    const circleTextColor = "text-white";
    const statusTextColorClass = isActive
      ? "text-orange-600"
      : isFinished
      ? "text-green-700"
      : isCancelled
      ? "text-red-700"
      : isNotCompleted
      ? "text-yellow-600"
      : "text-gray-600";
    const rotation = useSharedValue(isExpanded ? 180 : 0);
    useEffect(() => {
      rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 500 });
    }, [isExpanded, rotation]);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
      <View className={`px-4 ${itemOpacity}`}>
        <View style={styles.itemRow}>
          <View style={styles.leftColumn}>
            <TouchableOpacity onPress={() => onItemPress(item)}>
              <View
                className={`w-8 h-8 rounded-full justify-center items-center ${circleBgColor}`}
              >
                <Text className={`font-bold ${circleTextColor}`}>
                  {index + 1}
                </Text>
              </View>
            </TouchableOpacity>
            {isExpanded && !isLastItem && (
              <View style={styles.lineAndIconContainer}>
                <Svg height="100%" width="100%" style={styles.svgContainer}>
                  <Line
                    x1="50%"
                    y1="0"
                    x2="50%"
                    y2="100%"
                    stroke={statusColorCode}
                    strokeWidth="1.5"
                    strokeDasharray="4, 4"
                  />
                </Svg>
                <Animated.View style={[styles.iconContainer, animatedStyle]}>
                  <MaterialCommunityIcons
                    name="triangle-small-up"
                    size={18}
                    color={statusColorCode}
                  />
                </Animated.View>
              </View>
            )}
          </View>
          <View style={styles.rightColumn}>
            <TouchableOpacity
              onPress={() => onItemPress(item)}
              activeOpacity={0.7}
            >
              {isExpanded ? (
                <View className="space-y-4">
                  {/* ... Conteúdo Expandido ... */}
                  <View>
                    <Text className="text-lg font-bold text-gray-900">
                      {item.endereco_entrega}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-4">
                    <View className="p-2 bg-gray-300 rounded-full mr-3">
                      <Feather name="user" size={24} color="#374151" />
                    </View>
                    <Text className="text-lg font-bold text-gray-800">
                      {item.nome_cliente}
                    </Text>
                  </View>
                  <View className="space-y-2 pl-1">
                    {item.observacao && (
                      <Text className="text-sm text-gray-600">
                        Obs.:{" "}
                        <Text className="text-base text-gray-800">
                          {item.observacao}
                        </Text>
                      </Text>
                    )}
                    {
                      <Text className="text-sm text-gray-600">
                        Número do Pedido:{" "}
                        <Text className="text-base text-gray-800">
                          {item.numero_pedido}
                        </Text>
                      </Text>
                    }
                    {
                      <Text className="text-sm text-gray-600">
                        Status da entrega:{" "}
                        <Text
                          className={`text-base font-bold ${statusTextColorClass}`}
                        >
                          {item.status}
                        </Text>
                      </Text>
                    }
                  </View>
                  <View className="pt-4 mt-3">
                    {!isDone && (
                      <View className="flex-row">
                        {item.status === "pendente" && (
                          <TouchableOpacity
                            className="bg-orange-500 h-12 rounded-xl flex-1 flex-row justify-center items-center mr-2"
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
                            className="bg-green-600 h-12 rounded-xl flex-1 flex-row justify-center items-center mr-2"
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
                        {
                          <TouchableOpacity
                            className="bg-red-600 h-12 rounded-xl flex-1 flex-row justify-center items-center"
                            onPress={(e) => handleCancel(e, item)}
                          >
                            <Feather name="x-circle" size={18} color="white" />
                            <Text className="text-white text-center font-bold ml-2">
                              Cancelar
                            </Text>
                          </TouchableOpacity>
                        }
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View>
                  <Text className="text-lg font-bold text-gray-900">
                    {item.endereco_entrega}
                  </Text>
                  <Text className="text-base text-gray-700">
                    {item.nome_cliente}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
); // --- Fim do DeliveryListItem ---

// --- Componente Principal DeliveriesList ---
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

  // Handlers (iguais - sem alterações)
  const handleStart = (event: GestureResponderEvent, item: Delivery) => {
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
    setDeliveryToConfirm(item);
    setIsModalVisible(true);
  };
  const handleConfirmDelivery = (details: {
    status: "entregue" | "nao_entregue";
    nome_recebido: string;
    motivo: string;
    foto_prova: string | null;
    observacao: string;
  }) => {
    if (deliveryToConfirm) {
      onUpdateStatus(deliveryToConfirm.id, details.status, details);
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
              motivo: "Cancelado pelo motorista",
            }),
        },
      ]
    );
  };
  const handleItemPress = (item: Delivery) => {
    LayoutAnimation.configureNext(CustomLayoutLinear);
    onDeliveryPress(item);
  };

  return (
    // *** MUDANÇA: Substituído <View> por <BottomSheetView> ***
    <BottomSheetView style={styles.listContainer}>
      {/* O Header agora é só o texto, dentro do container azul */}
      <View style={styles.listHeader}>
        <Text style={styles.headerText}>Entregas do Dia</Text>
      </View>

      {/* A FlatList vem logo abaixo, dentro do container azul */}
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
          />
        )}
        style={styles.flatListStyle}
        contentContainerStyle={styles.listContentContainer}
        removeClippedSubviews={false}
        extraData={focusedDelivery}
      />

      {/* O Modal precisa ficar FORA do BottomSheetView para funcionar corretamente */}
      {/* *** MUDANÇA: Movido o Modal para fora *** */}
      <ConfirmationModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleConfirmDelivery}
      />
    </BottomSheetView> // *** MUDANÇA: Fechando <BottomSheetView> ***
  );
}

// Estilos (Sem alterações nos estilos)
const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    backgroundColor: "#1F2937",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
  },
  itemRow: { flexDirection: "row" },
  leftColumn: {
    width: 48,
    alignItems: "center",
    paddingTop: 16,
    marginRight: 8,
  },
  lineAndIconContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    paddingTop: 4,
  },
  svgContainer: { flex: 1, width: "100%" },
  iconContainer: { position: "absolute", bottom: 0, marginBottom: -4 },
  rightColumn: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingTop: 16,
    paddingBottom: 24,
  },
  listHeader: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F9FAFB",
    textAlign: "center",
    width: "100%",
  },
  flatListStyle: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  listContentContainer: {
    paddingBottom: 50,
    backgroundColor: "transparent",
  },
});
