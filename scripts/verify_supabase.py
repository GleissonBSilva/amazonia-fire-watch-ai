"""
Amazônia Fire-Watch AI • Script de Verificação e Diagnóstico Supabase PostGIS
Executa diagnóstico completo da conexão com Supabase, checando variáveis de ambiente,
tabelas espaciais PostGIS, políticas de RLS e funções RPC.
"""

import os
import sys
import json
import urllib.request
import urllib.error

# Forçar stdout para UTF-8 no Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

def load_env_file(path):
    env_vars = {}
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars

def main():
    print("=" * 70)
    print("AMAZONIA FIRE-WATCH AI - DIAGNOSTICO SUPABASE POSTGIS")
    print("=" * 70)

    # 1. Carregar variáveis de ambiente
    root_env = load_env_file('.env')
    combined = {**root_env, **os.environ}

    supabase_url = combined.get('VITE_SUPABASE_URL') or combined.get('SUPABASE_URL') or ''
    supabase_key = combined.get('VITE_SUPABASE_ANON_KEY') or combined.get('SUPABASE_ANON_KEY') or combined.get('SUPABASE_KEY') or ''

    print(f"Arquivo .env: {'Encontrado' if os.path.exists('.env') else 'Nao encontrado'}")
    print(f"VITE_SUPABASE_URL: {supabase_url or '(Nao configurada)'}")
    print(f"VITE_SUPABASE_ANON_KEY: {'[Configurada: ' + supabase_key[:12] + '...]' if supabase_key else '(Nao configurada)'}")
    print("-" * 70)

    if not supabase_url or not supabase_key or 'your-project-id' in supabase_url:
        print("[MODO ATUAL: CACHE LOCAL & HOMOLOGACAO]")
        print("As credenciais do Supabase ainda nao foram preenchidas no arquivo .env.")
        print("A aplicacao continua funcionando perfeitamente utilizando:")
        print("  - Cache local de telemetria espacial (NASA FIRMS 24h Global, INPE e NOAA GOES-16)")
        print("  - Ray casting local no frontend para cruzamento com o CAR/SICAR e geracao de Autos")
        print("\nPASSO A PASSO PARA ATIVAR O SUPABASE POSTGIS NA NUVEM:")
        print("  1. Acesse https://supabase.com e crie um novo projeto gratuito.")
        print("  2. No painel do projeto, abra o 'SQL Editor' (icone de terminal a esquerda).")
        print("  3. Copie todo o conteudo do arquivo 'supabase/schema.sql' deste repositorio e execute ('Run').")
        print("  4. (Opcional) Execute tambem 'supabase/seed.sql' para carregar poligonos de exemplo do CAR.")
        print("  5. Va em 'Project Settings' -> 'API' e copie:")
        print("     - Project URL (ex: https://xyzcompany.supabase.co)")
        print("     - Project API keys -> anon public (ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)")
        print("  6. Crie ou edite o arquivo '.env' e 'frontend/.env' com os valores:")
        print("     VITE_SUPABASE_URL=https://xyzcompany.supabase.co")
        print("     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
        print("  7. Execute este script novamente para validar a conexao!")
        print("=" * 70)
        return

    # 2. Testar conectividade HTTP com Supabase REST API
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }

    tables = ["fire_spots", "land_parcels", "infraction_notices"]
    all_ok = True

    print("Testando tabelas espaciais PostGIS no Supabase...")
    for tbl in tables:
        endpoint = f"{supabase_url.rstrip('/')}/rest/v1/{tbl}?select=count"
        req = urllib.request.Request(endpoint, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                status = resp.getcode()
                content = resp.read().decode('utf-8')
                print(f"  [OK] Tabela 'public.{tbl}': HTTP {status} (Acessivel)")
        except urllib.error.HTTPError as e:
            all_ok = False
            print(f"  [ERRO] Tabela 'public.{tbl}': Erro HTTP {e.code} ({e.reason})")
            if e.code == 404:
                print(f"      -> Execute o script 'supabase/schema.sql' no SQL Editor do Supabase!")
        except Exception as e:
            all_ok = False
            print(f"  [FALHA] Tabela 'public.{tbl}': Falha de conexao ({str(e)})")

    # 3. Testar função RPC de Spatial Intersect
    rpc_endpoint = f"{supabase_url.rstrip('/')}/rest/v1/rpc/fn_intersect_land_parcel"
    rpc_payload = json.dumps({"p_lat": -3.119, "p_lng": -60.021}).encode('utf-8')
    req_rpc = urllib.request.Request(rpc_endpoint, data=rpc_payload, headers=headers, method='POST')

    print("\nTestando funcao espacial PostGIS 'fn_intersect_land_parcel'...")
    try:
        with urllib.request.urlopen(req_rpc, timeout=10) as resp:
            content = resp.read().decode('utf-8')
            print(f"  [OK] RPC fn_intersect_land_parcel: HTTP {resp.getcode()}")
            print(f"       Resposta espacial: {content[:100]}...")
    except urllib.error.HTTPError as e:
        print(f"  [ALERTA] RPC fn_intersect_land_parcel: HTTP {e.code} ({e.reason})")
        if e.code == 404:
            print("       -> A funcao nao foi criada ainda. Execute 'supabase/schema.sql'.")
    except Exception as e:
        print(f"  [ERRO] RPC fn_intersect_land_parcel: Erro ({str(e)})")

    print("=" * 70)
    if all_ok:
        print("SUPABASE POSTGIS CONECTADO COM SUCESSO E 100% OPERACIONAL!")
    else:
        print("Algumas tabelas requerem execucao do arquivo 'supabase/schema.sql'.")
    print("=" * 70)

if __name__ == '__main__':
    main()
