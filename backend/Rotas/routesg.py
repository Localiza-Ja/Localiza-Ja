"""
Módulo: routes.py
Descrição: Definição do rastreador.
Autor: Gustavo Henrique dos Anjos
Data: 14/09/2025
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from App.db import get_db
from App.Models.sensor import Sensor

router = APIRouter()

@router.post("/sensores")
def create_sensor(data: dict, db: Session = Depends(get_db)):
    try:
        sensor = Sensor(
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            haveFix=data.get("haveFix", False),
            fixTime=data.get("fixTime"),
            numSatellites=data.get("numSatellites", 0),
            altitude=data.get("altitude", 0.0)
        )
        db.add(sensor)
        db.commit()
        db.refresh(sensor)
        return {"message": "Sensor criado com sucesso", "id": sensor.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sensores")
def list_sensores(db: Session = Depends(get_db)):
    sensores = db.query(Sensor).all()
    return sensores
