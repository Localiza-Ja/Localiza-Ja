"""
Módulo: db.py
Descrição: Configura a aplicação Flask e inicializa a conexão com o banco de dados PostgreSQL.
Autor: Rafael dos Santos Giorgi
Data: 31/08/2025
"""

from flask import Flask, jsonify
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
    """
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    
    db.init_app(app)
    
    return app