import base64
import json
import os

# === CONFIGURAÇÕES DO ENVIO ===
caminho_arquivo = r"C:\Work\Localiza-Ja\backend\foto_entrega.png"  # coloque o nome do arquivo local
status = "entregue"
nome_recebido = "João da Esquina"
latitude = -22.920341190791017
longitude = -47.105806744956155

# === GERAÇÃO DO BASE64 ===
ext = os.path.splitext(caminho_arquivo)[1].lstrip('.').lower()

# valida extensão
if ext not in ['jpg', 'jpeg', 'png']:
    raise ValueError("A imagem deve ser .jpg, .jpeg ou .png")

with open(caminho_arquivo, "rb") as img_file:
    base64_str = base64.b64encode(img_file.read()).decode('utf-8')

# cria o formato data:image/...;base64
foto_prova = f"data:image/{ext};base64,{base64_str}"

# === MONTA O JSON FINAL ===
dados = {
    "status": status,
    "nome_recebido": nome_recebido,
    "latitude": latitude,
    "longitude": longitude,
    "foto_prova": foto_prova
}

# imprime o JSON bonito no terminal
print(json.dumps(dados, indent=4, ensure_ascii=False))

# === Salva o JSON em arquivo ===
with open("payload_entrega.json", "w", encoding="utf-8") as f:
    json.dump(dados, f, indent=4, ensure_ascii=False)

print("\nJSON gerado com sucesso e salvo em 'payload_entrega.json'!")
