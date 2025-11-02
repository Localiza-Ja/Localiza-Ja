"""
Módulo: entrega.py
Descrição: Define o modelo de dados para a entidade Entrega no banco de dados PostgreSQL.
Autor: Rafael dos Santos Giorgi
Data: 01/10/2025

NOTE: Este módulo inclui o modelo Entrega com suporte a status e campos adicionais como foto de prova.
"""

from app.db import db
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum
from app.models.usuarios import Usuario

class StatusEntrega(enum.Enum):
    """
    Enumeração para os status possíveis de uma entrega.
    """
    PENDENTE = "pendente"
    EM_ROTA = "em_rota"
    ENTREGUE = "entregue"
    CANCELADA = "cancelada"
    NAO_ENTREGUE = "nao_entregue"

class Entrega(db.Model):
    """
    Modelo SQLAlchemy para a tabela 'entrega'.

    Esta classe representa a tabela de entregas no banco de dados.

    Attributes:
        id (UUID): Identificador único da entrega.
        motorista_id (UUID): ID do motorista associado.
        endereco_entrega (String): Endereço de entrega.
        numero_pedido (String): Número do pedido (único).
        status (Enum): Status da entrega.
        nome_cliente (String): Nome do cliente.
        nome_recebido (String): Nome da pessoa que recebeu (opcional).
        observacao (String): Observações (opcional).
        foto_prova (String): Caminho da foto de prova (opcional).
        motivo (String): Motivo para status não entregue ou cancelado (opcional).
        criado_em (DateTime): Timestamp de criação.
        atualizado_em (DateTime): Timestamp de atualização.
    """
    __tablename__ = 'entrega'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    motorista_id = db.Column(UUID(as_uuid=True), db.ForeignKey("usuario.id"), nullable=False)
    endereco_entrega = db.Column(db.String(255), nullable=False)
    numero_pedido = db.Column(db.String(6), nullable=False, unique=True)
    status = db.Column(db.Enum(StatusEntrega), default=StatusEntrega.PENDENTE, nullable=False)
    nome_cliente = db.Column(db.String(255), nullable=False)
    nome_recebido = db.Column(db.String(255), nullable=True)
    observacao = db.Column(db.String(255), nullable=True)
    foto_prova = db.Column(db.String(255), nullable=True)
    motivo = db.Column(db.String(255), nullable=True)
    criado_em = db.Column(db.DateTime, default=db.func.current_timestamp())
    atualizado_em = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    localizacoes = db.relationship("Localizacao", back_populates="entrega")
    motorista = db.relationship("Usuario", back_populates="entregas")

    def __init__(self, **kwargs):
        """
        Inicializa uma nova instância de Entrega.

        Args:
            **kwargs: Argumentos nomeados para inicializar os atributos da classe.

        Raises:
            ValueError: Se o motorista_id fornecido não corresponder a um motorista existente no banco de dados.
        """
        super().__init__(**kwargs)
        if not Usuario.query.get(self.motorista_id):
            raise ValueError("Motorista não encontrado")

    def json(self):
        """
        Converte o objeto Entrega para um dicionário JSON.

        Returns:
            dict: Representação JSON do objeto, incluindo status e campos opcionais.
        """
        return {
            "id": str(self.id),
            "motorista_id": str(self.motorista_id),
            "endereco_entrega": self.endereco_entrega,
            "numero_pedido": self.numero_pedido,
            "status": self.status.value,
            "nome_cliente": self.nome_cliente,
            "nome_recebido": self.nome_recebido,
            "observacao": self.observacao,
            "foto_prova": self.foto_prova,
            "motivo": self.motivo,
            "criado_em": str(self.criado_em),
            "atualizado_em": str(self.atualizado_em)
        }

    def __repr__(self):
        """
        Representação string do objeto para debugging.

        Returns:
            str: String representativa da entrega.
        """
        return f"<Entrega {self.numero_pedido} (ID: {self.id}, Status: {self.status.value})>"