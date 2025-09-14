// ARQUIVO: frontend/src/components/InputField.tsx

import React, { forwardRef } from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";
import { COLORS } from "../styles/theme";

interface InputFieldProps extends TextInputProps {
  label: string;
}

const InputField = forwardRef<TextInput, InputFieldProps>((props, ref) => {
  const { label, ...rest } = props;

  return (
    <View className="w-full mb-4">
      <Text className="text-text-secondary font-semibold mb-2 ml-1 text-sm">
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessible={true}
        accessibilityLabel={`Campo de texto para ${label}`}
        accessibilityHint={`Digite aqui a informação do campo ${label}`}
        className="w-full bg-input-background p-4 rounded-xl text-sm text-text-primary"
        placeholderTextColor={COLORS.placeholder}
        {...rest}
      />
    </View>
  );
});

InputField.displayName = "InputField";

export default InputField;
