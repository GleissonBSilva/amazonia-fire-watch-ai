/**
 * Tactical Emergency Alert Dispatcher (WhatsApp / CBMAM).
 * Implements strict security lock: when isSimulation === true,
 * external webhooks are blocked and logged internally to console and sandbox.
 */

export async function sendWhatsAppFireAlert(areaData: {
  lat: number;
  lng: number;
  areaSqKm: number;
  criticidade?: 'ALTA' | 'CRÍTICA' | 'MODERADA';
  imageBase64?: string;
  airQualityAlert?: { aqi: number; level: string; pm25: number };
  isSimulation?: boolean;
}) {
  const isSim =
    areaData.isSimulation !== undefined
      ? areaData.isSimulation
      : localStorage.getItem('isSimulation') !== 'false';

  const criticidade = areaData.criticidade || 'CRÍTICA';
  const mapsLink = `https://www.google.com/maps?q=${areaData.lat.toFixed(5)},${areaData.lng.toFixed(5)}`;

  // 1. TRAVA LÓGICA DE SEGURANÇA EM MODO SIMULAÇÃO
  if (isSim) {
    console.warn(
      '🔒 [TRAVA DE SEGURANÇA ATIVA • MODO SIMULAÇÃO]: Nenhuma mensagem externa ou webhook de produção transmitido.'
    );
    console.info('📋 [REGISTRO INTERNO DE TESTE SIMULADO]:', {
      coordenadas: `${areaData.lat.toFixed(5)}, ${areaData.lng.toFixed(5)}`,
      area_sq_km: areaData.areaSqKm,
      criticidade,
      qualidade_do_ar: areaData.airQualityAlert,
      timestamp: new Date().toISOString(),
    });

    const targetNumber = '5592993746740'; // Destino restrito de homologação
    const textMessage =
      `*[MODO SIMULAÇÃO // HOMOLOGAÇÃO]*\n` +
      `🚨 *ALERTA AMAZÔNIA FIRE WATCH AI* 🚨\n\n` +
      `🔥 *Foco Simulado em Teste!*\n` +
      `📍 *Coordenadas:* ${areaData.lat.toFixed(5)}, ${areaData.lng.toFixed(5)}\n` +
      `📐 *Área de Impacto:* ~${areaData.areaSqKm.toFixed(2)} km² (${(areaData.areaSqKm * 100).toFixed(1)} ha)\n` +
      `⚠️ *Severidade:* ${criticidade}\n` +
      (areaData.airQualityAlert && areaData.airQualityAlert.aqi > 50
        ? `💨 *ALERTA POLUIÇÃO DO AR (CONAMA > 50):* AQI ${areaData.airQualityAlert.aqi} (${areaData.airQualityAlert.level}) | PM2.5: ${areaData.airQualityAlert.pm25} µg/m³\n`
        : '') +
      `⚡ *Destino Simulação:* Exclusivo ao operador (+55 92 99374-6740)\n\n` +
      `🗺️ *Localização Google Maps:* ${mapsLink}\n\n` +
      `⚠️ _Trava de segurança ativa: nenhuma ocorrência real transmitida a órgãos externos._`;

    // Abertura exclusiva na janela de teste interno
    const encoded = encodeURIComponent(textMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetNumber}&text=${encoded}`;
    window.open(whatsappUrl, '_blank', 'width=800,height=700');

    return {
      success: true,
      simulationLocked: true,
      target: targetNumber,
      text: textMessage,
    };
  }

  // 2. MODO OPERACIONAL REAL (PRODUÇÃO)
  console.info('🚨 [DESPACHO OPERACIONAL REAL ATIVADO]: Encaminhando alerta para canais do CBMAM / CIOPS.');
  
  const realTextMessage =
    `*🚨 ALERTA OPERACIONAL REAL • CBMAM / CIOPS* 🚨\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔥 *OCORRÊNCIA DE INCÊNDIO FLORESTAL CONFIRMADA (NASA FIRMS / INPE)*\n` +
    `📍 *Coordenadas:* ${areaData.lat.toFixed(5)}, ${areaData.lng.toFixed(5)}\n` +
    `📐 *Área Estimada:* ~${areaData.areaSqKm.toFixed(2)} km²\n` +
    `⚠️ *Criticidade:* ${criticidade}\n` +
    (areaData.airQualityAlert && areaData.airQualityAlert.aqi > 50
      ? `💨 *Poluição do Ar:* AQI ${areaData.airQualityAlert.aqi} (${areaData.airQualityAlert.level}) | PM2.5: ${areaData.airQualityAlert.pm25} µg/m³\n`
      : '') +
    `🗺️ *Google Maps:* ${mapsLink}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Protocolo Operacional Oficial: CBMAM-FIREWATCH-REAL`;

  try {
    await fetch('http://localhost:8000/api/alerts/dispatch-safe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: areaData.lat,
        longitude: areaData.lng,
        endereco: 'Região Operacional Amazônia',
        reincidente: criticidade === 'CRÍTICA',
        frp: 45.0,
      }),
    });
  } catch (err) {
    console.warn('Erro ao conectar ao webhook de despacho real:', err);
  }

  const encodedReal = encodeURIComponent(realTextMessage);
  window.open(`https://api.whatsapp.com/send?text=${encodedReal}`, '_blank', 'width=800,height=700');

  return { success: true, simulationLocked: false, text: realTextMessage };
}

export async function sendSafeFireAlert(payload: {
  latitude: number;
  longitude: number;
  endereco: string;
  reincidente: boolean;
  frp: number;
}) {
  const res = await fetch('http://localhost:8000/api/alerts/dispatch-safe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}
