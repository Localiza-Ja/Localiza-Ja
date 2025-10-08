"""
Módulo: usuarios.py
Descrição: Define o modelo de dados para a entidade Usuário no banco de dados PostgreSQL.
Autor: Rafael dos Santos Giorgi
Data: 01/10/2025

NOTE: Este módulo implementa o modelo Usuario com informações de motorista, incluindo CNH, placa de veículo.
"""

from app.db import db
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Usuario(db.Model):
    """
    Modelo SQLAlchemy para a tabela 'usuario'.

    Esta classe representa a tabela de usuários (motoristas) no banco de dados.

    Attributes:
        id (UUID): Identificador único do usuário.
        nome (String): Nome do motorista.
        placa_veiculo (String): Placa do veículo.
        cnh (String): Número da CNH.
        telefone (String): Número de telefone.
        criado_em (DateTime): Timestamp de criação.
        atualizado_em (DateTime): Timestamp de atualização.
    """
    __tablename__ = 'usuario'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = db.Column(db.String(255), nullable=False)
    placa_veiculo = db.Column(db.String(8), nullable=False)
    cnh = db.Column(db.String(11), nullable=False)
    telefone = db.Column(db.String(11), nullable=False)
    criado_em = db.Column(db.DateTime, default=db.func.current_timestamp())
    atualizado_em = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    localizacoes = db.relationship("Localizacao", back_populates="motorista")
    entregas = db.relationship("Entrega", back_populates="motorista", cascade="all, delete-orphan")

    def json(self):
        """
        Converte o objeto Usuario para um dicionário JSON.

        Returns:
            dict: Representação JSON do objeto, incluindo dados do motorista.
        """
        return {
            "id": str(self.id),
            "nome": self.nome,
            "placa_veiculo": self.placa_veiculo,
            "cnh": self.cnh,
            "telefone": self.telefone,
            "criado_em": str(self.criado_em),
            "atualizado_em": str(self.atualizado_em)
        }

    def __repr__(self):
        """
        Representação string do objeto para debugging.

        Returns:
            str: String representativa do usuário.
        """
        return f"<Usuario {self.nome} (ID: {self.id})>"