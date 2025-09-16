// NAO ESTA SENDO USADO!

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { Feather } from '@expo/vector-icons';

type ConfirmationModalProps = {
  isVisible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  confirmButtonColor?: string;
};

export default function ConfirmationModal({
  isVisible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmText = "Confirmar",
  confirmButtonColor = "bg-green-600",
}: ConfirmationModalProps) {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onCancel}
      animationIn="fadeInUp"
      animationOut="fadeOutDown"
      backdropOpacity={0.4}
      
      style={{ justifyContent: 'center', margin: 20 }}>
      <View className="bg-white rounded-2xl flex-shrink-1">
        <View className="flex-row items-center p-5 border-b border-gray-200">
          <Feather name="alert-triangle" size={24} color="#f97316" />
          <Text className="text-xl font-bold text-gray-800 ml-3 flex-shrink-1">{title}</Text>
        </View>

        <ScrollView className="flex-shrink-1" contentContainerStyle={{ padding: 20 }}>
          <Text className="text-base text-gray-600">{message}</Text>
        </ScrollView>

        <View className="flex-row justify-end p-4 border-t border-gray-200">
          <TouchableOpacity
            onPress={onCancel}
            className="py-3 px-5 rounded-lg mr-3"
          >
            <Text className="font-bold text-gray-600">Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            className={`py-3 px-5 rounded-lg shadow-md ${confirmButtonColor}`}
          >
            <Text className="font-bold text-white">{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}