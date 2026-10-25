import React from 'react';
import { Camera, Radio, Globe, Satellite, MessageSquare, Flame, Compass, Layers, ShieldAlert } from 'lucide-react';

interface BottomDockProps {
  openWindows: { [id: string]: boolean };
  minimizedWindows: { [id: string]: boolean };
  onToggleWindow: (id: string) => void;
  isGeofenceActive?: boolean;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  openWindows,
  minimizedWindows,
  onToggleWindow,
  isGeofenceActive = false,
}) => {
  const dockItems = [
    { id: 'floorPlan', label: 'Planta Baixa (Térmica)', icon: Layers, color: 'text-amber-400' },
    { id: 'geofence', label: isGeofenceActive ? '🔒 Cerca Virtual (Ativa)' : 'Cerca Virtual (Isolar IA)', icon: ShieldAlert, color: isGeofenceActive ? 'text-cyan-300' : 'text-cyan-400' },
    { id: 'videoStream', label: 'Câmera Rua (YOLO)', icon: Camera, color: 'text-red-400' },
    { id: 'streetView', label: 'Visão da Rua (360°)', icon: Compass, color: 'text-cyan-300' },
    { id: 'osintFeed', label: 'OSINT Telegram/X', icon: Radio, color: 'text-amber-400' },
    { id: 'firms', label: 'NASA FIRMS', icon: Satellite, color: 'text-amber-300' },
    { id: 'googleEarth', label: 'Google Earth 3D', icon: Globe, color: 'text-sky-300' },
    { id: 'bdqueimadas', label: 'INPE BDQueimadas', icon: Flame, color: 'text-orange-400' },
    { id: 'whatsappAlert', label: 'Alerta WhatsApp', icon: MessageSquare, color: 'text-emerald-400' },
  ];

  return (
    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-40 h-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg px-2 py-0.5 flex items-center gap-1 shadow-2xl">
      {dockItems.map(item => {
        const isOpen = openWindows[item.id] || (item.id === 'geofence' && isGeofenceActive);
        const isMin = minimizedWindows[item.id];
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => onToggleWindow(item.id)}
            className={`relative flex items-center justify-center px-2 py-1 rounded-md transition-all gap-1.5 ${
              isOpen && !isMin
                ? 'bg-slate-800 border border-cyan-500/60 text-white shadow'
                : 'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Icon size={14} className={item.color} />
            <span className="text-[10px] font-mono whitespace-nowrap">{item.label}</span>

            {/* Status Indicator Dot */}
            <span
              className={`w-1.5 h-1.5 rounded-full transition-opacity ${
                isOpen
                  ? isMin
                    ? 'bg-amber-400 opacity-100'
                    : 'bg-emerald-400 opacity-100'
                  : 'opacity-0'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};
