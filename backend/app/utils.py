"""
Módulo: utils.py
Descrição: Utilitários gerais para a aplicação, incluindo a blacklist de JWT com armazenamento em memória.
Autor: Rafael dos Santos Giorgi
Data: 01/10/2025

NOTE: Este módulo gerencia a blacklist de tokens JWT usando um set em memória, ideal para MVP em desenvolvimento.
TODO: Migrar para Redis ou banco de dados persistente em produção para escalabilidade.
"""

token_blacklist = set()

def add_to_blacklist(jti):
    """
    Adiciona um token à blacklist em memória.

    Args:
        jti (str): Identificador único do token JWT.

    Raises:
        ValueError: Se jti não for uma string válida.
    """
    if not isinstance(jti, str) or not jti:
        raise ValueError("JTI deve ser uma string não vazia")
    token_blacklist.add(jti)

def remove_from_blacklist(jti):
    """
    Remove um token da blacklist em memória.

    Args:
        jti (str): Identificador único do token JWT.

    Raises:
        ValueError: Se jti não for uma string válida.
    """
    if not isinstance(jti, str) or not jti:
        raise ValueError("JTI deve ser uma string não vazia")
    token_blacklist.discard(jti)

def check_if_token_in_blacklist(decrypted_token):
    """
    Verifica se o token JWT está na blacklist em memória.

    Args:
        decrypted_token (dict): Payload decodificado do token JWT, contendo o 'jti'.

    Returns:
        bool: True se o token está na blacklist, False caso contrário.

    Raises:
        KeyError: Se 'jti' não estiver presente no payload.
        ValueError: Se decrypted_token não for um dicionário.
    """
    if not isinstance(decrypted_token, dict):
        raise ValueError("decrypted_token deve ser um dicionário")
    if 'jti' not in decrypted_token:
        raise KeyError("Token JWT inválido: 'jti' não encontrado")
    return decrypted_token['jti'] in token_blacklist