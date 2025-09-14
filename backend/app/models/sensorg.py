"""
Módulo: sensorg.py
Descrição: Tratamento dos dados do rastreador, recebidos pelo ESP 32.
Autor: Gustavo Henrique dos Anjos
Data: 14/09/2025
"""

from sqlalchemy import Column, Integer, Float, String, Boolean
from App.db import Base

class Sensor(Base):
    __tablename__ = "sensores"

    id = Column(Integer, primary_key=True, index=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    haveFix = Column(Boolean, default=False)
    fixTime = Column(String, nullable=True)
    numSatellites = Column(Integer, default=0)
    altitude = Column(Float, default=0.0)
