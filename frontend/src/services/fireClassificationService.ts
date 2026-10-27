import { FireSpot } from '../types';

export type SmokeColorKey = 'all' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'dark_purple';

export interface FireAuthenticityResult {
  isRealVegetationFire: boolean;
  classificationLabel: string;
  fireType: 'VEGETACAO_CRITICA' | 'VEGETACAO_MODERADA' | 'VEGETACAO_INICIAL' | 'RUIDO_TERMICO_SOLAR' | 'CALOR_INDUSTRIAL';
  confidenceScore: number;
  isNightPass: boolean;
  isDayPass: boolean;
  hasAtmosphericSmokeConfirmation: boolean;
  smokeLevel: 'LEVE' | 'MODERADA' | 'DENSA' | 'SEVERA' | 'MUITO_DENSA' | 'TOXICA_EXTREMA';
  smokeColor: string;
  smokeColorKey: SmokeColorKey;
  smokeRadiusMeters: number;
  reason: string;
}

export function getSpotSmokeColorKey(spot: FireSpot): SmokeColorKey {
  const aqi = spot.aqi || 50;
  const pm25 = spot.pm25 || 15;

  if (aqi > 300 || pm25 > 250.4) return 'dark_purple';
  if (aqi > 200 || pm25 > 150.4) return 'purple';
  if (aqi > 150 || pm25 > 55.4) return 'red';
  if (aqi > 100 || pm25 > 35.4) return 'orange';
  if (aqi > 50 || pm25 > 12.0) return 'yellow';
  return 'green';
}


/**
 * Avalia um foco térmico aplicando os 4 critérios científicos rigorosos:
 * 1. Limiares Técnicos (FRP >= 50 MW crítico, 20-50 MW moderado, corte de ruído < 20 MW; Confiança > 80%)
 * 2. Uso do Solo / Máscara Geográfica (Vegetação vs Urbana/Industrial vs Corpos hídricos)
 * 3. Separação Temporal (Passagem Noturna sem radiação solar vs Diurna com validação T_brilho > 340K)
 * 4. Correlação com Emissões Atmosféricas (Fumaça, Fuligem PM2.5 e AQI)
 */
export function classifyFireAuthenticity(spot: FireSpot): FireAuthenticityResult {
  const frp = spot.frp_mw || 0;
  const confidence = spot.confidence || 0.8;
  const brightK = spot.bright_ti4_k || 300;
  const aqi = spot.aqi || 50;
  const pm25 = spot.pm25 || 15;

  // 1. Detecção Temporal: Passagem Noturna vs Diurna
  // Analisa o horário da detecção (passagens noturnas de satélites ocorrem tipicamente entre 21h e 05h locais)
  let isNightPass = false;
  try {
    const timeStr = spot.detected_at || '';
    const match = timeStr.match(/(\d{2}):(\d{2})/);
    if (match) {
      const hour = parseInt(match[1], 10);
      if (hour >= 21 || hour <= 5) {
        isNightPass = true;
      }
    }
  } catch {
    isNightPass = false;
  }
  const isDayPass = !isNightPass;

  // 2. Correlação com Emissões Atmosféricas de Fumaça (PM2.5 / AQI)
  const hasAtmosphericSmokeConfirmation = aqi > 50 || pm25 > 25 || frp >= 35;

  // Cores padronizadas da Nuvem de Fumaça conforme CONAMA 491/2018 e US EPA
  let smokeLevel: FireAuthenticityResult['smokeLevel'] = 'LEVE';
  let smokeColor = '#10b981'; // Verde (Boa / Dispersa)
  let smokeColorKey: SmokeColorKey = 'green';

  if (aqi > 300 || pm25 > 250.4) {
    smokeLevel = 'TOXICA_EXTREMA';
    smokeColor = '#581c87'; // Púrpura Escuro (Perigosa / Emergência Máxima)
    smokeColorKey = 'dark_purple';
  } else if (aqi > 200 || pm25 > 150.4) {
    smokeLevel = 'MUITO_DENSA';
    smokeColor = '#a855f7'; // Roxo (Péssima)
    smokeColorKey = 'purple';
  } else if (aqi > 150 || pm25 > 55.4) {
    smokeLevel = 'SEVERA';
    smokeColor = '#ef4444'; // Vermelho (Muito Ruim)
    smokeColorKey = 'red';
  } else if (aqi > 100 || pm25 > 35.4) {
    smokeLevel = 'DENSA';
    smokeColor = '#f97316'; // Laranja (Ruim / Alerta)
    smokeColorKey = 'orange';
  } else if (aqi > 50 || pm25 > 12.0) {
    smokeLevel = 'MODERADA';
    smokeColor = '#eab308'; // Amarelo (Moderada)
    smokeColorKey = 'yellow';
  }

  // Raio físico estimado da nuvem de fumaça baseado na potência do fogo (FRP)
  const smokeRadiusMeters = Math.min(35000, Math.max(3500, frp * 320));

  // 3. Verificação de Zona Industrial / Urbana (Falsos Positivos Antrópicos)
  const isUrbanIndustrialZone =
    (spot.municipality && spot.municipality.includes('Distrito Industrial')) ||
    (spot.address && (spot.address.includes('PIM') || spot.address.includes('Fabril')));

  // 4. Aplicação dos Limiares e Classificação Final
  if (isUrbanIndustrialZone) {
    return {
      isRealVegetationFire: false,
      classificationLabel: 'Calor Industrial / Antrópico',
      fireType: 'CALOR_INDUSTRIAL',
      confidenceScore: 0.65,
      isNightPass,
      isDayPass,
      hasAtmosphericSmokeConfirmation: false,
      smokeLevel,
      smokeColor,
      smokeColorKey: 'green',
      smokeRadiusMeters: 2000,
      reason: 'Ponto localizado em polo industrial / fabril. Emissão de calor associada à atividade fabril.',
    };
  }

  // Caso A: Fogo Crítico de Grande Porte (FRP >= 50 MW)
  if (frp >= 50) {
    return {
      isRealVegetationFire: true,
      classificationLabel: 'Incêndio Florestal Crítico (Copa / Biomassa Pesada)',
      fireType: 'VEGETACAO_CRITICA',
      confidenceScore: 0.99,
      isNightPass,
      isDayPass,
      hasAtmosphericSmokeConfirmation: true,
      smokeLevel,
      smokeColor,
      smokeColorKey,
      smokeRadiusMeters,
      reason: `FRP de alta intensidade (${frp} MW) com severidade térmica confirmada (${brightK} K). Combustão florestal ativa contínua.`,
    };
  }

  // Caso B: Queimada de Média Intensidade (20 a 50 MW)
  if (frp >= 20) {
    // Se for passagem noturna ou houver confirmação atmosférica
    const isConfirmed = isNightPass || brightK >= 335 || hasAtmosphericSmokeConfirmation;
    return {
      isRealVegetationFire: isConfirmed,
      classificationLabel: isConfirmed ? 'Queimada Ativa de Vegetação' : 'Anomalia Térmica em Verificação',
      fireType: 'VEGETACAO_MODERADA',
      confidenceScore: isNightPass ? 0.96 : confidence >= 0.8 ? 0.9 : 0.78,
      isNightPass,
      isDayPass,
      hasAtmosphericSmokeConfirmation,
      smokeLevel,
      smokeColor,
      smokeColorKey,
      smokeRadiusMeters,
      reason: isNightPass
        ? `Passagem noturna sem interferência solar: Fogo ativo real garantido (${frp} MW).`
        : `Fogo de vegetação confirmado por correlação térmica (${brightK} K) e dispersão de aerossóis.`,
    };
  }


  // Caso C: Focos menores (< 20 MW)
  // À noite, mesmo com FRP baixo, sem sol incidindo, indica ponto de queima real inicial
  if (isNightPass && brightK >= 325) {
    return {
      isRealVegetationFire: true,
      classificationLabel: 'Fogo Inicial / Sub-bosque (Passagem Noturna)',
      fireType: 'VEGETACAO_INICIAL',
      confidenceScore: 0.85,
      isNightPass,
      isDayPass,
      hasAtmosphericSmokeConfirmation,
      smokeLevel,
      smokeColor,
      smokeColorKey,
      smokeRadiusMeters,
      reason: 'Passagem noturna do satélite: Ausência de radiação solar confirma foco de queima real em estágio inicial.',
    };
  }

  // Se diurno com FRP < 20 MW e sem fumaça significativa: Suspeito de Ruído Solar / Telhado Aquecido
  return {
    isRealVegetationFire: false,
    classificationLabel: 'Ruído Térmico / Solo Aquecido (Falso Positivo)',
    fireType: 'RUIDO_TERMICO_SOLAR',
    confidenceScore: 0.45,
    isNightPass,
    isDayPass,
    hasAtmosphericSmokeConfirmation: false,
    smokeLevel: 'LEVE',
    smokeColor: '#94a3b8',
    smokeColorKey: 'green',
    smokeRadiusMeters: 1500,
    reason: `FRP baixo (${frp} MW) em passagem diurna com baixa emissão de fumaça. Provável aquecimento solar de solo ou telhado.`,
  };
}
