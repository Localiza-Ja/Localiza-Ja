import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';

type AppHeaderProps = {
  logoSource?: any;
  onLogout?: () => void;
};

export default function AppHeader({ logoSource, onLogout }: AppHeaderProps) {
  return (
    <View className="absolute top-0 left-0 right-0 h-24 flex-row items-center justify-between px-4 pt-[35px] bg-[#21222D] rounded-b-2xl">
      <View className="w-10 h-10" />
      <View>
        {logoSource && (
          <Image source={logoSource} className="w-[150px] h-[40px]" resizeMode="contain" />
        )}
      </View>

      
      <View className="w-10 h-10 justify-center items-center">
        {onLogout && (
          <TouchableOpacity onPress={onLogout} className="p-2">
            <Feather name="log-out" size={24} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}