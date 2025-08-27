import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { router } from "expo-router";
import { deliveries } from "../data/deliveries";

export default function MapScreen() {
  const initialRegion = {
    latitude: -22.9056, // Campinas/SP
    longitude: -47.0608,
    latitudeDelta: 0.1, // Ajuste o zoom no mapa
    longitudeDelta: 0.1,
  };

  const points = [
    { latitude: -22.9056, longitude: -47.0608, title: "01" },
    { latitude: -22.8856, longitude: -47.0508, title: "02" },
  ];

  const handleLogout = () => router.push("/");
  const handleStartDelivery = () => alert("Entrega iniciada!");
  const handleFinishDelivery = () => {
    alert("Entrega finalizada!");
    router.push("/deliveries");
  };

  return (
    <View className="flex-1">
      {/* Mapa com Apple Maps */}
      <MapView
        className="flex-1"
        initialRegion={initialRegion}
        style={{ width: Dimensions.get("window").width, height: "100%" }} // Força tamanho
      >
        {points.map((point, index) => (
          <Marker key={index} coordinate={point} title={point.title} />
        ))}
        <Polyline coordinates={points} strokeColor="#000" strokeWidth={2} />
      </MapView>

      {/* Header */}
      <View className="absolute top-10 left-5 right-5 flex-row justify-between">
        <Text className="text-white font-bold text-xl">NACIONAL TELHA</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text className="text-white">Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Card de detalhes */}
      <View className="absolute bottom-20 left-5 right-5 bg-white p-4 rounded-md shadow-md">
        <Text className="font-bold">Detalhes da Entrega</Text>
        <Text>{deliveries[0].address}</Text>
        <Text>Cliente: {deliveries[0].client}</Text>
        <Text>Tel: {deliveries[0].phone}</Text>
        <Text>Obs: {deliveries[0].obs}</Text>
        <Text>Número do Pedido: {deliveries[0].orderNumber}</Text>
        <Text>Status: {deliveries[0].status}</Text>
        <View className="flex-row justify-between mt-4">
          <TouchableOpacity
            className="bg-blue-500 p-2 rounded"
            onPress={handleStartDelivery}
          >
            <Text className="text-white">Iniciar entrega</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-green-500 p-2 rounded"
            onPress={handleFinishDelivery}
          >
            <Text className="text-white">Finalizar entrega</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Botão para entregas */}
      <TouchableOpacity
        className="absolute bottom-5 right-5 bg-blue-900 p-3 rounded-full"
        onPress={() => router.push("/deliveries")}
      >
        <Text className="text-white">Ver Entregas</Text>
      </TouchableOpacity>
    </View>
  );
}
