//frontend/src/services/api.ts

import axios, { AxiosHeaders } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export type EntregaStatus =
  | "pendente"
  | "em_rota"
  | "entregue"
  | "cancelada"
  | "nao_entregue";

export type Delivery = {
  id: string;
  motorista_id: string;
  endereco_entrega: string;
  numero_pedido: string;
  status: EntregaStatus;
  nome_cliente?: string;
  observacao?: string;
  motivo?: string | null;
  nome_recebido?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type Usuario = {
  id: string;
  nome: string;
  placa_veiculo: string;
  cnh: string;
  telefone?: string;
};

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

// Endpoints de autenticação e dados.
export async function loginMotorista(cnh: string, placa: string) {
  return api.post("/usuarios/login", { cnh, placa_veiculo: placa });
}

export async function getSession() {
  return api.get("/usuarios/session");
}

export async function logoutMotorista() {
  return api.post("/usuarios/logout");
}

export async function getEntregasPorMotorista(motoristaId: string) {
  return api.get(`/entregas/motorista/${motoristaId}`);
}

// Atualiza status de entrega (monta payload conforme o status).
export async function updateStatusEntrega(
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

  return api.put(`/entregas/${entregaId}/status`, base);
}
