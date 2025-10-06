// frontend/src/components/HeaderSection.tsx

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
import { COLORS } from "../styles/theme";
import { scale, verticalScale } from "react-native-size-matters";
import LottieView from "lottie-react-native";

const START_FRAME = 0;
const END_FRAME = 26;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const { height: screenHeight } = Dimensions.get("window");

interface HeaderSectionProps {
  title: string;
  tips: string;
  keyboardAnimation: SharedValue<number>;
}

const HeaderSection = ({ tips, keyboardAnimation }: HeaderSectionProps) => {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    animationRef.current?.play(START_FRAME, END_FRAME);
  }, []);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      keyboardAnimation.value,
      [0, 1],
      [screenHeight * 0.4, screenHeight * 0.14]
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
      style={[styles.gradientContainer, animatedContainerStyle]}
    >
      <Animated.View
        style={[styles.absoluteFill, styles.centerContent, smallLogoStyle]}
      >
        <Image
          source={require("../../assets/images/logo001.png")}
          style={styles.smallLogo}
        />
      </Animated.View>

      <Animated.View style={[styles.mainContentContainer, mainContentStyle]}>
        <View style={styles.topSection}>
          <Image
            source={require("../../assets/images/logo001.png")}
            style={styles.largeLogo}
          />
        </View>
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

const styles = StyleSheet.create({
  gradientContainer: {
    width: "100%",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 50,
    overflow: "hidden",
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
    justifyContent: "space-between",
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
