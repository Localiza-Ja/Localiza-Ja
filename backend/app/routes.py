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
from sqlalchemy.exc import DataError, IntegrityError

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
            return {
                "pong": True, 
                "message": "API está no ar com sucesso."
            }, 200
        except Exception as e:
            return {
                "message": f"Erro interno no servidor: {str(e)}"
            }, 500

class Sensor_rote(Resource):
    """
    Endpoint para listar todos os sensores ou buscar um sensor específico por ID.
    """
    
    """
    Cria um objeto RequestParser para processar e validar parâmetros da requisição HTTP.
    Define dois parâmetros obrigatórios:
    - tipo: String que especifica o tipo do sensor (ex.: "temperatura").
    - dados: String que contém os dados do sensor (ex.: "25.5").
    Se algum parâmetro estiver ausente, retorna um erro 400 com a mensagem de ajuda correspondente.
    """
    args = reqparse.RequestParser()
    args.add_argument('tipo', type=str, required=True, help='Tipo do sensor é obrigatório')
    args.add_argument('dados', type=str, required=True, help='Dados do sensor são obrigatórios')
    
    def get(self, sensor_id=None):
        """
        Recupera um sensor específico por ID, se fornecido na URL, ou a lista de todos os sensores.

        Args:
            sensor_id (str, optional): ID do sensor para buscar um sensor específico, passado via URL.

        Returns:
            Response: JSON com o sensor específico e 'status' verdadeiro (status 200) se ID fornecido.
            Response: JSON com a lista de sensores e 'status' verdadeiro (status 200) se nenhum ID fornecido.
            Response: JSON com 'error' e 'status' falso (status 404) se sensor não encontrado.
            Response: JSON com 'message' (status 500) em caso de erro interno.
        """
        try:
            if sensor_id:
                get_um_sensor = Sensor.query.get(sensor_id)
                if not get_um_sensor:
                    return {"error": f"Sensor com ID {sensor_id} não encontrado", "status": False}, 404
                return {
                    "Sensor": get_um_sensor.json(), 
                    "message": "Sensor encontrado com sucesso.",  
                    "status": True
                }, 200
            
            get_sensores = Sensor.query.all()
            if not get_sensores:
                return {
                    "error": "Nenhum sensor encontrado", 
                    "status": False
                }, 404
                
            return {
                "Sensor": [current_sensor.json() for current_sensor in get_sensores],
                "message": "Sensores encontrados com sucesso.", 
                "status": True
            }, 200
            
        except ValueError as e:
            return {
                "error": str(e), 
                "status": False
            }, 400
        except Exception as e:
            return {
                "message": f"Erro interno no servidor: {str(e)}"
            }, 500
        
    def post(self):
        """
        Cria um novo sensor no banco de dados.

        Args (via JSON body):
            tipo (str): Tipo do sensor (obrigatório).
            dados (str): Dados do sensor (obrigatório).

        Returns:
            Response: JSON com o sensor criado e 'status' verdadeiro (status 201).
            Response: JSON com 'error' e 'status' falso (status 400) se os dados forem inválidos.
            Response: JSON com 'message' (status 500) em caso de erro interno.
        """
        try:
            dados = Sensor_rote.args.parse_args()
            post_sensor = Sensor(**dados)
            db.session.add(post_sensor)
            db.session.commit()
            
            return {
                "Sensor": post_sensor.json(), 
                "message": "Sensor criado com sucesso.", 
                "status": True
            }, 201
            
        except (ValueError, DataError) as e:
            return {
                "error": f"Dados inválidos: {str(e)}", 
                "status": False
            }, 400
        except IntegrityError as e:
            db.session.rollback()
            return {
                "error": f"Erro de integridade: {str(e)}", 
                "status": False
            }, 400
        except Exception as e:
            db.session.rollback()
            return {
                "message": f"Erro interno no servidor: {str(e)}"
            }, 500
        
    def put(self, sensor_id=None):
        """
        Edita um sensor no banco de dados.

        Args (via JSON body):
            tipo (str): Tipo do sensor (obrigatório).
            dados (str): Dados do sensor (obrigatório).

        Returns:
            Response: JSON com o sensor editado e 'status' verdadeiro (status 200).
            Response: JSON com 'error' e 'status' falso (status 400) se os dados forem inválidos.
            Response: JSON com 'message' (status 500) em caso de erro interno.
        """
        try:
            busca_sensor = Sensor.query.filter_by(id=sensor_id).first() if sensor_id else None
            
            dados = Sensor_rote.args.parse_args()
            
            if busca_sensor:
                busca_sensor.tipo = dados['tipo']
                busca_sensor.dados = dados['dados']
                db.session.commit()
                return {
                    "Sensor": busca_sensor.json(), 
                    "message": "Sensor editado com sucesso.", 
                    "status": True
                }, 200
            else:
                return {
                    "error": f"Sensor com ID {sensor_id} não encontrado", 
                    "status": False
                }, 404
            
        except (ValueError, DataError) as e:
            return {
                "error": f"Dados inválidos: {str(e)}", 
                "status": False
            }, 400
        except IntegrityError as e:
            db.session.rollback()
            return {
                "error": f"Erro de integridade: {str(e)}", 
                "status": False
            }, 400
        except Exception as e:
            db.session.rollback()
            return {
                "message": f"Erro interno no servidor: {str(e)}"
            }, 500
        
    def delete(self, sensor_id):
        """
        Deleta um sensor no banco de dados.

        Args:
            sensor_id (str): ID do sensor a ser deletado, passado via URL.

        Returns:
            Response: JSON com o sensor deletado e 'status' verdadeiro (status 200).
            Response: JSON com 'error' e 'status' falso (status 404) se sensor não encontrado.
            Response: JSON com 'message' (status 500) em caso de erro interno.
        """
        try:
            busca_sensor = Sensor.query.filter_by(id=sensor_id).first()
            
            if busca_sensor:
                db.session.delete(busca_sensor)
                db.session.commit()
                return {
                    "Sensor": busca_sensor.json(), 
                    "message": "Sensor excluído com sucesso.",
                    "status": True
                }, 200
            
            return {
                "message": f"Sensor com ID {sensor_id} não encontrado", 
                "status": False
            }, 404
            
        except ValueError as e:
            return {
                "error": str(e), 
                "status": False
            }, 400
        except Exception as e:
            db.session.rollback()
            return {
                "message": f"Erro interno no servidor: {str(e)}"
            }, 500