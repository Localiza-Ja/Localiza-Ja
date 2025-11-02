// frontend/src/services/api.ts
import axios, { AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const baseURL = "http://192.168.15.8:5000";
const TOKEN_KEY = "@user_token";

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Interceptor de Request: adiciona token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de Response: loga erros no terminal
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<any>) => {
    console.log(
      "[API ERROR]",
      error.config?.method?.toUpperCase(),
      error.config?.url,
      "| Status:",
      error.response?.status,
      "|",
      error.response?.data || error.message
    );
    return Promise.reject(error);
  }
);

// Tipos fortes
export type EntregaStatus =
  | "pendente"
  | "em_rota"
  | "entregue"
  | "cancelada"
  | "nao_entregue";

export type AtualizarStatusDetails = {
  nome_recebido?: string;
  motivo?: string;
  observacao?: string;
  foto_prova?: string | null;
};

// ===================== AUTENTICAÇÃO =====================
export async function loginMotorista(cnh: string, placa_veiculo: string) {
  console.log("[LOGIN] Tentando login para CNH:", cnh, "Placa:", placa_veiculo);
  const res = await api.post("/usuarios/login", { cnh, placa_veiculo });
  const token = (res.data as any)?.access_token;
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    console.log("[LOGIN] Sucesso. Token salvo no AsyncStorage.");
  }
  return res;
}

export async function logoutMotorista() {
  console.log("[LOGOUT] Iniciando logout...");
  try {
    await api.post("/usuarios/logout");
    console.log("[LOGOUT] Token invalidado no backend.");
  } catch (error) {
    console.warn("[LOGOUT] Erro ao deslogar:", (error as any).message);
  } finally {
    await AsyncStorage.removeItem(TOKEN_KEY);
    console.log("[LOGOUT] Token removido do AsyncStorage.");
  }
}

// ===================== SESSÃO =====================
export async function getSession() {
  const res = await api.get("/usuarios/session");
  const newToken = (res.data as any)?.access_token;
  if (newToken) {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    console.log("[SESSION] Sessão válida. Token renovado.");
  }
  console.log("[SESSION] Motorista logado:", res.data.Usuario?.nome);
  return res;
}

// ===================== ENTREGAS =====================
export async function getEntregasPorMotorista(motoristaId: string) {
  try {
    console.log("[ENTREGAS] Buscando entregas do motorista ID:", motoristaId);
    const res = await api.get(`/entregas/motorista/${motoristaId}`);
    console.log(
      "[ENTREGAS] Total de entregas:",
      res.data?.Entregas?.length || 0
    );
    return res;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      console.log("[ENTREGAS] Nenhuma entrega encontrada (404).");
      return { data: { Entregas: [] } } as any;
    }
    throw err;
  }
}

// ===================== STATUS =====================
export async function updateStatusEntrega(
  entregaId: string,
  status: EntregaStatus,
  details: AtualizarStatusDetails = {}
) {
  console.log(
    `[ENTREGA] Atualizando status da entrega ${entregaId} para "${status}"`
  );

  // Validações locais
  if (status === "entregue" && !details.nome_recebido?.trim()) {
    throw new Error('Para "entregue", o campo "nome_recebido" é obrigatório.');
  }
  if (
    (status === "cancelada" || status === "nao_entregue") &&
    !details.motivo?.trim()
  ) {
    throw new Error(`Para "${status}", o campo "motivo" é obrigatório.`);
  }

  const body: any = { status };
  if (details.nome_recebido) body.nome_recebido = details.nome_recebido;
  if (details.motivo) body.motivo = details.motivo;
  if (details.foto_prova) body.foto_prova = details.foto_prova;
  if (details.observacao) body.observacao = details.observacao;

  const res = await api.put(`/entregas/${entregaId}/status`, body);

  // Log contextual
  switch (status) {
    case "em_rota":
      console.log(`[ENTREGA] 🚚 Entrega ${entregaId} iniciada (em rota).`);
      break;
    case "entregue":
      console.log(`[ENTREGA] ✅ Entrega ${entregaId} finalizada com sucesso.`);
      break;
    case "nao_entregue":
      console.log(
        `[ENTREGA] ⚠️ Entrega ${entregaId} NÃO realizada. Motivo: ${details.motivo}`
      );
      break;
    case "cancelada":
      console.log(
        `[ENTREGA] ❌ Entrega ${entregaId} cancelada. Motivo: ${details.motivo}`
      );
      break;
    default:
      console.log(`[ENTREGA] Status ${status} atualizado.`);
  }

  return res;
}

// ===================== BUSCAR POR NÚMERO =====================
export async function getEntregaPorNumero(numeroPedido: string) {
  console.log("[ENTREGA] Buscando por número do pedido:", numeroPedido);
  const res = await api.get(`/entregas/numero_pedido/${numeroPedido}`);
  return res;
}
