// frontend/src/components/ConfirmationModal.tsx

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

type ConfirmationModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (details: {
    status: "entregue" | "nao_entregue";
    nome_recebido: string;
    motivo: string;
    foto_prova: string | null;
    observacao: string;
  }) => void;
};

export default function ConfirmationModal({
  visible,
  onClose,
  onConfirm,
}: ConfirmationModalProps) {
  const [isSuccess, setIsSuccess] = useState(true);
  const [receiverName, setReceiverName] = useState("");
  const [reason, setReason] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [observations, setObservations] = useState("");

  const handleChoosePhoto = async () => {
    // ... (função handleChoosePhoto permanece igual)
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permissão necessária",
        "Você recusou o acesso à sua galeria de fotos!"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleConfirm = () => {
    // ... (função handleConfirm permanece igual)
    if (isSuccess && !receiverName.trim()) {
      Alert.alert("Campo obrigatório", "O nome de quem recebeu é obrigatório.");
      return;
    }
    if (!isSuccess && !reason.trim()) {
      Alert.alert(
        "Campo obrigatório",
        "O motivo é obrigatório quando a entrega não é realizada."
      );
      return;
    }

    onConfirm({
      status: isSuccess ? "entregue" : "nao_entregue",
      nome_recebido: receiverName,
      motivo: isSuccess ? "" : reason,
      foto_prova: photo,
      observacao: observations,
    });
    resetStateAndClose();
  };

  const resetStateAndClose = () => {
    // ... (função resetStateAndClose permanece igual)
    setIsSuccess(true);
    setReceiverName("");
    setReason("");
    setPhoto(null);
    setObservations("");
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={resetStateAndClose}
    >
      {/* View externa com fundo escuro e padding */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.centeredView}
      >
        <View style={styles.modalOuterContainer}>
          {/* View interna com fundo cinza escuro e bordas */}
          <View className="w-full bg-gray-800 rounded-2xl p-6 shadow-lg max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xl font-bold mb-5 text-white text-center">
                Finalizar Entrega
              </Text>

              <View className="flex-row items-center justify-between w-full mb-4">
                <Text className="text-base text-gray-300">
                  Entrega realizada com sucesso?
                </Text>
                <Switch
                  trackColor={{ false: "#767577", true: "#81b0ff" }} // Cores ajustadas
                  thumbColor={isSuccess ? "#fca14e" : "#f4f3f4"} // Laranja quando ativo
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={() =>
                    setIsSuccess((previousState: boolean) => !previousState)
                  }
                  value={isSuccess}
                />
              </View>

              {isSuccess ? (
                <>
                  <Text className="w-full text-left text-sm font-medium text-gray-400 mb-1 mt-3">
                    Nome de quem recebeu*
                  </Text>
                  <TextInput
                    className="w-full h-12 bg-gray-700 border border-gray-600 rounded-lg px-4 text-base text-white" // Estilo ajustado
                    placeholder="Nome completo"
                    placeholderTextColor="#9ca3af" // Cinza claro para placeholder
                    value={receiverName}
                    onChangeText={setReceiverName}
                  />

                  <Text className="w-full text-left text-sm font-medium text-gray-400 mb-1 mt-3">
                    Observações (Opcional)
                  </Text>
                  <TextInput
                    className="w-full h-20 bg-gray-700 border border-gray-600 rounded-lg px-4 pt-3 text-base text-white" // Estilo ajustado
                    placeholder="Ex: Deixado na portaria com o Sr. João..."
                    placeholderTextColor="#9ca3af"
                    value={observations}
                    onChangeText={setObservations}
                    multiline
                    textAlignVertical="top"
                  />
                </>
              ) : (
                <>
                  <Text className="w-full text-left text-sm font-medium text-gray-400 mb-1 mt-3">
                    Motivo da não entrega*
                  </Text>
                  <TextInput
                    className="w-full h-20 bg-gray-700 border border-gray-600 rounded-lg px-4 pt-3 text-base text-white" // Estilo ajustado
                    placeholder="Ex: Cliente ausente, endereço não localizado..."
                    placeholderTextColor="#9ca3af"
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    textAlignVertical="top"
                  />
                </>
              )}

              <Text className="w-full text-left text-sm font-medium text-gray-400 mb-1 mt-3">
                Adicionar Foto (Opcional)
              </Text>
              <View className="flex-row w-full mt-1 items-center">
                <TouchableOpacity
                  className="w-20 h-20 rounded-lg border border-gray-600 bg-gray-700 justify-center items-center mr-4" // Estilo ajustado
                  onPress={handleChoosePhoto}
                >
                  {photo ? (
                    <Image
                      source={{ uri: photo }}
                      className="w-full h-full rounded-lg"
                    />
                  ) : (
                    <Feather name="camera" size={32} color="#9ca3af" /> // Cor ajustada
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row items-center bg-gray-600 px-4 py-3 rounded-lg border border-gray-500" // Estilo ajustado
                  onPress={handleChoosePhoto}
                >
                  <Feather name="upload" size={18} color="#e5e7eb" />{" "}
                  {/* Cor ajustada */}
                  <Text className="text-gray-200 ml-2 font-bold">
                    Escolher foto
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="w-full bg-primary py-3 rounded-lg mt-6" // Usando a cor primária laranja
                onPress={handleConfirm}
              >
                <Text className="text-white text-center font-bold text-base">
                  Confirmar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="w-full bg-gray-600 py-3 rounded-lg mt-2 border border-gray-500" // Estilo ajustado
                onPress={resetStateAndClose}
              >
                <Text className="text-white text-center font-bold text-base">
                  Cancelar
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Fundo escuro semi-transparente
  },
  modalOuterContainer: {
    width: "100%",
    paddingHorizontal: 20, // Adiciona padding horizontal para não colar nas bordas
    alignItems: "center", // Garante que o conteúdo interno (max-w) seja centralizado
  },
  // Classe w-full e max-w-sm (ou similar) pode ser usada no View interno se necessário
});
