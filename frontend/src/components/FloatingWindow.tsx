import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { X, Minus, Square, Maximize2, ExternalLink } from 'lucide-react';

interface FloatingWindowProps {
  id: string;
  title: string;
  url?: string;
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  children?: React.ReactNode;
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  id,
  title,
  url,
  isOpen,
  isMinimized,
  zIndex,
  onFocus,
  onClose,
  onMinimize,
  defaultPosition = { x: 60, y: 80 },
  defaultSize = { width: 620, height: 420 },
  children,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen || isMinimized) return null;

  return (
    <Rnd
      default={{
        x: Math.max(10, Math.min(defaultPosition.x, window.innerWidth - Math.min(defaultSize.width, window.innerWidth - 30) - 20)),
        y: Math.max(10, Math.min(defaultPosition.y, window.innerHeight - Math.min(defaultSize.height, window.innerHeight - 40) - 20)),
        width: Math.min(defaultSize.width, window.innerWidth - 30),
        height: Math.min(defaultSize.height, window.innerHeight - 40),
      }}
      minWidth={Math.min(320, window.innerWidth - 20)}
      minHeight={Math.min(200, window.innerHeight - 30)}
      bounds="window"
      dragHandleClassName="window-titlebar"
      enableResizing={!isMaximized}
      disableDragging={isMaximized}
      style={{ zIndex }}
      onMouseDown={() => onFocus(id)}
      className={`flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-lg shadow-2xl overflow-hidden backdrop-blur-md transition-all ${
        isMaximized ? '!fixed !inset-4 !w-auto !h-auto !transform-none z-50' : ''
      }`}
    >
      {/* Barra de Título (Draggable Handle) */}
      <div className="window-titlebar flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 cursor-move select-none">
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="truncate max-w-[280px]">{title}</span>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center space-x-1.5 text-slate-400">
          {url && (
            <button
              onClick={() => window.open(url, '_blank')}
              title="Abrir em nova aba"
              className="p-1 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              <ExternalLink size={13} />
            </button>
          )}
          <button
            onClick={() => onMinimize(id)}
            title="Minimizar para o dock"
            className="p-1 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restaurar" : "Maximizar"}
            className="p-1 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            {isMaximized ? <Square size={12} /> : <Maximize2 size={12} />}
          </button>
          <button
            onClick={() => onClose(id)}
            title="Fechar"
            className="p-1 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Conteúdo Iframe / Sandbox ou Componente Filho */}
      <div className="flex-1 w-full h-full bg-slate-950 relative overflow-hidden flex flex-col">
        {url ? (
          <iframe
            src={url}
            title={title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="w-full h-full border-0"
            loading="lazy"
          />
        ) : (
          children
        )}
      </div>
    </Rnd>
  );
};
