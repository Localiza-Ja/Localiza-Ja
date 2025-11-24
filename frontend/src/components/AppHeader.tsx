// frontend/src/components/AppHeader.tsx
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Image,
  Pressable,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

type AppHeaderProps = {
  logoSource?: any;
  isNightTheme: boolean;
  onLogout?: () => void;
  onToggleTheme?: () => void;
  variant?: "circle" | "pill";
};

export default function AppHeader({
  logoSource,
  isNightTheme,
  onLogout,
  onToggleTheme,
}: AppHeaderProps) {
  const scale = useRef(new Animated.Value(1)).current;

  // Logo automática de acordo com o tema
  const finalLogoSource =
    logoSource ??
    (isNightTheme
      ? require("../../assets/images/logo002.png")
      : require("../../assets/images/logo001.png"));

  // Estado do menu (abre/fecha)
  const [menuOpen, setMenuOpen] = useState(false);

  // Animações das duas ações
  const action1Anim = useRef(new Animated.Value(0)).current; // Dia/Noite
  const action2Anim = useRef(new Animated.Value(0)).current; // Sair

  const animateIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      bounciness: 6,
    }).start();

  const animateOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 6,
    }).start();

  // Anima abrir/fechar, igual o padrão do SimulationFab
  useEffect(() => {
    if (menuOpen) {
      Animated.stagger(70, [
        Animated.spring(action1Anim, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(action2Anim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(action1Anim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(action2Anim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [menuOpen, action1Anim, action2Anim]);

  return (
    <>
      {/* Barra do logo, fixa no topo */}
      <View style={styles.headerBar}>
        <Image
          source={finalLogoSource}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* FAB de ações (Dia/Noite + Sair) – igual SimulationFab, mas à ESQUERDA */}
      <View style={styles.menuContainer} pointerEvents="box-none">
        <View style={styles.menuInner}>
          {/* Coluna de ações, aparecendo ABAIXO do botão */}
          <View
            pointerEvents={menuOpen ? "auto" : "none"}
            style={styles.actionsColumn}
          >
            {/* Ação 1 – Modo dia/noite */}
            <Animated.View
              style={[
                styles.actionWrapper,
                {
                  opacity: action1Anim,
                  transform: [
                    {
                      scale: action1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 1],
                      }),
                    },
                    {
                      translateY: action1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-6, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.actionFab, { backgroundColor: "#0EA5E9" }]}
                onPress={() => {
                  setMenuOpen(false);
                  onToggleTheme && onToggleTheme();
                }}
                activeOpacity={0.85}
              >
                <Feather
                  name={isNightTheme ? "sun" : "moon"}
                  size={18}
                  color="#F9FAFB"
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.actionLabelContainer,
                  { backgroundColor: "rgba(15,23,42,0.95)" },
                ]}
              >
                <Text style={styles.actionLabelText}>
                  {isNightTheme ? "Modo dia" : "Modo noite"}
                </Text>
              </View>
            </Animated.View>

            {/* Ação 2 – Sair */}
            <Animated.View
              style={[
                styles.actionWrapper,
                {
                  opacity: action2Anim,
                  transform: [
                    {
                      scale: action2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 1],
                      }),
                    },
                    {
                      translateY: action2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-6, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.actionFab, { backgroundColor: "#EF4444" }]}
                onPress={() => {
                  setMenuOpen(false);
                  onLogout && onLogout();
                }}
                activeOpacity={0.85}
              >
                <Feather name="log-out" size={18} color="#F9FAFB" />
              </TouchableOpacity>

              <View
                style={[
                  styles.actionLabelContainer,
                  { backgroundColor: "#7F1D1D" },
                ]}
              >
                <Text style={styles.actionLabelText}>Sair</Text>
              </View>
            </Animated.View>
          </View>

          {/* Botão principal (engrenagem) que abre/fecha o menu */}
          <Animated.View style={{ transform: [{ scale }] }}>
            <LinearGradient
              colors={["#FDBA74", "#F59E0B"]}
              style={styles.gradient}
            >
              <Pressable
                onPress={() => setMenuOpen((v) => !v)}
                onPressIn={animateIn}
                onPressOut={animateOut}
                android_ripple={{
                  color: "rgba(255,255,255,0.15)",
                  borderless: true,
                  radius: 28,
                }}
                style={styles.mainButton}
              >
                <Feather name="settings" size={20} color="#FFFFFF" />
              </Pressable>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Barra do logo
  headerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 96, // equivalente aproximado ao h-24 + pt
    paddingTop: 35,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 90,
  },
  logo: {
    width: 150,
    height: 40,
  },

  // Container do FAB (espelhando SimulationFab: top: 80, só que à esquerda)
  menuContainer: {
    position: "absolute",
    top: 90,
    left: 16,
    zIndex: 120,
    width: "100%",
    alignItems: "flex-start",
  },
  menuInner: {
    position: "relative",
    alignItems: "flex-start",
  },

  // Coluna com as bolinhas, abaixo do botão
  actionsColumn: {
    position: "absolute",
    top: 48, // 48px abaixo do botão, igual SimulationFab
    left: 10,
  },
  actionWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 10,
  },
  actionFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  actionLabelContainer: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  actionLabelText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#F9FAFB",
  },

  // Botão principal
  gradient: {
    padding: 1,
    borderRadius: 999,
  },
  mainButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(18,19,27,0.80)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
});
