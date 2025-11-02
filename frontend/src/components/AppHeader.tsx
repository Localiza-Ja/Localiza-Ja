//frontend/src/components/AppHeader.tsx

import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';

type AppHeaderProps = {
  logoSource?: any;
  onLogout?: () => void;
};

export default function AppHeader({ logoSource, onLogout }: AppHeaderProps) {
  return (
    <View className="absolute top-0 left-0 right-0 h-24 flex-row items-center justify-between px-4 pt-[35px] bg-transparent">
      
      <View className="w-10 h-10 justify-center items-center">
        {onLogout && (
          // ALTERADO: Adicionadas classes para o fundo circular escuro
          <TouchableOpacity onPress={onLogout} className="w-10 h-10 rounded-full bg-[#1A1B23] justify-center items-center">
            <Feather name="log-out" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <View>
        {logoSource && (
          <Image source={logoSource} className="w-[150px] h-[40px]" resizeMode="contain" />
        )}
      </View>

      <View className="w-10 h-10" />

    </View>
  );
}