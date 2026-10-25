import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  PhoneCall,
  Clock,
  XCircle,
  Send,
  CheckCircle2,
  Lock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { sendWhatsAppFireAlert } from '../services/alertService';
import { Facility, ThermalIncident } from '../data/facilityFloorPlans';

interface AutoEmergencyCountdownProps {
  isOpen: boolean;
  onClose: () => void;
  facility?: Facility | null;
  incident?: ThermalIncident | null;
  defaultCountdownSeconds?: number;
}

export const AutoEmergencyCountdown: React.FC<AutoEmergencyCountdownProps> = ({
  isOpen,
  onClose,
  facility,
  incident,
  defaultCountdownSeconds = 30,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(defaultCountdownSeconds);
  const [isAborted, setIsAborted] = useState<boolean>(false);
  const [isDispatched, setIsDispatched] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const targetPhoneNumber = '(92) 99374-6740';
  const targetNumberDigits = '5592993746740';

  // Sound generator using Web Audio API
  const playTacticalBeep = (freq: number = 880, duration: number = 0.08) => {
    if (isMuted) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (audioContextRef.current) {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioContextRef.current.currentTime);
        gain.gain.setValueAtTime(0.04, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.start();
        osc.stop(audioContextRef.current.currentTime + duration);
      }
    } catch (e) {
      // Audio context might be restricted by browser policy before user interaction
    }
  };

  // Reset countdown on open
  useEffect(() => {
    if (isOpen) {
      setSecondsRemaining(defaultCountdownSeconds);
      setIsAborted(false);
      setIsDispatched(false);
      playTacticalBeep(1100, 0.15);
    }
  }, [isOpen, defaultCountdownSeconds]);

  // Countdown timer logic
  useEffect(() => {
    if (!isOpen || isAborted || isDispatched) return;

    if (secondsRemaining <= 0) {
      handleExecuteDispatch();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        // Pulse beep every second, higher pitch in last 5 seconds
        if (prev <= 6) {
          playTacticalBeep(1200, 0.12);
        } else if (prev % 5 === 0) {
          playTacticalBeep(750, 0.08);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, secondsRemaining, isAborted, isDispatched]);

  const handleAbort = () => {
    setIsAborted(true);
    playTacticalBeep(440, 0.25);
    console.info('🛑 [PROTOCOLO CANCELADO]: Operador interrompeu o despacho automático de emergência.');
  };

  const handleExecuteDispatch = async () => {
    setIsDispatched(true);
    playTacticalBeep(1400, 0.3);

    const facilityName = facility?.name || 'Complexo Industrial Manaus';
    const sectorName = incident?.sectorName || facility?.sectors[0]?.name || 'Galpão 01';
    const peakTemp = incident?.peakTempC || 184.6;
    const deltaTemp = incident?.deltaTempC || 160.1;
    const smokePpm = incident?.smokeConcentrationPpm || 485;
    const lat = facility?.coordinates.lat || -3.10250;
    const lng = facility?.coordinates.lng || -59.94500;
    const mapsLink = `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`;

    const message =
      `*[PROTOCOLO AUTOMATIZADO DE EMERGÊNCIA - SIMULADO]*\n` +
      `🚨 *SISTEMA AMAZÔNIA FIRE WATCH AI* 🚨\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔥 *AMEAÇA DE INCÊNDIO CONFIRMADA POR IA (SEM INTERRUPÇÃO DO OPERADOR)*\n\n` +
      `🏢 *Unidade Fabril:* ${facilityName}\n` +
      `📍 *Setor Crítico:* ${sectorName}\n` +
      `🌐 *Coordenadas:* ${lat.toFixed(5)}, ${lng.toFixed(5)}\n` +
      `🌡️ *Temperatura de Pico:* ${peakTemp.toFixed(1)}°C (Variação: +${deltaTemp.toFixed(1)}°C)\n` +
      `💨 *Concentração de Fumaça:* ${smokePpm} ppm (CO) | PM2.5 Elevado\n` +
      (incident
        ? `🧭 *Vetor de Dispersão:* ${incident.propagation.velocityMs} m/s rumo a ${incident.propagation.directionText}\n` +
          `🧯 *Combate Recomendado:* ${incident.recommendedExtinguisher}\n`
        : '') +
      `\n🔒 *DESTINATÁRIO EXCLUSIVO (SANDBOX):* Operador ${targetPhoneNumber}\n` +
      `🗺️ *Localização Google Maps:* ${mapsLink}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Protocolo de homologação operacional executado em segurança._`;

    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetNumberDigits}&text=${encoded}`;
    
    // Open in clean dedicated tab/window
    window.open(whatsappUrl, '_blank', 'width=800,height=700');
  };

  if (!isOpen) return null;

  const progressPercent = (secondsRemaining / defaultCountdownSeconds) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3">
      <div className="relative w-full max-w-xl bg-slate-950 border-2 border-red-600 rounded-xl shadow-[0_0_50px_rgba(239,68,68,0.35)] overflow-hidden font-sans">
        
        {/* TOP ALERT HEADER */}
        <div className="bg-red-950/80 px-4 py-3 border-b border-red-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <h3 className="text-sm md:text-base font-bold font-mono text-red-200 tracking-wider flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-400" />
              PROTOCOLO AUTOMATIZADO DE EMERGÊNCIA
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-red-300 hover:text-white p-1 rounded hover:bg-red-900/50"
              title={isMuted ? 'Ativar Áudio' : 'Mutar Áudio'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-900 text-red-200 border border-red-600">
              SIMULAÇÃO
            </span>
          </div>
        </div>

        {/* BODY */}
        <div className="p-4 md:p-6 space-y-4">
          
          {/* SECURITY & TARGET BADGE */}
          <div className="bg-amber-950/40 border border-amber-600/50 rounded-lg p-2.5 flex items-start gap-2.5 text-xs">
            <Lock size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-200">
                TRAVA DE SEGURANÇA OPERACIONAL ATIVA
              </p>
              <p className="text-amber-300/80 text-[11px] mt-0.5">
                Para evitar acionamentos reais indevidos a órgãos públicos, este alerta é direcionado
                estritamente ao número cadastrado do operador: <strong className="text-white">{targetPhoneNumber}</strong>.
              </p>
            </div>
          </div>

          {/* FACILITY & INCIDENT SUMMARY */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Instalação Afetada:</span>
              <span className="text-white font-bold">{facility?.name || 'LG Electronics (Galpão 01)'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Setor do Foco:</span>
              <span className="text-red-400 font-bold">{incident?.sectorName || 'Setor A - Linha SMT'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Telemetria Térmica:</span>
              <span className="text-orange-300 font-bold">
                {incident?.peakTempC.toFixed(1) || '184.6'}°C (Delta +{incident?.deltaTempC.toFixed(1) || '160.1'}°C)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Dispersão Fumaça:</span>
              <span className="text-amber-300 font-bold">
                {incident?.smokeConcentrationPpm || 485} ppm CO | {incident?.propagation.velocityMs || 1.6} m/s
              </span>
            </div>
          </div>

          {/* MAIN COUNTDOWN HUD (IF NOT ABORTED AND NOT DISPATCHED) */}
          {!isAborted && !isDispatched && (
            <div className="text-center py-2 space-y-3">
              <div className="flex items-center justify-center gap-3">
                <Clock size={28} className="text-red-500 animate-pulse" />
                <div className="text-5xl md:text-6xl font-mono font-extrabold text-white tracking-wider">
                  00:{secondsRemaining.toString().padStart(2, '0')}
                </div>
              </div>

              {/* DRAIN BAR */}
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="text-xs text-slate-400 font-mono">
                Se não houver interrupção do operador, o despacho de emergência será disparado automaticamente.
              </p>
            </div>
          )}

          {/* ABORTED STATE */}
          {isAborted && (
            <div className="bg-red-950/50 border border-red-600/60 rounded-lg p-4 text-center space-y-2">
              <XCircle size={36} className="text-red-400 mx-auto" />
              <h4 className="text-sm font-bold text-red-200 uppercase font-mono">
                PROTOCOLO CANCELADO PELO OPERADOR
              </h4>
              <p className="text-xs text-slate-300">
                O envio automático foi bloqueado com sucesso. Nenhuma mensagem foi despachada.
              </p>
            </div>
          )}

          {/* DISPATCHED STATE */}
          {isDispatched && (
            <div className="bg-emerald-950/50 border border-emerald-600/60 rounded-lg p-4 text-center space-y-2">
              <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-200 uppercase font-mono">
                DESPACHO TRANSMITIDO COM SUCESSO (SIMULAÇÃO)
              </h4>
              <p className="text-xs text-slate-300">
                Pacote de telemetria e alerta encaminhado para o canal do operador ({targetPhoneNumber}).
              </p>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            {!isAborted && !isDispatched ? (
              <>
                {/* 1. ABORT BUTTON */}
                <button
                  onClick={handleAbort}
                  className="w-full sm:flex-1 py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <XCircle size={16} />
                  <span>ABORTAR / CANCELAR PROTOCOLO</span>
                </button>

                {/* 2. IMMEDIATE DISPATCH (BYPASS COUNTDOWN) */}
                <button
                  onClick={handleExecuteDispatch}
                  className="w-full sm:flex-1 py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-cyan-500/40 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Send size={15} />
                  <span>DISPARAR AGORA (BYPASS)</span>
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition-all"
              >
                Fechar Notificação
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
