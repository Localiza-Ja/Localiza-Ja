// ====================================================================================
// ARQUIVO: CustomButton.tsx
// OBJETIVO: Componente de botão reutilizável padrão do aplicativo. Utiliza
//           TouchableOpacity para um feedback de opacidade ao ser pressionado.
// ====================================================================================

import React from "react";
import { Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { COLORS, SPACING } from "../styles/theme";

// ====================================================================================
// INTERFACE DE PROPRIEDADES (PROPS)
// ====================================================================================

interface ButtonProps {
  // O texto exibido no botão.
  title: string;
  // A função a ser executada quando o botão é pressionado.
  onPress: () => void;
  // Se `true`, o botão fica visualmente desabilitado e não pode ser pressionado.
  disabled?: boolean;
}

// ====================================================================================
// COMPONENTE PRINCIPAL
// ====================================================================================

const CustomButton = ({ title, onPress, disabled }: ButtonProps) => (
  // TouchableOpacity é um componente simples que dá um feedback de opacidade ao ser tocado.
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
    activeOpacity={0.8}
  >
    <Text style={styles.text} allowFontScaling={false}>
      {title}
    </Text>
  </TouchableOpacity>
);

// ====================================================================================
// ESTILOS (com StyleSheet)
// ====================================================================================

const styles = StyleSheet.create({
  // Estilo base do botão, com tamanho, bordas e sombras.
  button: {
    height: Platform.OS === "android" ? 48 : 58,
    width: "100%",
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING[4],
    // Sombra para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    // Sombra para Android
    elevation: 5,
  },
  // Estilo para o botão quando está habilitado (fundo escuro).
  buttonEnabled: {
    backgroundColor: COLORS["text-primary"],
  },
  // Estilo para o botão quando está desabilitado (fundo cinza).
  buttonDisabled: {
    backgroundColor: COLORS.gray[600],
  },
  // Estilo para o texto do botão.
  text: {
    color: COLORS.background,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CustomButton;
