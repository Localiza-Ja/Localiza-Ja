// frontend/src/components/CustomAlert.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";

type AlertVariant = "info" | "success" | "warning" | "danger";

type AlertButtonVariant =
  | "default"
  | "primary"
  | "danger"
  | "ghost"
  | "warning";

export type AlertButton = {
  text: string;
  onPress?: () => void;
  variant?: AlertButtonVariant | string;
};

export type AlertOptions = {
  title: string;
  message?: string;
  type?: AlertVariant;
  buttons?: AlertButton[];
};

type InternalAlertState = AlertOptions & {
  visible: boolean;
};

type CustomAlertContextValue = {
  showAlert: (options: AlertOptions) => void;
};

const CustomAlertContext = createContext<CustomAlertContextValue | undefined>(
  undefined
);

export const useCustomAlert = (): CustomAlertContextValue => {
  const ctx = useContext(CustomAlertContext);
  if (!ctx) {
    throw new Error(
      "useCustomAlert deve ser usado dentro de um CustomAlertProvider"
    );
  }
  return ctx;
};

export const CustomAlertProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [alertState, setAlertState] = useState<InternalAlertState>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    buttons: [],
  });

  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const runShowAnimation = useCallback(() => {
    translateY.setValue(40);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const runHideAnimation = useCallback(
    (onEnd?: () => void) => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 40,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onEnd?.();
      });
    },
    [opacity, translateY]
  );

  const hideAlert = useCallback(() => {
    runHideAnimation(() => {
      setAlertState((prev) => ({ ...prev, visible: false }));
    });
  }, [runHideAnimation]);

  const showAlert = useCallback(
    (options: AlertOptions) => {
      setAlertState({
        visible: true,
        title: options.title,
        message: options.message ?? "",
        type: options.type ?? "info",
        buttons:
          options.buttons && options.buttons.length > 0
            ? options.buttons
            : [
                {
                  text: "OK",
                  variant: options.type === "warning" ? "warning" : "primary",
                },
              ],
      });

      // espera o state aplicar e roda animação
      setTimeout(() => runShowAnimation(), 10);
    },
    [runShowAnimation]
  );

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    hideAlert();
  };

  const renderIconByType = (type: AlertVariant) => {
    switch (type) {
      case "success":
        return (
          <View style={[styles.iconContainer, styles.successIconBg]}>
            <Feather name="check" size={20} color="#FFFFFF" />
          </View>
        );
      case "warning":
        return (
          <View style={[styles.iconContainer, styles.warningIconBg]}>
            <Feather name="alert-triangle" size={20} color="#FFFFFF" />
          </View>
        );
      case "danger":
        return (
          <View style={[styles.iconContainer, styles.dangerIconBg]}>
            <Feather name="x-circle" size={20} color="#FFFFFF" />
          </View>
        );
      case "info":
      default:
        return (
          <View style={[styles.iconContainer, styles.infoIconBg]}>
            <Feather name="info" size={20} color="#FFFFFF" />
          </View>
        );
    }
  };

  const renderButton = (button: AlertButton, index: number) => {
    const variant = button.variant ?? "default";

    let buttonStyle: any = styles.buttonDefault;
    let textStyle: any = styles.buttonTextDefault;

    if (variant === "primary") {
      buttonStyle = styles.buttonPrimary;
      textStyle = styles.buttonTextPrimary;
    } else if (variant === "danger") {
      buttonStyle = styles.buttonDanger;
      textStyle = styles.buttonTextPrimary;
    } else if (variant === "ghost") {
      buttonStyle = styles.buttonGhost;
      textStyle = styles.buttonTextGhost;
    } else if (variant === "warning") {
      buttonStyle = styles.buttonWarning;
      textStyle = styles.buttonTextWarning;
    }

    return (
      <TouchableOpacity
        key={`${button.text}-${index}`}
        style={[styles.buttonBase, buttonStyle]}
        activeOpacity={0.9}
        onPress={() => handleButtonPress(button)}
      >
        <Text style={[styles.buttonTextBase, textStyle]}>{button.text}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <CustomAlertContext.Provider value={{ showAlert }}>
      {children}

      <Modal
        transparent
        visible={alertState.visible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={hideAlert}
      >
        <View style={styles.backdrop}>
          <Animated.View
            style={[
              styles.sheetContainer,
              {
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.contentRow}>
              {renderIconByType(alertState.type ?? "info")}
              <View style={styles.textContainer}>
                <Text style={styles.title}>{alertState.title}</Text>
                {!!alertState.message && (
                  <Text style={styles.message}>{alertState.message}</Text>
                )}
              </View>
            </View>

            {alertState.buttons && alertState.buttons.length > 0 && (
              <View
                style={[
                  styles.buttonsRow,
                  alertState.buttons.length === 1 && styles.buttonsRowSingle,
                ]}
              >
                {alertState.buttons.map(renderButton)}
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </CustomAlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === "android" ? 32 : 36,
    backgroundColor: "#111827",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: Platform.OS === "android" ? "30%" : undefined,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  infoIconBg: {
    backgroundColor: "#2563EB",
  },
  successIconBg: {
    backgroundColor: "#16A34A",
  },
  warningIconBg: {
    backgroundColor: "#F59E0B",
  },
  dangerIconBg: {
    backgroundColor: "#DC2626",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: "rgba(249,250,251,0.8)",
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 18,
  },
  buttonsRowSingle: {
    justifyContent: "center",
  },
  buttonBase: {
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginLeft: 8,
  },
  buttonTextBase: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
  buttonDefault: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(249,250,251,0.22)",
  },
  buttonTextDefault: {
    color: "#E5E7EB",
  },
  buttonPrimary: {
    backgroundColor: "#2563EB",
  },
  buttonDanger: {
    backgroundColor: "#DC2626",
  },
  buttonTextPrimary: {
    color: "#FFFFFF",
  },
  buttonGhost: {
    backgroundColor: "transparent",
  },
  buttonTextGhost: {
    color: "rgba(249,250,251,0.75)",
  },

  buttonWarning: {
    backgroundColor: "#F59E0B",
  },
  buttonTextWarning: {
    color: "#FFFFFF",
  },
});
