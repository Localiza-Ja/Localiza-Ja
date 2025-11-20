// frontend/src/components/ConfirmationActionModal.tsx

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Modal from "react-native-modal";
import { Feather } from "@expo/vector-icons";

type ConfirmationActionModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonStyle?: object;
  confirmTextStyle?: object;
};

export default function ConfirmationActionModal({
  isVisible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmButtonStyle,
  confirmTextStyle,
}: ConfirmationActionModalProps) {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      animationIn="fadeInUp"
      animationOut="fadeOutDown"
      backdropTransitionOutTiming={0}
      style={styles.modal}
    >
      <View className="w-full max-w-sm bg-gray-800 rounded-xl p-6 shadow-lg mx-4">
        <Text className="text-xl font-bold text-white text-center mb-4">
          {title}
        </Text>
        <Text className="text-base text-gray-300 text-center mb-6">
          {message}
        </Text>
        <View className="flex-row justify-between space-x-3">
          <TouchableOpacity
            className="flex-1 bg-gray-600 h-12 rounded-lg justify-center items-center"
            onPress={onClose}
          >
            <Text className="text-white font-bold text-base">{cancelText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButtonBase, confirmButtonStyle]}
            className="flex-1 h-12 rounded-lg justify-center items-center"
            onPress={onConfirm}
          >
            <Text
              style={[styles.confirmTextBase, confirmTextStyle]}
              className="font-bold text-base"
            >
              {confirmText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: "center",
    alignItems: "center",
    margin: 0,
  },
  confirmButtonBase: {
    backgroundColor: "#FCA14E",
  },
  confirmTextBase: {
    color: "#FFFFFF",
  },
});
