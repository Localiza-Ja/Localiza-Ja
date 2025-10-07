"""
Módulo: usuario.py
Descrição: Define o modelo de dados para a entidade Usuário no banco de dados PostgreSQL.
Autor: Rafael dos Santos Giorgi
Data: 13/09/2025
"""

from app.db import db
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Usuario(db.Model):
    """
    Modelo SQLAlchemy para a tabela 'usuario'.
    """
    __tablename__ = 'usuario'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = db.Column(db.String(255), nullable=False)
    placa_veiculo = db.Column(db.String(7), nullable=False)
    cnh = db.Column(db.String(11), nullable=False)
    telefone = db.Column(db.String(11), nullable=False)
    criado_em = db.Column(db.DateTime, default=db.func.current_timestamp())
    atualizado_em = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    # Relacionamento: um usuário pode ter várias localizações
    localizacoes = db.relationship("Localizacao", back_populates="motorista")

    def json(self):
        return {
            "id": str(self.id),
            "nome": self.nome,
            "placa_veiculo": self.placa_veiculo,
            "cnh": self.cnh,
            "criado_em": str(self.criado_em),
            "atualizado_em": str(self.atualizado_em)
        }
