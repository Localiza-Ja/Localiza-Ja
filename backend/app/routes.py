"""
Módulo: routes.py
Descrição: Define os endpoints da API para gerenciamento de Usuários, Entregas, Localizações, autenticação e verificação de conectividade.
Autor: Rafael dos Santos Giorgi
Data: 05/10/2025

NOTE: Este módulo inclui endpoints para autenticação (login/logout) e gerenciamento de sessões, além de recursos para usuários, entregas e localizações.
TODO: Adicionar suporte a paginação em listas longas para melhor performance.
"""

from app.db import db
from app.models.usuarios import Usuario
from app.models.entrega import Entrega, StatusEntrega
from app.models.localizacao import Localizacao
from flask_restful import Resource, reqparse
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity, get_jwt
from werkzeug.utils import secure_filename
import uuid
from sqlalchemy.exc import DataError, IntegrityError
from datetime import datetime
from app.utils import check_if_token_in_blacklist, add_to_blacklist
import os
import secrets
import string
from flask import request, current_app
from flask_babel import gettext
import re
import base64
import logging

# Configurar logging
logging.basicConfig(
    filename='app.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def validar_cnh(value):
    """
    Valida o formato da CNH.

    Args:
        value (str): Valor da CNH a validar.

    Returns:
        str: Valor validado.

    Raises:
        ValueError: Se o formato for inválido ou o valor for vazio.
    """
    if not value:
        raise ValueError("CNH não pode ser vazia")
    if not re.fullmatch(r'^\d{11}$', value):
        raise ValueError("CNH deve ter exatamente 11 dígitos numéricos")
    return value

def validar_placa(value):
    """
    Valida o formato da placa de veículo.

    Args:
        value (str): Valor da placa a validar.

    Returns:
        str: Valor validado.

    Raises:
        ValueError: Se o formato for inválido ou o valor for vazio.
    """
    if not value:
        raise ValueError("Placa não pode ser vazia")
    if not re.match(r'^[A-Za-z]{3}-[0-9]{4}$', value):
        raise ValueError("Placa deve seguir o formato XXX-1234")
    return value.upper()

def validar_endereco(value):
    """
    Valida o comprimento do endereço de entrega.

    Args:
        value (str): Valor do endereço a validar.

    Returns:
        str: Valor validado.

    Raises:
        ValueError: Se o comprimento exceder o limite ou for vazio.
    """
    if not value:
        raise ValueError("Endereço de entrega não pode ser vazio")
    if len(value) > 255:
        raise ValueError("Endereço de entrega deve ter no máximo 255 caracteres")
    return value

def validar_max_length(max_length):
    """
    Cria um validador para comprimento máximo de string.

    Args:
        max_length (int): Comprimento máximo permitido.

    Returns:
        function: Função validadora.
    """
    def validator(value):
        if value is not None:
            if not isinstance(value, str):
                raise ValueError("Valor deve ser uma string")
            if len(value) > max_length:
                raise ValueError(f"O valor deve ter no máximo {max_length} caracteres")
        return value
    return validator

def validar_range(min_value=None, max_value=None):
    """
    Cria um validador para faixa numérica.

    Args:
        min_value (float, optional): Valor mínimo.
        max_value (float, optional): Valor máximo.

    Returns:
        function: Função validadora.
    """
    def validator(value):
        if value is None:
            return value
        try:
            num = float(value)
        except ValueError:
            raise ValueError("Valor deve ser um número válido")
        if min_value is not None and num < min_value:
            raise ValueError(f"O valor mínimo permitido é {min_value}")
        if max_value is not None and num > max_value:
            raise ValueError(f"O valor máximo permitido é {max_value}")
        return num
    return validator

def validar_status():
    """
    Cria um validador para status possíveis de uma entrega.

    Returns:
        function: Função validadora que verifica se o valor é um status válido do enum StatusEntrega.
    """
    def validator(value):
        if value is None:
            raise ValueError("Status não pode ser nulo")
        try:
            return StatusEntrega(value)
        except ValueError:
            valid_statuses = [s.value for s in StatusEntrega]
            raise ValueError(f"Status inválido. Valores permitidos: {valid_statuses}")
    return validator

def processar_foto_prova(foto_prova, entrega_id):
    """
    Processa a foto de prova, suportando base64 ou nome de arquivo.

    Args:
        foto_prova (str): Dados da foto (base64 ou nome do arquivo).
        entrega_id: indetificação da entrega para salvar o arquivo com o mesmo nome da entrega para busca depois
    Returns:
        str: Nome do arquivo salvo.

    Raises:
        ValueError: Se o formato, tamanho ou existência do arquivo for inválido.
    """
    if foto_prova.startswith('data:image'):
        header, data = foto_prova.split(',', 1)
        mime_type = header.split(';')[0].split('/')[-1]
        allowed_extensions = ['jpeg', 'jpg', 'png']
        if mime_type not in allowed_extensions:
            raise ValueError(gettext("Formato de imagem inválido. Permitidos: {}").format(allowed_extensions))
        binary_data = base64.b64decode(data)
        if len(binary_data) > 5 * 1024 * 1024:
            raise ValueError(gettext("Arquivo de imagem excede o tamanho máximo de 5MB."))
        
        filename = secure_filename(f"{entrega_id}.{mime_type}")
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        with open(filepath, 'wb') as f:
            f.write(binary_data)
        return filename
    else:
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], secure_filename(foto_prova))
        if not os.path.exists(filepath):
            raise ValueError(gettext("Arquivo de foto_prova não encontrado."))
        ext = os.path.splitext(foto_prova)[1].lower().lstrip('.')
        if ext not in ['jpeg', 'jpg', 'png']:
            raise ValueError(gettext("Extensão de arquivo inválida. Permitidos: jpeg, jpg, png"))
        return None;

def gerar_numero_pedido():
    """
    Gera um código de rastreamento aleatório com 6 caracteres (letras e números, maiúsculas).

    Returns:
        str: Código de rastreamento gerado único.

    Raises:
        RuntimeError: Se não for possível gerar um número único após várias tentativas.
    """
    tentativas = 0
    max_tentativas = 100
    while tentativas < max_tentativas:
        numero = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        if not Entrega.query.filter_by(numero_pedido=numero).first():
            return numero
        tentativas += 1
    raise RuntimeError("Não foi possível gerar um número de pedido único após várias tentativas.")

class Ping(Resource):
    def get(self):
        """
        Verifica a conectividade da API.

        Returns:
            tuple: JSON com mensagem de sucesso, 'pong' verdadeiro e 'status' verdadeiro (status 200).
        """
        logger.info("Ping endpoint acessado")
        return {"pong": True, "message": gettext("API está no ar com sucesso."), "status": True}, 200

class LoginResource(Resource):
    args = reqparse.RequestParser()
    args.add_argument('cnh', type=validar_cnh, required=True, help='CNH deve ter 11 dígitos')
    args.add_argument('placa_veiculo', type=validar_placa, required=True, help='Placa inválida')

    def post(self):
        """
        Realiza login de usuário e retorna um token JWT.

        Args:
            JSON Body:
                cnh (str): Número da CNH do motorista.
                placa_veiculo (str): Placa do veículo do motorista.

        Returns:
            tuple: JSON com token de acesso, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 401) se as credenciais forem inválidas.
            tuple: JSON com 'error' e 'status' falso (status 400) se os dados forem inválidos.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            dados = LoginResource.args.parse_args()
            usuario = Usuario.query.filter_by(cnh=dados['cnh'], placa_veiculo=dados['placa_veiculo']).first()
            if not usuario:
                logger.warning(f"Tentativa de login falha com CNH {dados['cnh']}")
                return {"error": gettext("Credenciais inválidas. Verifique CNH e placa."), "status": False}, 401
            access_token = create_access_token(identity=str(usuario.id))
            logger.info(f"Login bem-sucedido para usuário {usuario.id}")
            return {
                "access_token": access_token,
                "message": gettext("Login realizado com sucesso."),
                "status": True
            }, 200
        except ValueError as e:
            logger.error(f"Erro de validação no login: {str(e)}")
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except Exception as e:
            logger.error(f"Erro interno no login: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class LogoutResource(Resource):
    @jwt_required()
    def post(self):
        """
        Realiza logout do usuário, adicionando o token JWT à blacklist.

        Returns:
            tuple: JSON com mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 400) se o token for inválido.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            jti = get_jwt()['jti']
            add_to_blacklist(jti)
            logger.info(f"Logout bem-sucedido para token {jti}")
            return {"message": gettext("Logout realizado com sucesso."), "status": True}, 200
        except KeyError as e:
            logger.error(f"Erro no logout: {str(e)}")
            return {"error": f"Erro no token: {str(e)}", "status": False}, 400
        except Exception as e:
            logger.error(f"Erro interno no logout: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class SessionResource(Resource):
    @jwt_required()
    def get(self):
        """
        Valida o token JWT atual, retorna os dados do usuário logado e renova o token.

        Returns:
            tuple: JSON com dados do usuário, novo token, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se o usuário não for encontrado.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            user_id = get_jwt_identity()
            user = Usuario.query.get(user_id)
            if not user:
                logger.warning(f"Usuário não encontrado na verificação de sessão: {user_id}")
                return {"error": gettext("Usuário não encontrado."), "status": False}, 404
            new_token = create_access_token(identity=user_id)
            logger.info(f"Sessão válida para usuário {user_id}")
            return {
                "Usuario": user.json(),
                "access_token": new_token,
                "message": gettext("Sessão válida e renovada com sucesso."),
                "status": True
            }, 200
        except Exception as e:
            logger.error(f"Erro na verificação de sessão: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class UsuarioResource(Resource):
    args = reqparse.RequestParser()
    args.add_argument('nome', type=validar_max_length(255), required=True, help='Nome é obrigatório')
    args.add_argument('placa_veiculo', type=validar_placa, required=True, help='Placa inválida')
    args.add_argument('cnh', type=validar_cnh, required=True, help='CNH deve ter 11 dígitos')
    args.add_argument('telefone', type=validar_max_length(11), required=True, help='Telefone deve ter no máximo 11 dígitos')

    def post(self):
        """
        Cria um novo usuário.

        Args:
            JSON Body:
                nome (str): Nome do motorista.
                placa_veiculo (str): Placa do veículo.
                cnh (str): Número da CNH.
                telefone (str): Número de telefone.

        Returns:
            tuple: JSON com dados do usuário criado, mensagem de sucesso e 'status' verdadeiro (status 201).
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos ou integridade violada.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            dados = UsuarioResource.args.parse_args()
            usuario = Usuario(**dados)
            db.session.add(usuario)
            db.session.commit()
            logger.info(f"Novo usuário criado: {usuario.id}")
            return {
                "Usuario": usuario.json(),
                "message": gettext("Usuário criado com sucesso."),
                "status": True
            }, 201
        except ValueError as e:
            db.session.rollback()
            logger.error(f"Erro de validação ao criar usuário: {str(e)}")
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except (DataError, IntegrityError) as e:
            db.session.rollback()
            logger.error(f"Erro de banco ao criar usuário: {str(e)}")
            return {"error": f"Erro de dados ou integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro interno ao criar usuário: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

    @jwt_required()
    def get(self, user_id=None):
        """
        Lista todos os usuários ou recupera um usuário específico.

        Args:
            user_id (str, optional): ID do usuário.

        Returns:
            tuple: JSON com lista ou dados do usuário, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se não encontrado.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            if user_id:
                usuario = Usuario.query.get(user_id)
                if not usuario:
                    logger.warning(f"Usuário não encontrado: {user_id}")
                    return {"error": f"Usuário com ID {user_id} não encontrado.", "status": False}, 404
                logger.info(f"Usuário encontrado: {user_id}")
                return {
                    "Usuario": usuario.json(),
                    "message": gettext("Usuário encontrado com sucesso."),
                    "status": True
                }, 200
            else:
                usuarios = Usuario.query.all()
                logger.info("Lista de usuários retornada")
                return {
                    "Usuarios": [u.json() for u in usuarios],
                    "message": gettext("Usuários listados com sucesso."),
                    "status": True
                }, 200
        except Exception as e:
            logger.error(f"Erro ao buscar usuário(s): {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

    @jwt_required()
    def put(self, user_id):
        """
        Atualiza os dados de um usuário existente.

        Args:
            user_id (str): ID do usuário.
            JSON Body: Campos a atualizar (nome, placa_veiculo, cnh, telefone).

        Returns:
            tuple: JSON com dados atualizados, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se não encontrado.
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos ou integridade violada.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            usuario = Usuario.query.get(user_id)
            if not usuario:
                logger.warning(f"Usuário não encontrado para atualização: {user_id}")
                return {"error": f"Usuário com ID {user_id} não encontrado.", "status": False}, 404
            dados = UsuarioResource.args.parse_args()
            atualizacoes = 0
            for campo, valor in dados.items():
                if valor is not None:
                    setattr(usuario, campo, valor)
                    atualizacoes += 1
            if atualizacoes == 0:
                return {"error": "Nenhum campo fornecido para atualização.", "status": False}, 400
            db.session.commit()
            logger.info(f"Usuário atualizado: {user_id}")
            return {
                "Usuario": usuario.json(),
                "message": gettext("Usuário atualizado com sucesso."),
                "status": True
            }, 200
        except ValueError as e:
            db.session.rollback()
            logger.error(f"Erro de validação ao atualizar usuário: {str(e)}")
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except (DataError, IntegrityError) as e:
            db.session.rollback()
            logger.error(f"Erro de banco ao atualizar usuário: {str(e)}")
            return {"error": f"Erro de dados ou integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro interno ao atualizar usuário: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

    @jwt_required()
    def delete(self, user_id):
        """
        Deleta um usuário existente.

        Args:
            user_id (str): ID do usuário a ser deletado.

        Returns:
            tuple: JSON com mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se não encontrado.
            tuple: JSON com 'error' e 'status' falso (status 400) se houver dependências.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            usuario = Usuario.query.get(user_id)
            if not usuario:
                logger.warning(f"Usuário não encontrado para deleção: {user_id}")
                return {"error": f"Usuário com ID {user_id} não encontrado.", "status": False}, 404
            db.session.delete(usuario)
            db.session.commit()
            logger.info(f"Usuário deletado: {user_id}")
            return {"message": gettext("Usuário deletado com sucesso."), "status": True}, 200
        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"Erro de integridade ao deletar usuário: {str(e)}")
            return {"error": f"Não é possível deletar devido a dependências: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro interno ao deletar usuário: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class EntregaResource(Resource):
    args = reqparse.RequestParser()
    args.add_argument('motorista_id', type=str, required=True, help='ID do motorista é obrigatório')
    args.add_argument('endereco_entrega', type=validar_endereco, required=True, help='Endereço inválido')
    args.add_argument('nome_cliente', type=validar_max_length(255), required=True, help='Nome do cliente é obrigatório')
    args.add_argument('observacao', type=validar_max_length(255), required=False, help='Observação inválida')
    args.add_argument('foto_prova', type=str, required=False, help='Foto de prova inválida')

    @jwt_required()
    def post(self):
        """
        Cria uma nova entrega.

        Args:
            JSON Body:
                motorista_id (str): ID do motorista.
                endereco_entrega (str): Endereço de entrega.
                nome_cliente (str): Nome do cliente.
                foto_prova (str, optional): Foto de prova (base64 ou nome de arquivo).

        Returns:
            tuple: JSON com dados da entrega criada, mensagem de sucesso e 'status' verdadeiro (status 201).
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos ou motorista não encontrado.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            dados = EntregaResource.args.parse_args()
            if not Usuario.query.get(dados['motorista_id']):
                logger.warning(f"Motorista não encontrado para entrega: {dados['motorista_id']}")
                raise ValueError("Motorista não encontrado com o ID fornecido.")
            dados['numero_pedido'] = gerar_numero_pedido()
            if dados['foto_prova']:
                dados['foto_prova'] = processar_foto_prova(dados['foto_prova'])
            entrega = Entrega(**dados)
            db.session.add(entrega)
            db.session.commit()
            logger.info(f"Nova entrega criada: {entrega.id}")
            return {
                "Entrega": entrega.json(),
                "message": gettext("Entrega criada com sucesso."),
                "status": True
            }, 201
        except ValueError as e:
            db.session.rollback()
            logger.error(f"Erro de validação ao criar entrega: {str(e)}")
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except (DataError, IntegrityError) as e:
            db.session.rollback()
            logger.error(f"Erro de banco ao criar entrega: {str(e)}")
            return {"error": f"Erro de dados ou integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro interno ao criar entrega: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

    @jwt_required()
    def get(self, entrega_id=None):
        """
        Lista todas as entregas ou recupera uma entrega específica.

        Args:
            entrega_id (str, optional): ID da entrega.

        Returns:
            tuple: JSON com lista ou dados da entrega, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se não encontrada.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            if entrega_id:
                entrega = Entrega.query.get(entrega_id)
                if not entrega:
                    logger.warning(f"Entrega não encontrada: {entrega_id}")
                    return {"error": f"Entrega com ID {entrega_id} não encontrada.", "status": False}, 404
                logger.info(f"Entrega encontrada: {entrega_id}")
                return {
                    "Entrega": entrega.json(),
                    "message": gettext("Entrega encontrada com sucesso."),
                    "status": True
                }, 200
            else:
                entregas = Entrega.query.all()
                logger.info("Lista de entregas retornada")
                return {
                    "Entregas": [e.json() for e in entregas],
                    "message": gettext("Entregas listadas com sucesso."),
                    "status": True
                }, 200
        except Exception as e:
            logger.error(f"Erro ao buscar entrega(s): {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

    @jwt_required()
    def put(self, entrega_id):
        """
        Atualiza uma entrega existente.

        Args:
            entrega_id (str): ID da entrega.
            JSON Body: Campos a atualizar (motorista_id, endereco_entrega, nome_cliente, observacao, foto_prova).

        Returns:
            tuple: JSON com dados atualizados, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se não encontrada.
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos ou motorista não encontrado.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            entrega = Entrega.query.get(entrega_id)
            if not entrega:
                logger.warning(f"Entrega não encontrada para atualização: {entrega_id}")
                return {"error": f"Entrega com ID {entrega_id} não encontrada.", "status": False}, 404
            dados = EntregaResource.args.parse_args()
            atualizacoes = 0
            for campo, valor in dados.items():
                if valor is not None:
                    if campo == 'motorista_id' and not Usuario.query.get(valor):
                        logger.warning(f"Motorista não encontrado para atualização de entrega: {valor}")
                        raise ValueError("Motorista não encontrado com o ID fornecido.")
                    if campo == 'foto_prova':
                        valor = processar_foto_prova(valor)
                    setattr(entrega, campo, valor)
                    atualizacoes += 1
            if atualizacoes == 0:
                return {"error": "Nenhum campo fornecido para atualização.", "status": False}, 400
            db.session.commit()
            logger.info(f"Entrega atualizada: {entrega_id}")
            return {
                "Entrega": entrega.json(),
                "message": gettext("Entrega atualizada com sucesso."),
                "status": True
            }, 200
        except ValueError as e:
            db.session.rollback()
            logger.error(f"Erro de validação ao atualizar entrega: {str(e)}")
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except (DataError, IntegrityError) as e:
            db.session.rollback()
            logger.error(f"Erro de banco ao atualizar entrega: {str(e)}")
            return {"error": f"Erro de dados ou integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro interno ao atualizar entrega: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

    @jwt_required()
    def delete(self, entrega_id):
        """
        Deleta uma entrega existente.

        Args:
            entrega_id (str): ID da entrega a ser deletada.

        Returns:
            tuple: JSON com mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se não encontrada.
            tuple: JSON com 'error' e 'status' falso (status 400) se houver dependências.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            entrega = Entrega.query.get(entrega_id)
            if not entrega:
                logger.warning(f"Entrega não encontrada para deleção: {entrega_id}")
                return {"error": f"Entrega com ID {entrega_id} não encontrada.", "status": False}, 404
            db.session.delete(entrega)
            db.session.commit()
            logger.info(f"Entrega deletada: {entrega_id}")
            return {"message": gettext("Entrega deletada com sucesso."), "status": True}, 200
        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"Erro de integridade ao deletar entrega: {str(e)}")
            return {"error": f"Não é possível deletar devido a dependências: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro interno ao deletar entrega: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class EntregaPorNumeroResource(Resource):
    def get(self, numero_pedido):
        """
        Recupera uma entrega pelo número do pedido.

        Args:
            numero_pedido (str): Número do pedido da entrega.

        Returns:
            tuple: JSON com dados da entrega, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se não encontrada.
            tuple: JSON com 'error' e 'status' falso (status 400) se número do pedido for inválido.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            if not re.match(r'^[A-Z0-9]{6}$', numero_pedido):
                logger.warning(f"Número de pedido inválido: {numero_pedido}")
                raise ValueError("Número do pedido deve ter exatamente 6 caracteres alfanuméricos maiúsculos.")
            entrega = Entrega.query.filter_by(numero_pedido=numero_pedido).first()
            if not entrega:
                logger.warning(f"Entrega não encontrada pelo número: {numero_pedido}")
                return {"error": f"Entrega com número {numero_pedido} não encontrada.", "status": False}, 404
            logger.info(f"Entrega encontrada pelo número: {numero_pedido}")
            return {
                "Entrega": entrega.json(),
                "message": gettext("Entrega encontrada com sucesso."),
                "status": True
            }, 200
        except ValueError as e:
            logger.error(f"Erro de validação ao buscar entrega por número: {str(e)}")
            return {"error": f"Formato inválido: {str(e)}", "status": False}, 400
        except Exception as e:
            logger.error(f"Erro interno ao buscar entrega por número: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class EntregaPorMotoristaResource(Resource):
    @jwt_required()
    def get(self, motorista_id):
        """
        Lista entregas por motorista.

        Args:
            motorista_id (str): ID do motorista.

        Returns:
            tuple: JSON com lista de entregas, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se nenhuma encontrada ou motorista não existir.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            if not Usuario.query.get(motorista_id):
                logger.warning(f"Motorista não encontrado: {motorista_id}")
                return {"error": f"Motorista com ID {motorista_id} não encontrado.", "status": False}, 404
            entregas = Entrega.query.filter_by(motorista_id=motorista_id).all()
            if not entregas:
                logger.warning(f"Nenhuma entrega encontrada para motorista: {motorista_id}")
                return {"error": f"Nenhuma entrega encontrada para o motorista {motorista_id}.", "status": False}, 404
            logger.info(f"Entregas encontradas para motorista: {motorista_id}")
            return {
                "Entregas": [e.json() for e in entregas],
                "message": gettext("Entregas encontradas com sucesso."),
                "status": True
            }, 200
        except Exception as e:
            logger.error(f"Erro ao buscar entregas por motorista: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class EntregaStatusResource(Resource):
    args = reqparse.RequestParser()
    args.add_argument('status', type=validar_status(), required=True, help='Status inválido')
    args.add_argument('nome_recebido', type=validar_max_length(255), required=False, help='Nome recebido inválido')
    args.add_argument('motivo', type=validar_max_length(255), required=False, help='Motivo inválido')
    args.add_argument('foto_prova', type=str, required=False, help='Foto de prova inválida')

    @jwt_required()
    def put(self, entrega_id):
        """
        Atualiza o status de uma entrega, respeitando regras de negócio específicas.

        Args:
            entrega_id (uuid): ID da entrega a ser atualizada.

        JSON Body (dependendo do status):
            - status (str): Novo status (pendente, em_rota, entregue, cancelada, nao_entregue).
            - Para 'em_rota': latitude (float) e longitude (float) obrigatórios.
            - Para 'entregue': nome_recebido (str) e foto_prova (str) obrigatórios.
            - Para 'cancelada' ou 'nao_entregue': motivo (str) e foto_prova (str) obrigatórios.
            - foto_prova: Pode ser nome de arquivo ou base64 (será salvo como arquivo).

        Returns:
            tuple: JSON com mensagem de sucesso, status true, dados da entrega e localização (se aplicável) (status 200).
            tuple: JSON com error e status false (status 400) para dados inválidos.
            tuple: JSON com error e status false (status 401) para acesso não autorizado.
            tuple: JSON com error e status false (status 404) se entrega não encontrada.
            tuple: JSON com message e status false (status 500) para erros internos.
        """
        try:
            dados = EntregaStatusResource.args.parse_args()
            novo_status = dados['status']
            entrega = Entrega.query.get(entrega_id)
            if not entrega:
                logger.warning(f"Entrega não encontrada para atualização de status: {entrega_id}")
                return {"error": gettext("Entrega com ID {} não encontrada.").format(entrega_id), "status": False}, 404
            current_user_id = get_jwt_identity()
            if str(entrega.motorista_id) != current_user_id:
                logger.warning(f"Acesso não autorizado para entrega {entrega_id} por usuário {current_user_id}")
                return {"error": gettext("Acesso não autorizado: você não é o motorista desta entrega."), "status": False}, 401
            foto_prova = dados.get('foto_prova')
            if foto_prova:
                foto_prova = processar_foto_prova(foto_prova, entrega_id)
            localizacao = None
            if novo_status == StatusEntrega.PENDENTE:
                pass
            elif novo_status == StatusEntrega.EM_ROTA:
                pass
            elif novo_status == StatusEntrega.ENTREGUE:
                if not dados.get('nome_recebido') or not foto_prova:
                    raise ValueError(gettext("Nome recebido e foto de prova são obrigatórios para status 'entregue'."))
                entrega.nome_recebido = dados['nome_recebido']
                entrega.foto_prova = foto_prova
                
            elif novo_status == StatusEntrega.CANCELADA:
                pass
            
            elif novo_status == StatusEntrega.NAO_ENTREGUE:
                if not dados.get('motivo'):
                    raise ValueError(gettext("Motivo é obrigatório para status '{}'.").format(novo_status.value))
                entrega.motivo = dados['motivo']
                
                if foto_prova is None:
                    entrega.foto_prova = ""
                else:
                    entrega.foto_prova = foto_prova
                
            entrega.status = novo_status
            db.session.commit()
            logger.info(f"Status da entrega atualizado: {entrega_id} para {novo_status.value}")
            response = {
                "message": gettext("Status da entrega atualizado com sucesso."),
                "status": True,
                "Entrega": entrega.json()
            }
            if localizacao:
                response["Localizacao"] = localizacao.json()
            return response, 200
        except ValueError as e:
            db.session.rollback()
            logger.error(f"Erro de validação ao atualizar status da entrega {entrega_id}: {str(e)}")
            return {"error": gettext("Dados inválidos: {}").format(str(e)), "status": False}, 400
        except (DataError, IntegrityError) as e:
            db.session.rollback()
            logger.error(f"Erro de banco ao atualizar status da entrega {entrega_id}: {str(e)}")
            return {"error": gettext("Erro de dados ou integridade: {}").format(str(e)), "status": False}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro interno ao atualizar status da entrega {entrega_id}: {str(e)}")
            return {"message": gettext("Erro interno no servidor: {}").format(str(e)), "status": False}, 500

class LocalizacaoResource(Resource):
    args = reqparse.RequestParser()
    args.add_argument('entrega_id', type=str, required=False, help='ID da entrega')
    args.add_argument('motorista_id', type=str, required=False, help='ID do motorista')
    args.add_argument('latitude', type=validar_range(-90, 90), required=True, help='Latitude inválida')
    args.add_argument('longitude', type=validar_range(-180, 180), required=True, help='Longitude inválida')
    args.add_argument('data_hora', type=str, required=False, help='Data e hora no formato ISO')

    @jwt_required()
    def get(self, loc_id=None):
        """
        Lista todas as localizações ou recupera uma específica.

        Args:
            loc_id (str, optional): ID da localização.

        Returns:
            tuple: JSON com lista ou dados da localização, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se não encontrada.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            if loc_id:
                localizacao = Localizacao.query.get(loc_id)
                if not localizacao:
                    logger.warning(f"Localização não encontrada: {loc_id}")
                    return {"error": f"Localização com ID {loc_id} não encontrada.", "status": False}, 404
                logger.info(f"Localização encontrada: {loc_id}")
                return {
                    "Localizacao": localizacao.json(),
                    "message": gettext("Localização encontrada com sucesso."),
                    "status": True
                }, 200
            else:
                localizacoes = Localizacao.query.all()
                logger.info("Lista de localizações retornada")
                return {
                    "Localizacoes": [loc.json() for loc in localizacoes],
                    "message": gettext("Localizações listadas com sucesso."),
                    "status": True
                }, 200
        except Exception as e:
            logger.error(f"Erro ao buscar localização(ões): {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

    @jwt_required()
    def post(self):
        """
        Cria uma nova localização.

        Args:
            JSON Body:
                entrega_id (str, optional): ID da entrega.
                motorista_id (str, optional): ID do motorista.
                latitude (float): Latitude.
                longitude (float): Longitude.
                data_hora (str, optional): Data e hora em formato ISO.

        Returns:
            tuple: JSON com dados da localização criada, mensagem de sucesso e 'status' verdadeiro (status 201).
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos ou IDs não encontrados.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            dados = LocalizacaoResource.args.parse_args()
            if dados['entrega_id'] and not Entrega.query.get(dados['entrega_id']):
                logger.warning(f"Entrega não encontrada para localização: {dados['entrega_id']}")
                raise ValueError("Entrega não encontrada com o ID fornecido.")
            if dados['motorista_id'] and not Usuario.query.get(dados['motorista_id']):
                logger.warning(f"Motorista não encontrado para localização: {dados['motorista_id']}")
                raise ValueError("Motorista não encontrado com o ID fornecido.")
            if dados['data_hora']:
                try:
                    dados['data_hora'] = datetime.fromisoformat(dados['data_hora'])
                except ValueError:
                    raise ValueError("Data e hora devem estar no formato ISO válido.")
            localizacao = Localizacao(**dados)
            db.session.add(localizacao)
            db.session.commit()
            logger.info(f"Nova localização criada: {localizacao.id}")
            return {
                "Localizacao": localizacao.json(),
                "message": gettext("Localização criada com sucesso."),
                "status": True
            }, 201
        except ValueError as e:
            db.session.rollback()
            logger.error(f"Erro de validação ao criar localização: {str(e)}")
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except (DataError, IntegrityError) as e:
            db.session.rollback()
            logger.error(f"Erro de banco ao criar localização: {str(e)}")
            return {"error": f"Erro de dados ou integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro interno ao criar localização: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

    @jwt_required()
    def put(self, loc_id):
        """
        Atualiza uma localização existente.

        Args:
            loc_id (str): ID da localização.
            JSON Body: Campos a atualizar (entrega_id, motorista_id, latitude, longitude, data_hora).

        Returns:
            tuple: JSON com dados atualizados, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se não encontrada.
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos ou IDs não encontrados.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            localizacao = Localizacao.query.get(loc_id)
            if not localizacao:
                logger.warning(f"Localização não encontrada para atualização: {loc_id}")
                return {"error": f"Localização com ID {loc_id} não encontrada.", "status": False}, 404
            dados = LocalizacaoResource.args.parse_args()
            atualizacoes = 0
            for campo, valor in dados.items():
                if valor is not None:
                    if campo == 'entrega_id' and not Entrega.query.get(valor):
                        logger.warning(f"Entrega não encontrada para atualização de localização: {valor}")
                        raise ValueError("Entrega não encontrada com o ID fornecido.")
                    if campo == 'motorista_id' and not Usuario.query.get(valor):
                        logger.warning(f"Motorista não encontrado para atualização de localização: {valor}")
                        raise ValueError("Motorista não encontrado com o ID fornecido.")
                    if campo == 'data_hora':
                        try:
                            valor = datetime.fromisoformat(valor)
                        except ValueError:
                            raise ValueError("Data e hora devem estar no formato ISO válido.")
                    setattr(localizacao, campo, valor)
                    atualizacoes += 1
            if atualizacoes == 0:
                return {"error": "Nenhum campo fornecido para atualização.", "status": False}, 400
            db.session.commit()
            logger.info(f"Localização atualizada: {loc_id}")
            return {
                "Localizacao": localizacao.json(),
                "message": gettext("Localização atualizada com sucesso."),
                "status": True
            }, 200
        except ValueError as e:
            db.session.rollback()
            logger.error(f"Erro de validação ao atualizar localização: {str(e)}")
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except (DataError, IntegrityError) as e:
            db.session.rollback()
            logger.error(f"Erro de banco ao atualizar localização: {str(e)}")
            return {"error": f"Erro de dados ou integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro interno ao atualizar localização: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

    @jwt_required()
    def delete(self, loc_id):
        """
        Deleta uma localização existente.

        Args:
            loc_id (str): ID da localização a ser deletada.

        Returns:
            tuple: JSON com mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se não encontrada.
            tuple: JSON com 'error' e 'status' falso (status 400) se houver dependências.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            localizacao = Localizacao.query.get(loc_id)
            if not localizacao:
                logger.warning(f"Localização não encontrada para deleção: {loc_id}")
                return {"error": f"Localização com ID {loc_id} não encontrada.", "status": False}, 404
            db.session.delete(localizacao)
            db.session.commit()
            logger.info(f"Localização deletada: {loc_id}")
            return {"message": gettext("Localização deletada com sucesso."), "status": True}, 200
        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"Erro de integridade ao deletar localização: {str(e)}")
            return {"error": f"Não é possível deletar devido a dependências: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro interno ao deletar localização: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class LocalizacaoIoTResource(Resource):
    args = reqparse.RequestParser()
    args.add_argument('motorista_id', type=str, required=True, help='ID do motorista')
    args.add_argument('latitude', type=validar_range(-90, 90), required=True, help='Latitude é obrigatória')
    args.add_argument('longitude', type=validar_range(-180, 180), required=True, help='Longitude é obrigatória')

    def post(self):
        """
        Cria uma nova localização a partir de dados enviados por um dispositivo IoT (sem autenticação).

        Args:
            JSON Body:
                motorista_id (str): ID do motorista.
                latitude (float): Latitude da localização.
                longitude (float): Longitude da localização.

        Returns:
            tuple: JSON com dados da localização criada, mensagem de sucesso e 'status' verdadeiro (status 201).
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos ou integridade violada.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            dados = LocalizacaoIoTResource.args.parse_args()
            if not Usuario.query.get(dados['motorista_id']):
                logger.warning(f"Motorista não encontrado para localização IoT: {dados['motorista_id']}")
                raise ValueError("Motorista não encontrado com o ID fornecido.")

            """
            pega a ultima entrega acionada como iniciada deste motorista 
            para já atualizar a referencia
            """
            entrega = (
                Entrega.query
                .filter(
                    Entrega.motorista_id == dados['motorista_id'],
                    or_(
                        Entrega.status == StatusEntrega.EM_ROTA,
                        Entrega.status == StatusEntrega.NAO_ENTREGUE,
                        Entrega.status == StatusEntrega.ENTREGUE
                    )
                )
                .order_by(Entrega.atualizado_em.desc())  
                .first()
            )
            
            if not entrega:
                localizacao = Localizacao(
                    motorista_id=dados['motorista_id'],
                    latitude=dados['latitude'],
                    longitude=dados['longitude'],
                    data_hora=db.func.current_timestamp()
                )     
            else:
                localizacao = Localizacao(
                    entrega_id=entrega.id,
                    motorista_id=dados['motorista_id'],
                    latitude=dados['latitude'],
                    longitude=dados['longitude'],
                    data_hora=db.func.current_timestamp()
                )
            
            db.session.add(localizacao)
            db.session.commit()
            logger.info(f"Localização IoT recebida: {localizacao.id}")
            return {
                "Localizacao": localizacao.json(),
                "message": gettext("Localização recebida com sucesso."),
                "status": True
            }, 201
        except ValueError as e:
            db.session.rollback()
            logger.error(f"Erro de validação ao receber localização IoT: {str(e)}")
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except (DataError, IntegrityError) as e:
            db.session.rollback()
            logger.error(f"Erro de banco ao receber localização IoT: {str(e)}")
            return {"error": f"Erro de dados ou integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro interno ao receber localização IoT: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class LocalizacaoEntregaResource(Resource):
    @jwt_required()
    def get(self, entrega_id):
        """
        Lista localizações por entrega.

        Args:
            entrega_id (str): ID da entrega.

        Returns:
            tuple: JSON com lista de localizações, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se nenhuma encontrada ou entrega não existir.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            if not Entrega.query.get(entrega_id):
                logger.warning(f"Entrega não encontrada para localizações: {entrega_id}")
                return {"error": f"Entrega com ID {entrega_id} não encontrada.", "status": False}, 404
            localizacoes = Localizacao.query.filter_by(entrega_id=entrega_id).all()
            if not localizacoes:
                logger.warning(f"Nenhuma localização encontrada para entrega: {entrega_id}")
                return {"error": "Nenhuma localização encontrada para esta entrega.", "status": False}, 404
            logger.info(f"Localizações encontradas para entrega: {entrega_id}")
            return {
                "Localizacoes": [loc.json() for loc in localizacoes],
                "message": gettext("Localizações encontradas com sucesso."),
                "status": True
            }, 200
        except Exception as e:
            logger.error(f"Erro ao buscar localizações por entrega: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class LocalizacaoMotoristaResource(Resource):
    @jwt_required()
    def get(self, motorista_id):
        """
        Lista localizações por motorista.

        Args:
            motorista_id (str): ID do motorista.

        Returns:
            tuple: JSON com lista de localizações, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se nenhuma encontrada ou motorista não existir.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.
        """
        try:
            if not Usuario.query.get(motorista_id):
                logger.warning(f"Motorista não encontrado para localizações: {motorista_id}")
                return {"error": f"Motorista com ID {motorista_id} não encontrado.", "status": False}, 404
            localizacoes = Localizacao.query.filter_by(motorista_id=motorista_id).all()
            if not localizacoes:
                logger.warning(f"Nenhuma localização encontrada para motorista: {motorista_id}")
                return {"error": "Nenhuma localização encontrada para este motorista.", "status": False}, 404
            logger.info(f"Localizações encontradas para motorista: {motorista_id}")
            return {
                "Localizacoes": [loc.json() for loc in localizacoes],
                "message": gettext("Localizações encontradas com sucesso."),
                "status": True
            }, 200
        except Exception as e:
            logger.error(f"Erro ao buscar localizações por motorista: {str(e)}")
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500