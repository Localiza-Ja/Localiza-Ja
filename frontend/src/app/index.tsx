import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useState, useRef, forwardRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

interface InputFieldProps extends TextInputProps {
  label: string;
  placeholder?: string;
}
const InputField = forwardRef<TextInput, InputFieldProps>((props, ref) => {
  const { label, ...rest } = props;
  return (
    <View className="w-full mb-4">
      <Text className="text-gray-500 font-semibold mb-2 ml-1">{label}</Text>
      <TextInput
        ref={ref}
        className="w-full bg-[#F3F7FB] p-4 rounded-xl text-base text-[#22212E]"
        placeholderTextColor="#ADB5BD"
        {...rest}
      />
    </View>
  );
});
InputField.displayName = "InputField";

interface HeaderSectionProps {
  name: string;
  tips: string;
}
const HeaderSection = ({ name, tips }: HeaderSectionProps) => (
  <LinearGradient
    colors={["#FCA14E", "#FFE6CE"]}
    style={{
      width: "100%",
      borderBottomLeftRadius: 40,
      borderBottomRightRadius: 40,
      paddingHorizontal: 24,
      paddingVertical: 32,
      flex: 11,
      justifyContent: "center",
    }}
  >
    <Image
      source={require("../../assets/images/truck.png")}
      style={{
        position: "absolute",
        right: "-20%",
        top: "15%",
        width: "70%",
        height: 150,
        resizeMode: "contain",
      }}
    />
    <View style={{ marginBottom: 40 }}>
      <Text className="text-2xl font-bold mb-1 text-[#22212E]">
        Olá, {name}
      </Text>
      <Text className="text-4xl font-bold text-[#22212E]">Localiza Já</Text>
    </View>
    <View>
      <Text className="text-base italic font-medium text-[#22212E]">
        {tips}
      </Text>
    </View>
  </LinearGradient>
);

interface ButtonProps {
  title: string;
  onPress: () => void;
}
const CustomButton = ({ title, onPress }: ButtonProps) => (
  <TouchableOpacity
    className="w-full bg-[#22212E] p-4 rounded-full shadow-md active:opacity-80"
    onPress={onPress}
  >
    <Text className="text-white text-center text-lg font-bold">{title}</Text>
  </TouchableOpacity>
);

export default function Login() {
  const [cnh, setCnh] = useState("");
  const [placa, setPlaca] = useState("");
  const [empresa, setEmpresa] = useState("");

  const placaInputRef = useRef<TextInput>(null);
  const empresaInputRef = useRef<TextInput>(null);

  const handleLogin = () => {
    router.push("/map");
  };

  const tips =
    "Dicas do dia:\n- Não esqueça de conferir se todo o material está carregado;\n- Verifique se a carga está bem lacrada;\n- E o mais importante, verifique as condições do veículo.";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FFF" }}
      edges={["right", "left", "bottom"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flex: 11 }}>
            <HeaderSection name="Richard" tips={tips} />
          </View>

          <View
            style={{
              flex: 9,
              padding: 24,
              justifyContent: "space-between",
              backgroundColor: "#FFF",
            }}
          >
            <ScrollView
              style={{ marginBottom: 20 }}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "flex-end",
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
            </ScrollView>
            <CustomButton title="Acessar" onPress={handleLogin} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
