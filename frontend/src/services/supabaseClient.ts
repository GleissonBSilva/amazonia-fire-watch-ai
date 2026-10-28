/**
 * Amazônia Fire-Watch AI • Supabase Realtime & PostGIS Client
 * 
 * Gerencia a conexão com o banco de dados PostgreSQL do Supabase,
 * habilitando persistência espacial de focos de incêndio,
 * consultas PostGIS e assinaturas em tempo real (Supabase Realtime).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FireSpot, InfractionDossier } from '../types';

// Obtém credenciais das variáveis de ambiente do Vite de forma resiliente
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id')
);

// Instância singleton do cliente Supabase
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Consulta focos de incêndio persistidos no Supabase PostGIS
 */
export async function fetchFiresFromSupabase(limit: number = 500): Promise<FireSpot[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('fire_spots')
      .select('*')
      .order('frp_mw', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Supabase: Erro na consulta de focos:', error.message);
      return [];
    }

    return (data || []) as FireSpot[];
  } catch (err) {
    console.warn('Supabase: Falha de conexão:', err);
    return [];
  }
}

/**
 * Insere ou atualiza um foco térmico no Supabase
 */
export async function upsertFireSpotToSupabase(spot: FireSpot): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('fire_spots').upsert({
      id: spot.id,
      latitude: spot.latitude,
      longitude: spot.longitude,
      frp_mw: spot.frp_mw,
      bright_ti4_k: spot.bright_ti4_k,
      confidence: spot.confidence,
      satellite: spot.satellite,
      municipality: spot.municipality,
      state: spot.state,
      address: spot.address,
      country_code: spot.country_code || 'BR',
      country_name: spot.country_name || 'Brasil',
      continent: spot.continent || 'América do Sul',
      biome: spot.biome,
      detection_type: spot.detection_type || 'CONFIRMADO_POLAR',
      is_geostationary_preliminary: spot.is_geostationary_preliminary || false,
      is_simulated: spot.is_simulated || false,
      is_new_outbreak: spot.is_new_outbreak || false,
      status: spot.status || 'PENDENTE',
      dispatched_at: spot.dispatched_at ? new Date().toISOString() : null,
      aqi: spot.aqi,
      pm25: spot.pm25,
      air_quality_level: spot.air_quality_level,
      detected_at: spot.detected_at,
    });

    if (error) {
      console.warn('Supabase: Erro ao persistir foco:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase: Falha ao enviar foco:', err);
    return false;
  }
}

/**
 * Registra um Auto de Infração Ambiental Preliminar no Supabase
 */
export async function saveInfractionToSupabase(dossier: InfractionDossier): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('infraction_notices').insert({
      protocol_number: dossier.protocolNumber,
      fire_spot_id: dossier.spot.id,
      car_receipt: dossier.property.car_receipt,
      target_name: dossier.property.owner_name,
      target_document: dossier.property.owner_document,
      property_name: dossier.property.property_name,
      municipality: dossier.spot.municipality,
      state: dossier.spot.state,
      latitude: dossier.spot.latitude,
      longitude: dossier.spot.longitude,
      satellite: dossier.spot.satellite,
      frp_mw: dossier.spot.frp_mw,
      burnt_area_ha: dossier.burntAreaHaEstimate,
      estimated_fine_brl: dossier.estimatedFineBrl,
      legal_articles: dossier.infractionArticles,
      environmental_damage: dossier.environmentalDamageEstimate,
      responsible_authority: dossier.responsibleAuthority,
      officer_protocol: dossier.officerSignatureProtocol,
      status: 'LAVRADO',
    });

    if (error) {
      console.warn('Supabase: Erro ao registrar auto de infração:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase: Falha ao registrar auto de infração:', err);
    return false;
  }
}

/**
 * Escuta novos focos e atualizações em tempo real via Supabase Realtime
 */
export function subscribeToRealtimeFires(onNewSpot: (spot: FireSpot) => void): (() => void) | null {
  if (!supabase) return null;

  const channel = supabase
    .channel('realtime_fire_spots')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'fire_spots' },
      (payload) => {
        if (payload.new) {
          onNewSpot(payload.new as FireSpot);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
