import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import InputField from "../components/InputField";
import CustomButton from "../components/CustomButton";
import HeaderSection from "../components/HeaderSection";
import CustomDropdown from "../components/CustomDropdown";
import { SPACING } from "../styles/theme";

type UserType = "motorista" | "cliente" | null;

export default function Login() {
  const [userType, setUserType] = useState<UserType>(null);
  const [pedido, setPedido] = useState("");
  const [cnh, setCnh] = useState("");
  const [placa, setPlaca] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const placaInputRef = useRef<TextInput>(null);
  const keyboardAnimation = useSharedValue(0);

  // Hook que escuta os eventos do teclado para disparar a animação do Header
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        keyboardAnimation.value = withTiming(1, { duration: 300 });
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        keyboardAnimation.value = withTiming(0, { duration: 300 });
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const userTypeData = [
    { label: "Motorista", value: "motorista" },
    { label: "Cliente", value: "cliente" },
  ];

  const handleAccess = () => {
    if (userType === "motorista") {
      router.push("/map");
    } else if (userType === "cliente") {
      alert(`Rastreando pedido: ${pedido}`);
    }
  };

  const renderForm = () => {
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

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["right", "left", "bottom"]}
    >
      <View className="flex-1">
        <HeaderSection
          name="seja bem vindo(a)!"
          tips="Mais eficiência para quem entrega, mais tranquilidade para quem recebe."
          keyboardAnimation={keyboardAnimation}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "space-between",
              padding: SPACING[6],
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isDropdownOpen}
          >
            <View style={{ zIndex: isDropdownOpen ? 100 : 0 }}>
              <CustomDropdown
                label="Motorista ou Cliente"
                placeholder="Clique aqui"
                data={userTypeData}
                value={userType}
                onChange={(item) => {
                  setUserType(item.value as UserType);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setIsDropdownOpen(false)}
              />
              {renderForm()}
            </View>

            <CustomButton
              title={userType === "cliente" ? "Rastrear" : "Acessar"}
              onPress={handleAccess}
              disabled={!userType}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
