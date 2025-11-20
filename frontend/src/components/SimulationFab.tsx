// frontend/src/components/SimulationFab.tsx


/**
 * Botão fixo no canto superior direito para controlar a simulação.
 *
 * - Não é arrastável.
 * - O botão "Simulação" NÃO se mexe quando o menu abre.
 * - Ao abrir, aparecem "bolinhas" (mini FABs) alinhadas verticalmente,
 *   com animação em sequência (stagger).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { SimulationMode } from "../hooks/useSimulationController";

type SimulationFabProps = {
  mode: SimulationMode;
  isPaused: boolean;
  isWrongRoute: boolean;
  visible: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onToggleWrongRoute: () => void;
  isNightTheme: boolean;
};

const SimulationFab: React.FC<SimulationFabProps> = ({
  mode,
  isPaused,
  isWrongRoute,
  visible,
  onStart,
  onPause,
  onResume,
  onStop,
  onToggleWrongRoute,
  isNightTheme,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const itemAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const actions = useMemo(() => {
    // Simulação desligada → somente "Iniciar"
    if (mode === "off") {
      return [
        {
          label: "Iniciar",
          icon: "play" as const,
          color: "#10B981",
          onPress: onStart,
        },
      ];
    }

    // Simulação ligada → sempre 3 botões:
    // [Pausar/Retomar] [Errar/Correta] [Encerrar]
    const pauseLabel = isPaused ? "Retomar" : "Pausar";
    const pauseIcon = isPaused ? ("play" as const) : ("pause" as const);
    const pauseColor = isPaused ? "#22C55E" : "#FACC15";
    const pauseHandler = isPaused ? onResume : onPause;

    const errorLabel = isWrongRoute ? "Correta" : "Errar";
    const errorIcon = isWrongRoute
      ? ("rotate-ccw" as const)
      : ("corner-up-right" as const);
    const errorColor = isWrongRoute ? "#3B82F6" : "#06B6D4";

    return [
      {
        label: pauseLabel,
        icon: pauseIcon,
        color: pauseColor,
        onPress: pauseHandler,
      },
      {
        label: errorLabel,
        icon: errorIcon,
        color: errorColor,
        onPress: onToggleWrongRoute,
      },
      {
        label: "Encerrar",
        icon: "stop-circle" as const,
        color: "#EF4444",
        onPress: onStop,
      },
    ];
  }, [
    mode,
    isPaused,
    isWrongRoute,
    onStart,
    onPause,
    onResume,
    onStop,
    onToggleWrongRoute,
  ]);

  // animação de "stagger" ao abrir/fechar o menu
  useEffect(() => {
    const enabledCount = actions.length;

    if (menuOpen) {
      const opens = itemAnims
        .map((anim, index) => {
          if (index >= enabledCount) {
            anim.setValue(0);
            return null;
          }
          return Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 7,
            tension: 80,
          });
        })
        .filter(Boolean) as Animated.CompositeAnimation[];

      Animated.stagger(70, opens).start();
    } else {
      const closes = itemAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        })
      );
      Animated.parallel(closes).start();
    }
  }, [menuOpen, actions.length, itemAnims]);

  if (!visible) {
    return null;
  }

  const mainIcon =
    mode === "off" ? "play-circle" : isPaused ? "pause-circle" : "navigation";

  // 🎨 cores dinâmicas de acordo com o tema
  const mainFabBackground = isNightTheme ? "#111827" : "rgba(255,255,255,0.95)";
  const mainFabTextColor = isNightTheme ? "#F9FAFB" : "#111827";

  const labelBackground = isNightTheme
    ? "rgba(15,23,42,0.95)"
    : "rgba(255,255,255,0.95)";
  const labelTextColor = isNightTheme ? "#E5E7EB" : "#111827";

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.inner}>
        {/* Coluna de "bolinhas" – aparece abaixo do botão, sem mover o botão */}
        <View
          pointerEvents={menuOpen ? "auto" : "none"}
          style={styles.actionsColumn}
        >
          {actions.map((action, index) => {
            const anim = itemAnims[index] ?? itemAnims[0];

            const animatedStyle = {
              opacity: anim,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                },
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-6, 0],
                  }),
                },
              ],
            };

            return (
              <Animated.View
                key={action.label}
                style={[styles.actionWrapper, animatedStyle]}
              >
                {/* Label opcional ao lado da bolinha */}
                <View
                  style={[
                    styles.actionLabelContainer,
                    { backgroundColor: labelBackground },
                  ]}
                >
                  <Text
                    style={[styles.actionLabelText, { color: labelTextColor }]}
                  >
                    {action.label}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.actionFab, { backgroundColor: action.color }]}
                  onPress={() => {
                    setMenuOpen(false);
                    action.onPress();
                  }}
                  activeOpacity={0.85}
                >
                  <Feather name={action.icon} size={18} color="#F9FAFB" />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Botão principal "Simulação" – fixo */}
        <TouchableOpacity
          style={[
            styles.mainFab,
            {
              backgroundColor: mainFabBackground,
            },
          ]}
          onPress={() => setMenuOpen((prev) => !prev)}
          activeOpacity={0.9}
        >
          <Feather name={mainIcon as any} size={22} color={mainFabTextColor} />
          <Text
            style={[
              styles.mainFabText,
              {
                color: mainFabTextColor,
              },
            ]}
          >
            Simulação
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // canto superior direito
  container: {
    position: "absolute",
    top: 80,
    right: 16,
    zIndex: 120,
    width: "100%",
    alignItems: "flex-end",
  },
  inner: {
    position: "relative",
    alignItems: "flex-end",
  },

  // botão principal
  mainFab: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  mainFabText: {
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 14,
  },

  // coluna de actions (bolinhas)
  actionsColumn: {
    position: "absolute",
    top: 48,
    right: 10,
  },
  actionWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
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
    marginRight: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  actionLabelText: {
    fontSize: 12,
    fontWeight: "500",
  },
});

export default SimulationFab;
