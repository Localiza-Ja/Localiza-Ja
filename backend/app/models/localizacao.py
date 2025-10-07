"""
Módulo: localizacao.py
Descrição: Define o modelo de dados para a entidade Localização no banco de dados PostgreSQL.
Autor: Rafael dos Santos Giorgi
Data: 13/09/2025
"""

from app.db import db
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Localizacao(db.Model):
    """
    Modelo SQLAlchemy para a tabela 'localizacao'.
    """
    __tablename__ = 'localizacao'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entrega_id = db.Column(UUID(as_uuid=True), db.ForeignKey("entrega.id"), nullable=False)
    motorista_id = db.Column(UUID(as_uuid=True), db.ForeignKey("usuario.id"), nullable=False)
    latitude = db.Column(db.Numeric(10, 7), nullable=False)
    longitude = db.Column(db.Numeric(10, 7), nullable=False)
    data_hora = db.Column(db.String(255), nullable=False)
    criado_em = db.Column(db.DateTime, default=db.func.current_timestamp())
    atualizado_em = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    # Relacionamentos
    entrega = db.relationship("Entrega", back_populates="localizacoes")
    motorista = db.relationship("Usuario", back_populates="localizacoes")

    def json(self):
        return {
            "id": str(self.id),
            "entrega_id": str(self.entrega_id),
            "motorista_id": str(self.motorista_id),
            "latitude": float(self.latitude),
            "longitude": float(self.longitude),
            "data_hora": self.data_hora,
            "criado_em": str(self.criado_em),
            "atualizado_em": str(self.atualizado_em)
        }
