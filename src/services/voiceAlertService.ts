import { FireSpot } from '../types';
import { classifyFireAuthenticity } from './fireClassificationService';

const STORAGE_KEY = 'amazonia_firewatch_voice_alerts_enabled';
const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const metaEnv = (import.meta as any).env || {};
const API_BASE_URL = isLocalhost ? (metaEnv.VITE_API_URL || 'http://localhost:8000/api') : '';

let isAudioPlaying = false;
const speechQueue: string[] = [];

/**
 * Retorna se os alertas por voz estão habilitados
 */
export function isVoiceAlertsEnabled(): boolean {
  if (!isBrowser) return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored !== 'false'; // Padrão: ativado
}

/**
 * Ativa ou desativa os alertas por voz
 */
export function setVoiceAlertsEnabled(enabled: boolean): void {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  if (!enabled && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Sintetiza voz tática em português (Brasil)
 * Suporte Híbrido:
 * 1. Web Speech API (zero latência, nativo do navegador)
 * 2. Fallback / gTTS no Backend FastAPI (/api/tts/speak)
 */
export async function speakTacticalAlert(text: string, forceBackend: boolean = false): Promise<void> {
  if (!isBrowser || !isVoiceAlertsEnabled() || !text.trim()) return;

  // Se já estiver falando, enfileira
  if (isAudioPlaying) {
    if (speechQueue.length < 5) {
      speechQueue.push(text);
    }
    return;
  }

  isAudioPlaying = true;

  const processNextInQueue = () => {
    isAudioPlaying = false;
    if (speechQueue.length > 0) {
      const nextText = speechQueue.shift();
      if (nextText) {
        setTimeout(() => speakTacticalAlert(nextText), 350);
      }
    }
  };

  // Método 1: Web Speech API nativa (rápida e sem tráfego de rede)
  if (!forceBackend && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel(); // Limpa áudio anterior

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05; // Ritmo militar claro e objetivo
      utterance.pitch = 1.0;

      // Tenta selecionar voz brasileira se disponível
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang.startsWith('pt'));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      utterance.onend = () => {
        processNextInQueue();
      };

      utterance.onerror = () => {
        // Se a síntese do navegador falhar, tenta fallback via backend gTTS
        playBackendAudio(text).finally(() => processNextInQueue());
      };

      window.speechSynthesis.speak(utterance);
      return;
    } catch {
      // Falha na Web Speech API, prossegue para o backend
    }
  }

  // Método 2: gTTS via Backend FastAPI
  await playBackendAudio(text);
  processNextInQueue();
}

/**
 * Toca áudio MP3 gerado pelo gTTS no backend
 */
async function playBackendAudio(text: string): Promise<void> {
  if (!API_BASE_URL) return;
  try {
    const encodedText = encodeURIComponent(text.slice(0, 300));
    const audioUrl = `${API_BASE_URL}/tts/speak?text=${encodedText}`;
    const audio = new Audio(audioUrl);
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  } catch {
    // Silencia erros de áudio para não interromper a interface
  }
}

/**
 * Gera e anuncia alerta tático oficial de voz para um foco detectado
 */
export function announceFireDetection(spot: FireSpot): void {
  const auth = classifyFireAuthenticity(spot);
  const tempC = Math.round((spot.bright_ti4_k || 300) - 273.15);
  const location = spot.municipality || spot.address || 'Amazônia';
  const frp = Math.round(spot.frp_mw || 0);

  let message = '';

  if (auth.fireType === 'CALOR_INDUSTRIAL') {
    message = `Atenção. Calor industrial identificado em ${location}. Potência de ${frp} megawatts. Fonte fabril com baixo particulado. Falso positivo para incêndio florestal.`;
  } else if (auth.fireType === 'INCENDIO_ESTRUTURAL_FABRIL') {
    message = `Alerta de emergência! Incêndio estrutural em complexo industrial detectado em ${location}. Fumaça tóxica severa. Acionar guarnições do Corpo de Bombeiros.`;
  } else if (auth.fireType === 'VEGETACAO_CRITICA') {
    message = `Alerta crítico de incêndio florestal! Detecção orbital em ${location}. Potência radiativa de ${frp} megawatts e temperatura de ${tempC} graus. Combustão pesada de biomassa ativa.`;
  } else {
    message = `Alerta tático. Foco de calor registrado em ${location}, com ${frp} megawatts. Triagem realizada pelos satélites do sistema.`;
  }

  speakTacticalAlert(message);
}
