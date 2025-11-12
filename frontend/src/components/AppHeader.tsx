// frontend/src/components/AppHeader.tsx
import React, { useRef } from "react";
import {
  View,
  Image,
  Pressable,
  Platform,
  Animated,
  StyleSheet,
  Text,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

type AppHeaderProps = {
  logoSource?: any;
  onLogout?: () => void;
  variant?: "circle" | "pill";
};

export default function AppHeader({
  logoSource,
  onLogout,
  variant = "circle",
}: AppHeaderProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();

  const animateOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();

  return (
    <View className="absolute top-0 left-0 right-0 h-24 flex-row items-center justify-between px-4 pt-[35px] bg-transparent">
      <View style={{ width: 44, height: 44, justifyContent: "center" }}>
        {onLogout && (
          <Animated.View style={{ transform: [{ scale }] }}>
            <LinearGradient
              colors={["#FDBA74", "#F59E0B"]} // anel âmbar quente
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.gradientRing,
                variant === "pill" && styles.pillGradient,
              ]}
            >
              <Pressable
                onPress={onLogout}
                onPressIn={animateIn}
                onPressOut={animateOut}
                android_ripple={{
                  color: "rgba(255,255,255,0.15)",
                  borderless: true,
                  radius: 28,
                }}
                style={[
                  styles.innerButton,
                  variant === "pill" ? styles.innerPill : styles.innerCircle,
                ]}
              >
                <Feather name="log-out" size={20} color="#FFFFFF" />

                {/* 👉 se quiser mostrar o texto "Sair", descomente abaixo */}
                {variant === "pill" && (
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.logoutText}>Sair</Text>
                  </View>
                )}
              </Pressable>
            </LinearGradient>
          </Animated.View>
        )}
      </View>

      {/* Logo central */}
      <View>
        {logoSource && (
          <Image
            source={logoSource}
            className="w-[150px] h-[40px]"
            resizeMode="contain"
          />
        )}
      </View>

      {/* Spacer simétrico à esquerda */}
      <View style={{ width: 44, height: 44 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  gradientRing: {
    padding: 1,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  pillGradient: {
    borderRadius: 24,
  },
  innerButton: {
    backgroundColor: "rgba(18,19,27,0.80)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  innerCircle: {
    width: 40,
    height: 40,
    borderRadius: 999,
  },
  innerPill: {
    minWidth: 92,
    height: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: "row",
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
});
