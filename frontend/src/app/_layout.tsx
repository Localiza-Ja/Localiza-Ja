import { Stack } from "expo-router";
import "../styles/global.css"; // Mantenha para Tailwind

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Esconde headers por padrão
      }}
    >
      <Stack.Screen name="index" /> {/* Tela de Login */}
      <Stack.Screen name="map" /> {/* Tela de Mapa */}
      <Stack.Screen name="deliveries" /> {/* Tela de Entregas */}
    </Stack>
  );
}
