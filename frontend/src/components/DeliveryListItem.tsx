// frontend/src/components/DeliveryListItem.tsx

/**
 * Representa visualmente um item individual da lista de entregas.
 * - Exibe informações do cliente, endereço, status e ações possíveis (iniciar, finalizar, cancelar).
 * - Controla as animações de expansão, colapso e rotação do ícone de seta.
 * - Mostra o estado de "carregando" com o componente `ShimmerBlock` (efeito shimmer/skeleton).
 *
 * Este componente é totalmente focado em UI e interações diretas do usuário.
 * Toda a lógica de negócio e atualização de status vem via props do componente pai.
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from "react-native";
import { Delivery } from "../types";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Line } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Animated as RNAnimated, Easing } from "react-native";
import ShimmerBlock from "./ShimmerBlock";

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

    // Fade entre skeleton e conteúdo.
    const [showSkeleton, setShowSkeleton] = React.useState<boolean>(isLoading);
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
        {/* Skeleton por cima do conteúdo */}
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

        {/* Conteúdo real */}
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

const styles = StyleSheet.create({
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

export default DeliveryListItem;
