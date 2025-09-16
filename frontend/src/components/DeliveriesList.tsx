
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, GestureResponderEvent, Alert } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Delivery } from '../types';
import { Feather } from '@expo/vector-icons';

type DeliveriesListProps = {
  data: Delivery[];
  onDeliveryPress: (delivery: Delivery) => void;
  onUpdateStatus: (deliveryId: number, newStatus: string) => void;
};

export default function DeliveriesList({ data, onDeliveryPress, onUpdateStatus }: DeliveriesListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(data[0]?.id || null);

  const handleItemPress = (delivery: Delivery) => {
    setExpandedId(currentId => currentId === delivery.id ? null : delivery.id);
    onDeliveryPress(delivery);
  };

  const renderItem = ({ item, index }: { item: Delivery, index: number }) => {
    const isExpanded = item.id === expandedId;
    const isFinished = item.status === 'Finalizada';
    const isActive = item.status === 'Em andamento';
    const isCancelled = item.status === 'Cancelada';
    const isDone = isFinished || isCancelled;
    const itemOpacity = isDone ? 'opacity-50' : 'opacity-100';

    let circleBgColor;
    if (isFinished) {
      circleBgColor = 'bg-green-500';
    } else if (isCancelled) {
      circleBgColor = 'bg-red-500';
    } else if (isActive) {
      circleBgColor = 'bg-orange-500';
    } else {
      circleBgColor = 'bg-gray-800';
    }

    const circleTextColor = 'text-white';
    const statusColorClass = isActive ? 'text-orange-500' : isFinished ? 'text-green-600' : isCancelled ? 'text-red-600' : 'text-gray-800';

    const handleStart = (event: GestureResponderEvent) => { event.stopPropagation(); Alert.alert("Iniciar Entrega", `Tem certeza que deseja iniciar a entrega para "${item.client}"?`, [{ text: "Cancelar", style: "cancel" }, { text: "Sim, Iniciar", onPress: () => onUpdateStatus(item.id, "Em andamento") }]); };
    const handleFinish = (event: GestureResponderEvent) => { event.stopPropagation(); Alert.alert("Finalizar Entrega", `Tem certeza que deseja finalizar a entrega para "${item.client}"?`, [{ text: "Cancelar", style: "cancel" }, { text: "Sim, Finalizar", style: "destructive", onPress: () => onUpdateStatus(item.id, "Finalizada") }]); };
    const handleCancel = (event: GestureResponderEvent) => { event.stopPropagation(); Alert.alert("Cancelar Entrega", `Tem certeza que deseja CANCELAR a entrega para "${item.client}"?`, [{ text: "Não", style: "cancel" }, { text: "Sim, Cancelar", style: "destructive", onPress: () => onUpdateStatus(item.id, "Cancelada") }]); };

    return (
      <View className={`px-4 bg-white ${itemOpacity}`}>
        <View className="flex-row">
          <TouchableOpacity onPress={() => handleItemPress(item)} className="items-center mr-4 pt-4">
            <View className={`w-8 h-8 rounded-full justify-center items-center z-10 ${circleBgColor}`}>
              <Text className={`font-bold ${circleTextColor}`}>{item.id.toString().padStart(2, '0')}</Text>
            </View>
            {index < data.length - 1 && (<View className="absolute top-[52px] bottom-0 left-[50%] -translate-x-px w-px bg-orange-500" />)}
          </TouchableOpacity>
          
          <View className="flex-1 border-b border-gray-200 py-4">
            <TouchableOpacity onPress={() => handleItemPress(item)} activeOpacity={0.7}>
              {isExpanded ? (
                <View className="space-y-4">
                  <View>
                    <Text className="text-lg font-bold text-gray-800">{item.addressStreet}</Text>
                    <Text className="text-lg font-bold text-gray-800">{item.addressCity}</Text>
                  </View>
                  <View className="flex-row items-center mt-4">
                    <View className="p-2 bg-gray-100 rounded-full mr-3">
                      <Feather name="user" size={24} color="#1f2937" />
                    </View>
                    <Text className="text-lg font-bold text-gray-900">{item.client}</Text>
                  </View>
                  <View className="space-y-2 pl-1">
                    <Text className="text-sm text-gray-500">Obs.: <Text className="text-base text-gray-700">{item.obs}</Text></Text>
                    <Text className="text-sm text-gray-500">Número do Pedido: <Text className="text-base text-gray-700">{item.orderNumber}</Text></Text>
                    <Text className="text-sm text-gray-500">Status da entrega: <Text className={`text-base font-bold ${statusColorClass}`}>{item.status}</Text></Text>
                  </View>
                  <View className="pt-4 mt-3">
                    {!isDone && (
                      <View className="flex-row">
                        {!isActive && (<TouchableOpacity className="bg-orange-500 h-12 rounded-full flex-1 flex-row justify-center items-center" onPress={handleStart}><Feather name="truck" size={18} color="white" /><Text className="text-white text-center font-bold ml-2">Iniciar Entrega</Text></TouchableOpacity>)}
                        {isActive && (<TouchableOpacity className="bg-green-600 h-12 rounded-full flex-1 flex-row justify-center items-center" onPress={handleFinish}><Feather name="check-circle" size={18} color="white" /><Text className="text-white text-center font-bold ml-2">Finalizar Entrega</Text></TouchableOpacity>)}
                        <TouchableOpacity className="bg-red-600 h-12 rounded-full flex-1 ml-2 flex-row justify-center items-center" onPress={handleCancel}><Feather name="x-circle" size={18} color="white" /><Text className="text-white text-center font-bold ml-2">Cancelar Entrega</Text></TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View>
                  <Text className="text-lg font-bold text-gray-800">{item.client}</Text>
                  <Text className="text-lg font-bold text-gray-800">{item.addressStreet}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  
  return (
    <BottomSheetFlatList
      data={data}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      ListHeaderComponent={<Text className="text-xl font-bold p-4 text-center">Entregas do Dia</Text>}
      stickyHeaderIndices={[0]}
      contentContainerStyle={{ paddingBottom: 50 }}
    />
  );
}