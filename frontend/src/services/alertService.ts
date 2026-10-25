export async function sendWhatsAppFireAlert(areaData: {
  lat: number;
  lng: number;
  areaSqKm: number;
  criticidade?: 'ALTA' | 'CRÍTICA' | 'MODERADA';
  imageBase64?: string;
  airQualityAlert?: { aqi: number; level: string; pm25: number };
}) {
  const targetNumber = '5591991463640'; // Destino exclusivo em modo simulação segura
  const criticidade = areaData.criticidade || 'CRÍTICA';
  const mapsLink = `https://www.google.com/maps?q=${areaData.lat.toFixed(5)},${areaData.lng.toFixed(5)}`;
  
  const textMessage = 
    `*[MODO SIMULAÇÃO - AMAPÁ/AMAZONAS]*\n` +
    `🚨 *ALERTA AMAZÔNIA FIRE WATCH AI* 🚨\n\n` +
    `🔥 *Foco Crítico Detectado!*\n` +
    `📍 *Coordenadas:* ${areaData.lat.toFixed(5)}, ${areaData.lng.toFixed(5)}\n` +
    `📐 *Área de Impacto:* ~${areaData.areaSqKm.toFixed(2)} km² (${(areaData.areaSqKm * 100).toFixed(1)} ha)\n` +
    `⚠️ *Severidade:* ${criticidade}\n` +
    (areaData.airQualityAlert && areaData.airQualityAlert.aqi > 50
      ? `💨 *ALERTA POLUIÇÃO DO AR (CONAMA > 50):* AQI ${areaData.airQualityAlert.aqi} (${areaData.airQualityAlert.level}) | PM2.5: ${areaData.airQualityAlert.pm25} µg/m³\n`
      : '') +
    `⚡ *Destino Simulação:* Exclusivo ao operador (+55 91 99146-3640)\n\n` +
    `🗺️ *Localização Google Maps:* ${mapsLink}\n\n` +
    `⚠️ _Mensagem de teste interna direcionada exclusivamente ao operador de homologação._`;

  try {
    // 1. Envio para o backend local do Fire Watch com bloqueio de emergência
    await fetch('http://localhost:8000/api/alerts/dispatch-safe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: areaData.lat,
        longitude: areaData.lng,
        endereco: 'Manaus e Região Metropolitana / AM',
        reincidente: criticidade === 'CRÍTICA',
        frp: 35.5
      }),
    });
  } catch (err) {
    console.warn('Backend local de WhatsApp não acessível, abrindo WhatsApp Web:', err);
  }

  // 2. Abertura segura do WhatsApp Web / Mobile direcionada apenas para seu número
  const encoded = encodeURIComponent(textMessage);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetNumber}&text=${encoded}`;
  window.open(whatsappUrl, '_blank', 'width=800,height=700');

  return { success: true, target: targetNumber, text: textMessage };
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
    body: JSON.stringify(payload)
  });
  return await res.json();
}
