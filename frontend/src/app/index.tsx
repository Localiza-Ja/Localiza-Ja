// ARQUIVO: frontend/src/app/index.tsx (Ajuste Final de zIndex)

import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { router } from "expo-router";
import { useState, useRef } from "react";
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // <-- NOVO ESTADO

  const placaInputRef = useRef<TextInput>(null);
  const keyboardAnimation = useSharedValue(0);
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
    // ... (esta função não muda) ...
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
            // --- NOVA PROP PARA CONTROLAR A ROLAGEM QUANDO O DROPDOWN ESTÁ ABERTO ---
            scrollEnabled={!isDropdownOpen}
          >
            {/* Envolvemos o formulário em uma View para aplicar o zIndex */}
            <View style={{ zIndex: isDropdownOpen ? 100 : 0 }}>
              <CustomDropdown
                label="Motorista ou Cliente"
                placeholder="Selecione abaixo"
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
