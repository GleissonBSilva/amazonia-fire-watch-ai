/**
 * Air Quality & Wildfire Smoke Dispersion Measurement Engine.
 * Grounded in EPA (Environmental Protection Agency) and CONAMA (Resolução nº 491/2018 Brasil) standards,
 * with Copernicus CAMS / GFAS empirical wildfire emission models.
 */

export interface AirQualityAssessment {
  aqi: number; // 0 - 500
  pm25: number; // µg/m³ (Partículas Inaláveis Finas <= 2.5 µm)
  co_ppm: number; // ppm (Monóxido de Carbono estimado)
  level: 'BOA' | 'MODERADA' | 'RUIM' | 'MUITO RUIM' | 'PÉSSIMA' | 'PERIGOSA';
  categoryNumber: number; // 1 a 6
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  healthImpact: string;
  operationalRecommendation: string;
  alertTriggered: boolean; // Alerta ativado quando AQI > 50
  alertMessage: string;
}

export interface AirQualityCategoryDef {
  id: number;
  name: AirQualityAssessment['level'];
  aqiRange: string;
  pm25Range: string;
  color: string;
  description: string;
  alertRequired: boolean;
}

export const AIR_QUALITY_CATEGORIES: AirQualityCategoryDef[] = [
  { id: 1, name: 'BOA', aqiRange: '0 - 50', pm25Range: '0 - 12.0 µg/m³', color: '#10b981', description: 'Ar satisfatório, sem riscos.', alertRequired: false },
  { id: 2, name: 'MODERADA', aqiRange: '51 - 100', pm25Range: '12.1 - 35.4 µg/m³', color: '#eab308', description: 'Alerta Nível 1: Atenção a hiper-sensíveis.', alertRequired: true },
  { id: 3, name: 'RUIM', aqiRange: '101 - 150', pm25Range: '35.5 - 55.4 µg/m³', color: '#f97316', description: 'Alerta Nível 2: Insalubre para crianças e idosos.', alertRequired: true },
  { id: 4, name: 'MUITO RUIM', aqiRange: '151 - 200', pm25Range: '55.5 - 150.4 µg/m³', color: '#ef4444', description: 'Alerta Nível 3: Insalubre geral. Máscara PFF2 obrigatória.', alertRequired: true },
  { id: 5, name: 'PÉSSIMA', aqiRange: '201 - 300', pm25Range: '150.5 - 250.4 µg/m³', color: '#a855f7', description: 'Alerta Nível 4: Emergência de saúde pública.', alertRequired: true },
  { id: 6, name: 'PERIGOSA', aqiRange: '301 - 500+', pm25Range: '> 250.4 µg/m³', color: '#7e22ce', description: 'Alerta Nível 5: Evacuação e isolamento da zona de pluma.', alertRequired: true },
];

/**
 * Calculates PM2.5 and AQI based on Fire Radiative Power (FRP in MW)
 * and proximity distance in kilometers.
 */
export function calculateAirQuality(frpMw: number, distanceKm: number = 1.0): AirQualityAssessment {
  const safeFrp = Math.max(1, frpMw || 20);
  const safeDist = Math.max(0.2, distanceKm || 1.0);

  // Empirical CAMS / GFAS fine particulate emission model for tropical forest & savannah fires:
  // Baseline Amazon background is ~10-12 µg/m³; fire core increases it proportionally to FRP.
  const rawPm25 = 12.0 + (safeFrp * 3.15) / (1 + safeDist * 0.22);
  const pm25 = Math.round(Math.min(500, rawPm25) * 10) / 10;

  // Estimated Carbon Monoxide (CO ppm) proportional to smoldering combustion
  const co_ppm = Math.round((0.8 + (safeFrp * 0.08) / (1 + safeDist * 0.3)) * 10) / 10;

  // EPA AQI Piecewise Linear Calculation
  let aqi: number;
  let level: AirQualityAssessment['level'];
  let categoryNumber: number;
  let color: string;
  let badgeBg: string;
  let badgeText: string;
  let badgeBorder: string;
  let healthImpact: string;
  let operationalRecommendation: string;

  if (pm25 <= 12.0) {
    aqi = Math.round((50 / 12.0) * pm25);
    level = 'BOA';
    categoryNumber = 1;
    color = '#10b981';
    badgeBg = 'bg-emerald-950/80';
    badgeText = 'text-emerald-300';
    badgeBorder = 'border-emerald-500';
    healthImpact = 'Qualidade do ar considerada satisfatória. Risco nulo à saúde.';
    operationalRecommendation = 'Nenhuma restrição respiratória necessária na área.';
  } else if (pm25 <= 35.4) {
    aqi = Math.round(51 + ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1));
    level = 'MODERADA';
    categoryNumber = 2;
    color = '#eab308';
    badgeBg = 'bg-yellow-950/80';
    badgeText = 'text-yellow-300';
    badgeBorder = 'border-yellow-500';
    healthImpact = 'Indivíduos extremamente sensíveis podem apresentar tosse ou irritação leve.';
    operationalRecommendation = 'Grupos de risco respiratório devem reduzir esforços pesados ao ar livre.';
  } else if (pm25 <= 55.4) {
    aqi = Math.round(101 + ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5));
    level = 'RUIM';
    categoryNumber = 3;
    color = '#f97316';
    badgeBg = 'bg-orange-950/80';
    badgeText = 'text-orange-300';
    badgeBorder = 'border-orange-500';
    healthImpact = 'Insalubre para grupos vulneráveis (crianças, idosos, asmáticos).';
    operationalRecommendation = 'Recomendado fechamento de portas/janelas. Evitar atividades físicas abertas.';
  } else if (pm25 <= 150.4) {
    aqi = Math.round(151 + ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5));
    level = 'MUITO RUIM';
    categoryNumber = 4;
    color = '#ef4444';
    badgeBg = 'bg-red-950/80';
    badgeText = 'text-red-300';
    badgeBorder = 'border-red-500';
    healthImpact = 'Toda a população sujeita a sintomas respiratórios e irritação ocular severa.';
    operationalRecommendation = 'Obrigatório uso de máscaras PFF2/N95 para equipes de campo. Suspender eventos externos.';
  } else if (pm25 <= 250.4) {
    aqi = Math.round(201 + ((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5));
    level = 'PÉSSIMA';
    categoryNumber = 5;
    color = '#a855f7';
    badgeBg = 'bg-purple-950/90';
    badgeText = 'text-purple-300';
    badgeBorder = 'border-purple-500';
    healthImpact = 'Alerta de saúde pública: Efeitos adversos generalizados, crise respiratória aguda.';
    operationalRecommendation = 'Alerta de evacuação para asmáticos. Brigadistas com EPI de proteção respiratória completa.';
  } else {
    aqi = Math.round(Math.min(500, 301 + ((500 - 301) / (500.0 - 250.5)) * (pm25 - 250.5)));
    level = 'PERIGOSA';
    categoryNumber = 6;
    color = '#7e22ce';
    badgeBg = 'bg-fuchsia-950';
    badgeText = 'text-fuchsia-200';
    badgeBorder = 'border-fuchsia-400';
    healthImpact = 'Condição extrema de emergência toxicológica por inalação de fuligem.';
    operationalRecommendation = 'Isolamento da zona de pluma tóxica. Despacho imediato de suporte médico.';
  }

  const safeAqi = Math.min(500, Math.max(1, aqi));
  const alertTriggered = safeAqi > 50;
  const alertMessage = alertTriggered
    ? `⚠️ ALERTA CONAMA: AQI ${safeAqi} > 50 (${level})`
    : `Qualidade do Ar Satisfatória (AQI ${safeAqi} <= 50)`;

  return {
    aqi: safeAqi,
    pm25,
    co_ppm,
    level,
    categoryNumber,
    color,
    badgeBg,
    badgeText,
    badgeBorder,
    healthImpact,
    operationalRecommendation,
    alertTriggered,
    alertMessage,
  };
}
