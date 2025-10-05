// ARQUIVO: frontend/src/app/_layout.tsx

import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import "../styles/global.css";

import { useFonts } from 'expo-font';
import { useEffect } from "react";
import { SplashScreen } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "GoogleSansCode-Regular": require("../../assets/fonts/GoogleSansCode-VariableFont_wght.ttf"),
    "GoogleSansCode-Italic": require("../../assets/fonts/GoogleSansCode-Italic-VariableFont_wght.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="map" />
      </Stack>
    </GestureHandlerRootView>
  );
}