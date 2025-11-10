//frontend/src/components/DeliveriesList.tsx

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
import { BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Delivery } from "../types";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Line } from "react-native-svg";
import ConfirmationModal from "./ConfirmationModal";
import AnimatedChevron, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Animated as RNAnimated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { EntregaStatus, AtualizarStatusDetails } from "../services/api";
import { pickProofPhotoBase64 } from "../utils/pickProofPhotoBase64";

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
  simultaneousHandlers?: any;
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
  isLoading: boolean;
};

// ---------- SKELETON / SHIMMER ----------
const AnimatedGradient = RNAnimated.createAnimatedComponent(LinearGradient);
const ShimmerBlock: React.FC<{ style?: any }> = ({ style }) => {
  const translateX = React.useRef(new RNAnimated.Value(-150)).current;

  React.useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.timing(translateX, {
        toValue: 300,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [translateX]);

  return (
    <View style={[style, { overflow: "hidden", backgroundColor: "#E5E7EB" }]}>
      <AnimatedGradient
        colors={["#E5E7EB", "#F3F4F6", "#E5E7EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          StyleSheet.absoluteFillObject,
          {
            width: "60%",
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

// Item da lista de entregas (colapsado/expandido).
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
    isLoading,
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

    // Anima rotação do chevron (Reanimated).
    const rotation = useSharedValue(isExpanded ? 180 : 0);
    useEffect(() => {
      rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 500 });
    }, [isExpanded, rotation]);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }));

    // Fade entre skeleton e conteúdo
    const [showSkeleton, setShowSkeleton] = React.useState(isLoading);
    const skeletonOpacity = React.useRef(
      new RNAnimated.Value(isLoading ? 1 : 0)
    ).current;
    const contentOpacity = React.useRef(
      new RNAnimated.Value(isLoading ? 0 : 1)
    ).current;

    useEffect(() => {
      if (isLoading) {
        setShowSkeleton(true);
        skeletonOpacity.setValue(1);
        contentOpacity.setValue(0);
      } else {
        RNAnimated.parallel([
          RNAnimated.timing(skeletonOpacity, {
            toValue: 0,
            duration: 350,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          RNAnimated.timing(contentOpacity, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowSkeleton(false);
        });
      }
    }, [isLoading, skeletonOpacity, contentOpacity]);

    return (
      <View className={`px-4 ${itemOpacity}`} style={{ position: "relative" }}>
        {/* SKELETON por cima do conteúdo, com o MESMO layout do item */}
        {showSkeleton && (
          <RNAnimated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                opacity: skeletonOpacity,
                justifyContent: "center",
                alignItems: "center",
                transform: [{ translateX: 11 }],
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.itemRow}>
              <View style={styles.leftColumn}>
                <ShimmerBlock style={styles.skeletonCircle} />
              </View>
              <View style={styles.rightColumn}>
                <ShimmerBlock style={styles.skeletonLinePrimary} />
                <ShimmerBlock style={styles.skeletonLineSecondary} />
              </View>
            </View>
          </RNAnimated.View>
        )}

        {/* CONTEÚDO REAL */}
        <RNAnimated.View style={{ opacity: contentOpacity }}>
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
                  <AnimatedChevron.View
                    style={[styles.iconContainer, animatedStyle]}
                  >
                    <MaterialCommunityIcons
                      name="triangle-small-up"
                      size={18}
                      color={statusColorCode}
                    />
                  </AnimatedChevron.View>
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

                      <Text className="text-sm text-gray-600">
                        Número do Pedido:{" "}
                        <Text className="text-base text-gray-800">
                          {item.numero_pedido}
                        </Text>
                      </Text>

                      <Text className="text-sm text-gray-600">
                        Status da entrega:{" "}
                        <Text
                          className={`text-base font-bold ${statusTextColorClass}`}
                        >
                          {item.status}
                        </Text>
                      </Text>
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

                          <TouchableOpacity
                            className="bg-red-600 h-12 rounded-xl flex-1 flex-row justify-center items-center"
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
        </RNAnimated.View>
      </View>
    );
  }
);

// Lista principal de entregas (com bottom sheet e modal).
export default function DeliveriesList({
  data,
  focusedDelivery,
  onDeliveryPress,
  onUpdateStatus,
  onStartNavigation,
  onLogout,
  isLoading,
  simultaneousHandlers,
}: DeliveriesListProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [deliveryToConfirm, setDeliveryToConfirm] = useState<Delivery | null>(
    null
  );

  // Impede iniciar uma nova quando já existe "em_rota".
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

  // Abre modal para finalizar (entregue/não entregue).
  const handleFinish = (event: GestureResponderEvent, item: Delivery) => {
    setDeliveryToConfirm(item);
    setIsModalVisible(true);
  };

  // Helper: pergunta foto quando necessário (mantém legado).
  const askForPhotoBase64 = () => pickProofPhotoBase64();

  // Recebe dados do modal e dispara atualização.
  const handleConfirmDelivery = async (details: {
    status: "entregue" | "nao_entregue";
    nome_recebido: string;
    motivo: string;
    foto_prova: string | null;
    observacao: string;
  }) => {
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

  // Confirma o cancelamento da entrega.
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

  // Dispara animação e informa item focado ao pai.
  const handleItemPress = (item: Delivery) => {
    LayoutAnimation.configureNext(CustomLayoutLinear);
    onDeliveryPress(item);
  };

  return (
    <BottomSheetView style={styles.listContainer}>
      <View style={styles.listHeader} pointerEvents="none" collapsable={false}>
        <Text style={styles.headerText}>Entregas do Dia</Text>
      </View>

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
        simultaneousHandlers={simultaneousHandlers}
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
      />

      <ConfirmationModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleConfirmDelivery}
      />
    </BottomSheetView>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    backgroundColor: "#1F2937",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
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
  listHeader: { paddingVertical: 16, paddingHorizontal: 24 },
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
  listContentContainer: { paddingBottom: 50, backgroundColor: "transparent" },

  // Skeleton
  skeletonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  skeletonLinePrimary: {
    height: 16,
    borderRadius: 8,
    marginBottom: 6,
    width: "80%",
  },
  skeletonLineSecondary: {
    height: 14,
    borderRadius: 7,
    width: "60%",
  },
});
