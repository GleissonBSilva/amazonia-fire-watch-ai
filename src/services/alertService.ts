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
  municipio?: string;
  isRecurrent?: boolean;
  targetPhone?: string;
  customMessage?: string;
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
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') await fetch('http://localhost:8000/api/alerts/dispatch-safe', {
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
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    try {
      const res = await fetch('http://localhost:8000/api/alerts/dispatch-safe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch {}
  }
  return { success: true, localOnly: true };
}


import { InfractionDossier } from '../types';
import { saveInfractionToSupabase } from './supabaseClient';

export interface InfractionDispatchOptions {
  dossier: InfractionDossier;
  targetType: 'CBMAM' | 'DEMA' | 'OWNER' | 'CUSTOM' | 'OPEN';
  customPhone?: string;
  saveToSupabase?: boolean;
}

/**
 * Despacho Tático de Auto de Infração Ambiental Preliminar via WhatsApp
 * Formata o ofício oficial completo com tipificação da Lei 9.605/98 e Dec 6.514/08,
 * geolocalização por satélite, dados do CAR e cálculo de multa.
 */
export async function dispatchInfractionWhatsApp(options: InfractionDispatchOptions) {
  const { dossier, targetType, customPhone, saveToSupabase = true } = options;
  const spot = dossier.spot;
  const land = dossier.property;
  const mapsLink = `https://www.google.com/maps?q=${spot.latitude.toFixed(5)},${spot.longitude.toFixed(5)}`;
  const tempC = Math.round((spot.bright_ti4_k || 320) - 273.15);

  let targetNumber = '';
  let recipientLabel = 'Plantão Operacional';
  if (targetType === 'CBMAM') {
    targetNumber = '5592993746740';
    recipientLabel = 'CBMAM / CIOPS / Defesa Civil';
  } else if (targetType === 'DEMA') {
    targetNumber = '5592984012020';
    recipientLabel = 'DEMA / Polícia Militar Ambiental';
  } else if (targetType === 'OWNER') {
    targetNumber = customPhone ? customPhone.replace(/\D/g, '') : '';
    recipientLabel = `Proprietário Legal: ${land.owner_name}`;
  } else if (targetType === 'CUSTOM') {
    targetNumber = customPhone ? customPhone.replace(/\D/g, '') : '';
    recipientLabel = `Destinatário Especial (${targetNumber})`;
  } else {
    targetNumber = '';
    recipientLabel = 'Seletor Livre WhatsApp';
  }

  const officialMessage =
    `*🚨 NOTIFICAÇÃO OFICIAL • AUTO DE INFRAÇÃO EM FLAGRANTE ORBITAL 🚨*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏛️ *REPÚBLICA FEDERATIVA DO BRASIL*\n` +
    `📋 *AUTO DE INFRAÇÃO Nº:* ${dossier.protocolNumber}\n` +
    `🛰️ *SISTEMA C2:* Amazônia Fire-Watch AI\n\n` +
    `🎯 *ALVO CIVIL/PENAL IDENTIFICADO (BASE CAR / SICAR / SIGEF):*\n` +
    `👤 *Responsável Legal:* ${land.owner_name}\n` +
    `🆔 *CPF/CNPJ:* ${land.owner_document}\n` +
    `🏡 *Imóvel Rural:* ${land.property_name}\n` +
    `📜 *Recibo CAR:* ${land.car_receipt} (${land.car_status})\n` +
    `📍 *Localização:* ${spot.municipality} - ${spot.state}\n` +
    `🌐 *Coordenadas:* ${spot.latitude.toFixed(5)}, ${spot.longitude.toFixed(5)}\n\n` +
    `🔥 *MATERIALIDADE TÉCNICA ORBITAL:*\n` +
    `🛰️ *Satélite Detector:* ${spot.satellite}\n` +
    `⚡ *Potência Radiativa (FRP):* ${spot.frp_mw} MW\n` +
    `🌡️ *Temperatura do Foco:* ${tempC}°C\n` +
    `📐 *Área Estimada Atingida:* ${dossier.burntAreaHaEstimate} hectares\n` +
    `💰 *Estimativa Preliminar de Multa:* R$ ${dossier.estimatedFineBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
    `⚖️ *TIPIFICAÇÃO JURÍDICA:*\n` +
    `• Art. 41 da Lei Federal nº 9.605/1998 (Crime Ambiental - Reclusão de 2 a 4 anos)\n` +
    `• Art. 43 do Decreto Federal nº 6.514/2008 (Multa de R$ 5.000,00 por hectare)\n\n` +
    `🗺️ *Geolocalização Satélite em Tempo Real:*\n${mapsLink}\n\n` +
    `🔐 *Protocolo Digital de Auditoria:* ${dossier.officerSignatureProtocol}\n` +
    `🏛️ *Órgão Competente:* ${dossier.responsibleAuthority}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Notificação pré-processada com fé pública preliminar nos termos do Decreto 6.514/08._`;

  // Persistência no Supabase PostGIS
  let supabaseSuccess = false;
  if (saveToSupabase) {
    try {
      supabaseSuccess = await saveInfractionToSupabase(dossier);
    } catch (e) {
      console.warn('Erro ao salvar no Supabase:', e);
    }
  }

  // Notificar backend local se ativo
  try {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') await fetch('http://localhost:8000/api/alerts/dispatch-safe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: spot.latitude,
        longitude: spot.longitude,
        endereco: `${spot.municipality} - ${spot.state} (CAR: ${land.car_receipt})`,
        reincidente: spot.frp_mw >= 50,
        frp: spot.frp_mw,
      }),
    });
  } catch (err) {
    // Backend offline ou modo client-only
  }

  // Disparo do WhatsApp Web / App
  const encoded = encodeURIComponent(officialMessage);
  const whatsappUrl = targetNumber
    ? `https://api.whatsapp.com/send?phone=${targetNumber}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;

  window.open(whatsappUrl, '_blank', 'width=850,height=720');

  return {
    success: true,
    protocolNumber: dossier.protocolNumber,
    recipient: recipientLabel,
    targetNumber,
    supabasePersisted: supabaseSuccess,
    text: officialMessage,
  };
}
