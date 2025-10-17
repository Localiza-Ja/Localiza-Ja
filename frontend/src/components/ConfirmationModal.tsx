// frontend/src/components/ConfirmationModal.tsx (VERSÃO FINAL CORRIGIDA)

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
      <View className="flex-1 justify-center items-center bg-black/50 p-4">
        <View className="w-full bg-white rounded-2xl p-6 shadow-lg max-h-[90%]">
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-xl font-bold mb-5 text-gray-800 text-center">
              Finalizar Entrega
            </Text>

            <View className="flex-row items-center justify-between w-full mb-4">
              <Text className="text-base text-gray-700">
                Entrega realizada com sucesso?
              </Text>
              <Switch
                trackColor={{ false: "#d1d5db", true: "#60a5fa" }}
                thumbColor={isSuccess ? "#2563eb" : "#f4f3f4"}
                onValueChange={() =>
                  setIsSuccess((previousState: boolean) => !previousState)
                }
                value={isSuccess}
              />
            </View>

            {isSuccess ? (
              <>
                <Text className="w-full text-left text-sm font-medium text-gray-700 mb-1 mt-3">
                  Nome de quem recebeu*
                </Text>
                <TextInput
                  className="w-full h-12 border border-gray-300 rounded-lg px-4 text-base"
                  placeholder="Nome completo"
                  value={receiverName}
                  onChangeText={setReceiverName}
                />

                <Text className="w-full text-left text-sm font-medium text-gray-700 mb-1 mt-3">
                  Observações (Opcional)
                </Text>
                <TextInput
                  className="w-full h-20 border border-gray-300 rounded-lg px-4 pt-3 text-base"
                  placeholder="Ex: Deixado na portaria com o Sr. João..."
                  value={observations}
                  onChangeText={setObservations}
                  multiline
                  textAlignVertical="top"
                />
              </>
            ) : (
              <>
                <Text className="w-full text-left text-sm font-medium text-gray-700 mb-1 mt-3">
                  Motivo da não entrega*
                </Text>
                <TextInput
                  className="w-full h-20 border border-gray-300 rounded-lg px-4 pt-3 text-base"
                  placeholder="Ex: Cliente ausente, endereço não localizado..."
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  textAlignVertical="top"
                />
              </>
            )}

            <Text className="w-full text-left text-sm font-medium text-gray-700 mb-1 mt-3">
              Adicionar Foto (Opcional)
            </Text>
            <View className="flex-row w-full mt-1 items-center">
              <TouchableOpacity
                className="w-20 h-20 rounded-lg border border-gray-300 justify-center items-center mr-4"
                onPress={handleChoosePhoto}
              >
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    className="w-full h-full rounded-lg"
                  />
                ) : (
                  <Feather name="camera" size={32} color="#6b7280" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center bg-gray-100 px-4 py-3 rounded-lg border border-gray-300"
                onPress={handleChoosePhoto}
              >
                <Feather name="upload" size={18} color="#374151" />
                <Text className="text-gray-800 ml-2 font-bold">
                  Escolher foto
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="w-full bg-gray-800 py-3 rounded-lg mt-6"
              onPress={handleConfirm}
            >
              <Text className="text-white text-center font-bold text-base">
                Confirmar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="w-full bg-white py-3 rounded-lg mt-2 border border-gray-300"
              onPress={resetStateAndClose}
            >
              <Text className="text-gray-800 text-center font-bold text-base">
                Cancelar
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
