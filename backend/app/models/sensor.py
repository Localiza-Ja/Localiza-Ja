"""
Módulo: sensor.py
Descrição: Define o modelo de dados para a entidade Sensor no banco de dados PostgreSQL.
Autor: Rafael dos Santos Giorgi
Data: 31/08/2025
"""

from app.db import db
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Sensor(db.Model):
    """
    Modelo SQLAlchemy para a tabela 'sensor' no banco de dados.

    Representa um sensor com atributos como ID, tipo, dados e data de atualização.
    """
    __tablename__ = 'sensor'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo = db.Column(db.String(255), nullable=False)
    dados = db.Column(db.String(255), nullable=False)
    data = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def json(self):
        """
        Converte os dados do sensor em um formato JSON.

        Returns:
            dict: Dicionário contendo os atributos 'id', 'tipo' e 'dados' do sensor.
        """
        return{
            'id': str(self.id),
            'tipo': self.tipo,
            'dados': self.dados,
        }