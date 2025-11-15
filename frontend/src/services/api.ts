// frontend/src/services/api.ts

import axios, { AxiosHeaders } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  EntregaStatus,
  Entrega as EntregaModel,
  Usuario as UsuarioModel,
  LoginResponse,
  SessionResponse,
  ListaEntregasResponse,
  AtualizarStatusEntregaResponse,
} from "../types";

// reexport pra manter compatibilidade com imports antigos
export type Delivery = EntregaModel;
export type Usuario = UsuarioModel;
export type { EntregaStatus } from "../types";

// Configura baseURL e timeout do backend Flask.
export const api = axios.create({
  baseURL: "http://192.168.15.3:5000",
  timeout: 15000,
});

// Injeta JWT automaticamente nas requisições.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("@user_token");
  if (token) {
    if (!config.headers) config.headers = new AxiosHeaders();
    const headers = config.headers as AxiosHeaders & Record<string, any>;
    if (typeof (headers as any).set === "function") {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

// Detalhes enviados por status (lat/long são injetados no map.tsx).
export type AtualizarStatusDetails =
  | { kind: "em_rota"; latitude?: number; longitude?: number }
  | {
      kind: "entregue";
      nome_recebido: string;
      foto_prova?: string;
      latitude?: number;
      longitude?: number;
    }
  | {
      kind: "cancelada";
      motivo?: string;
      latitude?: number;
      longitude?: number;
    }
  | {
      kind: "nao_entregue";
      motivo: string;
      foto_prova?: string;
      latitude?: number;
      longitude?: number;
    };

// --------- ENDPOINTS DE AUTENTICAÇÃO E SESSÃO ----------

// ⚠️ Importante: continua retornando o AxiosResponse,
// só que agora tipado com LoginResponse.
// Então o resto do app pode continuar usando `response.data`.
export function loginMotorista(cnh: string, placa: string) {
  return api.post<LoginResponse>("/usuarios/login", {
    cnh,
    placa_veiculo: placa,
  });
}

export function getSession() {
  return api.get<SessionResponse>("/usuarios/session");
}

export function logoutMotorista() {
  // seu backend provavelmente retorna { message, status }
  return api.post("/usuarios/logout");
}

// --------- ENTREGAS ----------

export function getEntregasPorMotorista(motoristaId: string) {
  return api.get<ListaEntregasResponse>(`/entregas/motorista/${motoristaId}`);
}

// Atualiza status de entrega (monta payload conforme o status).
export function updateStatusEntrega(
  entregaId: string,
  status: EntregaStatus,
  details: AtualizarStatusDetails
) {
  const base: any = {
    status,
    latitude: details.latitude,
    longitude: details.longitude,
  };

  if (status === "entregue") {
    base.nome_recebido = (details as any).nome_recebido;
    base.foto_prova = (details as any).foto_prova;
  } else if (status === "cancelada") {
    base.motivo = (details as any).motivo;
  } else if (status === "nao_entregue") {
    base.motivo = (details as any).motivo;
    base.foto_prova = (details as any).foto_prova;
  }

  return api.put<AtualizarStatusEntregaResponse>(
    `/entregas/${entregaId}/status`,
    base
  );
}
