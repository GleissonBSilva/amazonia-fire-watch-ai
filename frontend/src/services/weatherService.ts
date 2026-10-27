import { FireWeatherInfo } from '../types';

interface WeatherCacheEntry {
  data: FireWeatherInfo;
  timestamp: number;
}

const weatherCache = new Map<string, WeatherCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache em memória

/**
 * Consulta a telemetria meteorológica real em tempo real via Open-Meteo API
 * (Sem simulação: dados reais de temperatura, umidade, vento e chuva).
 */
export async function fetchRealWeather(lat: number, lng: number): Promise<FireWeatherInfo> {
  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  const now = Date.now();

  const cached = weatherCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const current = json.current || {};
      const temp = Number(current.temperature_2m ?? 28);
      const rh = Number(current.relative_humidity_2m ?? 60);
      const windSpeed = Number(current.wind_speed_10m ?? 8);
      const windDir = Number(current.wind_direction_10m ?? 0);
      const precip = Number(current.precipitation ?? 0);

      let risk: FireWeatherInfo['fire_spread_risk'] = 'MODERADO';
      let reason = 'Condições meteorológicas dentro dos padrões sazonais.';

      if (precip > 0.3) {
        risk = 'EXTINCAO_CHUVA';
        reason = `Precipitação ativa no quadrante (${precip.toFixed(1)} mm/h) favorecendo contenção ou extinção natural do fogo.`;
      } else if (rh < 30 && windSpeed > 15) {
        risk = 'EXTREMO';
        reason = `Ar criticamente seco (${rh}% RH) e rajadas de vento (${windSpeed.toFixed(1)} km/h): Altíssima velocidade de propagação de copas.`;
      } else if (rh < 40 || windSpeed > 20) {
        risk = 'ALTO';
        reason = `Estresse hídrico da biomassa florestal (${rh}% RH) com vento ativo (${windSpeed.toFixed(1)} km/h): Risco elevado de alastramento.`;
      } else if (rh >= 70) {
        risk = 'BAIXO';
        reason = `Umidade relativa alta (${rh}% RH) retardando taxa de combustão da biomassa vegetal.`;
      }

      const weatherInfo: FireWeatherInfo = {
        temperature_c: temp,
        relative_humidity: rh,
        wind_speed_kmh: windSpeed,
        wind_direction_deg: windDir,
        precipitation_mm: precip,
        fire_spread_risk: risk,
        risk_reason: reason,
      };

      weatherCache.set(cacheKey, { data: weatherInfo, timestamp: now });
      return weatherInfo;
    }
  } catch (err) {
    console.warn('Erro ao consultar telemetria meteorológica real:', err);
  }

  // Fallback baseado em médias conservadoras sem inventar alarme
  return {
    temperature_c: 28,
    relative_humidity: 65,
    wind_speed_kmh: 6,
    wind_direction_deg: 180,
    precipitation_mm: 0,
    fire_spread_risk: 'MODERADO',
    risk_reason: 'Telemetria meteorológica local estimada.',
  };
}

/**
 * Consulta a API pública do RainViewer para obter o frame mais recente
 * do radar meteorológico de precipitação global / América do Sul.
 */
export async function fetchLatestRainViewerRadar(): Promise<string | null> {
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (res.ok) {
      const json = await res.json();
      const past = json?.radar?.past;
      if (Array.isArray(past) && past.length > 0) {
        return past[past.length - 1].path;
      }
    }
  } catch (err) {
    console.warn('Erro ao obter radar de chuva RainViewer:', err);
  }
  return null;
}
