import { FireSpot } from '../types';

/**
 * Raio máximo em km para considerar duas leituras do satélite como o MESMO foco de incêndio ativo.
 * Valor padrão da literatura orbital (INPE/NASA FIRMS): 2.5 km (resolução espacial do cluster de pixel).
 */
export const DEFAULT_CLUSTER_RADIUS_KM = 2.5;

/**
 * Tempo máximo em minutos (24 horas = 1440 min) para um foco sem nova leitura permanecer ativo.
 * Após este limiar sem anomalia térmica, o foco é encerrado e removido para evitar trilhas de pontos fantasmas.
 */
export const DEFAULT_MAX_INACTIVE_MINUTES = 24 * 60; // 1440 min

/**
 * Calcula distância geográfica aproximada em km entre dois pontos (fórmula Haversine otimizada).
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determina se a leitura orbital foi DIURNA (☀️) ou NOTURNA (🌙) com base no horário solar local.
 */
export function determineReadingPeriod(
  dateIsoOrStr?: string,
  lat?: number,
  lng?: number
): 'DIURNO' | 'NOTURNO' {
  try {
    let date = dateIsoOrStr ? new Date(dateIsoOrStr) : new Date();
    if (isNaN(date.getTime())) {
      date = new Date();
    }

    // Offset solar aproximado pelo meridiano de longitude (-60° lng = UTC-4 horas)
    const longitudeOffsetHours = lng != null ? lng / 15 : -4;
    const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
    let localSolarHour = (utcHours + longitudeOffsetHours + 24) % 24;

    // Período Diurno: 06:00 às 18:00 no horário solar local
    if (localSolarHour >= 6.0 && localSolarHour < 18.0) {
      return 'DIURNO';
    }
    return 'NOTURNO';
  } catch {
    return 'DIURNO';
  }
}

/**
 * Determina a tendência de expansão ou regressão do incêndio comparando o FRP anterior com o atual.
 */
export function determineFireTrend(
  currentFrp: number,
  previousFrp?: number
): 'ATIVO' | 'ALASTRAMENTO' | 'DIMINUINDO' | 'ESTAVEL' {
  if (previousFrp == null || previousFrp <= 0) {
    return 'ATIVO';
  }

  // Aumento de mais de 15% na intensidade térmica indica alastramento ativo
  if (currentFrp >= previousFrp * 1.15) {
    return 'ALASTRAMENTO';
  }

  // Queda de mais de 20% na intensidade térmica indica diminuição do fogo
  if (currentFrp <= previousFrp * 0.8) {
    return 'DIMINUINDO';
  }

  return 'ESTAVEL';
}

export interface UpsertOptions {
  radiusKm?: number;
  maxInactiveMinutes?: number;
}

/**
 * Motor de Atualização Direta no Mesmo Registro (Upsert):
 *
 * 1. Um único registro por fogo ativo:
 *    - Se uma nova leitura cair no raio de um foco ativo já existente (<= 2.5 km), é o mesmo evento.
 *    - Congela `first_detected_at` e `first_detected_iso` com o valor original da 1ª detecção.
 *    - Sobrescreve diretamente dados voláteis: FRP, Coordenadas (frente do fogo), Temperatura, Satélite, Período (☀️/🌙).
 *
 * 2. Limpeza de pontos fantasmas:
 *    - Descarta ou encerra focos que deixaram de ser detectados após o tempo limite (24h).
 */
export function upsertFireSpots(
  existingSpots: FireSpot[],
  incomingSpots: FireSpot[],
  options: UpsertOptions = {}
): FireSpot[] {
  const radiusThreshold = options.radiusKm ?? DEFAULT_CLUSTER_RADIUS_KM;
  const maxInactiveMinutes = options.maxInactiveMinutes ?? DEFAULT_MAX_INACTIVE_MINUTES;

  // Mapa de focos ativos por ID
  const activeSpots: FireSpot[] = existingSpots.map((s) => ({ ...s }));

  for (const incoming of incomingSpots) {
    if (!incoming || incoming.latitude == null || incoming.longitude == null) continue;

    // 1. Procura se já existe um foco ativo no mesmo raio ou com mesmo ID
    let matchIndex = -1;

    // A. Busca por ID direto
    if (incoming.id) {
      matchIndex = activeSpots.findIndex((s) => s.id === incoming.id);
    }

    // B. Se não encontrou por ID, busca por proximidade espacial (mesmo raio de cluster)
    if (matchIndex === -1) {
      let closestDist = Infinity;
      for (let i = 0; i < activeSpots.length; i++) {
        const existing = activeSpots[i];
        const dist = calculateDistanceKm(
          existing.latitude,
          existing.longitude,
          incoming.latitude,
          incoming.longitude
        );

        if (dist <= radiusThreshold && dist < closestDist) {
          closestDist = dist;
          matchIndex = i;
        }
      }
    }

    // Determina período da leitura (☀️ Diurno / 🌙 Noturno)
    const period = determineReadingPeriod(
      incoming.detected_iso || incoming.detected_at,
      incoming.latitude,
      incoming.longitude
    );

    if (matchIndex >= 0) {
      // ENCONTROU O MESMO EVENTO: UPSERT DIRETO NO MESMO REGISTRO
      const existing = activeSpots[matchIndex];

      // A. Congela início (preserva a primeira detecção original)
      const frozenFirstDetectedAt = existing.first_detected_at || existing.detected_at || incoming.detected_at;
      const frozenFirstDetectedIso = existing.first_detected_iso || existing.detected_iso || incoming.detected_iso;
      const frozenInitialFrp = existing.initial_frp_mw != null ? existing.initial_frp_mw : existing.frp_mw;

      // B. Calcula tendência comparando leitura anterior vs atual
      const trend = determineFireTrend(incoming.frp_mw, existing.frp_mw);

      // C. Sobrescreve dados voláteis com os dados frescos da última passagem
      activeSpots[matchIndex] = {
        ...existing,
        // Mantém ID único e identificadores de status de despacho
        id: existing.id,
        status: existing.status || incoming.status || 'PENDENTE',
        dispatched_at: existing.dispatched_at || incoming.dispatched_at,

        // INÍCIO CONGELADO:
        first_detected_at: frozenFirstDetectedAt,
        first_detected_iso: frozenFirstDetectedIso,
        initial_frp_mw: frozenInitialFrp,

        // ESTADO ATUAL FRESCO (ÚLTIMA LEITURA):
        prev_frp_mw: existing.frp_mw,
        frp_mw: incoming.frp_mw,
        latitude: incoming.latitude, // Atualiza frente ativa de fogo
        longitude: incoming.longitude,
        bright_ti4_k: incoming.bright_ti4_k,
        confidence: incoming.confidence,
        satellite: incoming.satellite,
        address: incoming.address || existing.address,
        municipality: incoming.municipality || existing.municipality,
        state: incoming.state || existing.state,
        biome: incoming.biome || existing.biome,
        is_brazil: incoming.is_brazil !== false && existing.is_brazil !== false,
        country_name: incoming.country_name || existing.country_name,
        country_code: incoming.country_code || existing.country_code,
        continent: incoming.continent || existing.continent,

        // Timestamps da passagem mais recente
        last_detected_at: incoming.detected_at,
        last_detected_iso: incoming.detected_iso,
        detected_at: incoming.detected_at,
        detected_iso: incoming.detected_iso,
        minutes_ago: incoming.minutes_ago ?? 0,

        // Metadados dinâmicos adicionados
        reading_period: period,
        fire_trend: trend,
        readings_count: (existing.readings_count || 1) + 1,
        is_active_fire: true,
        last_seen_at: new Date().toISOString(),

        // Qualidade do ar e telemetria atualizada
        aqi: incoming.aqi != null ? incoming.aqi : existing.aqi,
        pm25: incoming.pm25 != null ? incoming.pm25 : existing.pm25,
        air_quality_level: incoming.air_quality_level || existing.air_quality_level,
        is_new_outbreak: (incoming.minutes_ago ?? 0) <= 180,
      };
    } else {
      // NOVO FOCO DETECTADO PELA PRIMEIRA VEZ
      const newSpot: FireSpot = {
        ...incoming,
        first_detected_at: incoming.detected_at,
        first_detected_iso: incoming.detected_iso,
        last_detected_at: incoming.detected_at,
        last_detected_iso: incoming.detected_iso,
        initial_frp_mw: incoming.frp_mw,
        prev_frp_mw: incoming.frp_mw,
        fire_trend: 'ATIVO',
        reading_period: period,
        readings_count: 1,
        is_active_fire: true,
        last_seen_at: new Date().toISOString(),
      };
      activeSpots.push(newSpot);
    }
  }

  // 2. Encerramento de registros que deixaram de ser detectados (eliminação de pontos fantasmas)
  return activeSpots.filter((spot) => {
    // Se o foco tiver mais de 24 horas (1440 min) sem nenhuma nova confirmação, encerra
    const elapsedMinutes = spot.minutes_ago ?? 0;
    if (elapsedMinutes > maxInactiveMinutes) {
      return false; // Remove ponto fantasma extinto
    }
    return true;
  });
}
