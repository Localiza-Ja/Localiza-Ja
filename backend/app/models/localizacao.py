"""
Módulo: localizacao.py
Descrição: Define o modelo de dados para a entidade Localização no banco de dados PostgreSQL.
Autor: Rafael dos Santos Giorgi
Data: 01/10/2025

NOTE: Este módulo implementa o modelo Localizacao com suporte a coordenadas e timestamp, utilizado para rastreamento de entregas.
"""

from app.db import db
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Localizacao(db.Model):
    """
    Modelo SQLAlchemy para a tabela 'localizacao'.

    Esta classe representa a tabela de localizações no banco de dados, incluindo coordenadas geográficas e timestamps.

    Attributes:
        id (UUID): Identificador único da localização.
        entrega_id (UUID): ID da entrega associada (opcional).
        motorista_id (UUID): ID do motorista associado (opcional).
        latitude (Numeric): Latitude da localização.
        longitude (Numeric): Longitude da localização.
        data_hora (DateTime): Data e hora da localização.
        criado_em (DateTime): Timestamp de criação.
        atualizado_em (DateTime): Timestamp de atualização.
    """
    __tablename__ = 'localizacao'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entrega_id = db.Column(UUID(as_uuid=True), db.ForeignKey("entrega.id"), nullable=True)
    motorista_id = db.Column(UUID(as_uuid=True), db.ForeignKey("usuario.id"), nullable=True)
    latitude = db.Column(db.Numeric(10, 7), nullable=False)
    longitude = db.Column(db.Numeric(10, 7), nullable=False)
    data_hora = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    criado_em = db.Column(db.DateTime, default=db.func.current_timestamp())
    atualizado_em = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    # Relacionamentos
    entrega = db.relationship("Entrega", back_populates="localizacoes")
    motorista = db.relationship("Usuario", back_populates="localizacoes")

    def json(self):
        """
        Converte o objeto Localizacao para um dicionário JSON.

        Returns:
            dict: Representação JSON do objeto, incluindo coordenadas e timestamps.
        """
        return {
            "id": str(self.id),
            "entrega_id": str(self.entrega_id) if self.entrega_id else None,
            "motorista_id": str(self.motorista_id) if self.motorista_id else None,
            "latitude": float(self.latitude),
            "longitude": float(self.longitude),
            "data_hora": str(self.data_hora),
            "criado_em": str(self.criado_em),
            "atualizado_em": str(self.atualizado_em)
        }