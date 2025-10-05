//frontend/src/components/HeaderSection.tsx

import React from "react";
// 1. Trocamos 'useWindowDimensions' por 'Dimensions'
import { View, Text, Image, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  SharedValue,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../styles/theme";
import { scale, verticalScale } from "react-native-size-matters";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// 2. Obtemos a altura da tela UMA VEZ, fora do componente.
const { height: screenHeight } = Dimensions.get("window");

interface HeaderSectionProps {
  name: string;
  tips: string;
  keyboardAnimation: SharedValue<number>;
}

const HeaderSection = ({
  name,
  tips,
  keyboardAnimation,
}: HeaderSectionProps) => {
  // O resto do componente continua igual, mas agora usará a altura estável da tela.
  const animatedContainerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      keyboardAnimation.value,
      [0, 1],
      [screenHeight * 0.4, screenHeight * 0.14] // A mágica acontece aqui
    );
    return { height };
  });

  const mainContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(keyboardAnimation.value, [0, 0.5], [1, 0]);
    return { opacity };
  });

  const smallLogoStyle = useAnimatedStyle(() => {
    const opacity = interpolate(keyboardAnimation.value, [0.5, 1], [0, 1]);
    return { opacity };
  });

  return (
    <AnimatedLinearGradient
      colors={[COLORS.primary, COLORS["gradient-end"]]}
      className="w-full rounded-b-4xl justify-center items-center p-6"
      style={animatedContainerStyle}
    >
      <Animated.View
        className="absolute top-0 left-0 w-full h-full justify-center items-center"
        style={smallLogoStyle}
      >
        <Animated.Image
          source={require("../../assets/images/logo001.png")}
          style={{
            width: scale(200),
            height: verticalScale(60),
            resizeMode: "contain",
          }}
        />
      </Animated.View>

      <Animated.View
        className="w-full h-full items-center"
        style={mainContentStyle}
      >
        <Text
          className="text-5xl font-bold text-text-primary mt-12"
          allowFontScaling={false} // Mantemos isso para consistência
        >
          {name}
        </Text>
        <Text
          className="text-base text-text-primary text-center mt-2"
          allowFontScaling={false} // Mantemos isso para consistência
        >
          {tips}
        </Text>
        <Image
          source={require("../../assets/images/truck001.png")}
          className="w-40 h-20 mt-4"
          resizeMode="contain"
        />
      </Animated.View>
    </AnimatedLinearGradient>
  );
};

export default HeaderSection;
