import random
import string
from datetime import datetime
from app.db import db
from app.models.usuarios import Usuario
from app.models.entrega import Entrega, StatusEntrega
from app.models.localizacao import Localizacao
from main import app

def gerar_numero_pedido_seed(tamanho=6):
    caracteres = string.ascii_uppercase + string.digits
    return ''.join(random.choice(caracteres) for _ in range(tamanho))

def seed_data():
    with app.app_context():
        print("Limpando todas as tabelas...")
        db.session.execute(db.text('TRUNCATE TABLE entrega, usuario, localizacao RESTART IDENTITY CASCADE;'))
        db.session.commit()
        print("Tabelas limpas com sucesso.")

        motorista1 = Usuario(nome="João da Silva", placa_veiculo="JSP-0101", cnh="11111111111", telefone="11911111111")
        db.session.add(motorista1)
        db.session.commit()
        print(f"Usuário '{motorista1.nome}' criado.")

        entregas_para_criar = [
            Entrega(motorista_id=motorista1.id, numero_pedido=gerar_numero_pedido_seed(), endereco_entrega="Rua Dr. Salles de Oliveira, 1380, Vila Industrial, Campinas, SP", nome_cliente="Oficina do Zé", status=StatusEntrega.PENDENTE, observacao="Entregar no portão dos fundos."),
            Entrega(motorista_id=motorista1.id, numero_pedido=gerar_numero_pedido_seed(), endereco_entrega="Avenida da Amizade, 2300, Vila Carlota, Sumaré, SP", nome_cliente="Supermercado Amigo", status=StatusEntrega.PENDENTE),
            Entrega(motorista_id=motorista1.id, numero_pedido=gerar_numero_pedido_seed(), endereco_entrega="Rua Luiz Camilo de Camargo, 585, Centro, Hortolândia, SP", nome_cliente="Shopping Hortolândia", status=StatusEntrega.PENDENTE, observacao="Deixar na doca de recebimento 3."),
            Entrega(motorista_id=motorista1.id, numero_pedido=gerar_numero_pedido_seed(), endereco_entrega="Av. Iguatemi, 777, Vila Brandina, Campinas, SP", nome_cliente="Shopping Iguatemi", status=StatusEntrega.PENDENTE),
            Entrega(motorista_id=motorista1.id, numero_pedido=gerar_numero_pedido_seed(), endereco_entrega="Rua Antônio de Castro, 123, Sousas, Campinas, SP", nome_cliente="Empório do Campo", status=StatusEntrega.PENDENTE, observacao="Cuidado, rua de terra."),
            Entrega(motorista_id=motorista1.id, numero_pedido=gerar_numero_pedido_seed(), endereco_entrega="Avenida Olivo Callegari, 789, Centro, Sumaré, SP", nome_cliente="Padaria Pão Nosso", status=StatusEntrega.PENDENTE),
            Entrega(motorista_id=motorista1.id, numero_pedido=gerar_numero_pedido_seed(), endereco_entrega="Rua Sete de Setembro, 50, Centro, Valinhos, SP", nome_cliente="Loja de Ferragens Tavares", status=StatusEntrega.PENDENTE),
            Entrega(motorista_id=motorista1.id, numero_pedido=gerar_numero_pedido_seed(), endereco_entrega="Avenida Francisco Glicério, 1000, Centro, Campinas, SP", nome_cliente="Relojoaria Pontual", status=StatusEntrega.PENDENTE, observacao="Procurar por Sra. Helena."),
            Entrega(motorista_id=motorista1.id, numero_pedido=gerar_numero_pedido_seed(), endereco_entrega="Rua Rosina Zagatti, 204, Jardim Amanda II, Hortolândia, SP", nome_cliente="Farmácia Bem Estar", status=StatusEntrega.PENDENTE),
            Entrega(motorista_id=motorista1.id, numero_pedido=gerar_numero_pedido_seed(), endereco_entrega="Avenida John Boyd Dunlop, 3900, Jardim Ipaussurama, Campinas, SP", nome_cliente="Parque Shopping Bandeiras", status=StatusEntrega.PENDENTE),
        ]
        
        db.session.add_all(entregas_para_criar)
        db.session.commit()
        print(f"{len(entregas_para_criar)} entregas de teste foram criadas.")

        localizacoes_para_criar = []
        for entrega in entregas_para_criar:
            if entrega.status == StatusEntrega.EM_ROTA:
                lat = random.uniform(-23.5, -23.6)
                lon = random.uniform(-46.6, -46.7)
                localizacao = Localizacao(entrega_id=entrega.id, motorista_id=entrega.motorista_id, latitude=lat, longitude=lon)
                localizacoes_para_criar.append(localizacao)

        if localizacoes_para_criar:
            db.session.add_all(localizacoes_para_criar)
            db.session.commit()
        print(f"{len(localizacoes_para_criar)} localizações de teste foram criadas.")