import React from "react";
import { View, Text, Image, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  SharedValue,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../styles/theme";
import { scale, verticalScale } from "react-native-size-matters";

// --- CORREÇÃO 2: Chame 'createAnimatedComponent' como um método de 'Animated' ---
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface HeaderSectionProps {
  name: string;
  tips: string;
  keyboardAnimation: SharedValue<number>;
}

// O resto do arquivo permanece exatamente o mesmo
const HeaderSection = ({
  name,
  tips,
  keyboardAnimation,
}: HeaderSectionProps) => {
  // ... (toda a lógica interna permanece a mesma) ...
  const { height: screenHeight } = useWindowDimensions();
  const imageMarginBottom = screenHeight * 0.05;
  const imageHeight = screenHeight * 0.12;

  const animatedContainerStyle = useAnimatedStyle(() => {
    const height =
      (1 - keyboardAnimation.value) *
        (screenHeight * 0.45 - screenHeight * 0.12) +
      screenHeight * 0.12;
    return {
      height: height,
    };
  });

  const mainContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      keyboardAnimation.value,
      [0, 0.5],
      [1, 0]
    );
    return { opacity };
  });

  const smallLogoStyle = useAnimatedStyle(() => {
    const opacity = (keyboardAnimation.value - 0.5) / 0.5;
    return { opacity };
  });

  const titleStyle = useAnimatedStyle(() => {
    const translateY = keyboardAnimation.value * -20;
    return { transform: [{ translateY }] };
  });

  return (
    <AnimatedLinearGradient
      colors={[COLORS.primary, COLORS["gradient-end"]]}
      className="w-full rounded-b-4xl"
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
        className="absolute top-0 left-0 w-full h-full justify-center items-center px-6"
        style={mainContentStyle}
      >
        <Image
          source={require("../../assets/images/login003.png")}
          accessible={true}
          accessibilityLabel="Ilustração de um caminhão de entregas"
          style={{
            width: "70%",
            height: imageHeight,
            resizeMode: "contain",
            marginBottom: imageMarginBottom,
          }}
        />
        <View className="items-start w-full">
          <Animated.View style={titleStyle}>
            <Text className="text-2xl font-bold mb-1 text-text-primary">
              Olá, {name}
            </Text>
            <Text className="text-4xl font-bold text-text-primary">
              Localiza Já
            </Text>
          </Animated.View>
          <Animated.View className="mt-2.5">
            <Text className="text-sm text-text-primary">{tips}</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </AnimatedLinearGradient>
  );
};

export default HeaderSection;
