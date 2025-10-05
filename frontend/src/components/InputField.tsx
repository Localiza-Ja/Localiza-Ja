//frontend/src/components/InputField.tsx

import React, { forwardRef } from "react";
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
        style={[styles.textInput, styles.textInputWithNativeWind]}
        placeholderTextColor={COLORS.placeholder}
        allowFontScaling={false}
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
  },
});

InputField.displayName = "InputField";

export default InputField;
