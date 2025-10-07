// ====================================================================================
// ARQUIVO: InputField.tsx
// OBJETIVO: Componente reutilizável para campos de texto, com estilo de foco e sombra.
// ====================================================================================

import React, { forwardRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  Platform,
} from "react-native";
import { COLORS, SPACING } from "../styles/theme";

// ====================================================================================
// INTERFACE DE PROPRIEDADES (PROPS)
// ====================================================================================

interface InputFieldProps extends TextInputProps {
  // O texto exibido no label acima do campo de texto.
  label: string;
}

// ====================================================================================
// COMPONENTE PRINCIPAL
// ====================================================================================

// Usamos `forwardRef` para permitir que o componente pai passe uma `ref` diretamente
// para o `TextInput` interno. Essencial para funcionalidades como focar no próximo campo.
const InputField = forwardRef<TextInput, InputFieldProps>((props, ref) => {
  // ----------------------------------------------------------------------------------
  // HOOKS
  // ----------------------------------------------------------------------------------

  // Extrai a prop 'label' e passa o resto das props (`...rest`) para o TextInput.
  const { label, ...rest } = props;

  // Cria um estado para controlar se o campo de texto está focado ou não.
  const [isFocused, setIsFocused] = useState(false);

  // ----------------------------------------------------------------------------------
  // LÓGICA DE ESTILOS
  // ----------------------------------------------------------------------------------

  // Compõe o estilo final do TextInput. Começa com os estilos base
  // e adiciona o `focusedStyle` condicionalmente se `isFocused` for verdadeiro.
  const textInputStyle = [
    styles.textInput,
    styles.textInputWithShadow,
    isFocused && styles.focusedStyle,
  ];

  // ----------------------------------------------------------------------------------
  // RENDERIZAÇÃO DO COMPONENTE (JSX)
  // ----------------------------------------------------------------------------------

  return (
    <View style={styles.outerContainer}>
      <Text style={styles.label} allowFontScaling={false}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessible={true}
        accessibilityLabel={`Campo de texto para ${label}`}
        accessibilityHint={`Digite aqui a informação do campo ${label}`}
        style={textInputStyle}
        placeholderTextColor={COLORS.placeholder}
        allowFontScaling={false}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...rest}
      />
    </View>
  );
});

// ====================================================================================
// ESTILOS (com StyleSheet)
// ====================================================================================

const styles = StyleSheet.create({
  // Container principal do componente
  outerContainer: {
    width: "100%",
    marginBottom: SPACING[4],
  },
  // Estilo para o label (título) do campo
  label: {
    color: COLORS["text-secondary"],
    fontWeight: "600", // `font-semibold`
    marginBottom: SPACING[2] / 2,
    marginLeft: SPACING[2] / 4,
    fontSize: 14,
  },
  // Estilos base para a caixa de texto
  textInput: {
    height: Platform.OS === "android" ? 45 : 50,
    textAlignVertical: "center",
  },
  // Estilos de aparência (cores, bordas, sombras)
  textInputWithShadow: {
    width: "100%",
    backgroundColor: COLORS["input-background"],
    paddingHorizontal: SPACING[4],
    borderRadius: 12,
    fontSize: 14,
    color: COLORS["text-primary"],
    borderWidth: 1.5,
    borderColor: COLORS.border,

    // Sombra padrão para iOS
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // Sombra padrão para Android
    elevation: 3,
  },
  // Estilos aplicados APENAS quando o campo está focado
  focusedStyle: {
    borderColor: COLORS.primary,
    // Sombra mais forte para iOS
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    // Sombra mais forte para Android
    elevation: 6,
  },
});

InputField.displayName = "InputField";

export default InputField;
