// ====================================================================================
// ARQUIVO: HeaderSection.tsx
// OBJETIVO: Exibir o cabeçalho principal da tela de login, que se anima
//           quando o teclado aparece.
// ====================================================================================

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Dimensions,
  StyleSheet,
  Platform,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  SharedValue,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import { scale, verticalScale } from "react-native-size-matters";

import { COLORS } from "../styles/theme";

// ====================================================================================
// CONSTANTES
// ====================================================================================

// Componente para permitir animações no LinearGradient
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Pega a altura total da tela do dispositivo uma única vez para otimização
const { height: screenHeight } = Dimensions.get("window");

// Define o segmento da animação Lottie que deve tocar em loop
const LOTTIE_START_FRAME = 0;
const LOTTIE_END_FRAME = 28;

// ====================================================================================
// INTERFACE DE PROPRIEDADES (PROPS)
// ====================================================================================

interface HeaderSectionProps {
  // O texto do slogan exibido na parte de baixo do header
  tips: string;
  // Valor compartilhado (da tela Login) que controla a animação do teclado (0 a 1)
  keyboardAnimation: SharedValue<number>;
}

// ====================================================================================
// COMPONENTE PRINCIPAL
// ====================================================================================

const HeaderSection = ({ tips, keyboardAnimation }: HeaderSectionProps) => {
  // ----------------------------------------------------------------------------------
  // HOOKS
  // ----------------------------------------------------------------------------------

  // Cria uma referência para o componente LottieView para podermos controlá-lo (ex: dar play)
  const animationRef = useRef<LottieView>(null);

  // useEffect que executa uma ação quando o componente é montado.
  // Neste caso, ele dá o "play" na animação Lottie.
  useEffect(() => {
    animationRef.current?.play(LOTTIE_START_FRAME, LOTTIE_END_FRAME);
  }, []);

  // ----------------------------------------------------------------------------------
  // ANIMAÇÕES (com react-native-reanimated)
  // ----------------------------------------------------------------------------------

  // Animação para a altura do container principal do header
  const animatedContainerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      keyboardAnimation.value,
      [0, 1], // De (teclado fechado) para (teclado aberto)
      [screenHeight * 0.4, screenHeight * 0.14] // A altura varia de 40% para 14% da tela
    );
    return { height };
  });

  // Animação para a opacidade do conteúdo principal (some quando o teclado abre)
  const mainContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      keyboardAnimation.value,
      [0, 0.5], // A opacidade vai de 1 a 0 na primeira metade da animação do teclado
      [1, 0]
    );
    return { opacity };
  });

  // Animação para a opacidade do logo pequeno (aparece quando o teclado abre)
  const smallLogoStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      keyboardAnimation.value,
      [0.5, 1], // A opacidade vai de 0 a 1 na segunda metade da animação do teclado
      [0, 1]
    );
    return { opacity };
  });

  // ----------------------------------------------------------------------------------
  // RENDERIZAÇÃO DO COMPONENTE (JSX)
  // ----------------------------------------------------------------------------------

  return (
    <AnimatedLinearGradient
      colors={[COLORS.primary, COLORS["gradient-end"]]}
      style={[styles.gradientContainer, animatedContainerStyle]}
    >
      {/* View para o logo pequeno (visível com o teclado aberto) */}
      <Animated.View
        style={[styles.absoluteFill, styles.centerContent, smallLogoStyle]}
      >
        <Image
          source={require("../../assets/images/logo001.png")}
          style={styles.smallLogo}
        />
      </Animated.View>

      {/* View para o conteúdo principal (visível com o teclado fechado) */}
      <Animated.View style={[styles.mainContentContainer, mainContentStyle]}>
        {/* Seção de Cima: Logo Principal */}
        <View style={styles.topSection}>
          <Image
            source={require("../../assets/images/logo001.png")}
            style={styles.largeLogo}
          />
        </View>

        {/* Seção de Baixo: Slogan e Animação do Caminhão */}
        <View style={styles.bottomSection}>
          <Text style={styles.tipsText} className="font-slogan">
            {tips}
          </Text>
          <LottieView
            ref={animationRef}
            source={require("../../assets/animations/logo-animation.json")}
            style={styles.truckAnimation}
            loop
          />
        </View>
      </Animated.View>
    </AnimatedLinearGradient>
  );
};

// ====================================================================================
// ESTILOS (com StyleSheet)
// ====================================================================================

const styles = StyleSheet.create({
  gradientContainer: {
    width: "100%",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 50,
    overflow: "hidden", // Garante que a animação não "vaze" para fora no Android
  },
  absoluteFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  smallLogo: {
    width: scale(190),
    height: verticalScale(40),
    resizeMode: "contain",
  },
  mainContentContainer: {
    flex: 1,
    justifyContent: "space-between", // Empurra o logo para cima e a seção de baixo para baixo
  },
  topSection: {
    alignItems: "center",
  },
  largeLogo: {
    width: scale(260),
    height: verticalScale(100),
    resizeMode: "contain",
    marginTop: verticalScale(16),
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  tipsText: {
    fontSize: Platform.select({
      ios: 14,
      android: 11,
    }),
    color: COLORS["text-primary"],
    width: "70%",
  },
  truckAnimation: {
    width: scale(80),
    height: verticalScale(60),
    transform: [{ scale: 4 }, { translateY: verticalScale(5) }],
  },
});

export default HeaderSection;
