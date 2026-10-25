import { OSINTAlert, VideoDetectionStatus, FireSpot } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

export async function fetchNationalFires(simulation: boolean = true): Promise<FireSpot[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/fires/national?simulation=${simulation}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend fires API offline. Usando fallback de contingência:', err);
  }
  
  // Informações simuladas só podem aparecer se a Simulação estiver ativa
  if (!simulation) {
    return [];
  }

  // Resilient fallback covering key Brazilian biomes (exclusivo para Modo Simulação)
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
    },
    {
      id: "VIIRS-24H-FALLBACK-3",
      latitude: -19.00940,
      longitude: -57.65330,
      biome: "Pantanal",
      state: "MS",
      municipality: "Corumbá",
      address: "Parque Nacional do Pantanal - Corumbá/MS",
      satellite: "Aqua (MODIS)",
      frp_mw: 64.0,
      bright_ti4_k: 362.4,
      confidence: 0.95,
      detected_at: new Date().toLocaleTimeString('pt-BR'),
      detected_iso: new Date().toISOString(),
      has_video: true,
      is_arson_cluster: false,
      is_recurrent: true,
      video_url: "http://localhost:8000/api/stream/live.mjpg"
    }
  ];
}

export async function fetchHeatmapData(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/fires/heatmap`);
    if (res.ok) return await res.json();
  } catch (err) {}
  return [];
}

export async function fetchTimelineData(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/fires/timeline`);
    if (res.ok) return await res.json();
  } catch (err) {}
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

export async function fetchOsintAlerts(limit: number = 25): Promise<OSINTAlert[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/osint/alerts?limit=${limit}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}
  
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
