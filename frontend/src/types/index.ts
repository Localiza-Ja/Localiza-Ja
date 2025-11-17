// frontend/src/types/index.ts

// ---- STATUS DA ENTREGA (igual ao Enum do backend) ----
export type EntregaStatus =
  | "pendente"
  | "em_rota"
  | "entregue"
  | "cancelada"
  | "nao_entregue";

// ---- BASE GENÉRICA DAS RESPOSTAS ----
export interface ApiResponseBase {
  status: boolean;
  message: string;
  error?: string;
}

export type ApiSingle<T, K extends string> = ApiResponseBase & {
  [key in K]: T;
};

export type ApiList<T, K extends string> = ApiResponseBase & {
  [key in K]: T[];
};

// ---- TIPOS DE DOMÍNIO (batendo com .json() do backend) ----

export interface Usuario {
  id: string;
  nome: string;
  placa_veiculo: string;
  cnh: string;
  telefone: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Entrega {
  id: string;
  motorista_id: string;
  endereco_entrega: string;
  numero_pedido: string;
  status: EntregaStatus;
  nome_cliente: string;
  observacao: string | null;
  nome_recebido: string | null;
  foto_prova: string | null;
  motivo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;

  // campos extras que você enriquece no front ou traz junto
  latitude?: number | null;
  longitude?: number | null;
}

// alias pra manter compatibilidade com o resto do front
export type Delivery = Entrega;

// tipo que você já tem e pode continuar usando
export interface Item {
  id: number;
  name: string;
  location: string;
}

export type UserType = "motorista" | "cliente" | null;

// ---- TIPOS DAS RESPOSTAS DA API ----

// POST /usuarios/login
export interface LoginResponse extends ApiResponseBase {
  access_token: string;
}

// GET /usuarios/session
export interface SessionResponse extends ApiSingle<Usuario, "Usuario"> {
  access_token: string;
}

// GET /entregas/motorista/<id> (ou /entregas do motorista logado)
export type ListaEntregasResponse = ApiList<Entrega, "Entregas">;

// PUT /entregas/<id>/status
export type AtualizarStatusEntregaResponse = ApiSingle<Entrega, "Entrega">;
