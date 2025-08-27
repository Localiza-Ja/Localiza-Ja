import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { router } from "expo-router";
import { deliveries } from "../data/deliveries";

export default function DeliveriesScreen() {
  const renderItem = ({ item }: { item: (typeof deliveries)[0] }) => (
    <TouchableOpacity
      className="flex-row items-center bg-white p-4 rounded-md mb-2 shadow"
      onPress={() => router.push("/map")} // Volta ao mapa ou abre detalhes
    >
      <View className="w-8 h-8 bg-orange-500 rounded-full justify-center items-center mr-4">
        <Text className="text-white">
          {item.id.toString().padStart(2, "0")}
        </Text>
      </View>
      <View>
        <Text className="font-bold">{item.address}</Text>
        <Text>{item.client}</Text>
        <Text>{item.obs}</Text>
        <Text>Número do Pedido: {item.orderNumber}</Text>
        <Text>Status: {item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white p-4">
      {/* Header */}
      <Text className="text-2xl font-bold mb-4">Entregas</Text>

      {/* Lista */}
      <FlatList
        data={deliveries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
      />

      {/* Botão voltar */}
      <TouchableOpacity
        className="bg-blue-900 p-3 rounded-md mt-4"
        onPress={() => router.back()}
      >
        <Text className="text-white text-center">Voltar ao Mapa</Text>
      </TouchableOpacity>
    </View>
  );
}
