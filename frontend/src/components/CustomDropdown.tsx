// ====================================================================================
// ARQUIVO: CustomDropdown.tsx
// OBJETIVO: Componente customizado de Dropdown (lista de seleção) com animações
//           e um truque de sobreposição para controle total do design.
// ====================================================================================


import React, {
  useRef,
  forwardRef,
  useImperativeHandle,
  ForwardedRef,
} from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolateColor,
  interpolate,
} from "react-native-reanimated";
import { COLORS } from "../styles/theme";

// ====================================================================================
// CONSTANTES (Locais a este componente)
// ====================================================================================

// Define o ajuste vertical da lista de itens no Android para ficar mais próxima.
const ANDROID_DROPDOWN_OFFSET = -5;

// ====================================================================================
// INTERFACES DE PROPRIEDADES (PROPS) E TIPOS
// ====================================================================================

// Descreve a estrutura de cada item na lista do dropdown.
interface DropdownItem {
  label: string;
  value: string;
}

// Descreve todas as props que o componente CustomDropdown aceita.
interface CustomDropdownProps {
  label: string;
  data: DropdownItem[];
  value: string | null;
  onChange: (item: DropdownItem) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onPress: () => void;
}

// ====================================================================================
// COMPONENTE PRINCIPAL
// ====================================================================================

const CustomDropdown = forwardRef(
  (props: CustomDropdownProps, ref: ForwardedRef<{ open: () => void }>) => {
    // --------------------------------------------------------------------------------
    // EXTRAÇÃO DE PROPS
    // --------------------------------------------------------------------------------

    const {
      label,
      data,
      value,
      onChange,
      placeholder,
      onFocus,
      onBlur,
      onPress,
    } = props;

    // --------------------------------------------------------------------------------
    // HOOKS
    // --------------------------------------------------------------------------------

    // Referência para o componente Dropdown da biblioteca, para podermos chamar seus métodos.
    const dropdownRef = useRef<any>(null);
    const scale = useSharedValue(1);
    const pressProgress = useSharedValue(0);

    // `useImperativeHandle` expõe o método `open` do Dropdown interno para o componente pai.
    // Isso permite que a tela de Login abra o dropdown através da `ref`.
    useImperativeHandle(ref, () => ({
      open() {
        dropdownRef.current?.open();
      },
    }));

    // --------------------------------------------------------------------------------
    // ANIMAÇÕES (com react-native-reanimated)
    // --------------------------------------------------------------------------------

    // Animação para o container principal do dropdown (o campo visível).
    const animatedStyle = useAnimatedStyle(() => {
      // Anima a cor da borda, a opacidade da sombra, o raio da sombra e a elevação.
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
      const animatedElevation = interpolate(
        pressProgress.value,
        [0, 1],
        [3, 8]
      );

      return {
        transform: [{ scale: scale.value }],
        borderColor: animatedBorderColor,
        shadowOpacity: animatedShadowOpacity,
        shadowRadius: animatedShadowRadius,
        elevation: animatedElevation,
      };
    });

    // --------------------------------------------------------------------------------
    // FUNÇÕES DE MANIPULAÇÃO DE EVENTOS (Handlers)
    // --------------------------------------------------------------------------------

    // Funções para controlar a animação de "pressionado".
    const handlePressIn = () => {
      scale.value = withSpring(0.98);
      pressProgress.value = withTiming(1, { duration: 100 });
    };

    const handlePressOut = () => {
      scale.value = withSpring(1);
      pressProgress.value = withTiming(0, { duration: 200 });
    };

    // Função que renderiza cada item da lista do dropdown.
    const renderDropdownItem = (item: DropdownItem) => {
      const isSelected = item.value === value;
      const index = data.findIndex((d) => d.value === item.value);
      const isEven = index % 2 === 0;

      return (
        <View
          style={[
            styles.listItemContainer,
            isEven ? null : styles.listItemContainerOdd,
          ]}
        >
          <Text
            style={[
              styles.listItemText,
              isSelected && styles.selectedListItemText,
            ]}
            allowFontScaling={false}
          >
            {item.label}
          </Text>
        </View>
      );
    };

    // --------------------------------------------------------------------------------
    // RENDERIZAÇÃO DO COMPONENTE (JSX)
    // --------------------------------------------------------------------------------

    return (
      <View style={styles.outerContainer}>
        <Text style={styles.label}>{label}</Text>

        {/* O truque deste componente: um container relativo com duas camadas. */}
        <View style={styles.container}>
          {/* CAMADA 1: O botão customizado e visível que o usuário interage. */}
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            style={{ zIndex: 1 }}
          >
            <Animated.View style={[styles.dropdown, animatedStyle]}>
              <Text
                style={
                  value ? styles.selectedTextStyle : styles.placeholderStyle
                }
                allowFontScaling={false}
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

          {/* CAMADA 2: O Dropdown real da biblioteca, invisível e escondido atrás. */}
          {/* Ele cuida de toda a lógica de abrir a lista, mas sua aparência é controlada por nós. */}
          <View style={styles.realDropdownContainer}>
            <Dropdown
              ref={dropdownRef}
              style={styles.realDropdownStyle}
              containerStyle={[
                styles.containerStyle,
                styles.shadow,
                Platform.OS === "android" && {
                  marginTop: ANDROID_DROPDOWN_OFFSET,
                },
              ]}
              renderItem={renderDropdownItem}
              data={data}
              maxHeight={200}
              labelField="label"
              valueField="value"
              value={value}
              onChange={onChange}
              onFocus={onFocus}
              onBlur={onBlur}
              dropdownPosition="bottom"
            />
          </View>
        </View>
      </View>
    );
  }
);

// ====================================================================================
// ESTILOS (com StyleSheet)
// ====================================================================================

const styles = StyleSheet.create({
  outerContainer: {
    width: "100%",
    marginBottom: 12,
  },
  label: {
    color: COLORS["text-secondary"],
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 14,
  },
  container: {
    position: "relative",
    width: "100%",
    height: 58,
  },
  // O campo visível do dropdown
  dropdown: {
    height: Platform.OS === "android" ? 48 : 58,
    width: "100%",
    backgroundColor: COLORS["input-background"],
    paddingHorizontal: 16,
    borderRadius: 12,
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
  // Container do dropdown invisível
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
  // Estilo da lista de itens que abre
  containerStyle: {
    borderRadius: 12,
    backgroundColor: COLORS["input-background"],
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    overflow: "hidden",
  },
  // Container de cada item da lista
  listItemContainer: {
    paddingVertical: Platform.OS === "android" ? 12 : 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS["input-background"],
  },
  // Cor de fundo para itens ímpares (efeito zebrado)
  listItemContainerOdd: {
    backgroundColor: COLORS.gray?.[100] || "#F8F9FA",
  },
  // Texto de um item normal da lista
  listItemText: {
    color: COLORS["text-primary"],
    fontSize: 14,
  },
  // Texto do item SELECIONADO na lista
  selectedListItemText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 15,
  },
  // Estilos para o texto DENTRO do campo visível
  placeholderStyle: {
    fontSize: 14,
    color: COLORS.placeholder,
  },
  selectedTextStyle: {
    fontSize: 14,
    color: COLORS["text-primary"],
  },
  // Estilo para a sombra da lista
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default CustomDropdown;
