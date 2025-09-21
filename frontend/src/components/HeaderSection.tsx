// ARQUIVO: frontend/src/components/HeaderSection.tsx (Versão Final Ajustada)

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

// Criamos uma versão animável do LinearGradient
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface HeaderSectionProps {
  name: string; // Será o título principal (ex: "Localiza Já" ou "Seja bem vindo(a)!")
  tips: string; // Será o subtítulo
  keyboardAnimation: SharedValue<number>;
}

const HeaderSection = ({
  name,
  tips,
  keyboardAnimation,
}: HeaderSectionProps) => {
  const { height: screenHeight } = useWindowDimensions();

  // --- ANIMAÇÃO DA ALTURA DO CONTAINER ---
  const animatedContainerStyle = useAnimatedStyle(() => {
    // A altura do header varia entre 40% e 12% da tela
    const height = interpolate(
      keyboardAnimation.value,
      [0, 1], // De teclado escondido (0) para visível (1)
      [screenHeight * 0.4, screenHeight * 0.16] // Altura vai de 40% para 12%
    );
    return { height };
  });

  // --- ANIMAÇÃO DO CONTEÚDO PRINCIPAL (TUDO EXCETO O LOGO PEQUENO) ---
  const mainContentStyle = useAnimatedStyle(() => {
    // A opacidade desaparece na primeira metade da animação do teclado
    const opacity = interpolate(keyboardAnimation.value, [0, 0.5], [1, 0]);
    return { opacity };
  });

  // --- ANIMAÇÃO DO LOGO PEQUENO (QUANDO O TECLADO ESTÁ ABERTO) ---
  const smallLogoStyle = useAnimatedStyle(() => {
    // A opacidade aparece na segunda metade da animação
    const opacity = interpolate(keyboardAnimation.value, [0.5, 1], [0, 1]);
    return { opacity };
  });

  return (
    <AnimatedLinearGradient
      colors={[COLORS.primary, COLORS["gradient-end"]]} // Suas cores do tema
      className="w-full rounded-b-4xl justify-center items-center p-6"
      style={animatedContainerStyle} // Aplica a altura animada
    >
      {/* Conteúdo que só aparece quando o teclado está ABERTO */}
      <Animated.View
        className="absolute top-0 left-0 w-full h-full justify-center items-center"
        style={smallLogoStyle}
      >
        <Animated.Image
          source={require("../../assets/images/logo001.png")} // Logo principal
          style={{
            width: scale(200),
            height: verticalScale(60),
            resizeMode: "contain",
          }}
        />
      </Animated.View>

      {/* Conteúdo que só aparece quando o teclado está FECHADO */}
      <Animated.View
        className="w-full h-full items-center"
        style={mainContentStyle}
      >
        <Text className="text-5xl font-bold text-text-primary mt-12">
          {name}
        </Text>
        <Text className="text-base text-text-primary text-center mt-2">
          {tips}
        </Text>
        <Image
          source={require("../../assets/images/truck001.png")} // Caminhão isométrico
          className="w-40 h-20 mt-4"
          resizeMode="contain"
        />
      </Animated.View>
    </AnimatedLinearGradient>
  );
};

export default HeaderSection;
