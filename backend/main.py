"""
Módulo: main.py
Descrição: Ponto de entrada da aplicação Flask, inicializa a API e registra os endpoints.
Autor: Rafael dos Santos Giorgi
Data: 31/08/2025
"""

from flask import Flask, jsonify
from flask_restful import Api
from app.db import create_app
from flask_jwt_extended import JWTManager
from app.routes import SensorList
from app.routes import Ping
from dotenv import load_dotenv
import os

load_dotenv()
app = create_app()
api = Api(app)
jwt = JWTManager(app)

api.add_resource(Ping, '/ping')
api.add_resource(SensorList, '/sensor_api')

if __name__ == "__main__":
    # TODO: Desativar modo de depuração (debug=False) em produção.
    app.run(host='0.0.0.0', debug=True)