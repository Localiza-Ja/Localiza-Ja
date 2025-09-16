// ARQUIVO: frontend/src/components/CustomDropdown.tsx (Versão Final com Estilos do Figma)

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { COLORS } from "../styles/theme";
import { Ionicons } from "@expo/vector-icons";

interface DropdownItem {
  label: string;
  value: string;
}

interface CustomDropdownProps {
  label: string;
  data: DropdownItem[];
  value: string | null;
  onChange: (item: DropdownItem) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

const CustomDropdown = ({
  label,
  data,
  value,
  onChange,
  placeholder,
  onFocus,
  onBlur,
}: CustomDropdownProps) => {
  return (
    <View className="w-full mb-4">
      <Text className="text-text-secondary font-semibold mb-2 ml-1 text-sm">
        {label}
      </Text>
      <Dropdown
        style={[styles.dropdown, styles.shadow]}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        containerStyle={[styles.containerStyle, styles.shadow]}
        itemContainerStyle={styles.itemContainerStyle}
        itemTextStyle={styles.itemTextStyle}
        activeColor={"#f0f0f0"} // Um cinza bem claro para o item selecionado
        data={data}
        maxHeight={200}
        labelField="label"
        valueField="value"
        placeholder={placeholder || "Selecione..."}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        renderRightIcon={() => (
          <Ionicons
            name="chevron-down"
            size={22}
            color={COLORS.textSecondary}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // --- AJUSTE 1: MUDAMOS O FUNDO PARA BRANCO ---
  dropdown: {
    width: "100%",
    backgroundColor: COLORS.background, // Era COLORS.inputBackground
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 58,
  },
  // --- AJUSTE 2: MUDAMOS O FUNDO DA LISTA PARA BRANCO ---
  containerStyle: {
    borderRadius: 12,
    backgroundColor: COLORS.background, // Era COLORS.inputBackground
    borderWidth: 0,
    marginTop: 8,
    // Garante que a sombra não seja cortada
    overflow: "visible",
  },
  itemContainerStyle: {
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  itemTextStyle: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  // --- AJUSTE 3: CORRIGIMOS A COR DO PLACEHOLDER ---
  placeholderStyle: {
    fontSize: 14,
    color: COLORS.placeholder, // Usando a cor cinza correta
  },
  selectedTextStyle: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2, // Aumentamos um pouco a sombra vertical
    },
    shadowOpacity: 0.1, // Sombra mais sutil
    shadowRadius: 4,
    elevation: 3,
  },
});

export default CustomDropdown;
