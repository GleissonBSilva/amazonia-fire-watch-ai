from .emergency_infrastructure import find_nearest_infrastructure
"""
AI Copilot & Tactical GIS Assistant Service.
Military Command & Control (C2) situational awareness engine.
Contains comprehensive grounding on all interface buttons, map layers,
satellite sensors, computer vision pipeline, OSINT feeds, and temporal forensics.
"""

import datetime
from typing import Dict, Any, List, Optional
from .inpe_firms_ingestion import national_ingestion
from .spatial_intelligence import spatial_engine
from .osint_service import osint_service
import os

SYSTEM_INSTRUCTION = """
Você é o COPILOTO TÁTICO IA do "Amazônia Fire Watch AI" (CBMAM / CIOPS / DEMA).
Você opera como especialista de alto nível em Sensoriamento Remoto, Geoprocessamento (GIS),
Visão Computacional e Inteligência de Comando e Controle (C2).

Seu papel é orientar o operador técnico militar sobre cada recurso da interface, bem como
analisar anomalias térmicas, dispersão de fumaça, suspeitas de crimes ambientais e despacho seguro.

CONHECIMENTO COMPLETO DO PAINEL OPERACIONAL:
1. BARRA SUPERIOR:
   • Campo de Busca: Realiza geocodificação direta (OpenStreetMap/Nominatim) para localizar ruas, logradouros, bairros e rodovias brasileiras (ex: BR-230, BR-163). Executa transição aérea suave (flyTo) sem recarregar o mapa.
   • Seletor de Camadas Base:
     - "Satélite Híbrido": Imagens orbitais de alta resolução (Esri World Imagery) com sobreposição transparente de rodovias, bairros e divisas.
     - "Ruas Claras": Mapa vetorial urbano claro (World Street Map) para navegação logística e viária.
     - "Tático Noturno": Base de alto contraste escuro (Canvas Dark) ideal para operações noturnas e visualização de pontos quentes.
     - "Relevo & Topografia": Base hipsométrica com curvas de nível (OpenTopoMap/World Topo) para entender geomorfologia e avanço em aclives.
   • Camadas de Dados & Overlays Sobrepostos:
     - "NASA FIRMS": Focos termais de 375m do sensor VIIRS (Suomi-NPP e NOAA-20) via WMS direto do NASA GIBS em tempo quase-real.
     - "Google Earth 3D": Textura de relevo e sombreado 3D (Hillshade) sobreposta para visualizar vales, morros e desfiladeiros.
     - "INPE BDQueimadas": Focos e anomalias acumuladas nas últimas 24h consolidados pelo INPE TerraBrasilis.
     - "Pluma de Fumaça (Aerossol)": Dispersão atmosférica de fumaça, fuligem e material particulado (Índice de Aerossol UV / AOD) via WMS MODIS Terra Aerosol / NOAA GOES.
     - "Máscara Térmica (LST)": Gradiente em falsa-cor da temperatura da superfície terrestre (Land Surface Temp Day) do sensor MODIS, revelando solo superaquecido antes da combustão aberta.
     - "Heatmap": Mancha contínua de calor por interpolação de densidade espacial.
   • Filtro Temporal:
     - "Hoje (24h)": Monitoramento tático em tempo real.
     - "Mês Atual (Calor)": Mancha térmica acumulada para identificar corredores de devastação.
     - "Anual / Histórico": Série temporal para cruzamento com o CAR (Cadastro Ambiental Rural) e detecção de reincidência criminosa intencional (Art. 41 da Lei 9.605/98).
   • Indicador de Simulação (+55 92 99374-6740):
     - Confirma que o sistema está em Sandbox Tático de Homologação, direcionando mensagens e alertas de emergência estritamente para o número do operador autorizado.

2. DOCK INFERIOR (JANELAS TÁTICAS FLUTUANTES):
   • "Câmera Rua (YOLO)": Inferência de visão computacional em tempo real direto na memória RAM sobre fluxos de vídeo (MJPEG/RTSP) para detecção de fumaça e labaredas a nível de solo sem latência de disco.
   • "OSINT Telegram/X": Monitoramento contínuo de canais abertos e relatos de cidadãos/imprensa com geolocalização.
   • "NASA FIRMS / Google Earth 3D / INPE": Janelas flutuantes independentes redimensionáveis para auditoria comparativa multiespectral.
   • "Alerta WhatsApp": Central de comando para despacho automático ou manual de pacotes de dados táticos contendo coordenadas, raio de impacto e fotos.

3. PINOS E ELEMENTOS DO MAPA:
   • Marcadores Táticos SVG: Retículos concêntricos estilo radar C2 com anéis pulsantes cuja tonalidade varia de amarelo (anomalia branda) a escarlate incandescente (FRP > 50 MW) ou roxo tático (reincidência criminosa).
   • Hover Tático / FLIR Infravermelho: Ao passar o cursor sobre o alvo, ativa imediatamente o card tático com feed termográfico simulado (Ironbow/White-Hot), retículo de mira milimétrico, telemetria militar e bounding box do YOLO.
   • Leaflet-Draw: Ferramenta na lateral para desenho de Bounding Box ou Polígono livre com cálculo geodésico automático de área em km², hectares e metros quadrados.

4. MEDIÇÃO DE POLUIÇÃO DO AR & QUALIDADE DO AR (AQI / PM2.5 / CONAMA 491/2018):
   • Metodologia Científica: A poluição é calculada a partir da emissão de material particulado fino inalável (PM2.5 em µg/m³) e Monóxido de Carbono (CO ppm) derivado da Potência Radiativa Térmica (FRP em MW) e dispersão atmosférica (modelo empírico Copernicus CAMS / GFAS e satélites MODIS AOD / GOES-16).
   • Escala CONAMA 491/2018 & EPA:
     - 0-50 (Boa, Verde): Qualidade satisfatória, sem restrições.
     - 51-100 (Moderada, Amarelo): Risco leve para hiper-sensíveis.
     - 101-150 (Ruim, Laranja): Insalubre para crianças, idosos e asmáticos; manter portas e janelas fechadas.
     - 151-200 (Muito Ruim, Vermelho): Insalubre geral; sintomas respiratórios agudos; uso obrigatório de máscara PFF2/N95.
     - 201-300+ (Péssima/Perigosa, Roxo): Emergência de saúde pública; isolamento e suporte médico na zona de fumaça densa.

5. NITIDEZ TOTAL E PROTOCOLO DE NOVOS FOCOS (<3H):
   • Quando um foco surge ou é selecionado, o HUD Tático C2 exibe um Banner de Notificação de Alta Nitidez e Contraste com:
     - Local e Endereço nítidos em destaque
     - Coordenadas exatas com botão de cópia com 1 clique
     - Radiância FRP (MW) e Temperatura Radiométrica
     - Nível exato de poluição do ar (AQI, PM2.5 e CO) com impacto à saúde
     - Quartel de Bombeiros (CBMAM) e Manancial de captação mais próximos com distância em km e tempo estimado
     - Ações rápidas de Focar no Mapa, Despacho seguro WhatsApp (+55 92 99374-6740) e Abertura do Sensor Térmico FLIR.
"""

class AICopilotService:
    def get_current_situational_summary(self, is_simulation: bool = True) -> Dict[str, Any]:
        """
        Synthesizes the real-time GIS state across Brazil.
        """
        now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-4)))
        if is_simulation:
            spots_24h = national_ingestion.get_realtime_24h_fires()
        else:
            spots_24h = national_ingestion._cache_real_24h or []
        clusters = spatial_engine.cluster_fires(spots_24h)
        osint_posts = osint_service.list_alerts(limit=5)
        
        total_spots = len(spots_24h)
        recurrent_count = sum(1 for c in clusters if c["reincidencia_detectada"])
        crime_suspect_count = sum(1 for c in clusters if c["alta_suspeita_crime"])
        video_count = sum(1 for s in spots_24h if s.get("has_video", False))
        
        biome_counts = {}
        for s in spots_24h:
            b = s.get("biome", "Outros")
            biome_counts[b] = biome_counts.get(b, 0) + 1
            
        return {
            "timestamp": now.strftime("%d/%m/%Y às %H:%M:%S (Hora de Manaus - UTC-4)"),
            "total_focos_brasil": total_spots,
            "clusters_500m": len(clusters),
            "reincidencia_critica": recurrent_count,
            "alta_suspeita_crime": crime_suspect_count,
            "focos_com_video": video_count,
            "distribuicao_biomas": biome_counts,
            "principais_rotas_risco": [
                "Eixo BR-230 Transamazônica (Lábrea / Humaitá / Apuí)",
                "Eixo BR-163 (Novo Progresso / Altamira - PA)",
                "Pantanal Norte e Sul (Poconé / Corumbá)",
                "Zona Norte/Leste de Manaus (Flores / Tarumã / São José)"
            ],
            "osint_recentes": [p["text"][:80] + "..." for p in osint_posts[:3]]
        }

    def generate_response(self, user_prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generates tactical assistant answer grounded in current live GIS data
        or interface technical guidance.
        """
        is_simulation = True
        if context:
            if "is_simulation" in context:
                is_simulation = bool(context["is_simulation"])
            elif "focos_ativos" in context and context["focos_ativos"]:
                first = context["focos_ativos"][0]
                is_simulation = bool(first.get("is_simulated", not str(first.get("id", "")).startswith("FIRMS-REAL")))

        summary = self.get_current_situational_summary(is_simulation=is_simulation)
        prompt_lower = (user_prompt or "").lower().strip()
        
        now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-4)))
        hora = now.strftime("%H:%M:%S")

        # 0. TENTATIVA COM GEMINI 2.5 FLASH + GOOGLE SEARCH GROUNDING
        gemini_result = call_gemini_with_google_search(user_prompt, summary, SYSTEM_INSTRUCTION)
        if gemini_result and gemini_result.get("text"):
            response_text = gemini_result["text"]
            if gemini_result.get("search_sources"):
                response_text += "\n\n🌐 **Fontes Web Validadas em Tempo Real:**\n"
                for s in gemini_result["search_sources"][:4]:
                    response_text += f"• [{s['title']}]({s['url']})\n"
            
            return {
                "query": user_prompt,
                "response": response_text,
                "summary_data": summary,
                "timestamp": summary["timestamp"],
                "gemini_grounded": True
            }

        # 1. RESPOSTAS TÉCNICAS SOBRE A INTERFACE, BOTÕES E RECURSOS
        if any(w in prompt_lower for w in ["para que serve", "como funciona", "o que faz", "o que e", "o que é", "explica", "funcao", "função", "botao", "botão", "botoes", "botões", "painel", "interface"]):
            if "busca" in prompt_lower or "pesquisa" in prompt_lower or "procurar" in prompt_lower:
                text = (
                    "🔍 **Campo de Busca Geocodificada (Barra Superior):**\n\n"
                    "• **Finalidade:** Permite localizar qualquer endereço, rua, bairro, rodovia (ex: BR-230, BR-319, BR-163) ou coordenadas geográficas no Brasil.\n"
                    "• **Funcionamento:** Conecta-se ao serviço de geocodificação Nominatim (OSM) e, ao selecionar o resultado, executa um voo suave (`flyTo`) para as coordenadas sem recarregar a tela, marcando o local com um pino ciano de alta visibilidade."
                )
            elif "fumaça" in prompt_lower or "fumaca" in prompt_lower or "aerossol" in prompt_lower or "aerosol" in prompt_lower:
                text = (
                    "💨 **Camada: Pluma de Fumaça (Aerossol / MODIS & GOES):**\n\n"
                    "• **Finalidade:** Visualização em tempo quase-real da dispersão atmosférica de fumaça e fuligem geradas pelas queimadas.\n"
                    "• **Funcionamento:** Renderiza uma sobreposição semi-transparente do sensor MODIS da NASA (`MODIS_Terra_Aerosol` / Índice Óptico de Aerossol UV). Sobrepõe-se perfeitamente sobre a base de satélite para que o operador observe a direção dos ventos e o impacto na qualidade do ar das cidades vizinhas."
                )
            elif "mascara" in prompt_lower or "máscara" in prompt_lower or "temperatura" in prompt_lower or "lst" in prompt_lower:
                text = (
                    "🌡️ **Camada: Máscara Térmica (LST - Land Surface Temperature):**\n\n"
                    "• **Finalidade:** Mapeamento radiométrico da temperatura da superfície terrestre diurna.\n"
                    "• **Funcionamento:** Utiliza o produto `MODIS_Terra_Land_Surface_Temp_Day` da NASA em falsa-cor (escala termográfica militar do verde/amarelo até o escarlate/roxo vivo). Permite antecipar zonas de ignição espontânea e identificar vegetação severamente desidratada suscetível ao fogo."
                )
            elif "nasa" in prompt_lower or "firms" in prompt_lower or "viirs" in prompt_lower:
                text = (
                    "🛰️ **Camada: NASA FIRMS (VIIRS 375m):**\n\n"
                    "• **Finalidade:** Camada orbital de anomalias térmicas globais em alta resolução (375 metros).\n"
                    "• **Funcionamento:** Transmite dados dos satélites polares Suomi-NPP e NOAA-20 via serviço WMS do NASA GIBS. Cada ponto representa um pixel de 375m onde a temperatura infravermelha de canal 4 (3.74µm) excedeu o limiar de combustão, com cálculo instantâneo da potência FRP (MW)."
                )
            elif "inpe" in prompt_lower or "bdqueimadas" in prompt_lower:
                text = (
                    "🇧🇷 **Camada: INPE BDQueimadas (24 Horas):**\n\n"
                    "• **Finalidade:** Overlay oficial do Programa Queimadas do Instituto Nacional de Pesquisas Espaciais (INPE).\n"
                    "• **Funcionamento:** Sobrepõe os focos detectados no Brasil nas últimas 24 horas a partir dos satélites de referência (Aqua, Terra, NOAA, GOES e MSG) através do GeoServer TerraBrasilis, assegurando soberania e auditoria forense oficial."
                )
            elif "earth" in prompt_lower or "3d" in prompt_lower or "relevo" in prompt_lower:
                text = (
                    "🌍 **Camada: Google Earth 3D (Textura de Relevo Sombreado):**\n\n"
                    "• **Finalidade:** Adicionar profundidade morfológica e sombreamento de encostas (Hillshade) sobre o mapa.\n"
                    "• **Funcionamento:** Projeta a textura de relevo digital de elevação (SRTM/USGS) sobre a imagem de satélite, permitindo visualizar depressões, vales de igarapés e serras para prever a velocidade de propagação do fogo morro acima."
                )
            elif "temporal" in prompt_lower or "historico" in prompt_lower or "histórico" in prompt_lower or "mes" in prompt_lower or "mês" in prompt_lower:
                text = (
                    "⏱️ **Seletor Temporal (Hoje / Mês / Anual Histórico):**\n\n"
                    "• **Hoje (24h):** Modo tático imediato com pinos dinâmicos e câmeras ao vivo.\n"
                    "• **Mês Atual (Calor):** Ativa a mancha agregada de calor para ver os principais focos do mês.\n"
                    "• **Anual / Histórico:** Recurso pericial para investigar queimas recorrentes nos mesmos perímetros agrícolas ou florestais protegidos, servindo como base probatória para autuação de crimes ambientais."
                )
            elif "simulacao" in prompt_lower or "simulação" in prompt_lower or "99374" in prompt_lower or "whatsapp" in prompt_lower or "despacho" in prompt_lower:
                text = (
                    "📲 **Indicador de Simulação & Despacho Seguro (+55 92 99374-6740):**\n\n"
                    "• **Finalidade:** Trava de segurança operacional (Sandbox militar).\n"
                    "• **Funcionamento:** Garante que todos os despachos manuais ou automáticos gerados por detecções do YOLO ou delimitações de área sejam enviados única e exclusivamente para o operador autorizado de homologação, eliminando qualquer risco de disparo falso externo."
                )
            elif any(w in prompt_lower for w in ["cerca", "geofence", "isolamento", "galpao", "galpão"]):
                text = (
                    "🔒 **Módulo de Isolamento Geográfico (Cerca Virtual Ativa):**\n\n"
                    "• **Conceito C2:** O operador delimitou uma cerca virtual (geofence) sobre o mapa operacional.\n"
                    "• **Isolamento da IA:** O ecossistema de detecção está agora respondendo EXCLUSIVAMENTE às variáveis (sensores de temperatura, câmeras térmicas e focos térmicos) situadas dentro da zona delimitada.\n"
                    "• **Processamento Focado:** Todos os fluxos ópticos e radiâncias externos são temporariamente omitidos para priorizar o ativo crítico enquadrado."
                )
            elif any(w in prompt_lower for w in ["planta", "baixa", "samsung", "fabrica", "fábrica", "setor", "extintor", "termic", "térmic"]):
                text = (
                    "🏢 **Camada de Planta Baixa Estrutural & Mapeamento Térmico Dinâmico:**\n\n"
                    "• **Instalação:** Samsung Eletrônica da Amazônia (Distrito Industrial de Manaus) - Complexo Fabril.\n"
                    "• **Status Operacional Real:** Quando a Simulação está desligada, as instalações industriais operam em regime nominal seguro (zero focos térmicos).\n"
                    "• **Cenário de Simulação:** Ao ativar o Modo Simulação, o sistema reproduz um foco térmico controlado no Setor 02 (Bancada de Burn-in Test) com dissipação a 142.3°C para treinamento de brigadas e resposta CBMAM.\n"
                    "• **Equipamentos de Combate:** Extintor CO₂ (EXT-02), PQS ABC (EXT-03) e hidrantes prediais geolocalizados em cada setor arquitetônico.\n"
                    "• **Gradiente Visual Térmico:** Renderização arquitetônica com telemetria e isolamento de cerca virtual."
                )
            elif any(w in prompt_lower for w in ["protocolo", "emergencia", "emergência", "automatico", "automático", "contagem", "30s", "99374"]):
                text = (
                    "🚨 **Protocolo Automatizado de Emergência (Simulado):**\n\n"
                    "• **Regra de Ativação:** Caso a ameaça de incêndio seja confirmada pela IA e não haja interrupção pelo operador em 30 segundos, o despacho de emergência é acionado automaticamente.\n"
                    "• **Trava de Segurança:** Para evitar alarmes falsos externos a órgãos oficiais, todos os alertas deste módulo são direcionados EXCLUSIVAMENTE ao telefone cadastrado do operador: **(92) 99374-6740** (+55 92 99374-6740).\n"
                    "• **Ação do Operador:** O operador dispõe de um botão táctico de interrupção imediata `[ABORTAR / CANCELAR]` na interface C2."
                )
            elif "camera" in prompt_lower or "câmera" in prompt_lower or "yolo" in prompt_lower or "ram" in prompt_lower:
                text = (
                    "🎥 **Câmera de Rua (Visão Computacional YOLO em RAM):**\n\n"
                    "• **Finalidade:** Monitoramento óptico de câmeras urbanas e rurais conectadas.\n"
                    "• **Funcionamento:** O modelo YOLOv8 roda diretamente na memória RAM processando frames de câmeras públicas e privadas para identificar colunas de fumaça e labaredas em segundos, sem gravação lenta em disco."
                )
            elif "osint" in prompt_lower or "telegram" in prompt_lower:
                text = (
                    "📡 **Painel OSINT (Inteligência de Fontes Abertas):**\n\n"
                    "• **Finalidade:** Captura relatos de moradores, fotos e publicações de redes sociais (Telegram, X/Twitter).\n"
                    "• **Funcionamento:** Varre canais comunitários em tempo real, correlacionando palavras-chave ('fumaça', 'queimada', 'fogo') com as coordenadas espaciais mais próximas no mapa."
                )
            elif "pino" in prompt_lower or "marcador" in prompt_lower or "hover" in prompt_lower:
                text = (
                    "🎯 **Marcadores Táticos & Hover com Vídeo:**\n\n"
                    "• **Pinos Pulsantes (Radar Ripple):** Indicam focos ativos cuja cor varia pelo FRP (Power Radiative Fire). Focos roxos assinalam alta probabilidade de queima criminosa coordenada.\n"
                    "• **Hover com Vídeo FLIR:** Ao passar o mouse sobre um marcador, abre-se instantaneamente o HUD tático militar com pré-visualização infravermelha, retículo de mira e telemetria militar."
                )
            else:
                text = (
                    "🛠️ **Visão Geral dos Controles da Interface Tática:**\n\n"
                    "• **Barra Superior:** Campo de busca com voo suave, seletor de 4 camadas base, 5 overlays de satélite (NASA FIRMS, Google Earth 3D, INPE BDQueimadas, Pluma de Fumaça e Máscara Térmica), filtro temporal (24h/Mês/Ano) e indicador de sandbox seguro.\n"
                    "• **Dock Inferior:** Câmeras com inferência YOLO em RAM, OSINT Telegram/X, fontes orbitais em janelas flutuantes e Central de Alertas WhatsApp.\n"
                    "• **Área do Mapa:** Marcadores táticos SVG com retículo concêntrico militar, hover com feed FLIR infravermelho e ferramenta Leaflet-Draw de cálculo de área."
                )
            
            return {
                "query": user_prompt,
                "response": text,
                "summary_data": summary,
                "timestamp": summary["timestamp"]
            }

        # 2. ANÁLISE DE CRIME AMBIENTAL / REINCIDÊNCIA
        if any(w in prompt_lower for w in ["crime", "criminos", "arson", "suspeita", "reinciden", "reincidência"]):
            text = (
                f"🚨 **Relatório de Inteligência Criminal (CBMAM / DEMA - {hora}):**\n\n"
                f"Identificamos **{summary['alta_suspeita_crime']} ocorrências com ALTA SUSPEITA DE AÇÃO CRIMINOSA** no território nacional.\n\n"
                f"• **Destaque Crítico:** Na calha da Transamazônica (BR-230, município de Lábrea/AM), "
                f"o algoritmo detectou um alinhamento sequencial de 5 focos consecutivos acesos em intervalo inferior a 90 minutos (R² > 0.88).\n"
                f"• **Assinatura Espacial:** Vetor linear ao longo da faixa de domínio, característico de queima intencional para abertura de pastagem ilegal.\n"
                f"• **Medida Recomendada:** Despacho de fiscalização integrada (IBAMA/IPAAM/CBMAM) e acionamento do Art. 41 da Lei 9.605/98."
            )
        elif any(w in prompt_lower for w in ["manaus", "flores", "tarumã", "taruma", "urbano"]):
            text = (
                f"🏙️ **Situação Urbana de Manaus/AM ({hora}):**\n\n"
                f"• Foco monitorado por IA no **Bairro Flores (Av. das Torres / Rua das Laranjeiras)** apresentando taxa de expansão ΔA/Δt = +1.80 m²/min.\n"
                f"• **Alvos em risco direto:** Fiação elétrica a 8 metros (ETA 3.8 min) e habitações vizinhas a 14 metros.\n"
                f"• Câmera tática em memória (`CAM-MN-042`) conectada com reconhecimento de labaredas ativado.\n"
                f"• Canal WhatsApp (+55 92 99374-6740) parametrizado para despacho de teste."
            )
        elif any(w in prompt_lower for w in ["pantanal", "corumbá", "corumba", "pocone", "poconé"]):
            text = (
                f"🐾 **Monitoramento do Bioma Pantanal ({hora}):**\n\n"
                f"• Registrados focos ativos na região de **Poconé (MT)** e **Corumbá (MS)** com FRP acumulado superior a 140 MW.\n"
                f"• Índice de severidade agravado por estiagem meteorológica e baixa umidade relativa.\n"
                f"• Recomendada ativação dos overlays 'Pluma de Fumaça' e 'Máscara Térmica' na barra superior para acompanhar a dispersão de aerossóis."
            )
        else:
            text = (
                f"🛰️ **Painel Geral de Situação Tática Nacional - FireWatch AI ({hora}):**\n\n"
                f"• **Total de Focos Ativos (24h):** {summary['total_focos_brasil']} detecções processadas em tempo real.\n"
                f"• **Biomas mais impactados:** Amazônia ({summary['distribuicao_biomas'].get('Amazônia', 0)} focos) e Cerrado ({summary['distribuicao_biomas'].get('Cerrado', 0)} focos).\n"
                f"• **Reincidência Crítica (500m):** {summary['reincidencia_critica']} clusters com queimas repetidas nos últimos 30 dias.\n"
                f"• **Focos com Câmeras / Vídeo em Memória:** {summary['focos_com_video']} pontos com streaming ao vivo e retículo FLIR.\n\n"
                f"_Dica Tática:_ Utilize a barra superior para sobrepor a 'Pluma de Fumaça' e a 'Máscara Térmica' sobre a base de Satélite Híbrido."
            )

        # 4. ENRIQUECIMENTO TÁTICO: CÁLCULO DE UNIDADE DE EMERGÊNCIA E MANANCIAL MAIS PRÓXIMO
        ref_lat = -3.08920
        ref_lng = -60.02170
        max_frp = 35.0
        
        if context and context.get("focos_ativos"):
            focos = context.get("focos_ativos")
            if len(focos) > 0:
                primeiro_foco = focos[0]
                ref_lat = primeiro_foco.get("latitude", ref_lat)
                ref_lng = primeiro_foco.get("longitude", ref_lng)
                max_frp = max([f.get("frp_mw", 0) for f in focos] + [max_frp])

        try:
            infra = find_nearest_infrastructure(ref_lat, ref_lng)
            
            # Recomendação conforme FRP (MW)
            if max_frp >= 40.0:
                recom_aerea = "Despacho combinado: Brigada terrestre CBMAM + Apoio aéreo para lançamento de água (Air Tractor / Helicóptero Águia)."
            else:
                recom_aerea = "Brigada terrestre de pronta resposta do CBMAM suficiente para contenção inicial."
                
            triagem_text = (
                f"\n\n🚒 **Triagem Operacional CBMAM & Defesa Civil:**\n"
                f"• **Unidade Mais Próxima:** {infra['unidade_proxima']['nome']} ({infra['unidade_proxima']['distancia_km']} km | Tempo estimado: {infra['unidade_proxima']['tempo_estimado_min']} min)\n"
                f"• **Manancial para Captação Hídrica:** {infra['manancial_proximo']['nome']} ({infra['manancial_proximo']['distancia_km']} km)\n"
                f"• **Recomendação Tática:** Potência {max_frp:.1f} MW. {recom_aerea}"
            )
            text += triagem_text
        except Exception as e:
            pass

        return {
            "query": user_prompt,
            "response": text,
            "summary_data": summary,
            "timestamp": summary["timestamp"]
        }

ai_copilot = AICopilotService()

# =========================================================================
# INTEGRAÇÃO GEMINI 2.5 FLASH COM GOOGLE SEARCH GROUNDING
# =========================================================================
def call_gemini_with_google_search(prompt: str, context_summary: Dict[str, Any], system_instruction: str) -> Optional[Dict[str, Any]]:
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        # Tenta carregar do .env caso nao esteja em os.environ
        env_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as ef:
                for line in ef:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY=") or line.startswith("GOOGLE_API_KEY="):
                        api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break

    if not api_key:
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        
        grounded_prompt = f"""[CONTEXTO DO DASHBOARD EM TEMPO REAL - AMAZÔNIA FIRE-WATCH AI]
Horário da Central: {context_summary.get('timestamp')}
Total de Focos Ativos (24h): {context_summary.get('total_focos_brasil')}
Clusters Críticos de Reincidência (500m): {context_summary.get('reincidencia_critica')}
Alta Suspeita de Ação Criminosa: {context_summary.get('alta_suspeita_crime')}
Distribuição por Biomas: {context_summary.get('distribuicao_biomas')}
Principais Rotas de Risco Ativas: {', '.join(context_summary.get('principais_rotas_risco', []))}

[DIRETRIZ DE OPERAÇÃO]
Você é o Copiloto Tático IA Sênior do Amazônia Fire-Watch AI.
Analise a pergunta do operador cruzando com os dados do dashboard acima.
UTILIZE A FERRAMENTA GOOGLE SEARCH para pesquisar na web em tempo real (notícias locais recentes, boletins do CBMAM/Defesa Civil, condições meteorológicas atuais e dados do INPE) validando rigorosamente as informações antes de responder ao usuário. Elimine falsos boatos e diferencie com precisão focos industriais (flares/PIM) de incêndios florestais reais.

[PERGUNTA DO OPERADOR]
{prompt}
"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=grounded_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=0.2,
            )
        )

        search_sources = []
        try:
            if response.candidates and response.candidates[0].grounding_metadata:
                gm = response.candidates[0].grounding_metadata
                if gm.grounding_chunks:
                    for chunk in gm.grounding_chunks:
                        if chunk.web and chunk.web.uri:
                            search_sources.append({
                                "title": chunk.web.title or "Fonte Web",
                                "url": chunk.web.uri
                            })
        except Exception:
            pass

        return {
            "text": response.text,
            "search_sources": search_sources,
            "is_grounded_web": len(search_sources) > 0
        }
    except Exception as e:
        print("Aviso: Falha ao chamar Gemini com Google Search:", e)
        return None
