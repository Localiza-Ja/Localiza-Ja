//frontend/src/components/InputField.tsx

import React, { forwardRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  Platform,
} from "react-native";
import { COLORS } from "../styles/theme";

interface InputFieldProps extends TextInputProps {
  label: string;
}

const InputField = forwardRef<TextInput, InputFieldProps>((props, ref) => {
  const { label, ...rest } = props;

  const [isFocused, setIsFocused] = useState(false);
  const textInputStyle = [
    styles.textInput,
    styles.textInputWithNativeWind,
    isFocused && styles.focusedStyle,
  ];

  return (
    <View className="w-full mb-4">
      <Text
        className="text-text-secondary font-semibold mb-2 ml-1 text-sm"
        allowFontScaling={false}
      >
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

const styles = StyleSheet.create({
  textInput: {
    height: Platform.OS === "android" ? 45 : 50,
    textAlignVertical: "center",
  },
  textInputWithNativeWind: {
    width: "100%",
    backgroundColor: COLORS["input-background"],
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 14,
    color: COLORS["text-primary"],
    borderWidth: 1.5,
    borderColor: COLORS.border,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1, 
    shadowRadius: 2,
    elevation: 3,
  },

  focusedStyle: {
    borderColor: COLORS.primary,

    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});

InputField.displayName = "InputField";

export default InputField;
