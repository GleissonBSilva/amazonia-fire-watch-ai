-- ==============================================================================
-- AMAZÔNIA FIRE-WATCH AI • SEED INICIAL DE DADOS FUNDIÁRIOS E FOCOS PILOTO
-- ==============================================================================

-- Inserção de Parcelas Cadastrais (CAR / SICAR / Terras Indígenas / UCs)
INSERT INTO public.land_parcels (
    car_receipt, property_name, owner_name, owner_document, municipality, state, country_code,
    car_status, status_reason, total_area_ha, legal_reserve_ha, app_area_ha, sigef_parcel_code,
    cadastral_type, estimated_fine_per_ha, min_lat, max_lat, min_lng, max_lng, geom
) VALUES 
(
    'AM-1300201-B78F90875AC14207908B1F548842EA35',
    'Fazenda Rio Negro & Castanho',
    'AGROFLORESTAL AMAZÔNIA S/A',
    '04.921.***/0001-82',
    'Barcelos', 'AM', 'BR',
    'ATIVO',
    'Cadastro ativo e regular no SICAR. Reserva Legal de 80% averbada.',
    4250.0, 3400.0, 310.0,
    'BR.AM.1300201.00000492',
    'IMOVEL_RURAL_PRIVADO',
    5000.0,
    -1.25, -0.85, -63.10, -62.60,
    ST_MakeEnvelope(-63.10, -1.25, -62.60, -0.85, 4326)
),
(
    'AM-1302405-D84C72101BF94726880012A346F19A01',
    'Fazenda Vale do Purus II',
    'VALDIR APARECIDO DOS SANTOS',
    '***.482.912-**',
    'Lábrea', 'AM', 'BR',
    'PENDENTE',
    'Notificado para adequação de Reserva Legal e compensação de desmate não autorizado.',
    1890.0, 1512.0, 145.0,
    'BR.AM.1302405.00001284',
    'IMOVEL_RURAL_PRIVADO',
    5000.0,
    -7.50, -7.10, -64.95, -64.45,
    ST_MakeEnvelope(-64.95, -7.50, -64.45, -7.10, 4326)
),
(
    'AM-RR-FUNAI-TI-YANOMAMI-1992',
    'TERRA INDÍGENA YANOMAMI (DEMARCADA E HOMOLOGADA)',
    'UNIÃO FEDERAL / POVO INDÍGENA YANOMAMI E YE\'KWANA',
    '00.394.460/0001-41 (FUNAI / MJ)',
    'Barcelos / São Gabriel da Cachoeira', 'AM', 'BR',
    'ATIVO',
    'Terra Pública Federal Inalienável de Posse Permanente Indígena (Art. 231 CF/88).',
    9665000.0, 9665000.0, 966500.0,
    'TI.FUNAI.YANOMAMI.1992.001',
    'TERRA_INDIGENA',
    10000.0,
    0.50, 3.50, -66.50, -62.50,
    ST_MakeEnvelope(-66.50, 0.50, -62.50, 3.50, 4326)
),
(
    'AM-ICMBIO-UC-PARNA-JAU-1980',
    'PARQUE NACIONAL DO JAÚ (UNIDADE DE PROTEÇÃO INTEGRAL)',
    'INSTITUTO CHICO MENDES DE CONSERVAÇÃO DA BIODIVERSIDADE (ICMBio)',
    '08.829.974/0001-94 (ICMBio / MMA)',
    'Novo Airão / Barcelos', 'AM', 'BR',
    'ATIVO',
    'Unidade de Conservação de Proteção Integral (Lei 9.985/2000 - SNUC).',
    2272000.0, 2272000.0, 350000.0,
    'UC.ICMBIO.PARNA.JAU.1980',
    'UNIDADE_CONSERVACAO',
    10000.0,
    -2.80, -1.70, -63.50, -61.40,
    ST_MakeEnvelope(-63.50, -2.80, -61.40, -1.70, 4326)
)
ON CONFLICT (car_receipt) DO NOTHING;
