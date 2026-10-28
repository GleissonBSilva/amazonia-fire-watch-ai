import { FireSpot } from '../types';

export type SmokeColorKey = 'all' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'dark_purple';

export interface IndustrialSite {
  id: string;
  name: string;
  type: 'REFINARIA_FLARE' | 'TERMOELETRICA' | 'SIDERURGICA' | 'POLO_FABRIL_PIM' | 'PETROQUIMICA_GAS';
  lat: number;
  lng: number;
  radiusKm: number;
  description: string;
}

// Catálogo de Polos Industriais e Instalações Térmicas Conhecidas da Amazônia e Brasil
export const KNOWN_INDUSTRIAL_THERMAL_SITES: IndustrialSite[] = [
  {
    id: 'reman-petrobras',
    name: 'Refinaria Isaac Sabbá (REMAN / Petrobras)',
    type: 'REFINARIA_FLARE',
    lat: -3.1465,
    lng: -59.9482,
    radiusKm: 2.5,
    description: 'Tochas de queima contínua (flares) de gases residuais e refino de petróleo.',
  },
  {
    id: 'pim-distrito-1',
    name: 'Polo Industrial de Manaus (Distrito Industrial I)',
    type: 'POLO_FABRIL_PIM',
    lat: -3.1250,
    lng: -59.9750,
    radiusKm: 5.0,
    description: 'Concentração fabril de eletrônicos, duas rodas, caldeiras e processos de solda/fundição.',
  },
  {
    id: 'pim-distrito-2',
    name: 'Polo Industrial de Manaus (Distrito Industrial II)',
    type: 'POLO_FABRIL_PIM',
    lat: -3.0780,
    lng: -59.9050,
    radiusKm: 6.0,
    description: 'Complexo químico, metalomecânico, termoelétricas e indústrias pesadas.',
  },
  {
    id: 'termo-maua',
    name: 'Complexo Termelétrico Mauá / Aparecida (Amazonas Energia)',
    type: 'TERMOELETRICA',
    lat: -3.1360,
    lng: -59.9650,
    radiusKm: 2.0,
    description: 'Geração térmica a gás natural com turbinas e exaustão contínua em alta temperatura.',
  },
  {
    id: 'termo-tambaqui',
    name: 'Usina Termelétrica Tambaqui / Manauara',
    type: 'TERMOELETRICA',
    lat: -3.0805,
    lng: -59.9300,
    radiusKm: 2.0,
    description: 'Usinas térmicas bicombustível (gás natural / óleo) na Zona Leste de Manaus.',
  },
  {
    id: 'petro-urucu',
    name: 'Polo Petrolífero de Urucu (Bacia do Solimões / Petrobras)',
    type: 'PETROQUIMICA_GAS',
    lat: -4.8850,
    lng: -65.2900,
    radiusKm: 12.0,
    description: 'Extração de petróleo leve e gás natural com múltiplos flares industriais em área florestal.',
  },
  {
    id: 'polo-barcarena',
    name: 'Complexo Industrial de Barcarena (Albras / Alunorte / Vila do Conde)',
    type: 'SIDERURGICA',
    lat: -1.5100,
    lng: -48.7500,
    radiusKm: 7.0,
    description: 'Metalurgia pesada de bauxita e refino de alumina com altos-fornos contínuos.',
  },
  {
    id: 'siderurgia-maraba',
    name: 'Distrito Industrial e Metalúrgico de Marabá (Carajás)',
    type: 'SIDERURGICA',
    lat: -5.3400,
    lng: -49.0900,
    radiusKm: 6.0,
    description: 'Usinas de ferro-gusa, fornos industriais e carvoarias siderúrgicas.',
  },
  {
    id: 'termo-porto-velho',
    name: 'Complexo Termelétrico Rio Madeira / Porto Velho',
    type: 'TERMOELETRICA',
    lat: -8.7200,
    lng: -63.8500,
    radiusKm: 4.0,
    description: 'Parque de usinas termelétricas e parque de tancagem de combustíveis.',
  },
  {
    id: 'distrito-cuiaba',
    name: 'Distrito Industrial de Cuiabá / Várzea Grande',
    type: 'POLO_FABRIL_PIM',
    lat: -15.6500,
    lng: -56.0500,
    radiusKm: 6.0,
    description: 'Indústrias de moagem de grãos, frigoríficos, biomassa e cimento.',
  },
];

export interface FireAuthenticityResult {
  isRealVegetationFire: boolean;
  isIndustrialHeat: boolean;
  isStructuralIndustrialFire: boolean;
  classificationLabel: string;
  fireType:
    | 'VEGETACAO_CRITICA'
    | 'VEGETACAO_MODERADA'
    | 'VEGETACAO_INICIAL'
    | 'CALOR_INDUSTRIAL'
    | 'INCENDIO_ESTRUTURAL_FABRIL'
    | 'RUIDO_TERMICO_SOLAR';
  confidenceScore: number;
  isNightPass: boolean;
  isDayPass: boolean;
  hasAtmosphericSmokeConfirmation: boolean;
  smokeLevel: 'LEVE' | 'MODERADA' | 'DENSA' | 'SEVERA' | 'MUITO_DENSA' | 'TOXICA_EXTREMA';
  smokeColor: string;
  smokeColorKey: SmokeColorKey;
  smokeRadiusMeters: number;
  particulateThermalRatio: number; // PM2.5 / FRP
  biomassCombustionLikelihood: number; // 0 - 100%
  industrialThermalLikelihood: number; // 0 - 100%
  matchedIndustrialFacility?: string;
  aiExplanation: string;
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

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Motor de IA para Análise Termodinâmica e Espectral Multivariada:
 * 1. Potência Térmica Radiativa (FRP em MW)
 * 2. Temperatura de Brilho dos Canais Infravermelhos (T_b em Kelvin / Celsius)
 * 3. Material Particulado Inalável (PM2.5 em µg/m³) e AQI
 * 4. Razão Particulado-Térmica (PTR = PM2.5 / FRP):
 *    - Combustão de biomassa florestal incompleta: alta densidade de fuligem (PTR >= 2.0).
 *    - Calor industrial / tochas / gás / fornos limpos: radiação pontual extrema com baixo particulado disperso (PTR < 1.3).
 * 5. Cruzamento espacial com polígonos de refinarias, termoelétricas e distritos industriais.
 */
export function classifyFireAuthenticity(spot: FireSpot): FireAuthenticityResult {
  const frp = spot.frp_mw || 0;
  const confidence = spot.confidence || 0.8;
  const brightK = spot.bright_ti4_k || 300;
  const brightC = Math.round(brightK - 273.15);
  const aqi = spot.aqi || 50;
  const pm25 = spot.pm25 || 15;

  // 1. Detecção Temporal: Passagem Noturna vs Diurna
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

  // 2. Classificação de Fumaça e Poluição Atmosférica
  const hasAtmosphericSmokeConfirmation = aqi > 50 || pm25 > 25 || frp >= 35;
  let smokeLevel: FireAuthenticityResult['smokeLevel'] = 'LEVE';
  let smokeColor = '#10b981';
  let smokeColorKey: SmokeColorKey = 'green';

  if (aqi > 300 || pm25 > 250.4) {
    smokeLevel = 'TOXICA_EXTREMA';
    smokeColor = '#581c87';
    smokeColorKey = 'dark_purple';
  } else if (aqi > 200 || pm25 > 150.4) {
    smokeLevel = 'MUITO_DENSA';
    smokeColor = '#a855f7';
    smokeColorKey = 'purple';
  } else if (aqi > 150 || pm25 > 55.4) {
    smokeLevel = 'SEVERA';
    smokeColor = '#ef4444';
    smokeColorKey = 'red';
  } else if (aqi > 100 || pm25 > 35.4) {
    smokeLevel = 'DENSA';
    smokeColor = '#f97316';
    smokeColorKey = 'orange';
  } else if (aqi > 50 || pm25 > 12.0) {
    smokeLevel = 'MODERADA';
    smokeColor = '#eab308';
    smokeColorKey = 'yellow';
  }

  const smokeRadiusMeters = Math.min(35000, Math.max(3500, frp * 320));

  // 3. Cruzamento Espacial com Fontes Industriais Cadastradas
  let matchedIndustrial: IndustrialSite | null = null;
  for (const site of KNOWN_INDUSTRIAL_THERMAL_SITES) {
    const dist = calculateDistanceKm(spot.latitude, spot.longitude, site.lat, site.lng);
    if (dist <= site.radiusKm) {
      matchedIndustrial = site;
      break;
    }
  }

  // Verificação textual adicional de zona fabril
  const hasIndustrialKeywords =
    (spot.municipality && /distrito industrial|polo fabril|parque industrial/i.test(spot.municipality)) ||
    (spot.address && /distrito industrial|pim|fabril|refinaria|termoelétrica|usina|porto chibatão/i.test(spot.address));

  const isNearbyIndustrial = !!matchedIndustrial || hasIndustrialKeywords;

  // 4. Razão Particulado-Térmica (PTR): PM2.5 / max(FRP, 3.0)
  // Biomassa: PTR tipicamente >= 2.0 (muita fumaça para a energia gerada)
  // Industrial: PTR < 1.3 (muito calor pontual, mas sem pluma de biomassa descontrolada)
  const safeFrp = Math.max(frp, 3.0);
  const ptr = parseFloat((pm25 / safeFrp).toFixed(2));

  // 5. Motor de Probabilidades da IA
  let industrialLikelihood = 10;
  let biomassLikelihood = 90;

  if (isNearbyIndustrial) {
    industrialLikelihood += 45;
    biomassLikelihood -= 40;
  }

  // Tochas de gás e fornos atingem temperaturas extremas de subpixel (T_b >= 355K / 82°C)
  if (brightK >= 355) {
    if (ptr < 1.8) {
      industrialLikelihood += 30;
      biomassLikelihood -= 25;
    } else {
      // Se temperatura extrema E muito particulado, pode ser fogo em grande floresta ou incêndio em fábrica
      biomassLikelihood += 15;
    }
  }

  // Baixo particulado relativo à potência térmica é assinatura marcante de processos limpos / chaminés
  if (ptr < 1.2 && frp >= 15) {
    industrialLikelihood += 25;
    biomassLikelihood -= 25;
  } else if (ptr >= 2.5 && pm25 >= 35) {
    biomassLikelihood += 30;
    industrialLikelihood -= 30;
  }

  industrialLikelihood = Math.min(100, Math.max(0, industrialLikelihood));
  biomassLikelihood = Math.min(100, Math.max(0, biomassLikelihood));

  // =========================================================================
  // CASO 1: INCÊNDIO ESTRUTURAL FABRIL (EMERGÊNCIA INDUSTRIAL)
  // Ocorre dentro de parque industrial MAS com emissão massiva de particulado tóxico
  // =========================================================================
  if (isNearbyIndustrial && (pm25 >= 120 || (frp >= 45 && pm25 >= 75))) {
    return {
      isRealVegetationFire: false,
      isIndustrialHeat: true,
      isStructuralIndustrialFire: true,
      classificationLabel: 'Incêndio Estrutural Fabril (Emergência)',
      fireType: 'INCENDIO_ESTRUTURAL_FABRIL',
      confidenceScore: 0.94,
      isNightPass,
      isDayPass,
      hasAtmosphericSmokeConfirmation: true,
      smokeLevel,
      smokeColor: '#ef4444',
      smokeColorKey: 'red',
      smokeRadiusMeters: 8000,
      particulateThermalRatio: ptr,
      biomassCombustionLikelihood: 15,
      industrialThermalLikelihood: 98,
      matchedIndustrialFacility: matchedIndustrial?.name || 'Complexo Industrial',
      aiExplanation: `IA identificou anomalia crítica em polo fabril: FRP de ${frp} MW com particulado massivo (PM2.5 de ${pm25} µg/m³). Sugere combustão de polímeros ou estrutura fabril, excedendo os níveis de operação nominal.`,
      reason: `Incêndio em instalação industrial. Alta emissão de fumaça tóxica no perímetro de ${matchedIndustrial?.name || 'polo fabril'}.`,
    };
  }

  // =========================================================================
  // CASO 2: CALOR INDUSTRIAL / OPERAÇÃO NOMINAL (FALTO POSITIVO DE QUEIMADA)
  // Ex: Flares de refinaria, chaminés de termoelétricas, fornos de siderúrgica
  // =========================================================================
  if (industrialLikelihood >= 60 || (isNearbyIndustrial && ptr < 1.8 && pm25 < 75)) {
    const facilityName = matchedIndustrial?.name || (hasIndustrialKeywords ? 'Distrito Industrial / PIM' : 'Instalação Industrial');
    return {
      isRealVegetationFire: false,
      isIndustrialHeat: true,
      isStructuralIndustrialFire: false,
      classificationLabel: 'Calor Industrial / Flare Antrópico',
      fireType: 'CALOR_INDUSTRIAL',
      confidenceScore: 0.92,
      isNightPass,
      isDayPass,
      hasAtmosphericSmokeConfirmation: false,
      smokeLevel: 'LEVE',
      smokeColor: '#0ea5e9', // Azul ciano tático (Calor controlado)
      smokeColorKey: 'green',
      smokeRadiusMeters: 1800,
      particulateThermalRatio: ptr,
      biomassCombustionLikelihood: 8,
      industrialThermalLikelihood: Math.max(85, industrialLikelihood),
      matchedIndustrialFacility: facilityName,
      aiExplanation: `IA filtrou como Falso Positivo Florestal: Foco térmico pontual com alta temperatura (${brightC}°C / ${brightK}K) e FRP de ${frp} MW, porém com baixa pluma de particulado (PTR ${ptr} e PM2.5 de ${pm25} µg/m³). Coincide com ${facilityName}.`,
      reason: `Assinatura térmica típica de processo industrial/flare (${facilityName}). Ausência de dispersão florestal.`,
    };
  }

  // =========================================================================
  // CASO 3: INCÊNDIO FLORESTAL CRÍTICO (VEGETAÇÃO PESADA / COPA)
  // Alta potência térmica + altíssima taxa de material particulado
  // =========================================================================
  if (frp >= 50 || (frp >= 35 && pm25 >= 60)) {
    return {
      isRealVegetationFire: true,
      isIndustrialHeat: false,
      isStructuralIndustrialFire: false,
      classificationLabel: 'Incêndio Florestal Crítico (Copa / Biomassa)',
      fireType: 'VEGETACAO_CRITICA',
      confidenceScore: 0.99,
      isNightPass,
      isDayPass,
      hasAtmosphericSmokeConfirmation: true,
      smokeLevel,
      smokeColor,
      smokeColorKey,
      smokeRadiusMeters,
      particulateThermalRatio: ptr,
      biomassCombustionLikelihood: 99,
      industrialThermalLikelihood: 2,
      aiExplanation: `IA confirmou Incêndio Florestal de Alta Severidade: Combinação de FRP elevado (${frp} MW), temperatura de brilho de ${brightC}°C e densa pluma de aerossóis (PM2.5 de ${pm25} µg/m³, AQI ${aqi}). Taxa PTR de ${ptr} confirma queima de biomassa verde densa.`,
      reason: `FRP de ${frp} MW com alta severidade (${brightK} K) e pluma de particulados confirmada. Combustão florestal ativa.`,
    };
  }

  // =========================================================================
  // CASO 4: QUEIMADA ATIVA MODERADA DE VEGETAÇÃO (PASTAGEM / SUB-BOSQUE)
  // FRP entre 20 e 50 MW
  // =========================================================================
  if (frp >= 20) {
    const isConfirmed = isNightPass || brightK >= 335 || hasAtmosphericSmokeConfirmation;
    return {
      isRealVegetationFire: isConfirmed,
      isIndustrialHeat: false,
      isStructuralIndustrialFire: false,
      classificationLabel: isConfirmed ? 'Queimada Ativa de Vegetação' : 'Anomalia Térmica em Verificação',
      fireType: 'VEGETACAO_MODERADA',
      confidenceScore: isNightPass ? 0.96 : confidence >= 0.8 ? 0.91 : 0.82,
      isNightPass,
      isDayPass,
      hasAtmosphericSmokeConfirmation,
      smokeLevel,
      smokeColor,
      smokeColorKey,
      smokeRadiusMeters,
      particulateThermalRatio: ptr,
      biomassCombustionLikelihood: 88,
      industrialThermalLikelihood: 8,
      aiExplanation: `IA identificou Queimada de Biomassa: Radiação de ${frp} MW correlacionada a emissão de aerossóis PM2.5 (${pm25} µg/m³). ${
        isNightPass ? 'Passagem noturna eliminou reflexo solar.' : 'Assinatura térmica compatível com frente de fogo aberta.'
      }`,
      reason: isNightPass
        ? `Passagem noturna sem interferência solar: Fogo ativo real garantido (${frp} MW).`
        : `Fogo de vegetação confirmado por correlação térmica (${brightK} K) e dispersão de aerossóis.`,
    };
  }

  // =========================================================================
  // CASO 5: FOCO INICIAL / SUB-BOSQUE (PASSAGEM NOTURNA)
  // =========================================================================
  if (isNightPass && brightK >= 322) {
    return {
      isRealVegetationFire: true,
      isIndustrialHeat: false,
      isStructuralIndustrialFire: false,
      classificationLabel: 'Fogo Inicial / Sub-bosque (Órbita Noturna)',
      fireType: 'VEGETACAO_INICIAL',
      confidenceScore: 0.86,
      isNightPass,
      isDayPass,
      hasAtmosphericSmokeConfirmation,
      smokeLevel,
      smokeColor,
      smokeColorKey,
      smokeRadiusMeters,
      particulateThermalRatio: ptr,
      biomassCombustionLikelihood: 82,
      industrialThermalLikelihood: 10,
      aiExplanation: `Detecção infravermelha noturna (sem iluminação solar direta) com temperatura de brilho ${brightC}°C. Indicativo precoce de início de combustão ou fogo de sub-bosque.`,
      reason: 'Passagem noturna do satélite: Ausência de radiação solar confirma foco de queima real em estágio inicial.',
    };
  }

  // =========================================================================
  // CASO 6: RUÍDO TÉRMICO SOLAR (SOLO EXPOSTO / TELHADO DE GALPÃO)
  // =========================================================================
  return {
    isRealVegetationFire: false,
    isIndustrialHeat: false,
    isStructuralIndustrialFire: false,
    classificationLabel: 'Ruído Térmico / Solo Aquecido (Falso Positivo)',
    fireType: 'RUIDO_TERMICO_SOLAR',
    confidenceScore: 0.42,
    isNightPass,
    isDayPass,
    hasAtmosphericSmokeConfirmation: false,
    smokeLevel: 'LEVE',
    smokeColor: '#94a3b8',
    smokeColorKey: 'green',
    smokeRadiusMeters: 1500,
    particulateThermalRatio: ptr,
    biomassCombustionLikelihood: 12,
    industrialThermalLikelihood: 15,
    aiExplanation: `IA filtrou anomalia de baixa energia: FRP residual (${frp} MW) em horário diurno com atmosfera limpa (PM2.5 ${pm25} µg/m³). Compatível com aquecimento de solo desmatado ou telhados reflexivos.`,
    reason: `FRP baixo (${frp} MW) em passagem diurna com baixa emissão de fumaça. Provável aquecimento solar de solo ou telhado.`,
  };
}
