// ARQUIVO: frontend/src/components/CustomButton.tsx (com disabled)
import React from "react";
import { Text, TouchableOpacity } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean; // Adicionamos a prop opcional
}

const CustomButton = ({ title, onPress, disabled }: ButtonProps) => (
  <TouchableOpacity
    // Aplicamos estilos diferentes quando está desabilitado
    className={`
      w-full p-4 rounded-full shadow-md
      ${disabled ? "bg-gray-600" : "bg-text-primary active:opacity-80"}
    `}
    onPress={onPress}
    disabled={disabled} // Passamos a prop para o componente
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
