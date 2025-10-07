"""
Módulo: routes.py
Descrição: Define os endpoints da API para gerenciamento de sensores e verificação de conectividade.
Autor: Kaua Hipolito Rodrigues
Data: 06/10/2025
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

class UsuarioResource(Resource):
    parser = reqparse.RequestParser()
    parser.add_argument('nome', type=str, required=True, help='Nome do usuário é obrigatório')
    parser.add_argument("placa_veiculo", type=str, required=True)
    parser.add_argument("cnh", type=str, required=True)
    parser.add_argument("telefone", type=str, required=True)

    @jwt_required()
    def get(self, user_id=None):
        """
        Recupera um usuário específico por ID, se fornecido na URL, ou a lista de todos os usuários.
        """
        try:
            if user_id:
                get_um_usuario = Usuario.query.get(user_id)
                if not get_um_usuario:
                    return {"error": f"Usuário com ID {user_id} não encontrado", "status": False}, 404
                return {
                    "Usuario": get_um_usuario.json(),
                    "message": "Usuário encontrado com sucesso.",
                    "status": True
                }, 200

            get_usuarios = Usuario.query.all()
            if not get_usuarios:
                return {"error": "Nenhum usuário encontrado", "status": False}, 404

            return {
                "Usuario": [current_usuario.json() for current_usuario in get_usuarios],
                "message": "Usuários encontrados com sucesso.",
                "status": True
            }, 200

        except ValueError as e:
            return {"error": str(e), "status": False}, 400
        except Exception as e:
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500

    def post(self):
        try:
            data = UsuarioResource.parser.parse_args()
            novo_usuario = Usuario(
                id=uuid.uuid4(),
                nome=data["nome"],
                placa_veiculo=data["placa_veiculo"],
                cnh=data["cnh"],
                telefone=data["telefone"]
            )
            db.session.add(novo_usuario)
            db.session.commit()

            return {
                "Usuario": novo_usuario.json(),
                "message": "Usuário criado com sucesso.",
                "status": True
            }, 201

        except (ValueError, DataError) as e:
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Erro de integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500

    @jwt_required()
    def put(self, user_id):
        """
        Atualiza os dados de um usuário existente.
        """
        try:
            busca_usuario = Usuario.query.filter_by(id=user_id).first() if user_id else None
            dados = UsuarioResource.parser.parse_args()

            if busca_usuario:
                busca_usuario.nome = dados['nome']
                busca_usuario.placa_veiculo = dados['placa_veiculo']
                busca_usuario.cnh = dados['cnh']
                busca_usuario.telefone = dados['telefone']
                db.session.commit()
                return {
                    "Usuario": busca_usuario.json(),
                    "message": "Usuário editado com sucesso.",
                    "status": True
                }, 200
            else:
                return {
                    "error": f"Usuário com ID {user_id} não encontrado",
                    "status": False
                }, 404

        except (ValueError, DataError) as e:
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Erro de integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500

    def delete(self, usuario_id):
        try:
            usuario = Usuario.query.get(usuario_id)
            if not usuario:
                return {"error": f"Usuário com ID {usuario_id} não encontrado", "status": False}, 404

            db.session.delete(usuario)
            db.session.commit()

            return {"message": "Usuário deletado com sucesso.", "status": True}, 200

        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500


def init_routes(api):
    api.add_resource(Ping, "/ping")
    api.add_resource(Sensor_rote, "/sensores", "/sensores/<string:sensor_id>")
    api.add_resource(UsuarioResource, "/usuarios", "/usuarios/<string:usuario_id>")

class EntregaResource(Resource):
    parser = reqparse.RequestParser()
    parser.add_argument("motorista_id", type=str, required=True, help="ID do motorista é obrigatório")
    parser.add_argument("endereco_entrega", type=str, required=True, help="Endereço de entrega é obrigatório")
    parser.add_argument("numero_pedido", type=str, required=True, help="Número do pedido é obrigatório")
    parser.add_argument("status", type=str, choices=[s.value for s in StatusEntrega], help="Status inválido")
    parser.add_argument("nome_cliente", type=str, required=True, help="Nome do cliente é obrigatório")
    parser.add_argument("nome_recebido", type=str, required=True, help="Nome do recebedor é obrigatório")
    parser.add_argument("descricao", type=str)
    parser.add_argument("observacao", type=str)

    @jwt_required()
    def get(self, entrega_id=None):
        try:
            if entrega_id:
                entrega = Entrega.query.get(entrega_id)
                if not entrega:
                    return {"error": f"Entrega {entrega_id} não encontrada", "status": False}, 404
                return {
                    "Entrega": entrega.json(),
                    "message": "Entrega encontrada com sucesso",
                    "status": True
                }, 200

            entregas = Entrega.query.all()
            if not entregas:
                return {"error": "Nenhuma entrega encontrada", "status": False}, 404

            return {
                "Entregas": [e.json() for e in entregas],
                "message": "Entregas encontradas com sucesso",
                "status": True
            }, 200

        except Exception as e:
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500

    def post(self):
        try:
            data = EntregaResource.parser.parse_args()
            nova_entrega = Entrega(
                id=uuid.uuid4(),
                motorista_id=data["motorista_id"],
                endereco_entrega=data["endereco_entrega"],
                numero_pedido=data["numero_pedido"],
                status=StatusEntrega(data["status"]) if data.get("status") else StatusEntrega.PENDENTE,
                nome_cliente=data["nome_cliente"],
                nome_recebido=data["nome_recebido"],
                descricao=data.get("descricao"),
                observacao=data.get("observacao")
            )
            db.session.add(nova_entrega)
            db.session.commit()
            return {"Entrega": nova_entrega.json(), "status": True}, 201

        except (ValueError, DataError) as e:
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Erro de integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500

    @jwt_required()
    def put(self, entrega_id):
        try:
            entrega = Entrega.query.get(entrega_id)
            if not entrega:
                return {"error": f"Entrega {entrega_id} não encontrada", "status": False}, 404

            data = EntregaResource.parser.parse_args()

            entrega.motorista_id = data["motorista_id"]
            entrega.endereco_entrega = data["endereco_entrega"]
            entrega.numero_pedido = data["numero_pedido"]
            entrega.status = StatusEntrega(data["status"]) if data.get("status") else entrega.status
            entrega.nome_cliente = data["nome_cliente"]
            entrega.nome_recebido = data["nome_recebido"]
            entrega.descricao = data.get("descricao")
            entrega.observacao = data.get("observacao")

            db.session.commit()
            return {"Entrega": entrega.json(), "message": "Entrega atualizada com sucesso", "status": True}, 200

        except (ValueError, DataError) as e:
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Erro de integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500

    def delete(self, entrega_id):
        try:
            entrega = Entrega.query.get(entrega_id)
            if not entrega:
                return {"error": f"Entrega {entrega_id} não encontrada", "status": False}, 404

            db.session.delete(entrega)
            db.session.commit()
            return {"message": "Entrega deletada com sucesso", "status": True}, 200

        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500

class LocalizacaoResource(Resource):
    parser = reqparse.RequestParser()
    parser.add_argument("entrega_id", type=str, required=True, help="ID da entrega é obrigatório")
    parser.add_argument("latitude", type=float, required=True, help="Latitude é obrigatória")
    parser.add_argument("longitude", type=float, required=True, help="Longitude é obrigatória")

    @jwt_required()
    def get(self, localizacao_id=None):
        try:
            if localizacao_id:
                localizacao = Localizacao.query.get(localizacao_id)
                if not localizacao:
                    return {"error": f"Localização {localizacao_id} não encontrada", "status": False}, 404
                return {"Localizacao": localizacao.json(), "status": True}, 200

            localizacoes = Localizacao.query.all()
            if not localizacoes:
                return {"error": "Nenhuma localização encontrada", "status": False}, 404

            return {"Localizacoes": [loc.json() for loc in localizacoes], "status": True}, 200

        except Exception as e:
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500

    def post(self):
        try:
            data = LocalizacaoResource.parser.parse_args()
            nova_localizacao = Localizacao(
                id=uuid.uuid4(),
                entrega_id=data["entrega_id"],
                latitude=data["latitude"],
                longitude=data["longitude"]
            )
            db.session.add(nova_localizacao)
            db.session.commit()
            return {"Localizacao": nova_localizacao.json(), "message": "Localização criada com sucesso", "status": True}, 201

        except (ValueError, DataError) as e:
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Erro de integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500

    @jwt_required()
    def put(self, localizacao_id):
        try:
            localizacao = Localizacao.query.get(localizacao_id)
            if not localizacao:
                return {"error": f"Localização {localizacao_id} não encontrada", "status": False}, 404

            data = LocalizacaoResource.parser.parse_args()
            localizacao.entrega_id = data["entrega_id"]
            localizacao.latitude = data["latitude"]
            localizacao.longitude = data["longitude"]

            db.session.commit()
            return {"Localizacao": localizacao.json(), "message": "Localização atualizada com sucesso", "status": True}, 200

        except (ValueError, DataError) as e:
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Erro de integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500

    def delete(self, localizacao_id):
        try:
            localizacao = Localizacao.query.get(localizacao_id)
            if not localizacao:
                return {"error": f"Localização {localizacao_id} não encontrada", "status": False}, 404

            db.session.delete(localizacao)
            db.session.commit()
            return {"message": "Localização deletada com sucesso", "status": True}, 200

        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}"}, 500
