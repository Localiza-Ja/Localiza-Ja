"""
Módulo: main.py
Descrição: Ponto de entrada da aplicação Flask, inicializa a API e registra os endpoints.
Autor: Rafael dos Santos Giorgi
Data: 16/11/2025


NOTE: A blacklist é mantida em memória localmente; considere Redis em produção.
TODO: Desativar modo de depuração (debug=False) em produção.
"""


from flask import Flask, jsonify, request
from flask_restful import Api
from app.db import create_app, db
from flask_jwt_extended import JWTManager
from app.routes import Ping, UsuarioResource, LoginResource, LogoutResource, SessionResource, EntregaResource, EntregaPorNumeroResource, EntregaPorMotoristaResource, EntregaStatusResource, LocalizacaoResource, LocalizacaoIoTResource, LocalizacaoEntregaResource, LocalizacaoMotoristaResource
from app.utils import check_if_token_in_blacklist
from dotenv import load_dotenv
import os
from flask_babel import Babel
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import timedelta
from flask_migrate import Migrate
import time
import json
from termcolor import colored


load_dotenv()
app = create_app()
api = Api(app)
jwt = JWTManager(app)
babel = Babel(app)
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per hour"]
)
migrate = Migrate(app, db)


def decorated_check_if_token_in_blacklist(jwt_header, jwt_payload):
    """
    Verifica se o token JWT está na blacklist.


    Args:
        jwt_header (dict): Cabeçalho do token JWT.
        jwt_payload (dict): Payload do token JWT.


    Returns:
        bool: True se o token está na blacklist, False caso contrário.


    Raises:
        KeyError: Se 'jti' não estiver presente no payload.
    """
    if 'jti' not in jwt_payload:
        raise KeyError("Token JWT inválido: 'jti' não encontrado.")
    return check_if_token_in_blacklist(jwt_payload)


app.config["JWT_SECRET_KEY"] = os.getenv('JWT_SECRET_KEY')
if not app.config["JWT_SECRET_KEY"]:
    raise ValueError("JWT_SECRET_KEY não configurada no ambiente.")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
app.config["BABEL_DEFAULT_LOCALE"] = 'pt_BR'
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv('DATABASE_URL')
if not app.config["SQLALCHEMY_DATABASE_URI"]:
    raise ValueError("DATABASE_URL não configurada no ambiente.")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)


@jwt.token_in_blocklist_loader
def token_in_blocklist_callback(jwt_header, jwt_payload):
    """
    Callback para verificar se o token está na blacklist.


    Args:
        jwt_header (dict): Cabeçalho do token JWT.
        jwt_payload (dict): Payload do token JWT.


    Returns:
        bool: True se o token está na blacklist, False caso contrário.
    """
    try:
        return decorated_check_if_token_in_blacklist(jwt_header, jwt_payload)
    except KeyError as e:
        return jsonify({"error": str(e), "status": False}), 400


def get_locale():
    """
    Determina o idioma preferido com base nos cabeçalhos de aceitação do cliente.


    Returns:
        str: Código do idioma (ex.: 'pt_BR', 'en_US') que melhor corresponde.


    NOTE: Retorna 'pt_BR' como padrão se nenhum idioma for compatível.
    """
    return request.accept_languages.best_match(['pt_BR', 'en_US'], default='pt_BR')


@app.errorhandler(Exception)
def handle_exception(e):
    """
    Trata exceções não capturadas na aplicação.


    Args:
        e (Exception): Exceção levantada.


    Returns:
        tuple: JSON com mensagem de erro e status 500 (Internal Server Error).


    NOTE: Logar o erro em um sistema de logging em produção para rastreamento.
    """
    return jsonify({"message": f"Erro interno no servidor: {str(e)}", "status": False}), 500

@app.before_request
def before_request_log():
    """
    Registra o início da requisição e o payload.
    """
    request.start_time = time.time()
    
    payload = {}
    try:
        if request.is_json:
            payload = request.get_json(silent=True)
        elif request.form:
            payload = dict(request.form)
        elif request.data:
            try:
                payload = json.loads(request.data.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                payload = {"data_raw": request.data.decode('utf-8', errors='ignore')[:100] + "..."} # Limita para não poluir
    except Exception as e:
        payload = {"error_parsing_payload": str(e)}

    request.payload = payload
    
    method_color = 'green'
    if request.method in ['POST', 'PUT', 'PATCH']:
        method_color = 'yellow'
    elif request.method == 'DELETE':
        method_color = 'red'
        
    print(colored("="*80, 'blue'))
    print(colored(f"| REQUISIÇÃO INICIADA | {request.method} {request.path}", method_color, attrs=['bold']))
    print(colored("="*80, 'blue'))
    print(colored("| DADOS ENVIADOS (PAYLOAD):", 'cyan', attrs=['bold']))
    if request.payload:
        try:
            formatted_payload = json.dumps(request.payload, indent=4, ensure_ascii=False)
            print(colored(formatted_payload, 'white'))
        except TypeError:
            print(colored(str(request.payload), 'white'))
    else:
        print(colored("  (Nenhum dado enviado no corpo da requisição)", 'white', attrs=['dark']))
    print(colored("-"*80, 'blue'))


@app.after_request
def after_request_log(response):
    """
    Registra o status da resposta, o corpo e o tempo de execução.
    """
    duration = (time.time() - request.start_time) * 1000 # em milissegundos
    
    response_body = {}
    try:
        if response.is_json:
            response_data = json.loads(response.get_data().decode('utf-8'))
            response_body = response_data
        else:
            response_body = {"data_raw": response.get_data(as_text=True)[:100] + "..."}
    except Exception:
        response_body = {"message": f"Resposta com status {response.status_code}. Corpo não JSON ou vazio."}

    status_code = response.status_code
    status_color = 'green'
    if status_code >= 500:
        status_color = 'red'
    elif status_code >= 400:
        status_color = 'yellow'
    elif status_code >= 300:
        status_color = 'magenta'
        
    print(colored("| RESPOSTA RETORNADA:", 'cyan', attrs=['bold']))
    print(colored(f"| STATUS: {status_code} | DURAÇÃO: {duration:.2f}ms", status_color, attrs=['bold']))
    print(colored("-"*80, 'blue'))
    print(colored("| CORPO DA RESPOSTA:", 'cyan', attrs=['bold']))
    try:
        formatted_response = json.dumps(response_body, indent=4, ensure_ascii=False)
        print(colored(formatted_response, 'white'))
    except TypeError:
        print(colored(str(response_body), 'white'))
        
    print(colored("="*80, 'blue'))
    print("\n") # Linha extra para separar logs
    
    return response


api.add_resource(Ping, '/ping')
api.add_resource(UsuarioResource, '/usuarios', '/usuarios/<uuid:user_id>')
api.add_resource(LoginResource, '/usuarios/login')
api.add_resource(LogoutResource, '/usuarios/logout')
api.add_resource(SessionResource, '/usuarios/session')
api.add_resource(EntregaResource, '/entregas', '/entregas/<uuid:entrega_id>')
api.add_resource(EntregaPorNumeroResource, '/entregas/numero_pedido/<string:numero_pedido>')
api.add_resource(EntregaPorMotoristaResource, '/entregas/motorista/<uuid:motorista_id>')
api.add_resource(EntregaStatusResource, '/entregas/<uuid:entrega_id>/status')
api.add_resource(LocalizacaoResource, '/localizacoes', '/localizacoes/<uuid:loc_id>')
api.add_resource(LocalizacaoIoTResource, '/localizacoes/iot')
api.add_resource(LocalizacaoEntregaResource, '/localizacoes/entrega/<uuid:entrega_id>')
api.add_resource(LocalizacaoMotoristaResource, '/localizacoes/motorista/<uuid:motorista_id>')


# Bloco para registrar o comando 'seed-db'
@app.cli.command("seed-db")
def seed_db_command():
    """Popula o banco de dados com dados de teste."""
    from seed import seed_data # Adicione o import aqui dentro para evitar importação circular
    seed_data()

if __name__ == "__main__":
    host = "0.0.0.0"
    port = 5000


    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
        print(f"\nBackend em: http://{lan_ip}:{port}  (LAN)  |  http://127.0.0.1:{port} (localhost)\n")
    except Exception:
        print(f"\nBackend em: http://127.0.0.1:{port}\n")

    app.run(host=host, port=port, debug=True, use_reloader=False)
