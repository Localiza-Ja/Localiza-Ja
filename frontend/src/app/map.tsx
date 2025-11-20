// src/app/map.tsx
/**
 * Tela principal do motorista com o mapa.
 * - Orquestra sessão, entregas, localização em tempo real e rotas.
 * - Renderiza o MapView com motorista, pinos de entrega, rota e trilha percorrida.
 * - Integra o painel inferior de entregas (DeliveryPanel) e o cabeçalho (AppHeader).
 *
 * A lógica pesada está no hook useMapScreen em src/hooks,
 * mantendo este arquivo como "compositor" da tela, com o mesmo comportamento de antes.
 */
import React, { memo } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, Polyline, Circle } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import { ToastProvider } from "../components/Toast";
import DeliveryPanel from "../components/DeliveryPanel";
import SimulationFab from "../components/SimulationFab";
import mapStyleLight from "../styles/mapStyleLight";
import mapStyleDark from "../styles/mapStyleDark";
import { Delivery } from "../types";
import { useMapScreen } from "../hooks/useMapScreen";

// Imagens do app (logo e seta do motorista).
const appLogo = require("../../assets/images/lj-logo.png");
const navigationArrow = require("../../assets/images/navigation-arrow.png");

// Estilos de rota desenhada no mapa.
const ROUTE_COLOR = "#4285F4";
const ROUTE_OUTLINE_COLOR = "#68C6FC";
const ROUTE_WIDTH = 6;
const ROUTE_OUTLINE_WIDTH = ROUTE_WIDTH + 4;

// Pino personalizado de entrega.
const CustomDeliveryMarker: React.FC<{ color: string }> = ({ color }) => (
  <View style={styles.deliveryPin}>
    <Feather name="map-pin" size={32} color={color} />
    <View style={[styles.deliveryPinDot, { backgroundColor: color }]} />
  </View>
);

// Indicador fixo do motorista quando navegando.
const DriverIndicator: React.FC = memo(
  () => {
    return (
      <Image source={navigationArrow} style={styles.fixedNavigationIcon} />
    );
  },
  () => true
);

function MapScreenInner() {
  const {
    mapRef,
    motorista,
    deliveriesData,
    isLoading,
    driverLocation,
    effectiveLocation,
    pastCoordinates,
    displayedRouteCoordinates,
    selectedDelivery,
    isNavigating,
    isMapCentered,
    sheetIndex,
    setSheetIndex,
    handleLogout,
    handleDeliveryPress,
    handleUpdateStatus,
    handleStartNavigation,
    handleCenterMap,
    simulation,
    handleSimulationStart,
    handleSimulationStop,
    handleToggleWrongRoute,
    initialRegion,
    isNightTheme,
    handleRegionChangeComplete,
    sheetTargetIndex,
    setSheetTargetIndex,
  } = useMapScreen();

  const isSheetCoveringMap =
    (sheetIndex ?? 1) >= 1 || (sheetTargetIndex ?? -1) >= 1;

  const centerIconName = isNavigating ? "navigation" : "compass";

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#21222D" />
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onPanDrag={() => {}}
        onRegionChangeComplete={handleRegionChangeComplete}
        rotateEnabled
        pitchEnabled={false}
        showsCompass={false}
        toolbarEnabled={false}
        customMapStyle={isNightTheme ? mapStyleDark : mapStyleLight}
      >
        {/* Pinos das entregas ativas */}
        {deliveriesData
          .filter((d: Delivery) => {
            const hasCoordinates =
              typeof d.latitude === "number" && typeof d.longitude === "number";
            const isActive =
              d.status !== "cancelada" && d.status !== "entregue";
            return hasCoordinates && isActive;
          })
          .map((d: Delivery) => {
            const color = selectedDelivery?.id === d.id ? "#34A853" : "#EA4335";
            return (
              <Marker
                key={`delivery-${d.id}`}
                coordinate={{ latitude: d.latitude!, longitude: d.longitude! }}
                onPress={() => handleDeliveryPress(d)}
                anchor={{ x: 0.5, y: 1 }}
              >
                <CustomDeliveryMarker color={color} />
              </Marker>
            );
          })}

        {/* Trilho de coordenadas já percorridas */}
        {false && pastCoordinates.length > 0 && (
          <Polyline
            coordinates={pastCoordinates}
            strokeColor="#AAAAAA"
            strokeWidth={3}
            lineDashPattern={[10, 10]}
            zIndex={0}
          />
        )}

        {/* Rota entre motorista e entrega selecionada (SEMPRE a rota CORRETA: original ou recalculada) */}
        {displayedRouteCoordinates.length > 0 && selectedDelivery && (
          <>
            <Polyline
              coordinates={displayedRouteCoordinates}
              strokeColor={ROUTE_OUTLINE_COLOR}
              strokeWidth={ROUTE_OUTLINE_WIDTH}
              zIndex={1}
            />
            <Polyline
              coordinates={displayedRouteCoordinates}
              strokeColor={ROUTE_COLOR}
              strokeWidth={ROUTE_WIDTH}
              zIndex={2}
            />
          </>
        )}

        {/* Motorista (não navegando): ponto azul com círculo de precisão */}
        {effectiveLocation && !isNavigating && (
          <>
            <Circle
              center={effectiveLocation.coords}
              radius={effectiveLocation.coords.accuracy || 20}
              strokeWidth={1}
              strokeColor="rgba(26, 115, 232, 0.5)"
              fillColor="rgba(26, 115, 232, 0.1)"
              zIndex={1}
            />
            <Marker
              coordinate={effectiveLocation.coords}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={3}
              rotation={0}
            >
              <Image
                source={navigationArrow}
                style={styles.mapNavigationIcon}
              />
            </Marker>
          </>
        )}
      </MapView>

      {/* Indicador fixo quando navegando + mapa centrado */}
      {effectiveLocation &&
        isNavigating &&
        isMapCentered &&
        !isSheetCoveringMap && <DriverIndicator />}

      <AppHeader logoSource={appLogo} onLogout={handleLogout} />

      {!isMapCentered && (
        <TouchableOpacity style={styles.centerButton} onPress={handleCenterMap}>
          <Feather name={centerIconName} size={24} color="#5F6368" />
        </TouchableOpacity>
      )}

      {/* Painel de entregas (BottomSheet) */}
      <DeliveryPanel
        deliveriesData={deliveriesData}
        selectedDelivery={selectedDelivery}
        onDeliveryPress={handleDeliveryPress}
        onUpdateStatus={handleUpdateStatus}
        onLogout={handleLogout}
        onStartNavigation={handleStartNavigation}
        isLoadingList={isLoading}
        onSheetIndexChange={setSheetIndex}
        onSheetTargetIndexChange={setSheetTargetIndex}
      />

      {/* FAB de simulação */}
      <SimulationFab
        mode={simulation.mode}
        isPaused={simulation.isPaused}
        isWrongRoute={simulation.isWrongRoute}
        visible={sheetIndex === 0}
        onStart={handleSimulationStart}
        onPause={simulation.pause}
        onResume={simulation.resume}
        onStop={handleSimulationStop}
        onToggleWrongRoute={handleToggleWrongRoute}
        isNightTheme={isNightTheme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  fixedNavigationIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 25,
    height: 25,
    marginLeft: -12.5,
    marginTop: -12.5,
    zIndex: 100,
  },
  mapNavigationIcon: {
    width: 20,
    height: 20,
    zIndex: 10,
  },
  centerButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.85)" : "white",
    borderRadius: 30,
    padding: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === "ios" ? 0.15 : 0.25,
    shadowRadius: 3.84,
  },
  deliveryPin: {
    justifyContent: "center",
    alignItems: "center",
    width: 35,
    height: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  deliveryPinDot: {
    position: "absolute",
    top: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
});

// Wrapper exportando com ToastProvider
export default function MapScreen() {
  return (
    <ToastProvider>
      <MapScreenInner />
    </ToastProvider>
  );
}
