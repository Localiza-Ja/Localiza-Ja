import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  StyleSheet,
} from "react-native";

import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  interpolate,
  Easing,
} from "react-native-reanimated";

import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import InputField from "../components/InputField";
import CustomButton from "../components/CustomButton";
import HeaderSection from "../components/HeaderSection";
import CustomDropdown from "../components/CustomDropdown";
import { COLORS, SPACING } from "../styles/theme";

type UserType = "motorista" | "cliente" | null;

export default function Login() {
  const [userType, setUserType] = useState<UserType>(null);
  const [pedido, setPedido] = useState("");
  const [cnh, setCnh] = useState("");
  const [placa, setPlaca] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const placaInputRef = useRef<TextInput>(null);
  const dropdownRef = useRef<{ open: () => void }>(null);

  const keyboardAnimation = useSharedValue(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showListener = Keyboard.addListener(showEvent, () => {
      keyboardAnimation.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.exp),
      });
    });
    const hideListener = Keyboard.addListener(hideEvent, () => {
      keyboardAnimation.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.exp),
      });
    });

    return () => {
      hideListener.remove();
      showListener.remove();
    };
  }, []);

  const userTypeData = [
    { label: "Motorista", value: "motorista" },
    { label: "Cliente", value: "cliente" },
  ];

  const handleAccess = () => {
    Keyboard.dismiss();
    if (userType === "motorista") {
      router.push("/map");
    } else if (userType === "cliente") {
      router.push("/client");
    }
  };

  const handleDropdownPress = () => {
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
    } else {
      dropdownRef.current?.open();
    }
  };

  const clienteHelperText =
    "Em caso de dúvida consulte número do pedido na Nota Fiscal ou entre em contato com o atendimento ao cliente.";

  const BUTTON_SHIFT = 0;

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      keyboardAnimation.value,
      [0, 1],
      [0, -BUTTON_SHIFT]
    );
    return {
      transform: [{ translateY }],
    };
  });

  const welcomeAnimatedStyle = useAnimatedStyle(() => {
    let fontSize = 22;
    let opacity = 1;
    let marginBottom = 24;
    let lineHeight: number | undefined = undefined;
    let height: number | undefined = undefined;

    const initialFontSize = Platform.OS === "ios" ? 23 : 21;

    switch (userType) {
      case "motorista":
        opacity = interpolate(keyboardAnimation.value, [0, 1], [1, 0]);
        lineHeight = interpolate(
          keyboardAnimation.value,
          [0, 1],
          [initialFontSize * 1.2, 0]
        );
        marginBottom = interpolate(keyboardAnimation.value, [0, 1], [8, 0]);
        fontSize = initialFontSize;
        height = interpolate(
          keyboardAnimation.value,
          [0, 1],
          [initialFontSize * 1.2, 0]
        );
        break;
      case "cliente":
        fontSize = interpolate(
          keyboardAnimation.value,
          [0, 1],
          [initialFontSize, 18]
        );
        marginBottom = interpolate(keyboardAnimation.value, [0, 1], [16, 8]);
        break;
      default:
        fontSize = interpolate(
          keyboardAnimation.value,
          [0, 1],
          [initialFontSize, 20]
        );
        marginBottom = 15;
        break;
    }

    return {
      opacity,
      fontSize,
      marginBottom,
      lineHeight,
      height,
    };
  });

  return (
    <SafeAreaView style={styles.container} edges={["right", "left", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <HeaderSection
          title="seja bem vindo(a)!"
          tips="Mais eficiência para quem entrega, mais tranquilidade para quem recebe."
          keyboardAnimation={keyboardAnimation}
        />

        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!isDropdownOpen}
          >
            <View>
              <Animated.Text style={[styles.welcomeText, welcomeAnimatedStyle]}>
                Seja bem vindo(a)!
              </Animated.Text>
              <CustomDropdown
                ref={dropdownRef}
                label="Motorista ou Cliente"
                placeholder="Selecione abaixo"
                data={userTypeData}
                value={userType}
                onChange={(item) => setUserType(item.value as UserType)}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setIsDropdownOpen(false)}
                onPress={handleDropdownPress}
              />
              {userType === "cliente" && (
                <>
                  <InputField
                    label="Número do pedido"
                    placeholder="XXXXXXXXXXXX"
                    value={pedido}
                    onChangeText={setPedido}
                    keyboardType="numeric"
                  />
                  <Text
                    style={styles.helperText}
                    numberOfLines={2}
                    adjustsFontSizeToFit={true}
                  >
                    {clienteHelperText}
                  </Text>
                </>
              )}
              {userType === "motorista" && (
                <>
                  <InputField
                    label="CNH"
                    placeholder="XX-XXXXX-XXXX"
                    value={cnh}
                    onChangeText={setCnh}
                    returnKeyType="next"
                    onSubmitEditing={() => placaInputRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <InputField
                    ref={placaInputRef}
                    label="PLACA VEÍCULO"
                    placeholder="ABC 1234"
                    value={placa}
                    onChangeText={setPlaca}
                    returnKeyType="done"
                    onSubmitEditing={handleAccess}
                  />
                </>
              )}
            </View>
          </ScrollView>
          <Animated.View style={[styles.buttonWrapper, buttonAnimatedStyle]}>
            <CustomButton
              title={userType === "cliente" ? "Rastrear" : "Acessar"}
              onPress={handleAccess}
              disabled={!userType}
            />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING[6],
    paddingBottom: 0,
  },
  buttonWrapper: {
    width: "100%",
    paddingBottom: 8,
    paddingHorizontal: 25,
    backgroundColor: COLORS.background,
  },
  welcomeText: {
    fontWeight: "bold",
    color: COLORS["text-primary"],
    textAlign: "left",
  },
  helperText: {
    marginTop: 16,
    marginBottom: 16,
    fontSize: 30,
    color: COLORS["text-secondary"],
    textAlign: "center",
    alignSelf: "center",
    width: "90%",
  },
});
