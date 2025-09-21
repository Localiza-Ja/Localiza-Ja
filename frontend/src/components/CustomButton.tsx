import React from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { COLORS, SPACING } from "../styles/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

const CustomButton = ({ title, onPress, disabled }: ButtonProps) => (
  <TouchableOpacity
    style={[
      styles.button,
      disabled ? styles.buttonDisabled : styles.buttonEnabled,
    ]}
    onPress={onPress}
    disabled={disabled}
    accessible={true}
    accessibilityLabel={title}
    accessibilityHint={`Toque para ${title}`}
    accessibilityRole="button"
  >
    <Text style={styles.text} allowFontScaling={false}>
      {title}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    height: Platform.OS === "android" ? 48 : 58,
    width: "100%",
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING[4],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonEnabled: {
    backgroundColor: COLORS["text-primary"],
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray[600],
  },
  text: {
    color: COLORS.background,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CustomButton;
