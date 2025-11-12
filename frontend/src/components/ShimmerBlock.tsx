// frontend/src/components/ShimmerBlock.tsx

/**
 * Componente visual genérico para exibir um efeito shimmer (skeleton loading).
 * - Utiliza `Animated` e `LinearGradient` para criar um brilho animado.
 * - Usado no `DeliveryListItem` durante o carregamento dos dados.
 *
 * É reutilizável em qualquer outro componente que precise de placeholder animado.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Animated as RNAnimated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const AnimatedGradient = RNAnimated.createAnimatedComponent(LinearGradient);

type ShimmerBlockProps = {
  style?: any;
};

const ShimmerBlock: React.FC<ShimmerBlockProps> = ({ style }) => {
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

export default ShimmerBlock;
