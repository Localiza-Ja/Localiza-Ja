"""
Módulo: entrega.py
Descrição: Define o modelo de dados para a entidade Entrega no banco de dados PostgreSQL.
Autor: Rafael dos Santos Giorgi
Data: 13/09/2025
"""

from app.db import db
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

class StatusEntrega(enum.Enum):
    PENDENTE = "pendente"
    EM_ROTA = "em_rota"
    ENTREGUE = "entregue"
    CANCELADA = "cancelada"

class Entrega(db.Model):
    """
    Modelo SQLAlchemy para a tabela 'entrega'.
    """
    __tablename__ = 'entrega'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    endereco_entrega = db.Column(db.String(255), nullable=False)
    numero_pedido = db.Column(db.String(6), nullable=False, unique=True)
    status = db.Column(db.Enum(StatusEntrega), default=StatusEntrega.PENDENTE)
    nome_cliente = db.Column(db.String(255), nullable=False)
    descricao = db.Column(db.String(255), nullable=True)
    criado_em = db.Column(db.DateTime, default=db.func.current_timestamp())
    atualizado_em = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    # Relacionamento: uma entrega pode ter várias localizações
    localizacoes = db.relationship("Localizacao", back_populates="entrega")

    def json(self):
        return {
            "id": str(self.id),
            "endereco_entrega": self.endereco_entrega,
            "numero_pedido": self.numero_pedido,
            "status": self.status.value,
            "nome_cliente": self.nome_cliente,
            "descricao": self.descricao,
            "criado_em": str(self.criado_em),
            "atualizado_em": str(self.atualizado_em)
        }
