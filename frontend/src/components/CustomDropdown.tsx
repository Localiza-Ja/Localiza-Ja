//frontend/src/components/CustomDropdown.tsx

import React, { useRef } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { COLORS } from "../styles/theme";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolateColor,
  interpolate,
} from "react-native-reanimated";

// Define os tipos de dados que o componente usará, como os itens da lista e suas propriedades.
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

// Componente principal que recebe as propriedades (props) e inicializa os estados de animação e a referência (ref) para o dropdown.
const CustomDropdown = ({
  label,
  data,
  value,
  onChange,
  placeholder,
  onFocus,
  onBlur,
}: CustomDropdownProps) => {
  const dropdownRef = useRef<any>(null);
  const scale = useSharedValue(1);
  const pressProgress = useSharedValue(0);

  // Cria os estilos dinâmicos que mudam quando o componente é pressionado (escala, cor da borda e sombra).
  const animatedStyle = useAnimatedStyle(() => {
    const animatedBorderColor = interpolateColor(
      pressProgress.value,
      [0, 1],
      [COLORS.border, COLORS.primary]
    );
    const animatedShadowOpacity = interpolate(
      pressProgress.value,
      [0, 1],
      [0.1, 0.2]
    );
    const animatedShadowRadius = interpolate(
      pressProgress.value,
      [0, 1],
      [4, 8]
    );
    const animatedElevation = interpolate(pressProgress.value, [0, 1], [3, 8]);

    return {
      transform: [{ scale: scale.value }],
      borderColor: animatedBorderColor,
      shadowOpacity: animatedShadowOpacity,
      shadowRadius: animatedShadowRadius,
      elevation: animatedElevation,
    };
  });

  // Funções que controlam o início e o fim das animações quando o utilizador pressiona e solta o botão.
  const handlePressIn = () => {
    scale.value = withSpring(0.98);
    pressProgress.value = withTiming(1, { duration: 100 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1);
    pressProgress.value = withTiming(0, { duration: 200 });
  };

  // Função customizada que desenha cada linha da lista, aplicando cores alternadas e destacando o item selecionado.
  const renderDropdownItem = (item: DropdownItem) => {
    const isSelected = item.value === value;
    const index = data.findIndex((d) => d.value === item.value);
    const isEven = index % 2 === 0;

    return (
      <View
        style={[
          styles.listItemContainer,
          isEven ? null : styles.listItemContainerOdd,
          isSelected && styles.selectedListItemContainer,
        ]}
      >
        <Text
          style={[
            styles.listItemText,
            isSelected && styles.selectedListItemText,
          ]}
        >
          {item.label}
        </Text>
      </View>
    );
  };

  // Renderiza a estrutura visual do componente, combinando o botão "falso" animado com o componente de dropdown "real" escondido.
  return (
    <View className="w-full mb-4">
      <Text className="text-text-secondary font-semibold mb-2 ml-1 text-sm">
        {label}
      </Text>
      <View style={{ position: "relative", width: "100%", height: 58 }}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => dropdownRef.current?.open()}
          style={{ zIndex: 10 }}
        >
          <Animated.View style={[styles.dropdown, animatedStyle]}>
            <Text
              style={value ? styles.selectedTextStyle : styles.placeholderStyle}
            >
              {value
                ? data.find((item) => item.value === value)?.label
                : placeholder}
            </Text>
            <Ionicons
              name="chevron-down"
              size={22}
              color={COLORS["text-secondary"]}
            />
          </Animated.View>
        </Pressable>

        <View style={styles.realDropdownContainer}>
          <Dropdown
            ref={dropdownRef}
            style={styles.realDropdownStyle}
            containerStyle={[styles.containerStyle, styles.shadow]}
            renderItem={renderDropdownItem}
            data={data}
            maxHeight={200}
            labelField="label"
            valueField="value"
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
          />
        </View>
      </View>
    </View>
  );
};

// Define todos os estilos visuais fixos do componente, como tamanhos, cores, fontes e sombras.
const styles = StyleSheet.create({
  dropdown: {
    width: "100%",
    backgroundColor: COLORS["input-background"],
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 58,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  realDropdownContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    opacity: 0,
  },
  realDropdownStyle: {
    width: "100%",
    height: "100%",
  },
  containerStyle: {
    borderRadius: 12,
    backgroundColor: COLORS["input-background"],
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
    overflow: "hidden",
  },
  listItemContainer: {
    paddingVertical: 17,
    paddingHorizontal: 16,
    backgroundColor: COLORS["input-background"],
  },
  listItemContainerOdd: {
    backgroundColor: COLORS.gray?.[200] || "#F8F9FA",
  },
  listItemText: {
    color: COLORS["text-primary"],
    fontSize: 14,
  },
  selectedListItemContainer: {
    backgroundColor: COLORS["ui-border"] || "#E9ECEF",
  },
  selectedListItemText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 15,
  },
  placeholderStyle: {
    fontSize: 14,
    color: COLORS.placeholder,
  },
  selectedTextStyle: {
    fontSize: 14,
    color: COLORS["text-primary"],
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default CustomDropdown;
