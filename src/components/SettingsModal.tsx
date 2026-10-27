import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import {
  X,
  Settings,
  Save,
  RotateCcw,
  Bell,
  Shield,
  Layers,
  Phone,
  Flame,
  Wind,
  CheckCircle2,
  Maximize2,
  Square
} from 'lucide-react';
import { MapLayerType } from '../types';

export interface SystemConfigState {
  criticalFrpThreshold: number;
  criticalAqiThreshold: number;
  recentOutbreakMinutes: number;
  whatsappEmergencyPhone: string;
  telegramChatId: string;
  enableSoundAlerts: boolean;
  enableAutoEmergencyProtocol: boolean;
  defaultBaseLayer: MapLayerType;
  enableRainRadarOnStartup: boolean;
  enableThermalMaskOnStartup: boolean;
  pollingIntervalSeconds: number;
}

export const DEFAULT_CONFIG: SystemConfigState = {
  criticalFrpThreshold: 50,
  criticalAqiThreshold: 50,
  recentOutbreakMinutes: 180,
  whatsappEmergencyPhone: '+55 92 99374-6740',
  telegramChatId: '993746740',
  enableSoundAlerts: true,
  enableAutoEmergencyProtocol: false,
  defaultBaseLayer: 'google_hybrid',
  enableRainRadarOnStartup: false,
  enableThermalMaskOnStartup: false,
  pollingIntervalSeconds: 45,
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemConfigState;
  onSaveConfig: (newConfig: SystemConfigState) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<SystemConfigState>(config);
  const [activeTab, setActiveTab] = useState<'alerts' | 'dispatch' | 'layers'>('alerts');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  useEffect(() => {
    setFormData(config);
  }, [config, isOpen]);

  const handleSave = () => {
    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleReset = () => {
    setFormData(DEFAULT_CONFIG);
  };

  if (!isOpen) return null;

  return (
    <Rnd
      default={{
        x: Math.max(30, (window.innerWidth - 620) / 2),
        y: Math.max(30, (window.innerHeight - 520) / 2),
        width: 620,
        height: 520,
      }}
      minWidth={360}
      minHeight={280}
      bounds="window"
      dragHandleClassName="settings-window-handle"
      enableResizing={!isMaximized}
      disableDragging={isMaximized}
      className={`fixed z-50 flex flex-col bg-slate-900/95 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md font-mono select-none ${
        isMaximized ? '!inset-3 !w-auto !h-auto !transform-none' : ''
      }`}
    >
      {/* Header Móvel de Configuração (Draggable Handle) */}
      <div className="settings-window-handle px-4 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between cursor-move select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
            <Settings size={16} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide">
              CENTRO DE CONFIGURAÇÕES &amp; PARÂMETROS
            </h2>
            <p className="text-[9.5px] text-slate-400">
              Ajuste de limiares operacionais, comunicação de emergência e camadas GIS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
            title={isMaximized ? 'Restaurar tamanho' : 'Maximizar'}
          >
            {isMaximized ? <Square size={12} /> : <Maximize2 size={12} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:text-red-400 hover:bg-slate-800 rounded transition"
            title="Fechar configurações"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Abas de Configuração */}
      <div className="px-4 py-1.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 text-xs flex-shrink-0">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition text-[10.5px] ${
            activeTab === 'alerts'
              ? 'bg-amber-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Flame size={12} />
          <span>Limiares de Alerta</span>
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition text-[10.5px] ${
            activeTab === 'dispatch'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Phone size={12} />
          <span>Despacho &amp; Alertas</span>
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition text-[10.5px] ${
            activeTab === 'layers'
              ? 'bg-cyan-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Layers size={12} />
          <span>Camadas &amp; Polling</span>
        </button>
      </div>

      {/* Formulário de Configuração */}
      <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs text-slate-200">
        {activeTab === 'alerts' && (
          <div className="space-y-3.5">
            <div>
              <label className="font-bold text-white block mb-0.5 flex items-center justify-between text-[11px]">
                <span>Limiar de FRP Crítico (MW):</span>
                <span className="text-amber-400 font-bold">{formData.criticalFrpThreshold} MW</span>
              </label>
              <input
                type="range"
                min="20"
                max="150"
                step="5"
                value={formData.criticalFrpThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, criticalFrpThreshold: Number(e.target.value) })
                }
                className="w-full cursor-pointer"
              />
              <p className="text-[9.5px] text-slate-400 mt-0.5">
                Focos com FRP igual ou superior a este valor disparam status de Severidade Crítica.
              </p>
            </div>

            <div>
              <label className="font-bold text-white block mb-0.5 flex items-center justify-between text-[11px]">
                <span>Limiar de Alerta de Qualidade do Ar (AQI):</span>
                <span className="text-purple-400 font-bold">AQI {formData.criticalAqiThreshold}</span>
              </label>
              <input
                type="range"
                min="30"
                max="200"
                step="5"
                value={formData.criticalAqiThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, criticalAqiThreshold: Number(e.target.value) })
                }
                className="w-full cursor-pointer"
              />
              <p className="text-[9.5px] text-slate-400 mt-0.5">
                Padrão CONAMA Resolução nº 491/2018 (AQI &gt; 50 = Alerta de Poluição Respiratória).
              </p>
            </div>

            <div>
              <label className="font-bold text-white block mb-0.5 flex items-center justify-between text-[11px]">
                <span>Janela de Novo Surgimento (Minutos):</span>
                <span className="text-cyan-400 font-bold">{formData.recentOutbreakMinutes} min ({formData.recentOutbreakMinutes / 60}h)</span>
              </label>
              <input
                type="range"
                min="60"
                max="360"
                step="30"
                value={formData.recentOutbreakMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, recentOutbreakMinutes: Number(e.target.value) })
                }
                className="w-full cursor-pointer"
              />
              <p className="text-[9.5px] text-slate-400 mt-0.5">
                Detecções com tempo de passagem menor que este intervalo disparam banner imediato de novo foco.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'dispatch' && (
          <div className="space-y-3.5">
            <div>
              <label className="font-bold text-white block mb-1 text-[11px]">
                Número de Notificação WhatsApp de Emergência (CBMAM / CIOPS):
              </label>
              <input
                type="text"
                value={formData.whatsappEmergencyPhone}
                onChange={(e) => setFormData({ ...formData, whatsappEmergencyPhone: e.target.value })}
                placeholder="+55 92 99374-6740"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
              />
              <p className="text-[9.5px] text-slate-400 mt-1">
                Contato operacional que recebe despachos automáticos e relatórios das áreas delimitadas.
              </p>
            </div>

            <div>
              <label className="font-bold text-white block mb-1 text-[11px]">
                Chat ID do Telegram (Alertas OSINT):
              </label>
              <input
                type="text"
                value={formData.telegramChatId}
                onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                placeholder="993746740"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={formData.enableSoundAlerts}
                  onChange={(e) => setFormData({ ...formData, enableSoundAlerts: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="font-bold text-white">Ativar Notificações Sonoras para Focos Críticos</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={formData.enableAutoEmergencyProtocol}
                  onChange={(e) =>
                    setFormData({ ...formData, enableAutoEmergencyProtocol: e.target.checked })
                  }
                  className="w-4 h-4 accent-red-500"
                />
                <span className="font-bold text-white">Protocolo de Contagem Regressiva Automática</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'layers' && (
          <div className="space-y-3.5">
            <div>
              <label className="font-bold text-white block mb-1 text-[11px]">Textura Base Inicial do Mapa:</label>
              <select
                value={formData.defaultBaseLayer}
                onChange={(e) =>
                  setFormData({ ...formData, defaultBaseLayer: e.target.value as MapLayerType })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="google_hybrid">Google Satélite HD (Híbrido)</option>
                <option value="satellite">Esri Satélite Híbrido</option>
                <option value="google_earth">Google Earth 3D (Terreno)</option>
                <option value="dark">Tático Noturno</option>
                <option value="topo">Relevo &amp; Topografia</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-white block mb-0.5 flex items-center justify-between text-[11px]">
                <span>Intervalo de Polling / Sincronização Satelital:</span>
                <span className="text-cyan-300 font-bold">{formData.pollingIntervalSeconds}s</span>
              </label>
              <input
                type="range"
                min="20"
                max="180"
                step="5"
                value={formData.pollingIntervalSeconds}
                onChange={(e) =>
                  setFormData({ ...formData, pollingIntervalSeconds: Number(e.target.value) })
                }
                className="w-full cursor-pointer"
              />
              <p className="text-[9.5px] text-slate-400 mt-0.5">
                Taxa de consulta aos dados orbitais e caches da NASA e INPE.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={formData.enableRainRadarOnStartup}
                  onChange={(e) =>
                    setFormData({ ...formData, enableRainRadarOnStartup: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="font-bold text-white">Ativar Radar de Chuva na Inicialização</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={formData.enableThermalMaskOnStartup}
                  onChange={(e) =>
                    setFormData({ ...formData, enableThermalMaskOnStartup: e.target.checked })
                  }
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="font-bold text-white">Ativar Máscara Térmica LST na Inicialização</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé com Ações */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
        <button
          onClick={handleReset}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] flex items-center gap-1 transition"
        >
          <RotateCcw size={12} />
          <span>Restaurar Padrões</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10.5px] flex items-center gap-1 transition shadow"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 size={13} className="text-emerald-200" />
                <span>Salvo!</span>
              </>
            ) : (
              <>
                <Save size={12} />
                <span>Salvar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Rnd>
  );
};
