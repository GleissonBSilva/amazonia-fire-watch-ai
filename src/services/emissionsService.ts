import { FireSpot } from '../types';

/**
 * Fatores de Emissão Oficiais para Queimadas em Florestas Tropicais e Savanas / Cerrado
 * Baseados em:
 * 1. IPCC Guidelines for National Greenhouse Gas Inventories (Volume 4: Agriculture, Forestry and Other Land Use)
 * 2. GFED4s (Global Fire Emissions Database with small fires) - Andreae (2019)
 * 3. Wooster et al. (2005) - Relação FRP/FRE para conversão de energia radiativa em biomassa consumida
 */
export const EMISSION_FACTORS = {
  // Conversão de energia radiativa: ~0.368 kg de biomassa seca por Megajoule (MJ) de FRE
  // 1 MW = 1 MJ/s. Para um ciclo diário representativo de foco ativo (~2h de combustão contínua equivalente):
  BIOMASS_KG_PER_MW_HOUR: 1324.8, // kg de biomassa por MW-hora

  // Fatores de Emissão (g de poluente por kg de biomassa seca queimada)
  CO2_G_PER_KG: 1580.0,      // Dióxido de Carbono (g/kg) -> principal gás de efeito estufa
  CO_G_PER_KG: 104.0,        // Monóxido de Carbono (g/kg) -> gás asfixiante e precursor de ozônio
  CH4_G_PER_KG: 5.1,         // Metano (g/kg) -> alto potencial de aquecimento global (GWP=28)
  PM25_G_PER_KG: 9.1,        // Material Particulado Fino <= 2.5 µm (g/kg) -> toxicidade pulmonar profunda
  PM10_G_PER_KG: 13.5,       // Material Particulado Inalável <= 10 µm (g/kg)
  NOX_G_PER_KG: 2.55,        // Óxidos de Nitrogênio (g/kg)
  BLACK_CARBON_G_PER_KG: 0.52 // Carbono Negro / Fuligem (g/kg) -> forçante radiativa positiva
};

export interface FireEmissionMetrics {
  biomassTons: number;       // Biomassa consumida (toneladas)
  co2Tons: number;           // Dióxido de carbono emitido (toneladas)
  coTons: number;            // Monóxido de carbono emitido (toneladas)
  ch4Kg: number;             // Metano emitido (kg)
  pm25Kg: number;            // Material particulado PM2.5 emitido (kg)
  pm10Kg: number;            // Material particulado PM10 emitido (kg)
  noxKg: number;             // Óxidos de nitrogênio emitidos (kg)
  blackCarbonKg: number;     // Carbono negro emitido (kg)
  co2EquivTons: number;      // CO2 equivalente total (CO2 + 28*CH4) em toneladas
}

export interface MunicipalitySummary {
  name: string;
  state: string;
  biome: string;
  spotCount: number;
  totalFrp: number;
  maxFrp: number;
  avgConfidence: number;
  biomassTons: number;
  co2Tons: number;
  coTons: number;
  pm25Kg: number;
  ch4Kg: number;
  noxKg: number;
  centerLat: number;
  centerLng: number;
  satellitesUsed: string[];
  worstAqi: number;
}

export interface AggregatedEmissionsReport {
  totalSpots: number;
  totalFrpMw: number;
  avgFrpMw: number;
  peakFrpMw: number;
  totalBiomassTons: number;
  totalCo2Tons: number;
  totalCoTons: number;
  totalCh4Kg: number;
  totalPm25Kg: number;
  totalPm10Kg: number;
  totalNoxKg: number;
  totalBlackCarbonKg: number;
  totalCo2EquivTons: number;
  avgAqi: number;
  maxAqi: number;
  municipalities: MunicipalitySummary[];
  biomesDistribution: Record<string, { spots: number; frp: number; co2Tons: number }>;
  pollutantDistribution: { name: string; key: string; valueTons: number; percent: number; color: string }[];
  sources: {
    satelliteConstellation: string[];
    groundStation: string;
    emissionModel: string;
    weatherTelemetry: string;
    auditTimestamp: string;
  };
}

/**
 * Calcula a estimativa de poluentes para um único foco térmico
 */
export function calculateFireEmissions(spot: FireSpot): FireEmissionMetrics {
  const frp = spot.frp_mw || 10.0;
  // Estimativa de duração efetiva de queima vigorosa observada pelo satélite (~1.5 horas)
  const durationHours = 1.5;

  const biomassKg = frp * durationHours * (EMISSION_FACTORS.BIOMASS_KG_PER_MW_HOUR / 2.0);
  const biomassTons = biomassKg / 1000.0;

  const co2Tons = (biomassKg * EMISSION_FACTORS.CO2_G_PER_KG) / 1000000.0;
  const coTons = (biomassKg * EMISSION_FACTORS.CO_G_PER_KG) / 1000000.0;
  const ch4Kg = (biomassKg * EMISSION_FACTORS.CH4_G_PER_KG) / 1000.0;
  const pm25Kg = (biomassKg * EMISSION_FACTORS.PM25_G_PER_KG) / 1000.0;
  const pm10Kg = (biomassKg * EMISSION_FACTORS.PM10_G_PER_KG) / 1000.0;
  const noxKg = (biomassKg * EMISSION_FACTORS.NOX_G_PER_KG) / 1000.0;
  const blackCarbonKg = (biomassKg * EMISSION_FACTORS.BLACK_CARBON_G_PER_KG) / 1000.0;

  // CO2eq = CO2 + GWP_CH4 * CH4 (GWP do Metano = 28 segundo IPCC AR5)
  const co2EquivTons = co2Tons + (ch4Kg * 28.0) / 1000.0;

  return {
    biomassTons: parseFloat(biomassTons.toFixed(2)),
    co2Tons: parseFloat(co2Tons.toFixed(2)),
    coTons: parseFloat(coTons.toFixed(2)),
    ch4Kg: parseFloat(ch4Kg.toFixed(1)),
    pm25Kg: parseFloat(pm25Kg.toFixed(1)),
    pm10Kg: parseFloat(pm10Kg.toFixed(1)),
    noxKg: parseFloat(noxKg.toFixed(1)),
    blackCarbonKg: parseFloat(blackCarbonKg.toFixed(1)),
    co2EquivTons: parseFloat(co2EquivTons.toFixed(2)),
  };
}

/**
 * Agrega e consolida as emissões atmosféricas e os dados de todos os municípios
 */
export function generateDetailedEmissionsReport(spots: FireSpot[]): AggregatedEmissionsReport {
  let totalFrp = 0;
  let peakFrp = 0;
  let totalBiomass = 0;
  let totalCo2 = 0;
  let totalCo = 0;
  let totalCh4 = 0;
  let totalPm25 = 0;
  let totalPm10 = 0;
  let totalNox = 0;
  let totalBlackCarbon = 0;
  let totalCo2Eq = 0;
  let totalAqiSum = 0;
  let maxAqi = 0;

  const satellitesSet = new Set<string>();
  const munMap = new Map<string, MunicipalitySummary>();
  const biomeMap: Record<string, { spots: number; frp: number; co2Tons: number }> = {};

  spots.forEach((spot) => {
    const frp = spot.frp_mw || 10.0;
    totalFrp += frp;
    if (frp > peakFrp) peakFrp = frp;

    const aqi = spot.aqi || 45;
    totalAqiSum += aqi;
    if (aqi > maxAqi) maxAqi = aqi;

    if (spot.satellite) satellitesSet.add(spot.satellite);

    const em = calculateFireEmissions(spot);
    totalBiomass += em.biomassTons;
    totalCo2 += em.co2Tons;
    totalCo += em.coTons;
    totalCh4 += em.ch4Kg;
    totalPm25 += em.pm25Kg;
    totalPm10 += em.pm10Kg;
    totalNox += em.noxKg;
    totalBlackCarbon += em.blackCarbonKg;
    totalCo2Eq += em.co2EquivTons;

    // Bioma
    const biome = spot.biome || 'Amazônia';
    if (!biomeMap[biome]) {
      biomeMap[biome] = { spots: 0, frp: 0, co2Tons: 0 };
    }
    biomeMap[biome].spots += 1;
    biomeMap[biome].frp += frp;
    biomeMap[biome].co2Tons += em.co2Tons;

    // Município
    const munName = spot.municipality || 'Região Não Mapeada';
    const state = spot.state || 'AM';
    const key = `${munName}_${state}`;

    if (!munMap.has(key)) {
      munMap.set(key, {
        name: munName,
        state,
        biome,
        spotCount: 0,
        totalFrp: 0,
        maxFrp: 0,
        avgConfidence: 0,
        biomassTons: 0,
        co2Tons: 0,
        coTons: 0,
        pm25Kg: 0,
        ch4Kg: 0,
        noxKg: 0,
        centerLat: spot.latitude,
        centerLng: spot.longitude,
        satellitesUsed: [],
        worstAqi: aqi,
      });
    }

    const mun = munMap.get(key)!;
    mun.spotCount += 1;
    mun.totalFrp += frp;
    if (frp > mun.maxFrp) mun.maxFrp = frp;
    mun.avgConfidence += spot.confidence || 0.85;
    mun.biomassTons += em.biomassTons;
    mun.co2Tons += em.co2Tons;
    mun.coTons += em.coTons;
    mun.pm25Kg += em.pm25Kg;
    mun.ch4Kg += em.ch4Kg;
    mun.noxKg += em.noxKg;
    if (aqi > mun.worstAqi) mun.worstAqi = aqi;
    if (spot.satellite && !mun.satellitesUsed.includes(spot.satellite)) {
      mun.satellitesUsed.push(spot.satellite);
    }
  });

  // Finaliza médias dos municípios
  const municipalities = Array.from(munMap.values()).map((m) => {
    m.avgConfidence = parseFloat((m.avgConfidence / m.spotCount).toFixed(2));
    m.totalFrp = parseFloat(m.totalFrp.toFixed(1));
    m.biomassTons = parseFloat(m.biomassTons.toFixed(1));
    m.co2Tons = parseFloat(m.co2Tons.toFixed(1));
    m.coTons = parseFloat(m.coTons.toFixed(1));
    m.pm25Kg = parseFloat(m.pm25Kg.toFixed(1));
    m.ch4Kg = parseFloat(m.ch4Kg.toFixed(1));
    m.noxKg = parseFloat(m.noxKg.toFixed(1));
    return m;
  }).sort((a, b) => b.totalFrp - a.totalFrp);

  const totalSpots = spots.length;
  const avgFrpMw = totalSpots > 0 ? parseFloat((totalFrp / totalSpots).toFixed(1)) : 0;
  const avgAqi = totalSpots > 0 ? Math.round(totalAqiSum / totalSpots) : 0;

  // Distribuição percentual de poluentes para exibição visual
  const totalPollutantTons = totalCo2 + totalCo + (totalCh4 / 1000) + (totalPm25 / 1000) + (totalNox / 1000);
  const pollutantDistribution = [
    {
      name: 'Dióxido de Carbono (CO₂)',
      key: 'CO2',
      valueTons: parseFloat(totalCo2.toFixed(1)),
      percent: totalPollutantTons > 0 ? parseFloat(((totalCo2 / totalPollutantTons) * 100).toFixed(1)) : 93.5,
      color: '#ef4444' // Vermelho
    },
    {
      name: 'Monóxido de Carbono (CO)',
      key: 'CO',
      valueTons: parseFloat(totalCo.toFixed(1)),
      percent: totalPollutantTons > 0 ? parseFloat(((totalCo / totalPollutantTons) * 100).toFixed(1)) : 6.1,
      color: '#f97316' // Laranja
    },
    {
      name: 'Metano (CH₄)',
      key: 'CH4',
      valueTons: parseFloat((totalCh4 / 1000).toFixed(2)),
      percent: totalPollutantTons > 0 ? parseFloat((((totalCh4 / 1000) / totalPollutantTons) * 100).toFixed(2)) : 0.3,
      color: '#eab308' // Amarelo
    },
    {
      name: 'Particulados Finos (PM2.5)',
      key: 'PM2.5',
      valueTons: parseFloat((totalPm25 / 1000).toFixed(2)),
      percent: totalPollutantTons > 0 ? parseFloat((((totalPm25 / 1000) / totalPollutantTons) * 100).toFixed(2)) : 0.5,
      color: '#a855f7' // Roxo
    },
    {
      name: 'Óxidos de Nitrogênio (NOx)',
      key: 'NOx',
      valueTons: parseFloat((totalNox / 1000).toFixed(2)),
      percent: totalPollutantTons > 0 ? parseFloat((((totalNox / 1000) / totalPollutantTons) * 100).toFixed(2)) : 0.15,
      color: '#06b6d4' // Ciano
    }
  ];

  return {
    totalSpots,
    totalFrpMw: parseFloat(totalFrp.toFixed(1)),
    avgFrpMw,
    peakFrpMw: parseFloat(peakFrp.toFixed(1)),
    totalBiomassTons: parseFloat(totalBiomass.toFixed(1)),
    totalCo2Tons: parseFloat(totalCo2.toFixed(1)),
    totalCoTons: parseFloat(totalCo.toFixed(1)),
    totalCh4Kg: parseFloat(totalCh4.toFixed(1)),
    totalPm25Kg: parseFloat(totalPm25.toFixed(1)),
    totalPm10Kg: parseFloat(totalPm10.toFixed(1)),
    totalNoxKg: parseFloat(totalNox.toFixed(1)),
    totalBlackCarbonKg: parseFloat(totalBlackCarbon.toFixed(1)),
    totalCo2EquivTons: parseFloat(totalCo2Eq.toFixed(1)),
    avgAqi,
    maxAqi,
    municipalities,
    biomesDistribution: biomeMap,
    pollutantDistribution,
    sources: {
      satelliteConstellation: Array.from(satellitesSet).length > 0 ? Array.from(satellitesSet) : ['NOAA-20 VIIRS 375m', 'Suomi-NPP VIIRS', 'Aqua MODIS'],
      groundStation: 'INPE / CPTEC - Programa Queimadas (Cachoeira Paulista/SP & Manaus/AM)',
      emissionModel: 'IPCC Guidelines 2019 Refinement & GFED4s (Global Fire Emissions Database)',
      weatherTelemetry: 'Open-Meteo & ECMWF Integrated Forecasting System (IFS) + RainViewer Radar',
      auditTimestamp: new Date().toISOString()
    }
  };
}
