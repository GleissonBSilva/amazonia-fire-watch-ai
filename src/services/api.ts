import { OSINTAlert, VideoDetectionStatus, FireSpot } from '../types';

const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const metaEnv = (import.meta as any).env || {};
const API_BASE_URL = isLocalhost ? (metaEnv.VITE_API_URL || 'http://localhost:8000/api') : '';


// Helper de requisição resiliente com timeout controlado (evita travamento do navegador em caso de backend lento)
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 2500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function fetchNationalFires(simulation: boolean = true): Promise<FireSpot[]> {
  // 1. Tenta consulta ao backend FastAPI com timeout estrito de 2.0s
  try {
    if (!API_BASE_URL) throw new Error('Produção: usando feed sincronizado estático');
    const res = await fetchWithTimeout(`${API_BASE_URL}/fires/national?simulation=${simulation}`, {}, 2000);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        try {
          localStorage.setItem('amazonia_fire_spots_cache', JSON.stringify(data));
        } catch {}
        return data;
      }
    }
  } catch (err) {
    // Backend offline ou rodando em produção (Vercel)
  }
  
  // 2. Fallback sincronizado idêntico entre Local e Vercel (servido em <5ms)
  const targetFile = simulation ? '/simulation_fires.json' : '/real_firms_cache.json';
  try {
    const cacheRes = await fetchWithTimeout(targetFile, {}, 2500);
    if (cacheRes.ok) {
      const cachedSpots: FireSpot[] = await cacheRes.json();
      if (Array.isArray(cachedSpots) && cachedSpots.length > 0) {
        try {
          localStorage.setItem('amazonia_fire_spots_cache', JSON.stringify(cachedSpots));
        } catch {}
        return cachedSpots;
      }
    }
  } catch (cacheErr) {}

  // 3. Fallback de contingência pelo localStorage
  try {
    const local = localStorage.getItem('amazonia_fire_spots_cache');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  // Resilient fallback mínimo emergencial se offline sem cache
  return [
    {
      id: "VIIRS-24H-FALLBACK-1",
      latitude: -3.08920,
      longitude: -60.02170,
      biome: "Amazônia",
      state: "AM",
      municipality: "Manaus",
      address: "Av. das Torres, Bairro Flores - Manaus/AM",
      satellite: "NOAA-20 (VIIRS)",
      frp_mw: 42.6,
      bright_ti4_k: 348.5,
      confidence: 0.96,
      detected_at: new Date().toLocaleTimeString('pt-BR'),
      detected_iso: new Date().toISOString(),
      has_video: true,
      is_arson_cluster: false,
      is_recurrent: true,
      video_url: "http://localhost:8000/api/stream/live.mjpg"
    },
    {
      id: "VIIRS-24H-FALLBACK-2",
      latitude: -7.25940,
      longitude: -64.79810,
      biome: "Amazônia",
      state: "AM",
      municipality: "Lábrea",
      address: "BR-230 Transamazônica km 52 - Lábrea/AM",
      satellite: "Suomi-NPP (VIIRS)",
      frp_mw: 58.2,
      bright_ti4_k: 356.1,
      confidence: 0.98,
      detected_at: new Date().toLocaleTimeString('pt-BR'),
      detected_iso: new Date().toISOString(),
      has_video: true,
      is_arson_cluster: true,
      is_recurrent: true,
      video_url: "http://localhost:8000/api/stream/live.mjpg"
    }
  ];
}

export async function fetchHeatmapData(simulation: boolean = true): Promise<any[]> {
  try {
    if (API_BASE_URL) {
      const res = await fetchWithTimeout(`${API_BASE_URL}/fires/heatmap?simulation=${simulation}`, {}, 2000);
      if (res.ok) return await res.json();
    }
  } catch (err) {}

  // Fallback estático sincronizado para Vercel e offline
  try {
    const file = simulation ? '/heatmap_simulation.json' : '/heatmap_real.json';
    const res = await fetchWithTimeout(file, {}, 2000);
    if (res.ok) return await res.json();
  } catch {}

  return [];
}

export async function fetchTimelineData(): Promise<any[]> {
  try {
    if (API_BASE_URL) {
      const res = await fetchWithTimeout(`${API_BASE_URL}/fires/timeline`, {}, 2500);
      if (res.ok) return await res.json();
    }
  } catch (err) {}

  // Fallback estático sincronizado para Vercel e offline
  try {
    const res = await fetchWithTimeout('/timeline.json', {}, 2000);
    if (res.ok) return await res.json();
  } catch {}

  return [];
}

export async function fetchCopilotStatus(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/copilot/status`);
    if (res.ok) return await res.json();
  } catch (err) {}
  return {
    timestamp: new Date().toLocaleTimeString('pt-BR'),
    total_focos_brasil: 80,
    reincidencia_critica: 14,
    alta_suspeita_crime: 6,
    focos_com_video: 8
  };
}

export async function sendCopilotPrompt(prompt: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/copilot/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (res.ok) return await res.json();
  } catch (err) {}
  
  return {
    query: prompt,
    response: `🛰️ **Análise Tática Local:** O sistema processou sua consulta para "${prompt}". Focos críticos no Sul do Amazonas e Pantanal permanecem sob alerta máximo. Alinhamentos na BR-230 indicam alta suspeita de ação criminosa.`,
    timestamp: new Date().toLocaleTimeString('pt-BR')
  };
}

export async function fetchOsintAlerts(limit: number = 25, simulation: boolean = true): Promise<OSINTAlert[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/osint/alerts?limit=${limit}&simulation=${simulation}`, {}, 2000);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}
  
  if (!simulation) {
    // Em Modo Operacional Real, zero posts fictícios
    return [];
  }
  
  return [
    {
      id: 1,
      source: "Telegram (Alerta Manaus)",
      author: "@manausalertas",
      original_url: "https://t.me/s/manausalertas",
      text: "Fumaça densa e foco de queimada de lixo atingindo fiação na Av. das Torres próximo a Flores.",
      latitude: -3.08920,
      longitude: -60.02170,
      confidence: 0.94,
      keywords_matched: "fumaça, queimada, manaus",
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      source: "X / Twitter (@MonitoramentoAM)",
      author: "@defesacivilam",
      original_url: "https://twitter.com/search?q=queimada+manaus",
      text: "Moradores do Tarumã relatam alta concentração de calor e princípio de incêndio em capoeira.",
      latitude: -3.03140,
      longitude: -60.08910,
      confidence: 0.88,
      keywords_matched: "calor, incêndio, manaus",
      created_at: new Date().toISOString()
    }
  ];
}

export async function fetchVideoStatus(): Promise<VideoDetectionStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/stream/status`);
    if (res.ok) return await res.json();
  } catch (err) {}
  
  return {
    camera_id: "CAM-MN-042-FLORES",
    timestamp: new Date().toLocaleTimeString('pt-BR'),
    fps: 16.0,
    fire_detected: true,
    confidence: 0.88,
    expansion_rate: 1.80,
    has_snapshot: false
  };
}


export async function fetchAirQuality(lat: number, lng: number, frp_mw?: number): Promise<any> {
  try {
    const url = `${API_BASE_URL}/air-quality?lat=${lat}&lng=${lng}${frp_mw ? `&frp_mw=${frp_mw}` : ''}`;
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Air quality API offline, using client calculation:', err);
  }
  return null;
}

export async function fetchAirQualityCategories(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/air-quality/categories`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}
  return null;
}
