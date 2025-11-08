//frontend/src/components/ConfirmationModal.tsx

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
import {
  pickFromCameraDataUrl,
  pickFromLibraryDataUrl,
} from "../utils/pickProofPhotoBase64";

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
  // Estados do formulário (sucesso/não entregue, texto e foto).
  const [isSuccess, setIsSuccess] = useState(true);
  const [receiverName, setReceiverName] = useState("");
  const [reason, setReason] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [observations, setObservations] = useState("");

  // Tira foto pela câmera.
  const openCamera = async () => {
    const picked = await pickFromCameraDataUrl();
    if (picked) {
      setPhotoUri(picked.uri);
      setPhotoDataUrl(picked.dataUrl);
    }
  };

  // Escolhe foto da galeria.
  const openGallery = async () => {
    const picked = await pickFromLibraryDataUrl();
    if (picked) {
      setPhotoUri(picked.uri);
      setPhotoDataUrl(picked.dataUrl);
    }
  };

  // Valida e devolve os dados para o pai.
  const handleConfirm = () => {
    if (isSuccess) {
      if (!receiverName.trim()) {
        Alert.alert(
          "Campo obrigatório",
          "O nome de quem recebeu é obrigatório."
        );
        return;
      }
      if (!photoDataUrl) {
        Alert.alert("Foto obrigatória", "Anexe a foto de comprovação.");
        return;
      }
      onConfirm({
        status: "entregue",
        nome_recebido: receiverName.trim(),
        motivo: "",
        foto_prova: photoDataUrl,
        observacao: "",
      });
    } else {
      if (!reason.trim()) {
        Alert.alert(
          "Campo obrigatório",
          "O motivo é obrigatório quando a entrega não é realizada."
        );
        return;
      }
      if (!photoDataUrl) {
        Alert.alert("Foto obrigatória", "Anexe a foto de comprovação.");
        return;
      }
      onConfirm({
        status: "nao_entregue",
        nome_recebido: "",
        motivo: reason.trim(),
        foto_prova: photoDataUrl,
        observacao: "",
      });
    }
    resetStateAndClose();
  };

  // Reseta o estado e fecha o modal.
  const resetStateAndClose = () => {
    setIsSuccess(true);
    setReceiverName("");
    setReason("");
    setPhotoUri(null);
    setPhotoDataUrl(null);
    setObservations("");
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={resetStateAndClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.centeredView}
      >
        <View style={styles.modalOuterContainer}>
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
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={isSuccess ? "#fca14e" : "#f4f3f4"}
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={() => setIsSuccess((prev) => !prev)}
                  value={isSuccess}
                />
              </View>

              {isSuccess ? (
                <>
                  <Text className="w-full text-left text-sm font-medium text-gray-400 mb-1 mt-3">
                    Nome de quem recebeu*
                  </Text>
                  <TextInput
                    className="w-full h-12 bg-gray-700 border border-gray-600 rounded-lg px-4 text-base text-white"
                    placeholder="Nome completo"
                    placeholderTextColor="#9ca3af"
                    value={receiverName}
                    onChangeText={setReceiverName}
                  />
                </>
              ) : (
                <>
                  <Text className="w-full text-left text-sm font-medium text-gray-400 mb-1 mt-3">
                    Motivo da não entrega*
                  </Text>
                  <TextInput
                    className="w-full h-20 bg-gray-700 border border-gray-600 rounded-lg px-4 pt-3 text-base text-white"
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
                Adicionar Foto (Obrigatório)
              </Text>

              <View className="flex-row w-full mt-1 items-center">
                {/* Quadro abre a CÂMERA */}
                <TouchableOpacity
                  className="w-20 h-20 rounded-lg border border-gray-600 bg-gray-700 justify-center items-center mr-4"
                  onPress={openCamera}
                >
                  {photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      className="w-full h-full rounded-lg"
                    />
                  ) : (
                    <Feather name="camera" size={32} color="#9ca3af" />
                  )}
                </TouchableOpacity>

                {/* Botão abre a GALERIA */}
                <TouchableOpacity
                  className="flex-row items-center bg-gray-600 px-4 py-3 rounded-lg border border-gray-500"
                  onPress={openGallery}
                >
                  <Feather name="upload" size={18} color="#e5e7eb" />
                  <Text className="text-gray-200 ml-2 font-bold">
                    Escolher foto
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="w-full bg-primary py-3 rounded-lg mt-6"
                onPress={handleConfirm}
              >
                <Text className="text-white text-center font-bold text-base">
                  Confirmar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full bg-gray-600 py-3 rounded-lg mt-2 border border-gray-500"
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalOuterContainer: {
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
  },
});
