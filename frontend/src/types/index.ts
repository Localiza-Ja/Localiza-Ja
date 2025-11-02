// frontend/src/types/index.ts

import type { EntregaStatus } from "../services/api";

export interface Item {
  id: number;
  name: string;
  location: string;
}

export type Delivery = {
  id: string;
  motorista_id: string;
  endereco_entrega: string;
  numero_pedido: string;
  status: EntregaStatus;
  nome_cliente: string;
  nome_recebido: string | null;
  observacao: string | null;
  foto_prova: string | null;
  motivo: string | null;
  criado_em: string;
  atualizado_em: string;

  latitude?: number;
  longitude?: number;
};

export type UserType = "motorista" | "cliente" | null;