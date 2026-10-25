"""
Ponto de Entrada Principal FastAPI para o Amazônia Fire Watch AI
Re-exporta e inicializa a aplicação de backend completa com todos os roteadores.
"""
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path para garantir resolução dos módulos
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
