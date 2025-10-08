"""
Módulo: test_api.py
Descrição: Testes de integração para os endpoints da API de gerenciamento de Usuários, Entregas, Localizações e autenticação.
Autor: Rafael dos Santos Giorgi
Data: 07/10/2025

NOTE: Este módulo usa pytest para testar os endpoints definidos em routes.py.
      Assume que a API está rodando em http://localhost:5000.
      Usa fixtures para gerenciar o estado do banco de dados e autenticação.
TODO: Adicionar testes para validações de erro específicas, como CNH inválida.
"""

import pytest
import requests
from datetime import datetime
import uuid

BASE_URL = "http://localhost:5000"

# --------------------------- FIXTURES ---------------------------

@pytest.fixture(scope="session")
def client():
    """
    Cria uma sessão de requests para reutilizar a conexão em todos os testes.

    Returns:
        Session: Sessão de requests.
    """
    with requests.Session() as session:
        yield session

@pytest.fixture
def user_data():
    """
    Retorna um dicionário com os dados de um usuário de teste.

    Returns:
        dict: Dados do usuário de teste.
    """
    return {
        "nome": "Motorista Teste",
        "placa_veiculo": "XYZ-9876",
        "cnh": "12345678901",
        "telefone": "11999999999"
    }

@pytest.fixture
def auth_headers(client, user_data):
    """
    Cria um usuário, realiza login e retorna os headers com token JWT.
    Também realiza logout ao final dos testes que usam esta fixture.

    Args:
        client (Session): Sessão de requests.
        user_data (dict): Dados do usuário.

    Yields:
        dict: Headers com token de autorização.

    Raises:
        AssertionError: Se a criação do usuário ou login falhar.
    """
    resp = client.post(f"{BASE_URL}/usuarios", json=user_data)
    assert resp.status_code == 201, f"Falha ao criar usuário de teste: {resp.json()}"

    login_data = {
        "cnh": user_data["cnh"],
        "placa_veiculo": user_data["placa_veiculo"]
    }
    resp = client.post(f"{BASE_URL}/usuarios/login", json=login_data)
    assert resp.status_code == 200, f"Falha no login: {resp.json()}"
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    yield headers

@pytest.fixture
def user_id(auth_headers, client):
    """
    Obtém o ID do usuário atualmente logado a partir do endpoint de sessão.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.

    Returns:
        str: ID do usuário.

    Raises:
        AssertionError: Se a obtenção da sessão falhar.
    """
    resp = client.get(f"{BASE_URL}/usuarios/session", headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao obter sessão: {resp.json()}"
    return resp.json()["Usuario"]["id"]

@pytest.fixture
def entrega_id(auth_headers, client, user_id):
    """
    Cria uma entrega de teste e retorna seu ID em uma lista mutável.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        user_id (str): ID do usuário.

    Returns:
        list: Lista com ID da entrega (mutável para atualizações).

    Raises:
        AssertionError: Se a criação da entrega falhar.
    """
    data = {
        "motorista_id": user_id,
        "endereco_entrega": "Rua Nova, 456",
        "nome_cliente": "Cliente Teste",
        "observacao": "Entregar no 2º andar"
    }
    resp = client.post(f"{BASE_URL}/entregas", json=data, headers=auth_headers)
    assert resp.status_code == 201, f"Falha ao criar entrega: {resp.json()}"
    return [resp.json()["Entrega"]["id"]]

@pytest.fixture
def loc_id(auth_headers, client, entrega_id, user_id):
    """
    Cria uma localização de teste associada a uma entrega e retorna seu ID.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        entrega_id (list): ID da entrega.
        user_id (str): ID do usuário.

    Returns:
        str: ID da localização.

    Raises:
        AssertionError: Se a criação da localização falhar.
    """
    data = {
        "entrega_id": entrega_id[0],
        "motorista_id": user_id,
        "latitude": -23.56,
        "longitude": -46.64
    }
    resp = client.post(f"{BASE_URL}/localizacoes", json=data, headers=auth_headers)
    assert resp.status_code == 201, f"Falha ao criar localização: {resp.json()}"
    return resp.json()["Localizacao"]["id"]

# --------------------------- TESTES GERAIS ---------------------------

@pytest.mark.order(1)
def test_ping(client):
    """
    Testa o endpoint de ping para verificar se a API está ativa.

    Args:
        client (Session): Sessão de requests.

    Raises:
        AssertionError: Se o ping falhar.
    """
    resp = client.get(f"{BASE_URL}/ping")
    assert resp.status_code == 200
    assert resp.json()["status"] is True

# --------------------------- TESTES DE AUTENTICAÇÃO ---------------------------

@pytest.mark.order(10)
def test_create_user(client, user_data):
    """
    Testa a criação de um novo usuário.

    Args:
        client (Session): Sessão de requests.
        user_data (dict): Dados do usuário.

    Raises:
        AssertionError: Se a criação do usuário falhar.
    """
    resp = client.post(f"{BASE_URL}/usuarios", json=user_data)
    assert resp.status_code == 201
    assert resp.json()["status"] is True

@pytest.mark.order(11)
def test_login(client, user_data):
    """
    Testa o login do usuário.

    Args:
        client (Session): Sessão de requests.
        user_data (dict): Dados do usuário.

    Raises:
        AssertionError: Se o login falhar.
    """
    login_data = {
        "cnh": user_data["cnh"],
        "placa_veiculo": user_data["placa_veiculo"]
    }
    resp = client.post(f"{BASE_URL}/usuarios/login", json=login_data)
    assert resp.status_code == 200
    assert "access_token" in resp.json()

@pytest.mark.order(12)
def test_session(auth_headers, client):
    """
    Testa a verificação de sessão ativa.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.

    Raises:
        AssertionError: Se a sessão não for válida.
    """
    resp = client.get(f"{BASE_URL}/usuarios/session", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] is True

@pytest.mark.order(13)
def test_logout(auth_headers, client):
    """
    Realiza logout do usuário de teste e verifica sucesso.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.

    Raises:
        AssertionError: Se o logout falhar.
    """
    resp = client.post(f"{BASE_URL}/usuarios/logout", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] is True

# --------------------------- TESTES DE USUÁRIOS ---------------------------

@pytest.mark.order(14)
def test_list_users(auth_headers, client):
    """
    Testa a listagem de todos os usuários.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.

    Raises:
        AssertionError: Se a listagem de usuários falhar.
    """
    resp = client.get(f"{BASE_URL}/usuarios", headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao listar usuários: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(15)
def test_get_user_by_id(auth_headers, client, user_id):
    """
    Testa a obtenção de um usuário por ID.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        user_id (str): ID do usuário.

    Raises:
        AssertionError: Se a obtenção do usuário falhar.
    """
    resp = client.get(f"{BASE_URL}/usuarios/{user_id}", headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao obter usuário: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(16)
def test_update_user(auth_headers, client, user_id):
    """
    Testa a atualização de um usuário existente.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        user_id (str): ID do usuário.

    Raises:
        AssertionError: Se a atualização do usuário falhar.
    """
    data = {
        "nome": "Motorista Atualizado",
        "placa_veiculo": "ABC-1234",
        "cnh": "12345678901",
        "telefone": "11988888888"
    }
    resp = client.put(f"{BASE_URL}/usuarios/{user_id}", json=data, headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao atualizar usuário: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(93)
def test_delete_user(auth_headers, client, user_id):
    """
    Exclui o usuário criado para teste e verifica sucesso.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        user_id (str): ID do usuário.

    Raises:
        AssertionError: Se a exclusão do usuário falhar.
    """
    resp = client.delete(f"{BASE_URL}/usuarios/{user_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] is True

# --------------------------- TESTES DE ENTREGAS ---------------------------

@pytest.mark.order(20)
def test_create_entrega(auth_headers, client, user_id):
    """
    Testa a criação de uma nova entrega.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        user_id (str): ID do usuário.

    Raises:
        AssertionError: Se a criação da entrega falhar.
    """
    data = {
        "motorista_id": user_id,
        "endereco_entrega": "Rua Nova, 456",
        "nome_cliente": "Cliente Teste",
        "observacao": "Entregar no 2º andar"
    }
    resp = client.post(f"{BASE_URL}/entregas", json=data, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["status"] is True

@pytest.mark.order(21)
def test_list_entregas(auth_headers, client, entrega_id):
    """
    Testa a listagem de todas as entregas.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        entrega_id (list): ID da entrega criada para teste.

    Raises:
        AssertionError: Se a listagem de entregas falhar.
    """
    resp = client.get(f"{BASE_URL}/entregas", headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao listar entregas: {resp.json()}"
    assert resp.json()["status"] is True
    assert any(entrega["id"] == entrega_id[0] for entrega in resp.json()["Entregas"]), \
           "Entrega criada não encontrada na lista."

@pytest.mark.order(22)
def test_get_entrega_by_id(auth_headers, client, entrega_id):
    """
    Testa a obtenção de uma entrega por ID.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        entrega_id (list): ID da entrega.

    Raises:
        AssertionError: Se a obtenção da entrega falhar.
    """
    resp = client.get(f"{BASE_URL}/entregas/{entrega_id[0]}", headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao obter entrega: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(23)
def test_entregas_por_numero(auth_headers, client, entrega_id):
    """
    Testa a busca de entrega por número do pedido.
    Primeiro obtém o número do pedido da entrega criada.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        entrega_id (list): ID da entrega.

    Raises:
        AssertionError: Se a busca por número do pedido falhar.
    """
    resp_entrega = client.get(f"{BASE_URL}/entregas/{entrega_id[0]}", headers=auth_headers)
    assert resp_entrega.status_code == 200, f"Falha ao obter entrega: {resp_entrega.json()}"
    numero_pedido = resp_entrega.json()["Entrega"]["numero_pedido"]

    resp = client.get(f"{BASE_URL}/entregas/numero_pedido/{numero_pedido}", headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao buscar entrega por número: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(24)
def test_entregas_por_motorista(auth_headers, client, user_id):
    """
    Testa a listagem de entregas por motorista.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        user_id (str): ID do usuário.

    Raises:
        AssertionError: Se a listagem de entregas por motorista falhar.
    """
    resp = client.get(f"{BASE_URL}/entregas/motorista/{user_id}", headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao listar entregas: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(25)
def test_update_entrega(auth_headers, client, entrega_id, user_id):
    """
    Testa a atualização de uma entrega existente.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        entrega_id (list): ID da entrega.
        user_id (str): ID do usuário.

    Raises:
        AssertionError: Se a atualização da entrega falhar.
    """
    data = {
        "motorista_id": user_id,
        "endereco_entrega": "Rua Atualizada, 789",
        "nome_cliente": "Cliente Atualizado",
        "numero_pedido": "ABC123"
    }
    resp = client.put(f"{BASE_URL}/entregas/{entrega_id[0]}", json=data, headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao atualizar entrega: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(26)
def test_update_entrega_status(auth_headers, client, entrega_id):
    """
    Testa a atualização do status de uma entrega.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        entrega_id (list): ID da entrega.

    Raises:
        AssertionError: Se a atualização do status falhar.
    """
    data = {
        "status": "entregue",
        "nome_recebido": "Recebedor Teste",
        "motivo": None
    }
    resp = client.put(f"{BASE_URL}/entregas/{entrega_id[0]}/status", json=data, headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao atualizar status: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(91)
def test_delete_entrega(auth_headers, client, entrega_id):
    """
    Exclui a entrega criada para teste e verifica sucesso.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        entrega_id (list): ID da entrega.

    Raises:
        AssertionError: Se a exclusão da entrega falhar.
    """
    resp = client.delete(f"{BASE_URL}/entregas/{entrega_id[0]}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] is True

# --------------------------- TESTES DE LOCALIZAÇÕES ---------------------------

@pytest.mark.order(30)
def test_create_localizacao(auth_headers, client, entrega_id, user_id):
    """
    Testa a criação de uma nova localização.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        entrega_id (list): ID da entrega.
        user_id (str): ID do usuário.

    Raises:
        AssertionError: Se a criação da localização falhar.
    """
    data = {
        "entrega_id": entrega_id[0],
        "motorista_id": user_id,
        "latitude": -23.56,
        "longitude": -46.64
    }
    resp = client.post(f"{BASE_URL}/localizacoes", json=data, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["status"] is True
    
@pytest.mark.order(31)
def test_create_localizacao_iot(client):
    """
    Testa o envio de localização via IoT (endpoint público) e verifica registro.

    Args:
        client (Session): Sessão de requests.

    Raises:
        AssertionError: Se o envio de localização IoT falhar.
    """
    data = {"latitude": -23.58, "longitude": -46.66}
    resp = client.post(f"{BASE_URL}/localizacoes/iot", json=data)
    assert resp.status_code == 201, f"Falha ao criar localização IoT: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(32)
def test_list_localizacoes(auth_headers, client, entrega_id, user_id):
    """
    Testa a listagem de todas as localizações.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        entrega_id (list): ID da entrega.
        user_id (str): ID do usuário.

    Raises:
        AssertionError: Se a listagem de localizações falhar.
    """
    data = {
        "entrega_id": entrega_id[0],
        "motorista_id": user_id,
        "latitude": -23.56,
        "longitude": -46.64
    }
    resp_create = client.post(f"{BASE_URL}/localizacoes", json=data, headers=auth_headers)
    assert resp_create.status_code == 201, f"Falha ao criar localização: {resp_create.json()}"

    resp = client.get(f"{BASE_URL}/localizacoes", headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao listar localizações: {resp.json()}"
    assert resp.json()["status"] is True
    assert any(loc["id"] == resp_create.json()["Localizacao"]["id"] for loc in resp.json()["Localizacoes"]), \
           "Localização criada não encontrada na lista."

@pytest.mark.order(33)
def test_get_localizacao_by_id(auth_headers, client, loc_id):
    """
    Testa a obtenção de uma localização por ID.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        loc_id (str): ID da localização.

    Raises:
        AssertionError: Se a obtenção da localização falhar.
    """
    resp = client.get(f"{BASE_URL}/localizacoes/{loc_id}", headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao obter localização: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(34)
def test_localizacoes_por_entrega(auth_headers, client, entrega_id, user_id):
    """
    Testa a listagem de localizações por entrega_id.
    Garante que a entrega e pelo menos uma localização existam antes da consulta.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        entrega_id (list): ID da entrega.
        user_id (str): ID do usuário.

    Raises:
        AssertionError: Se a consulta de localizações por entrega falhar.
    """
    data = {
        "entrega_id": entrega_id[0],
        "motorista_id": user_id,
        "latitude": -23.56,
        "longitude": -46.64
    }
    resp_create = client.post(f"{BASE_URL}/localizacoes", json=data, headers=auth_headers)
    assert resp_create.status_code == 201, f"Falha ao criar localização: {resp_create.json()}"

    resp = client.get(f"{BASE_URL}/localizacoes/entrega/{entrega_id[0]}", headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao buscar localizações: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(35)
def test_localizacoes_por_motorista(auth_headers, client, user_id, entrega_id):
    """
    Testa a listagem de localizações por motorista_id.
    Garante que exista pelo menos uma localização para o motorista antes da consulta.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        user_id (str): ID do usuário.
        entrega_id (list): ID da entrega.

    Raises:
        AssertionError: Se a consulta de localizações por motorista falhar.
    """
    data = {
        "entrega_id": entrega_id[0],
        "motorista_id": user_id,
        "latitude": -23.56,
        "longitude": -46.64
    }
    resp_create = client.post(f"{BASE_URL}/localizacoes", json=data, headers=auth_headers)
    assert resp_create.status_code == 201, f"Falha ao criar localização: {resp_create.json()}"

    resp = client.get(f"{BASE_URL}/localizacoes/motorista/{user_id}", headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao buscar localizações: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(36)
def test_update_localizacao(auth_headers, client, loc_id, entrega_id, user_id):
    """
    Testa a atualização de uma localização existente.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        loc_id (str): ID da localização.
        entrega_id (list): ID da entrega.
        user_id (str): ID do usuário.

    Raises:
        AssertionError: Se a atualização da localização falhar.
    """
    data = {
        "entrega_id": entrega_id[0],
        "motorista_id": user_id,
        "latitude": -23.57,
        "longitude": -46.65
    }
    resp = client.put(f"{BASE_URL}/localizacoes/{loc_id}", json=data, headers=auth_headers)
    assert resp.status_code == 200, f"Falha ao atualizar localização: {resp.json()}"
    assert resp.json()["status"] is True

@pytest.mark.order(90)
def test_delete_localizacao(auth_headers, client, loc_id):
    """
    Exclui uma localização criada para teste e verifica sucesso.

    Args:
        auth_headers (dict): Headers de autenticação.
        client (Session): Sessão de requests.
        loc_id (str): ID da localização.

    Raises:
        AssertionError: Se a exclusão da localização falhar.
    """
    resp = client.delete(f"{BASE_URL}/localizacoes/{loc_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] is True