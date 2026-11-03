// Serviço de Text-to-Speech (TTS) Humanizado e Natural
// Prioriza o áudio neural (MP3) do endpoint /api/tts (Google Neural / OpenAI TTS)
// Fallback inteligente para vozes neurais de alta fidelidade da Web Speech API (Edge/Chrome/Windows)

export type VoiceGender = 'feminina' | 'masculina';

export interface TTSOptions {
  gender?: VoiceGender;
  speed?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

class TTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private isMutedState: boolean = false;
  private speaking: boolean = false;
  private selectedGender: VoiceGender = 'feminina';
  private listeners: Set<(isSpeaking: boolean) => void> = new Set();
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    try {
      const savedMute = localStorage.getItem('afw_tts_muted');
      if (savedMute !== null) {
        this.isMutedState = JSON.parse(savedMute);
      }
      const savedGender = localStorage.getItem('afw_tts_gender') as VoiceGender;
      if (savedGender === 'feminina' || savedGender === 'masculina') {
        this.selectedGender = savedGender;
      }
    } catch {}

    // Pré-carrega vozes do navegador de forma assíncrona
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        this.cachedVoices = window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  public subscribe(listener: (isSpeaking: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.speaking);
    return () => this.listeners.delete(listener);
  }

  private setSpeaking(status: boolean) {
    this.speaking = status;
    this.listeners.forEach((cb) => cb(status));
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public setMuted(muted: boolean): void {
    this.isMutedState = muted;
    try {
      localStorage.setItem('afw_tts_muted', JSON.stringify(muted));
    } catch {}
    if (muted) {
      this.stop();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMutedState);
    return this.isMutedState;
  }

  public getGender(): VoiceGender {
    return this.selectedGender;
  }

  public setGender(gender: VoiceGender): void {
    this.selectedGender = gender;
    try {
      localStorage.setItem('afw_tts_gender', gender);
    } catch {}
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }

  public stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.setSpeaking(false);
  }

  public async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (this.isMutedState || !text) return;

    this.stop();
    this.setSpeaking(true);

    const gender = options.gender || this.selectedGender;

    // Higienização semântica de pontuação e siglas para fala fluida
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[#*`_~]/g, '')
      .replace(/•/g, ', ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/CBMAM/gi, 'Corpo de Bombeiros')
      .replace(/ICMBio/gi, 'I C M Bio')
      .replace(/PM2\.5/gi, 'partículas P M 2 ponto 5')
      .replace(/AQI/gi, 'índice A Q I')
      .replace(/FRP/gi, 'potência radiativa')
      .replace(/MW/gi, 'Megawatts')
      .trim();

    try {
      // 1. Tenta endpoint /api/tts (Retorna áudio neural MP3 Google/OpenAI)
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voice: gender === 'masculina' ? 'onyx' : 'nova',
          speed: options.speed || 1.0,
        }),
      });

      const contentType = res.headers.get('Content-Type') || '';

      if (res.ok && contentType.includes('audio')) {
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;

        audio.onplay = () => {
          options.onStart?.();
        };

        audio.onended = () => {
          this.setSpeaking(false);
          options.onEnd?.();
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = (e) => {
          console.warn('Erro ao reproduzir stream MP3, recorrendo à síntese local natural:', e);
          this.fallbackWebSpeech(cleanText, gender, options);
        };

        await audio.play();
        return;
      }

      // Se retornou JSON instruindo síntese local
      this.fallbackWebSpeech(cleanText, gender, options);
    } catch (err) {
      console.warn('Endpoint /api/tts inacessível, utilizando vozes neurais locais do sistema:', err);
      this.fallbackWebSpeech(cleanText, gender, options);
    }
  }

  // Fallback Inteligente: Filtra rigorosamente por vozes neurais humanas em português
  private fallbackWebSpeech(text: string, gender: VoiceGender, options: TTSOptions): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.setSpeaking(false);
      options.onError?.(new Error('Nenhum sintetizador de voz disponível.'));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0; // Cadência humana normal
    utterance.pitch = 1.0; // Entonação natural (evita pitch grave ou robótico)

    const voices = this.cachedVoices.length > 0 ? this.cachedVoices : window.speechSynthesis.getVoices();

    // Prioriza vozes neurais / naturais conhecidas no Edge e Chrome:
    // 1. Francisca Online (Natural) - Português (Brasil) -> Voz humana mais perfeita da Microsoft
    // 2. Antonio Online (Natural) - Português (Brasil) -> Voz masculina natural
    // 3. Google português do Brasil -> Muito limpa
    // 4. Luciana / Maria Natural
    let bestVoice: SpeechSynthesisVoice | undefined;

    if (gender === 'masculina') {
      bestVoice = voices.find((v) => v.lang.startsWith('pt') && (v.name.includes('Antonio') || v.name.includes('Felipe') || v.name.includes('Daniel') || (v.name.includes('Male') && v.name.includes('Natural'))))
        || voices.find((v) => v.lang === 'pt-BR' && v.name.includes('Natural'))
        || voices.find((v) => v.lang === 'pt-BR' && !v.name.toLowerCase().includes('desktop'));
    } else {
      bestVoice = voices.find((v) => v.lang.startsWith('pt') && (v.name.includes('Francisca') || v.name.includes('Thalita') || v.name.includes('Google') || (v.name.includes('Natural') && !v.name.includes('Antonio'))))
        || voices.find((v) => v.lang === 'pt-BR' && v.name.includes('Natural'))
        || voices.find((v) => v.lang === 'pt-BR' && !v.name.toLowerCase().includes('desktop'));
    }

    if (!bestVoice) {
      bestVoice = voices.find((v) => v.lang.startsWith('pt')) || voices[0];
    }

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onstart = () => {
      this.setSpeaking(true);
      options.onStart?.();
    };

    utterance.onend = () => {
      this.setSpeaking(false);
      options.onEnd?.();
    };

    utterance.onerror = (err) => {
      this.setSpeaking(false);
      options.onError?.(err);
    };

    window.speechSynthesis.speak(utterance);
  }
}

export const ttsService = new TTSService();
