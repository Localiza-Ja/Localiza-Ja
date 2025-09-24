//frontend/src/app/index.tsx

import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  StyleSheet,
} from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { useState, useRef, useEffect } from "react";
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
      keyboardAnimation.value = withTiming(1, { duration: 250 });
    });
    const hideListener = Keyboard.addListener(hideEvent, () => {
      keyboardAnimation.value = withTiming(0, { duration: 250 });
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

  const renderForm = () => {
    // ... Nenhuma alteração aqui
    if (userType === "cliente") {
      return (
        <InputField
          label="Número do pedido"
          placeholder="XXXXXXXXXXXX"
          value={pedido}
          onChangeText={setPedido}
          keyboardType="numeric"
        />
      );
    }
    if (userType === "motorista") {
      return (
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
      );
    }
    return null;
  };

  const handleDropdownPress = () => {
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
    } else {
      dropdownRef.current?.open();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["right", "left", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
      >
        <View style={styles.container}>
          <HeaderSection
            name="seja bem vindo(a)!"
            tips="Mais eficiência para quem entrega, mais tranquilidade para quem recebe."
            keyboardAnimation={keyboardAnimation}
          />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isDropdownOpen}
          >
            <View>
              <View style={{ zIndex: 1 }}>
                <CustomDropdown
                  ref={dropdownRef}
                  label="Motorista ou Cliente"
                  placeholder="Clique aqui"
                  data={userTypeData}
                  value={userType}
                  onChange={(item) => setUserType(item.value as UserType)}
                  onFocus={() => setIsDropdownOpen(true)}
                  onBlur={() => setIsDropdownOpen(false)}
                  onPress={handleDropdownPress}
                />
              </View>
              {renderForm()}
            </View>
            <CustomButton
              title={userType === "cliente" ? "Rastrear" : "Acessar"}
              onPress={handleAccess}
              disabled={!userType}
            />
          </ScrollView>
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
    flexGrow: 1,
    justifyContent: "space-between",
    padding: SPACING[6],
  },
});
