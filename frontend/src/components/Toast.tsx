// frontend/src/components/Toast.tsx

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  StatusBar,
  Platform,
  LayoutChangeEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type ToastType = "success" | "warning" | "error" | "info";

type ToastOptions = {
  type?: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// barra de progresso animada
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// cor base do card (fundo sólido)
const BASE_CARD_COLOR = "#242C32";

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(new Animated.Value(1)).current;
  const [cardWidth, setCardWidth] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 300,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setCurrentToast(null));
  }, [animatedValue]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const duration = options.durationMs ?? 3200;

      setCurrentToast({
        type: options.type || "info",
        title: options.title,
        message: options.message,
        durationMs: duration,
      });

      // animação de entrada
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      progressValue.setValue(1);
      Animated.timing(progressValue, {
        toValue: 0,
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      timeoutRef.current = setTimeout(() => {
        hide();
      }, duration);
    },
    [animatedValue, hide, progressValue]
  );

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 0],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const progressWidth =
    cardWidth > 0
      ? progressValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, cardWidth],
        })
      : 0;

  const paletteByType: Record<
    ToastType,
    {
      icon: keyof typeof Feather.glyphMap;
      accentFrom: string;
      accentTo: string;
      badgeBg: string;
      iconColor: string;
    }
  > = {
    success: {
      icon: "check-circle",
      accentFrom: "#01E17B",
      accentTo: "#00DF80",
      badgeBg: "rgba(1,225,123,0.14)",
      iconColor: "#00DF80",
    },
    warning: {
      icon: "alert-triangle",
      accentFrom: "#facc15",
      accentTo: "#eab308",
      badgeBg: "rgba(234,179,8,0.16)",
      iconColor: "#facc15",
    },
    error: {
      icon: "x-circle",
      accentFrom: "#fb7185",
      accentTo: "#ef4444",
      badgeBg: "rgba(248,113,113,0.16)",
      iconColor: "#fb7185",
    },
    info: {
      icon: "info",
      accentFrom: "#38bdf8",
      accentTo: "#0ea5e9",
      badgeBg: "rgba(56,189,248,0.16)",
      iconColor: "#38bdf8",
    },
  };

  const config = paletteByType[currentToast?.type || "info"];

  // overlay de cor do lado esquerdo (accent por cima do fundo)
  const accentOverlayStrong = `${config.accentFrom}35`;
  const accentOverlayFade = `${config.accentFrom}00`;

  const handleCardLayout = (e: LayoutChangeEvent) => {
    setCardWidth(e.nativeEvent.layout.width);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {currentToast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.overlay,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hide}
            style={styles.touchArea}
          >
            <View style={styles.card} onLayout={handleCardLayout}>
              {/* overlay em cima do fundo, do lado esquerdo */}
              <LinearGradient
                colors={[
                  accentOverlayStrong,
                  accentOverlayFade,
                  BASE_CARD_COLOR,
                ]}
                locations={[0, 0.28, 0.6]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardGradient}
              />

              <View style={styles.cardInner}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: config.badgeBg },
                  ]}
                >
                  <Feather
                    name={config.icon}
                    size={22}
                    color={config.iconColor}
                  />
                </View>

                <View style={styles.textContainer}>
                  <Text style={styles.title} numberOfLines={1}>
                    {currentToast.title}
                  </Text>
                  {currentToast.message ? (
                    <Text style={styles.message} numberOfLines={2}>
                      {currentToast.message}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* barra de progresso colada no rodapé */}
              <View style={styles.bottomAccentContainer}>
                {cardWidth > 0 && (
                  <AnimatedLinearGradient
                    colors={[config.accentFrom, config.accentTo]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.bottomAccent,
                      { width: progressWidth as any },
                    ]}
                  />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de um ToastProvider");
  }
  return ctx;
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 16 : 48,
    alignItems: "center",
    zIndex: 999,
  },
  touchArea: {
    paddingHorizontal: 16,
    width: "70%",
    alignSelf: "center",
  },

  // card com fundo sólido
  card: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    position: "relative",
    overflow: "hidden",
    backgroundColor: BASE_CARD_COLOR,
  },

  // camada do gradiente por cima do fundo (lado esquerdo)
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },

  cardInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#f9fafb",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
    textAlign: "center",
  },
  message: {
    color: "#9ca3af",
    fontSize: 13,
  },

  bottomAccentContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    overflow: "hidden",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  bottomAccent: {
    height: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
});
