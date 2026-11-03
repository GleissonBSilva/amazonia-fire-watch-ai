// Serviço de Text-to-Speech (TTS) com suporte a voz neural de alta fidelidade
// Prioriza o endpoint serverless /api/tts (OpenAI TTS) com fallback instantâneo para a Web Speech API nativa

export interface TTSOptions {
  voice?: 'onyx' | 'alloy' | 'nova' | string;
  speed?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

class TTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private isMutedState: boolean = false;
  private speaking: boolean = false;
  private listeners: Set<(isSpeaking: boolean) => void> = new Set();

  constructor() {
    try {
      const saved = localStorage.getItem('afw_tts_muted');
      if (saved !== null) {
        this.isMutedState = JSON.parse(saved);
      }
    } catch {}
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

    const cleanText = text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[#*`_~]/g, '')
      .replace(/•/g, ', ')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    try {
      // 1. Tenta endpoint da Vercel (/api/tts)
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voice: options.voice || 'onyx',
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
          console.warn('Erro na reprodução do áudio da Vercel, usando fallback Web Speech:', e);
          this.fallbackWebSpeech(cleanText, options);
        };

        await audio.play();
        return;
      }

      // Se a API retornar JSON indicando fallback ou se falhar
      this.fallbackWebSpeech(cleanText, options);
    } catch (err) {
      console.warn('Falha na chamada /api/tts, usando Web Speech API local:', err);
      this.fallbackWebSpeech(cleanText, options);
    }
  }

  private fallbackWebSpeech(text: string, options: TTSOptions): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.setSpeaking(false);
      options.onError?.(new Error('Nenhum sintetizador de voz disponível neste navegador.'));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = options.speed || 1.05;
    utterance.pitch = 0.95; // Tom levemente mais sóbrio e militar

    // Procura por vozes em português de alta qualidade disponíveis no sistema
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang === 'pt-BR' && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural')))
      || voices.find((v) => v.lang.startsWith('pt'));

    if (ptVoice) {
      utterance.voice = ptVoice;
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

