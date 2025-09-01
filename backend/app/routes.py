"""
Módulo: routes.py
Descrição: Define os endpoints da API para gerenciamento de sensores e verificação de conectividade.
Autor: Rafael dos Santos Giorgi
Data: 31/08/2025
"""

from app.db import db
from app.models.sensor import Sensor
from flask_restful import Resource, reqparse
from flask_jwt_extended import create_access_token, jwt_required, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
import uuid

class Ping(Resource):
    """
    Endpoint para verificar a conectividade da API.
    """
    def get(self):
        """
        Retorna uma resposta indicando que a API está ativa.

        Returns:
            Response: JSON com 'pong' e 'status' verdadeiros (status 200).
            Response: JSON com mensagem de erro (status 500) em caso de falha.
        """
        try:
            return {"pong": True}, 200
        except Exception as e:
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500

class SensorList(Resource):
    """
    Endpoint para listar todos os sensores do banco de dados.
    """
    def get(self):
        """
        Recupera a lista de todos os sensores.

        Args:
            codprojeto (str): Código do projeto para filtrar sensores (obrigatório, mas não implementado).

        Returns:
            Response: JSON com a lista de sensores e 'status' verdadeiro (status 200).
            Response: JSON com 'error' e 'status' falso (status 400, 404) em caso de erro.
            Response: JSON com 'message' (status 500) em caso de erro interno.

        """
        try:
            sensors = Sensor.query.all()
            if not sensors:
                return {"error": "Nenhum sensor encontrado", "status": False}, 404
                
            return {
                "Sensor": [current_sensor.json() for current_sensor in sensors],
                "status": True
            }, 200
        except ValueError as e:
            return {"error": str(e), "status": False}, 400
        except Exception as e:
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500