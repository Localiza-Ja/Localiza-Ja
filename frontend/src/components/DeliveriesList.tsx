import React, { useState } from 'react';
import { View, Text, TouchableOpacity, GestureResponderEvent, Alert } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Delivery } from '../types';
import { Feather } from '@expo/vector-icons';
import ConfirmationModal from './ConfirmationModal';

type DeliveriesListProps = {
  data: Delivery[];
  onDeliveryPress: (delivery: Delivery) => void;
  onUpdateStatus: (deliveryId: number, newStatus: string) => void;
  onStartNavigation: () => void;
  onLogout: () => void;
};

export default function DeliveriesList({ data, onDeliveryPress, onUpdateStatus, onStartNavigation }: DeliveriesListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(data.find(d => d.status === 'Pendente')?.id || null);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [deliveryToConfirm, setDeliveryToConfirm] = useState<Delivery | null>(null);

  const handleItemPress = (delivery: Delivery) => {
    setExpandedId(currentId => currentId === delivery.id ? null : delivery.id);
    onDeliveryPress(delivery);
  };
  
  const handleStart = (event: GestureResponderEvent, item: Delivery) => {
    event.stopPropagation();
    Alert.alert("Iniciar Entrega", `Tem certeza que deseja iniciar a entrega para "${item.client}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Sim, Iniciar", onPress: () => {
          onUpdateStatus(item.id, "Em andamento");
          onStartNavigation();
        }}
    ]);
  };
  
  const handleFinish = (event: GestureResponderEvent, item: Delivery) => {
    event.stopPropagation();
    setDeliveryToConfirm(item);
    setIsModalVisible(true);
  };
  
  const handleConfirmDelivery = (details: { status: string; receiverName: string; reason: string; photoUri: string | null; observations: string; }) => {
    if (deliveryToConfirm) {
      onUpdateStatus(deliveryToConfirm.id, details.status);
    }
    setIsModalVisible(false);
    setDeliveryToConfirm(null);
  };

  const handleCancel = (event: GestureResponderEvent, item: Delivery) => {
    event.stopPropagation();
    Alert.alert("Cancelar Entrega", `Tem certeza que deseja CANCELAR a entrega para "${item.client}"?`, [
      { text: "Não", style: "cancel" },
      { text: "Sim, Cancelar", style: "destructive", onPress: () => onUpdateStatus(item.id, "Cancelada") }
    ]);
  };

  const renderItem = ({ item, index }: { item: Delivery, index: number }) => {
    const isExpanded = item.id === expandedId;
    const isFinished = item.status === 'Finalizada';
    const isActive = item.status === 'Em andamento';
    const isCancelled = item.status === 'Cancelada';
    const isNotCompleted = item.status === 'Não realizada';

    const isDone = isFinished || isCancelled || isNotCompleted; 
    const itemOpacity = isDone ? 'opacity-50' : 'opacity-100';

    let circleBgColor;
    if (isFinished) circleBgColor = 'bg-green-500';
    else if (isCancelled) circleBgColor = 'bg-red-500';
    else if (isNotCompleted) circleBgColor = 'bg-yellow-500';
    else if (isActive) circleBgColor = 'bg-orange-500';
    else circleBgColor = 'bg-gray-800';

    const circleTextColor = 'text-white';
    
    const statusColorClass = 
        isActive ? 'text-orange-500' : 
        isFinished ? 'text-green-600' : 
        isCancelled ? 'text-red-600' :
        isNotCompleted ? 'text-yellow-600' :
        'text-gray-800';

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
                      <View className="flex-row space-x-2">
                        {!isActive && (<TouchableOpacity className="bg-orange-500 h-12 rounded-full flex-1 flex-row justify-center items-center" onPress={(e) => handleStart(e, item)}><Feather name="truck" size={18} color="white" /><Text className="text-white text-center font-bold ml-2">Iniciar Entrega</Text></TouchableOpacity>)}
                        {isActive && (<TouchableOpacity className="bg-green-600 h-12 rounded-full flex-1 flex-row justify-center items-center" onPress={(e) => handleFinish(e, item)}><Feather name="check-circle" size={18} color="white" /><Text className="text-white text-center font-bold ml-2">Finalizar Entrega</Text></TouchableOpacity>)}
                        <TouchableOpacity className="bg-red-600 h-12 rounded-full flex-1 flex-row justify-center items-center" onPress={(e) => handleCancel(e, item)}><Feather name="x-circle" size={18} color="white" /><Text className="text-white text-center font-bold ml-2">Cancelar Entrega</Text></TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View>
                  <Text className="text-lg font-bold text-gray-800">{item.client}</Text>
                  <Text className="text-base text-gray-600">{item.addressStreet}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  
  return (
    <>
      <BottomSheetFlatList<Delivery>
        data={data}
        // ALTERADO: Adicionamos o tipo explícito (item: Delivery) aqui também
        keyExtractor={(item: Delivery) => item.id.toString()}
        renderItem={renderItem}
        ListHeaderComponent={<View className="bg-white"><Text className="text-xl font-bold p-4 text-center text-gray-800">Entregas do Dia</Text></View>}
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: 50, backgroundColor: 'white' }}
      />
      
      <ConfirmationModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleConfirmDelivery}
      />
    </>
  );
}