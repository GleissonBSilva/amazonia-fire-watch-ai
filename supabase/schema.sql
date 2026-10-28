-- ==============================================================================
-- AMAZÔNIA FIRE-WATCH AI • PLANETARY MONITORING & C2 ENGINE
-- SUPABASE POSTGRESQL + POSTGIS SCHEMA & REALTIME CONFIGURATION
-- ==============================================================================

-- 1. Habilita extensões espaciais e utilitárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Tabela de Focos de Incêndio (Fire Spots)
CREATE TABLE IF NOT EXISTS public.fire_spots (
    id TEXT PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    frp_mw DOUBLE PRECISION NOT NULL,
    bright_ti4_k DOUBLE PRECISION,
    confidence DOUBLE PRECISION DEFAULT 0.85,
    satellite TEXT NOT NULL,
    municipality TEXT,
    state TEXT,
    address TEXT,
    country_code TEXT DEFAULT 'BR',
    country_name TEXT DEFAULT 'Brasil',
    continent TEXT DEFAULT 'América do Sul',
    biome TEXT DEFAULT 'Amazônia',
    detection_type TEXT DEFAULT 'CONFIRMADO_POLAR', -- 'PRELIMINAR_GEOESTACIONARIO' ou 'CONFIRMADO_POLAR'
    is_geostationary_preliminary BOOLEAN DEFAULT FALSE,
    awaiting_polar_confirmation BOOLEAN DEFAULT FALSE,
    is_simulated BOOLEAN DEFAULT FALSE,
    is_new_outbreak BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'PENDENTE', -- 'PENDENTE', 'ACIONADO_SIMULACAO', 'EQUIPE_DESIGNADA', 'COMBATE_ATIVO'
    dispatched_at TIMESTAMPTZ,
    aqi INTEGER,
    pm25 DOUBLE PRECISION,
    air_quality_level TEXT,
    detected_at TEXT,
    detected_iso TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices Espaciais e de Consulta Rápida
CREATE INDEX IF NOT EXISTS idx_fire_spots_geom ON public.fire_spots USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_fire_spots_frp ON public.fire_spots (frp_mw DESC);
CREATE INDEX IF NOT EXISTS idx_fire_spots_simulated ON public.fire_spots (is_simulated);
CREATE INDEX IF NOT EXISTS idx_fire_spots_continent ON public.fire_spots (continent);
CREATE INDEX IF NOT EXISTS idx_fire_spots_status ON public.fire_spots (status);

-- 3. Tabela da Malha Fundiária (CAR / SICAR / Terras Indígenas / UCs / Cadastros Globais)
CREATE TABLE IF NOT EXISTS public.land_parcels (
    car_receipt TEXT PRIMARY KEY,
    property_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_document TEXT NOT NULL,
    municipality TEXT,
    state TEXT,
    country_code TEXT DEFAULT 'BR',
    car_status TEXT DEFAULT 'ATIVO', -- 'ATIVO', 'PENDENTE', 'CANCELADO', 'SUSPENSO'
    status_reason TEXT,
    total_area_ha DOUBLE PRECISION,
    legal_reserve_ha DOUBLE PRECISION,
    app_area_ha DOUBLE PRECISION,
    sigef_parcel_code TEXT,
    cadastral_type TEXT DEFAULT 'IMOVEL_RURAL_PRIVADO', -- 'IMOVEL_RURAL_PRIVADO', 'TERRA_INDIGENA', 'UNIDADE_CONSERVACAO', 'GLEBA_PUBLICA'
    indigenous_land TEXT,
    conservation_unit TEXT,
    infraction_risk TEXT DEFAULT 'ALTO',
    estimated_fine_per_ha DOUBLE PRECISION DEFAULT 5000.0,
    legal_infraction_articles JSONB DEFAULT '[]'::JSONB,
    min_lat DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    min_lng DOUBLE PRECISION,
    max_lng DOUBLE PRECISION,
    geom GEOMETRY(Polygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_land_parcels_geom ON public.land_parcels USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_land_parcels_status ON public.land_parcels (car_status);

-- 4. Tabela de Autos de Infração Ambiental Preliminares
CREATE TABLE IF NOT EXISTS public.infraction_notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol_number TEXT UNIQUE NOT NULL,
    fire_spot_id TEXT,
    car_receipt TEXT,
    target_name TEXT NOT NULL,
    target_document TEXT NOT NULL,
    property_name TEXT NOT NULL,
    municipality TEXT,
    state TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    satellite TEXT,
    frp_mw DOUBLE PRECISION,
    burnt_area_ha DOUBLE PRECISION,
    estimated_fine_brl DOUBLE PRECISION,
    legal_articles JSONB,
    environmental_damage TEXT,
    responsible_authority TEXT DEFAULT 'CBMAM / DEMA / IBAMA',
    officer_protocol TEXT NOT NULL,
    status TEXT DEFAULT 'LAVRADO', -- 'LAVRADO', 'NOTIFICADO', 'EMBARGADO', 'ARQUIVADO'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_infraction_protocol ON public.infraction_notices (protocol_number);
CREATE INDEX IF NOT EXISTS idx_infraction_car ON public.infraction_notices (car_receipt);

-- 5. Função PostGIS de Interseção Espacial Imediata (Spatial Intersect)
CREATE OR REPLACE FUNCTION public.fn_intersect_land_parcel(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE (
    car_receipt TEXT,
    property_name TEXT,
    owner_name TEXT,
    owner_document TEXT,
    car_status TEXT,
    status_reason TEXT,
    total_area_ha DOUBLE PRECISION,
    sigef_parcel_code TEXT,
    cadastral_type TEXT,
    estimated_fine_brl DOUBLE PRECISION
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_pt GEOMETRY;
BEGIN
    v_pt := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    RETURN QUERY
    SELECT 
        lp.car_receipt,
        lp.property_name,
        lp.owner_name,
        lp.owner_document,
        lp.car_status,
        lp.status_reason,
        lp.total_area_ha,
        lp.sigef_parcel_code,
        lp.cadastral_type,
        (lp.total_area_ha * lp.estimated_fine_per_ha * 0.05) AS estimated_fine_brl
    FROM public.land_parcels lp
    WHERE lp.geom IS NOT NULL AND ST_Contains(lp.geom, v_pt)
    LIMIT 1;
END;
$$;

-- 6. Função PostGIS de Busca em Raio Geodésico (Radar Buffer em Metros)
CREATE OR REPLACE FUNCTION public.fn_nearby_fires(
    p_lat DOUBLE PRECISION, 
    p_lng DOUBLE PRECISION, 
    p_radius_meters DOUBLE PRECISION
)
RETURNS SETOF public.fire_spots
LANGUAGE sql
AS $$
    SELECT *
    FROM public.fire_spots
    WHERE ST_DWithin(
        geom::geography, 
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, 
        p_radius_meters
    )
    ORDER BY frp_mw DESC;
$$;

-- 7. Ativação do Supabase Realtime para Notificações Instantâneas
ALTER PUBLICATION supabase_realtime ADD TABLE public.fire_spots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.infraction_notices;

-- 8. Políticas de Segurança (Row Level Security - RLS)
ALTER TABLE public.fire_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infraction_notices ENABLE ROW LEVEL SECURITY;

-- Leitura pública para interfaces de monitoramento (C2 / Dashboard)
CREATE POLICY "Leitura Pública de Focos" ON public.fire_spots FOR SELECT USING (true);
CREATE POLICY "Leitura Pública de Parcelas" ON public.land_parcels FOR SELECT USING (true);
CREATE POLICY "Leitura Pública de Autos de Infração" ON public.infraction_notices FOR SELECT USING (true);

-- Inserção / Atualização para clientes autenticados ou anon autorizados
CREATE POLICY "Inserção de Focos Autorizada" ON public.fire_spots FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização de Status de Focos" ON public.fire_spots FOR UPDATE USING (true);
CREATE POLICY "Inserção de Autos de Infração" ON public.infraction_notices FOR INSERT WITH CHECK (true);


-- 9. Tabela de Perfis de Usuários (Vinculada ao auth.users do Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_whatsapp TEXT,
    company_name TEXT,
    role TEXT DEFAULT 'operator', -- 'operator', 'commander', 'auditor'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS em Perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário acessa seu próprio perfil"
ON public.profiles FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Trigger para salvar nome, telefone e empresa automaticamente ao cadastrar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone_whatsapp, company_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Operador C2'),
        NEW.raw_user_meta_data->>'phone_whatsapp',
        NEW.raw_user_meta_data->>'company_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
