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
import { SPACING } from "../styles/theme";

export default function Login() {

  const [cnh, setCnh] = useState("");
  const [placa, setPlaca] = useState("");
  const [empresa, setEmpresa] = useState("");
  const placaInputRef = useRef<TextInput>(null);
  const empresaInputRef = useRef<TextInput>(null);

  const keyboardAnimation = useSharedValue(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      keyboardAnimation.value = withTiming(1, { duration: 300 });
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardAnimation.value = withTiming(0, { duration: 300 });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardAnimation]);

  const handleLogin = () => {
    router.push("/map");
  };

  const tips =
    "Dicas do dia:\n- Não esqueça de conferir se todo o material está carregado;\n- Verifique se a carga está bem lacrada;\n- E o mais importante, verifique as condições do veículo.";

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["right", "left", "bottom"]}
    >
      <View className="flex-1">
        <HeaderSection
          name="Motorista"
          tips={tips}
          keyboardAnimation={keyboardAnimation}
        />

        <View className="flex-1">
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
            >
              <View>
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
                  label="PLACA VEICULO"
                  placeholder="ABC 1234"
                  value={placa}
                  onChangeText={setPlaca}
                  returnKeyType="next"
                  onSubmitEditing={() => empresaInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <InputField
                  ref={empresaInputRef}
                  label="EMPRESA"
                  placeholder="Nacional LTDA"
                  value={empresa}
                  onChangeText={setEmpresa}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>
              <CustomButton title="Acessar" onPress={handleLogin} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
}
