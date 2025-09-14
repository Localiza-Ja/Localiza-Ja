import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import "../styles/global.css";
import "../styles/global.css";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="map" />
        <Stack.Screen name="deliveries" />
      </Stack>
    </GestureHandlerRootView>
  );
}