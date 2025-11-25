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
import { Svg, Path } from "react-native-svg";

// Imagem da seta do motorista.
const navigationArrow = require("../../assets/images/navigation-arrow.png");

// Estilos de rota desenhada no mapa.
const ROUTE_COLOR = "#4285F4";
const ROUTE_OUTLINE_COLOR = "#68C6FC";
const ROUTE_WIDTH = 6;
const ROUTE_OUTLINE_WIDTH = ROUTE_WIDTH + 4;

// Pino personalizado de entrega com o SVG da tela client
const CustomDeliveryMarker: React.FC<{ color: string }> = ({ color }) => {
  return (
    <Svg width={40} height={40} viewBox="0 0 66 100" fill="none">

      {/* PINO – usa cor recebida por props */}
      <Path
        d="M32.9639 2.5C43.8413 2.50011 53.3954 8.12565 58.6084 17.5469V17.5479C63.8122 26.9677 63.4169 37.9322 57.5547 46.9609L43.1221 69.1855L41.0576 72.3643L44.793 73.0107C50.8953 74.0655 55.6846 75.8994 58.8789 78.125C62.0752 80.3521 63.4062 82.7515 63.4062 85.0156C63.4062 88.0506 61.0565 91.2789 55.5312 93.8838C50.1119 96.4387 42.2672 98.0361 32.9639 98.0361C23.6607 98.0361 15.8158 96.4389 10.3936 93.8838C4.86898 91.2804 2.51003 88.0525 2.5 85.0156C2.5 82.7722 3.83005 80.3758 7.03516 78.1406C10.2349 75.9092 15.0276 74.063 21.1201 72.9932L24.8418 72.3398L22.7842 69.1699L8.37305 46.9619C2.50455 37.9166 2.11479 26.9519 7.31738 17.5488L7.31836 17.5479C12.5256 8.12683 22.085 2.5 32.9639 2.5ZM24.9824 75.1211C18.9181 75.8376 14.248 77.2719 11.0205 78.8594C9.41563 79.6488 8.09525 80.5122 7.13379 81.4023C6.65335 81.8472 6.21104 82.3453 5.875 82.8955C5.54923 83.4289 5.23438 84.1584 5.23438 85.0156C5.23438 86.0373 5.67835 86.8887 6.09668 87.4785C6.53913 88.1022 7.12459 88.6765 7.77734 89.1973C9.08784 90.2428 10.916 91.2662 13.1875 92.167C17.751 93.9767 24.378 95.4014 32.9639 95.4014C41.5498 95.4013 48.1768 93.9768 52.7402 92.167C55.0116 91.2662 56.8399 90.2428 58.1504 89.1973C58.803 88.6766 59.3877 88.1021 59.8301 87.4785C60.2484 86.8887 60.6924 86.0373 60.6924 85.0156C60.6924 84.1589 60.378 83.4298 60.0527 82.8965C59.717 82.3461 59.2754 81.847 58.7949 81.4014C57.8335 80.5097 56.5122 79.6453 54.9062 78.8545C51.677 77.2643 47.0043 75.8297 40.9355 75.1211L39.3936 74.9414L38.5479 76.2441L33.1211 84.6143L33.1143 84.624L33.1074 84.6348C33.1023 84.6427 33.0955 84.6509 33.0801 84.6592C33.0639 84.6678 33.0273 84.6826 32.9639 84.6826C32.9143 84.6826 32.8817 84.6711 32.8633 84.6611C32.8458 84.6516 32.8314 84.6386 32.8184 84.6182L32.8115 84.6064L32.8047 84.5957L27.3721 76.2412L26.5254 74.9395L24.9824 75.1211ZM32.9639 13.5732C24.0672 13.5732 16.7765 20.7447 16.7764 29.6143C16.7764 38.4694 24.0734 45.6201 32.9639 45.6201C41.8542 45.6199 49.1514 38.4692 49.1514 29.6143C49.1512 20.7273 41.8585 13.5734 32.9639 13.5732Z"
        fill={color}
        stroke="black"
        strokeWidth={5}
      />
    </Svg>
  );
};

// Cor do pin por status da entrega
const getMarkerColorByStatus = (status: Delivery["status"]) => {
  switch (status) {
    case "pendente":
      return "#F97316"; // laranja
    case "em_rota":
      return "#3B82F6"; // azul
    case "entregue":
      return "#22C55E"; // verde
    case "nao_entregue":
      return "#EF4444"; // vermelho
    case "cancelada":
      return "#6B7280"; // cinza (se um dia mostrar cancelada)
    default:
      return "#F97316";
  }
};

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
    handleToggleTheme,
    handleRegionChangeComplete,
    sheetTargetIndex,
    setSheetTargetIndex,
  } = useMapScreen();

  const isSheetCoveringMap =
    (sheetIndex ?? 1) >= 1 || (sheetTargetIndex ?? -1) >= 1;

  // Controles do topo (logo/header + indicador + FAB de simulação)
  const showTopControls = !isSheetCoveringMap;

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
            const baseColor = getMarkerColorByStatus(d.status);
            const color = selectedDelivery?.id === d.id ? "#22C55E" : baseColor;

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
        showTopControls && <DriverIndicator />}

      {/* Header (logo + menu tema/sair) */}
      {showTopControls && (
        <AppHeader
          isNightTheme={isNightTheme}
          onLogout={handleLogout}
          onToggleTheme={handleToggleTheme}
        />
      )}

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
        visible={showTopControls}
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
