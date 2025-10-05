import React from "react";
// Importe o StyleSheet para as mudanças
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

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const { height: screenHeight } = Dimensions.get("window");

interface HeaderSectionProps {
  title: string;
  tips: string;
  keyboardAnimation: SharedValue<number>;
}

const HeaderSection = ({
  title,
  tips,
  keyboardAnimation,
}: HeaderSectionProps) => {
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
          <Image
            source={require("../../assets/images/truck001.png")}
            style={styles.truckImage}
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
  truckImage: {
    width: scale(100),
    height: verticalScale(60),
    resizeMode: "contain",
  },
});

export default HeaderSection;
