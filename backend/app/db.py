"""
Módulo: db.py
Descrição: Configura a aplicação Flask e inicializa a conexão com o banco de dados PostgreSQL.
Autor: Rafael dos Santos Giorgi
Data: 01/10/2025

NOTE: Este módulo inicializa a aplicação Flask com configurações de ambiente e o SQLAlchemy para persistência de dados.
"""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)
db = SQLAlchemy()

def create_app():
    """
    Cria e configura a aplicação Flask com as variáveis de ambiente e inicializa o SQLAlchemy.

    Configura a conexão com o banco de dados PostgreSQL, define chaves secretas para
    segurança e desativa modificações de rastreamento para melhor desempenho.

    Returns:
        Flask: Instância da aplicação Flask configurada.

    Raises:
        ValueError: Se variáveis de ambiente obrigatórias não estiverem definidas.
    """
    if not os.getenv('DATABASE_URL'):
        raise ValueError("DATABASE_URL não configurada no ambiente.")
    
    if not os.getenv('SECRET_KEY'):
        raise ValueError("SECRET_KEY não configurada no ambiente.")
    
    if not os.getenv('JWT_SECRET_KEY'):
        raise ValueError("JWT_SECRET_KEY não configurada no ambiente.")

    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    
    db.init_app(app)
    
    return app