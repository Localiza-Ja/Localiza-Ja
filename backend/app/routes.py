"""
Módulo: routes.py
Descrição: Define os endpoints da API para gerenciamento de Usuários, Entregas, Localizações, autenticação e verificação de conectividade.
Autor: Rafael dos Santos Giorgi
Data: 05/10/2025

NOTE: Este módulo inclui endpoints para autenticação (login/logout) e gerenciamento de sessões, além de recursos para usuários, entregas e localizações.
TODO: Adicionar suporte a paginação em listas longas para melhor performance.
TODO: Implementar logging de erros para monitoramento em produção.
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

def gerar_numero_pedido():
    """
    Gera um código de rastreamento aleatório com 6 caracteres (letras e números, maiúsculas).

    Returns:
        str: Código de rastreamento gerado único.

    Raises:
        RuntimeError: Se não for possível gerar um número único após várias tentativas.

    NOTE: Garante unicidade verificando no banco de dados.
    TODO: Limitar o número de tentativas para evitar loops infinitos em cenários de alta concorrência.
    """
    tentativas = 0
    max_tentativas = 100
    while tentativas < max_tentativas:
        numero = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        if not Entrega.query.filter_by(numero_pedido=numero).first():
            return numero
        tentativas += 1
    raise RuntimeError("Não foi possível gerar um número de pedido único após várias tentativas.")

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

class Ping(Resource):
    def get(self):
        """
        Verifica a conectividade da API.

        Returns:
            tuple: JSON com mensagem de sucesso, 'pong' verdadeiro e 'status' verdadeiro (status 200).
        """
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

        Raises:
            ValueError: Se os dados de entrada forem inválidos.
            DataError: Se ocorrer erro de dados no banco.
            Exception: Para erros internos gerais.

        NOTE: Este endpoint não exige autenticação prévia.
        TODO: Implementar limite de tentativas de login para prevenir ataques de força bruta.
        TODO: Adicionar suporte a autenticação multi-fator em futuras versões.
        """
        try:
            dados = LoginResource.args.parse_args()
            usuario = Usuario.query.filter_by(cnh=dados['cnh'], placa_veiculo=dados['placa_veiculo']).first()
            if not usuario:
                return {"error": gettext("Credenciais inválidas. Verifique CNH e placa."), "status": False}, 401
            access_token = create_access_token(identity=str(usuario.id))
            return {
                "access_token": access_token,
                "message": gettext("Login realizado com sucesso."),
                "status": True
            }, 200
        except ValueError as e:
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except DataError as e:
            return {"error": f"Erro de dados: {str(e)}", "status": False}, 400
        except Exception as e:
            # NOTE: Em produção, logar o stack trace para depuração sem expor ao usuário.
            return {"message": f"Erro interno no servidor. Contate o suporte: {str(e)}", "status": False}, 500

class LogoutResource(Resource):
    @jwt_required()
    def post(self):
        """
        Realiza logout do usuário, adicionando o token JWT à blacklist.

        Returns:
            tuple: JSON com mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 400) se o token for inválido.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.

        Raises:
            KeyError: Se 'jti' não estiver no JWT.
            Exception: Para erros internos.

        NOTE: Requer autenticação via JWT.
        """
        try:
            jwt_data = get_jwt()
            if 'jti' not in jwt_data:
                return {"error": "Token JWT inválido: 'jti' não encontrado.", "status": False}, 400
            add_to_blacklist(jwt_data['jti'])
            return {"message": gettext("Logout realizado com sucesso."), "status": True}, 200
        except KeyError as e:
            return {"error": f"Erro no token: {str(e)}", "status": False}, 400
        except Exception as e:
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class SessionResource(Resource):
    @jwt_required()
    def get(self):
        """
        Valida o token JWT atual, retorna os dados do usuário logado e renova o token estendendo seu tempo de expiração.

        Returns:
            tuple: JSON com dados do usuário, novo token de acesso, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se o usuário não for encontrado.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.

        Raises:
            Exception: Erros gerais (tratados pelo errorhandler global).

        NOTE: O token é validado automaticamente pelo @jwt_required(), incluindo verificação de blacklist e expiração.
              Um novo token é gerado para renovar a sessão, mantendo o identity do usuário.
        """
        try:
            user_id = get_jwt_identity()
            user = Usuario.query.get(user_id)
            if not user:
                return {"error": gettext("Usuário não encontrado."), "status": False}, 404

            new_token = create_access_token(identity=user_id)

            return {
                "Usuario": user.json(),
                "access_token": new_token,
                "message": gettext("Sessão válida e renovada com sucesso."),
                "status": True
            }, 200
        except Exception as e:
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class UsuarioResource(Resource):
    args = reqparse.RequestParser()
    args.add_argument('nome', type=validar_max_length(255), required=True, help='Nome é obrigatório e deve ter no máximo 255 caracteres')
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
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos ou integridade violada (ex.: duplicidade).
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.

        Raises:
            ValueError: Se dados forem inválidos.
            DataError: Erro de dados no banco.
            IntegrityError: Violação de integridade (ex.: chave única).
            Exception: Erros gerais.

        NOTE: Não requer autenticação para criação de usuário (cadastro inicial).
        """
        try:
            dados = UsuarioResource.args.parse_args()
            usuario = Usuario(**dados)
            db.session.add(usuario)
            db.session.commit()
            return {
                "Usuario": usuario.json(),
                "message": gettext("Usuário criado com sucesso."),
                "status": True
            }, 201
        except ValueError as e:
            db.session.rollback()
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except DataError as e:
            db.session.rollback()
            return {"error": f"Erro de dados: {str(e)}", "status": False}, 400
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Violação de integridade: Já existe um usuário com essa CNH ou placa. Detalhes: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
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

        Raises:
            Exception: Para erros internos.

        NOTE: Requer autenticação via JWT. Para listagem, considerar permissões de admin em futuras versões.
        """
        try:
            if user_id:
                usuario = Usuario.query.get(user_id)
                if not usuario:
                    return {"error": f"Usuário com ID {user_id} não encontrado.", "status": False}, 404
                return {
                    "Usuario": usuario.json(),
                    "message": gettext("Usuário encontrado com sucesso."),
                    "status": True
                }, 200
            else:
                usuarios = Usuario.query.all()
                if not usuarios:
                    return {"message": "Nenhum usuário encontrado.", "status": True, "Usuarios": []}, 200
                return {
                    "Usuarios": [u.json() for u in usuarios],
                    "message": gettext("Usuários listados com sucesso."),
                    "status": True
                }, 200
        except Exception as e:
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

        Raises:
            ValueError: Se dados forem inválidos.
            IntegrityError: Violação de integridade.
            Exception: Erros gerais.

        NOTE: Requer autenticação via JWT. Atualiza apenas campos fornecidos.
        TODO: Verificar se o usuário logado tem permissão para atualizar o ID especificado (ex.: próprio ou admin).
        """
        try:
            usuario = Usuario.query.get(user_id)
            if not usuario:
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
            return {
                "Usuario": usuario.json(),
                "message": gettext("Usuário atualizado com sucesso."),
                "status": True
            }, 200
        except ValueError as e:
            db.session.rollback()
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Violação de integridade durante atualização: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
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
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.

        Raises:
            Exception: Para erros internos.

        NOTE: Requer autenticação via JWT. Cascade deleta entregas e localizações associadas.
        TODO: Adicionar confirmação ou soft-delete para evitar perda de dados acidental.
        """
        try:
            usuario = Usuario.query.get(user_id)
            if not usuario:
                return {"error": f"Usuário com ID {user_id} não encontrado.", "status": False}, 404
            db.session.delete(usuario)
            db.session.commit()
            return {"message": gettext("Usuário deletado com sucesso."), "status": True}, 200
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Não é possível deletar devido a dependências: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class EntregaResource(Resource):
    args = reqparse.RequestParser()
    args.add_argument('motorista_id', type=str, required=True, help='ID do motorista é obrigatório')
    args.add_argument('endereco_entrega', type=validar_endereco, required=True, help='Endereço inválido')
    args.add_argument('nome_cliente', type=validar_max_length(255), required=True, help='Nome do cliente é obrigatório')
    args.add_argument('observacao', type=validar_max_length(255), required=False, help='Observação inválida')
    args.add_argument('foto_prova', type=validar_max_length(255), required=False, help='Foto de prova inválida')
    args.add_argument('motivo', type=validar_max_length(255), required=False, help='Motivo inválido')

    @jwt_required()
    def post(self):
        """
        Cria uma nova entrega.

        Args:
            JSON Body:
                motorista_id (str): ID do motorista.
                endereco_entrega (str): Endereço de entrega.
                nome_cliente (str): Nome do cliente.
                observacao (str, optional): Observações.
                foto_prova (str, optional): Caminho da foto de prova.
                motivo (str, optional): Motivo para status não entregue ou cancelado.

        Returns:
            tuple: JSON com dados da entrega criada, mensagem de sucesso e 'status' verdadeiro (status 201).
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos, motorista não encontrado ou integridade violada.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.

        Raises:
            ValueError: Se dados forem inválidos ou motorista não existir.
            IntegrityError: Violação de integridade.
            RuntimeError: Se falhar na geração do número de pedido.
            Exception: Erros gerais.

        NOTE: Gera número de pedido único automaticamente.
        """
        try:
            dados = EntregaResource.args.parse_args()
            if not Usuario.query.get(dados['motorista_id']):
                raise ValueError("Motorista não encontrado com o ID fornecido.")
            dados['numero_pedido'] = gerar_numero_pedido()
            entrega = Entrega(**dados)
            db.session.add(entrega)
            db.session.commit()
            return {
                "Entrega": entrega.json(),
                "message": gettext("Entrega criada com sucesso."),
                "status": True
            }, 201
        except ValueError as e:
            db.session.rollback()
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Violação de integridade: {str(e)}", "status": False}, 400
        except RuntimeError as e:
            db.session.rollback()
            return {"error": f"Erro na geração do número de pedido: {str(e)}", "status": False}, 500
        except Exception as e:
            db.session.rollback()
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

        Raises:
            Exception: Para erros internos.

        NOTE: Para listagem, retorna vazio se não houver entregas.
        """
        try:
            if entrega_id:
                entrega = Entrega.query.get(entrega_id)
                if not entrega:
                    return {"error": f"Entrega com ID {entrega_id} não encontrada.", "status": False}, 404
                return {
                    "Entrega": entrega.json(),
                    "message": gettext("Entrega encontrada com sucesso."),
                    "status": True
                }, 200
            else:
                entregas = Entrega.query.all()
                if not entregas:
                    return {"message": "Nenhuma entrega encontrada.", "status": True, "Entregas": []}, 200
                return {
                    "Entregas": [e.json() for e in entregas],
                    "message": gettext("Entregas listadas com sucesso."),
                    "status": True
                }, 200
        except Exception as e:
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

    @jwt_required()
    def put(self, entrega_id):
        """
        Atualiza uma entrega existente.

        Args:
            entrega_id (str): ID da entrega.
            JSON Body: Campos a atualizar (motorista_id, endereco_entrega, nome_cliente, observacao, foto_prova, motivo).

        Returns:
            tuple: JSON com dados atualizados, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se não encontrada.
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos, sem atualizações ou integridade violada.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.

        Raises:
            ValueError: Se dados forem inválidos ou motorista não existir.
            IntegrityError: Violação de integridade.
            Exception: Erros gerais.
        """
        try:
            entrega = Entrega.query.get(entrega_id)
            if not entrega:
                return {"error": f"Entrega com ID {entrega_id} não encontrada.", "status": False}, 404
            dados = EntregaResource.args.parse_args()
            atualizacoes = 0
            for campo, valor in dados.items():
                if valor is not None:
                    if campo == 'motorista_id' and not Usuario.query.get(valor):
                        raise ValueError("Motorista não encontrado com o ID fornecido para atualização.")
                    setattr(entrega, campo, valor)
                    atualizacoes += 1
            if atualizacoes == 0:
                return {"error": "Nenhum campo fornecido para atualização.", "status": False}, 400
            db.session.commit()
            return {
                "Entrega": entrega.json(),
                "message": gettext("Entrega atualizada com sucesso."),
                "status": True
            }, 200
        except ValueError as e:
            db.session.rollback()
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Violação de integridade durante atualização: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
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
            tuple: JSON com 'error' e 'status' falso (status 400) se houver dependências que impeçam a deleção.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.

        Raises:
            IntegrityError: Se houver violações de integridade.
            Exception: Erros gerais.

        NOTE: Cascade deleta localizações associadas.
        """
        try:
            entrega = Entrega.query.get(entrega_id)
            if not entrega:
                return {"error": f"Entrega com ID {entrega_id} não encontrada.", "status": False}, 404
            db.session.delete(entrega)
            db.session.commit()
            return {"message": gettext("Entrega deletada com sucesso."), "status": True}, 200
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Não é possível deletar devido a dependências: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class EntregaPorNumeroResource(Resource):
    @jwt_required()
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

        Raises:
            ValueError: Se o número do pedido não seguir o formato esperado.
            Exception: Erros gerais.

        NOTE: Valida o formato do número do pedido antes da consulta.
        """
        try:
            if not re.match(r'^[A-Z0-9]{6}$', numero_pedido):
                raise ValueError("Número do pedido deve ter exatamente 6 caracteres alfanuméricos maiúsculos.")
            entrega = Entrega.query.filter_by(numero_pedido=numero_pedido).first()
            if not entrega:
                return {"error": f"Entrega com número {numero_pedido} não encontrada.", "status": False}, 404
            return {
                "Entrega": entrega.json(),
                "message": gettext("Entrega encontrada com sucesso."),
                "status": True
            }, 200
        except ValueError as e:
            return {"error": f"Formato inválido: {str(e)}", "status": False}, 400
        except Exception as e:
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

        Raises:
            Exception: Erros gerais.

        NOTE: Verifica se o motorista existe antes de listar.
        """
        try:
            if not Usuario.query.get(motorista_id):
                return {"error": f"Motorista com ID {motorista_id} não encontrado.", "status": False}, 404
            entregas = Entrega.query.filter_by(motorista_id=motorista_id).all()
            if not entregas:
                return {"error": f"Nenhuma entrega encontrada para o motorista {motorista_id}.", "status": False}, 404
            return {
                "Entregas": [e.json() for e in entregas],
                "message": gettext("Entregas encontradas com sucesso."),
                "status": True
            }, 200
        except Exception as e:
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class EntregaStatusResource(Resource):
    args = reqparse.RequestParser()
    args.add_argument('status', type=str, required=True, help='Status é obrigatório')
    args.add_argument('nome_recebido', type=validar_max_length(255), required=False, help='Nome recebido inválido')
    args.add_argument('motivo', type=validar_max_length(255), required=False, help='Motivo inválido')

    @jwt_required()
    def put(self, entrega_id):
        """
        Atualiza o status de uma entrega.

        Args:
            entrega_id (str): ID da entrega.
            JSON Body:
                status (str): Novo status da entrega (pendente, em_rota, entregue, cancelada, nao_entregue).
                nome_recebido (str, optional): Nome da pessoa que recebeu (obrigatório se status=entregue).
                motivo (str, optional): Motivo (obrigatório se status=cancelada ou nao_entregue).

        Returns:
            tuple: JSON com dados atualizados, mensagem de sucesso e 'status' verdadeiro (status 200).
            tuple: JSON com 'error' e 'status' falso (status 404) se entrega não encontrada.
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos, status inválido ou campos obrigatórios faltando.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.

        Raises:
            ValueError: Se status for inválido ou campos obrigatórios faltarem.
            Exception: Erros gerais.

        NOTE: Valida campos condicionais com base no status.
        """
        try:
            entrega = Entrega.query.get(entrega_id)
            if not entrega:
                return {"error": f"Entrega com ID {entrega_id} não encontrada.", "status": False}, 404
            dados = EntregaStatusResource.args.parse_args()
            try:
                novo_status = StatusEntrega(dados['status'].lower())
            except ValueError:
                return {"error": f"Status inválido: {dados['status']}. Valores permitidos: pendente, em_rota, entregue, cancelada, nao_entregue.", "status": False}, 400

            if novo_status == StatusEntrega.ENTREGUE and not dados.get('nome_recebido'):
                raise ValueError("Nome recebido é obrigatório para status 'entregue'.")
            if novo_status in [StatusEntrega.CANCELADA, StatusEntrega.NAO_ENTREGUE] and not dados.get('motivo'):
                raise ValueError("Motivo é obrigatório para status 'cancelada' ou 'nao_entregue'.")

            entrega.status = novo_status
            if dados['nome_recebido'] is not None:
                entrega.nome_recebido = dados['nome_recebido']
            if dados['motivo'] is not None:
                entrega.motivo = dados['motivo']
            db.session.commit()
            return {
                "Entrega": entrega.json(),
                "message": gettext("Status da entrega atualizado com sucesso."),
                "status": True
            }, 200
        except ValueError as e:
            db.session.rollback()
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except DataError as e:
            db.session.rollback()
            return {"error": f"Erro de dados: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

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

        Raises:
            Exception: Para erros internos.

        NOTE: Para listagem, retorna vazio se não houver localizações.
        """
        try:
            if loc_id:
                localizacao = Localizacao.query.get(loc_id)
                if not localizacao:
                    return {"error": f"Localização com ID {loc_id} não encontrada.", "status": False}, 404
                return {
                    "Localizacao": localizacao.json(),
                    "message": gettext("Localização encontrada com sucesso."),
                    "status": True
                }, 200
            else:
                localizacoes = Localizacao.query.all()
                if not localizacoes:
                    return {"message": "Nenhuma localização encontrada.", "status": True, "Localizacoes": []}, 200
                return {
                    "Localizacoes": [loc.json() for loc in localizacoes],
                    "message": gettext("Localizações listadas com sucesso."),
                    "status": True
                }, 200
        except Exception as e:
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

    @jwt_required()
    def post(self):
        """
        Cria uma nova localização.

        Args:
            JSON Body:
                entrega_id (str, optional): ID da entrega (valida existência se fornecido).
                motorista_id (str, optional): ID do motorista (valida existência se fornecido).
                latitude (float): Latitude.
                longitude (float): Longitude.
                data_hora (str, optional): Data e hora em formato ISO.

        Returns:
            tuple: JSON com dados da localização criada, mensagem de sucesso e 'status' verdadeiro (status 201).
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos, IDs não encontrados ou integridade violada.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.

        Raises:
            ValueError: Se dados forem inválidos ou IDs não existirem.
            IntegrityError: Violação de integridade.
            Exception: Erros gerais.
        """
        try:
            dados = LocalizacaoResource.args.parse_args()
            if dados['entrega_id'] and not Entrega.query.get(dados['entrega_id']):
                raise ValueError("Entrega não encontrada com o ID fornecido.")
            if dados['motorista_id'] and not Usuario.query.get(dados['motorista_id']):
                raise ValueError("Motorista não encontrado com o ID fornecido.")
            if dados['data_hora']:
                try:
                    dados['data_hora'] = datetime.fromisoformat(dados['data_hora'])
                except ValueError:
                    raise ValueError("Data e hora devem estar no formato ISO válido.")
            localizacao = Localizacao(**dados)
            db.session.add(localizacao)
            db.session.commit()
            return {
                "Localizacao": localizacao.json(),
                "message": gettext("Localização criada com sucesso."),
                "status": True
            }, 201
        except ValueError as e:
            db.session.rollback()
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except DataError as e:
            db.session.rollback()
            return {"error": f"Erro de dados: {str(e)}", "status": False}, 400
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Violação de integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
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
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos, sem atualizações ou IDs não encontrados.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.

        Raises:
            ValueError: Se dados forem inválidos ou IDs não existirem.
            Exception: Erros gerais.
        """
        try:
            localizacao = Localizacao.query.get(loc_id)
            if not localizacao:
                return {"error": f"Localização com ID {loc_id} não encontrada.", "status": False}, 404
            dados = LocalizacaoResource.args.parse_args()
            atualizacoes = 0
            for campo, valor in dados.items():
                if valor is not None:
                    if campo == 'entrega_id' and not Entrega.query.get(valor):
                        raise ValueError("Entrega não encontrada com o ID fornecido para atualização.")
                    if campo == 'motorista_id' and not Usuario.query.get(valor):
                        raise ValueError("Motorista não encontrado com o ID fornecido para atualização.")
                    if campo == 'data_hora':
                        try:
                            setattr(localizacao, campo, datetime.fromisoformat(valor))
                        except ValueError:
                            raise ValueError("Data e hora devem estar no formato ISO válido.")
                    else:
                        setattr(localizacao, campo, valor)
                    atualizacoes += 1
            if atualizacoes == 0:
                return {"error": "Nenhum campo fornecido para atualização.", "status": False}, 400
            db.session.commit()
            return {
                "Localizacao": localizacao.json(),
                "message": gettext("Localização atualizada com sucesso."),
                "status": True
            }, 200
        except ValueError as e:
            db.session.rollback()
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except DataError as e:
            db.session.rollback()
            return {"error": f"Erro de dados: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
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

        Raises:
            IntegrityError: Se houver violações de integridade.
            Exception: Erros gerais.
        """
        try:
            localizacao = Localizacao.query.get(loc_id)
            if not localizacao:
                return {"error": f"Localização com ID {loc_id} não encontrada.", "status": False}, 404
            db.session.delete(localizacao)
            db.session.commit()
            return {"message": gettext("Localização deletada com sucesso."), "status": True}, 200
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Não é possível deletar devido a dependências: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500

class LocalizacaoIoTResource(Resource):
    args = reqparse.RequestParser()
    args.add_argument('latitude', type=validar_range(-90, 90), required=True, help='Latitude é obrigatória')
    args.add_argument('longitude', type=validar_range(-180, 180), required=True, help='Longitude é obrigatória')

    def post(self):
        """
        Cria uma nova localização a partir de dados enviados por um dispositivo IoT (sem autenticação).

        Args:
            JSON Body:
                latitude (float): Latitude da localização.
                longitude (float): Longitude da localização.

        Returns:
            tuple: JSON com dados da localização criada, mensagem de sucesso e 'status' verdadeiro (status 201).
            tuple: JSON com 'error' e 'status' falso (status 400) se dados inválidos ou integridade violada.
            tuple: JSON com 'message' e 'status' falso (status 500) em caso de erro interno.

        Raises:
            ValueError: Se dados forem inválidos.
            IntegrityError: Violação de integridade.
            Exception: Erros gerais.

        NOTE: Endpoint público para dispositivos IoT. Considerar autenticação básica em produção.
        TODO: Adicionar validação de origem do request para segurança.
        """
        try:
            dados = LocalizacaoIoTResource.args.parse_args()
            localizacao = Localizacao(latitude=dados['latitude'], longitude=dados['longitude'])
            db.session.add(localizacao)
            db.session.commit()
            return {
                "Localizacao": localizacao.json(),
                "message": gettext("Localização recebida com sucesso."),
                "status": True
            }, 201
        except ValueError as e:
            db.session.rollback()
            return {"error": f"Dados inválidos: {str(e)}", "status": False}, 400
        except DataError as e:
            db.session.rollback()
            return {"error": f"Erro de dados: {str(e)}", "status": False}, 400
        except IntegrityError as e:
            db.session.rollback()
            return {"error": f"Violação de integridade: {str(e)}", "status": False}, 400
        except Exception as e:
            db.session.rollback()
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

        Raises:
            Exception: Erros gerais.

        NOTE: Verifica existência da entrega antes de listar.
        """
        try:
            if not Entrega.query.get(entrega_id):
                return {"error": f"Entrega com ID {entrega_id} não encontrada.", "status": False}, 404
            localizacoes = Localizacao.query.filter_by(entrega_id=entrega_id).all()
            if not localizacoes:
                return {"error": "Nenhuma localização encontrada para esta entrega.", "status": False}, 404
            return {
                "Localizacoes": [loc.json() for loc in localizacoes],
                "message": gettext("Localizações encontradas com sucesso."),
                "status": True
            }, 200
        except Exception as e:
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

        Raises:
            Exception: Erros gerais.

        NOTE: Verifica existência do motorista antes de listar.
        """
        try:
            if not Usuario.query.get(motorista_id):
                return {"error": f"Motorista com ID {motorista_id} não encontrado.", "status": False}, 404
            localizacoes = Localizacao.query.filter_by(motorista_id=motorista_id).all()
            if not localizacoes:
                return {"error": "Nenhuma localização encontrada para este motorista.", "status": False}, 404
            return {
                "Localizacoes": [loc.json() for loc in localizacoes],
                "message": gettext("Localizações encontradas com sucesso."),
                "status": True
            }, 200
        except Exception as e:
            return {"message": f"Erro interno no servidor: {str(e)}", "status": False}, 500