//frontend/src/services/api.ts

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://192.168.15.3:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("@user_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginMotorista = (cnh: string, placa_veiculo: string) =>
  api.post("/usuarios/login", { cnh, placa_veiculo });
export const getSession = () => api.get("/usuarios/session");
export const logoutMotorista = () => api.post("/usuarios/logout");
export const getEntregasPorMotorista = (motoristaId: string) =>
  api.get(`/entregas/motorista/${motoristaId}`);
export const getEntregaPorId = (entregaId: string) =>
  api.get(`/entregas/${entregaId}`);
export const getUltimaLocalizacaoPorMotorista = (motoristaId: string) =>
  api.get(`/localizacoes/motorista/${motoristaId}`);
export const updateStatusEntrega = (
  entregaId: string,
  novoStatus: string,
  dadosAdicionais: object
) =>
  api.put(`/entregas/${entregaId}/status`, {
    status: novoStatus,
    ...dadosAdicionais,
  });

export default api;
