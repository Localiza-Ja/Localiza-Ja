// ARQUIVO: frontend/src/components/CustomButton.tsx

import React from "react";
import { Text, TouchableOpacity } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
}

const CustomButton = ({ title, onPress }: ButtonProps) => (
  <TouchableOpacity
    className="w-full bg-text-primary p-4 rounded-full shadow-md active:opacity-80"
    onPress={onPress}
    accessible={true}
    accessibilityLabel={title}
    accessibilityHint={`Toque para ${title}`}
    accessibilityRole="button"
  >
    <Text className="text-background text-center text-base font-bold">
      {title}
    </Text>
  </TouchableOpacity>
);

export default CustomButton;
