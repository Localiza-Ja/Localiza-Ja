import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

type DeliveryDetailsProps = {
  clientName: string;
  street: string;
  neighborhoodAndCity: string;
  phone: string;
  orderNumber: string;
  status: string;
  driverName?: string;
};

export default function DeliveryInRoute({
  clientName,
  street,
  neighborhoodAndCity,
  phone,
  orderNumber,
  status,
  driverName,
}: DeliveryDetailsProps) {
  return (
    <View className="bg-white rounded-lg m-4 ">
      <Text
        style={{ marginBottom: 20, fontSize: 25 }}
        className="text-xl pl-5 font-bold text-gray-800 mt-2"
      >
        Detalhes da Entrega
      </Text>
      <View
        style={{
          height: 2,
          width: "80%",
          backgroundColor: "#efeff0ff",
          borderRadius: 5,
          marginBottom: 20,
          alignSelf: "center",
        }}
      />
      <View className="flex-row">
        <View style={{ marginRight: 20 }} className="items-center mr-4">
          <View
            style={{ marginLeft: 20 }}
            className="w-10 h-10 bg-black rounded-full justify-center items-center z-10"
          >
            <Feather name="users" size={22} color="white" />
          </View>
          <View style={styles.dashedLine} />
          <View style={{ transform: [{ rotate: "-90deg" }], marginLeft: 20 }}>
            <Feather name="play" size={14} color="black" />
          </View>
        </View>

        <View className="flex-1">
          <View className="mb-2">
            <Text className="text-xl font-bold text-gray-800">
              Cliente:{" "}
              <Text className="font-bold text-green-600">{clientName}</Text>
            </Text>
            <Text className="text-xl font-bold text-gray-800">{street}</Text>
            <Text className="text-xl font-bold text-gray-800">
              {neighborhoodAndCity}
            </Text>
          </View>

          <View className="space-y-1">
            {driverName && (
              <Text className="text-xl text-gray-800">
                Motorista:{" "}
                <Text className="font-bold text-gray-800">{driverName}</Text>
              </Text>
            )}
            <Text className="text-xl text-gray-800 mb-2">
              Telefone: <Text className="font-bold text-gray-800">{phone}</Text>
            </Text>
            <Text className="text-xl text-gray-800">
              Número do Pedido:{" "}
              <Text className="font-bold text-gray-800">{orderNumber}</Text>
            </Text>
            <Text className="text-xl text-gray-800">
              Status:{" "}
              <Text className="font-bold text-orange-500">{status}</Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  dashedLine: {
    flex: 1,
    width: 1,
    borderLeftColor: "orange",
    backgroundColor: "orange",
    borderLeftWidth: 1.5,
    borderRadius: 2,
    borderStyle: "dashed",
    marginLeft: 20,
  },
});
