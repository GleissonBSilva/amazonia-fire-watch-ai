import React, { useState, useEffect, useRef } from 'react';
import { Polygon, Marker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ActiveGeofenceState } from '../types';
import { reverseGeocode, ReverseGeocodingResult } from '../services/geocodingService';
import { queryLandRegistry } from '../services/landRegistryService';
import {
  normalizeGeofenceToPolygon,
  calculatePolygonAreaKm2,
  getPolygonCentroid,
  translatePolygon,
  scalePolygonXY,
  getPolygonDimensionsKm,
  addVertexAtMidpoint,
  removeVertex,
  getPolygonBoundingBox,
} from '../services/geofenceGeometryService';

interface EditableGeofenceLayerProps {
  geofence: ActiveGeofenceState;
  isEditing: boolean;
  onUpdateGeofence: (updated: ActiveGeofenceState) => void;
  onToggleEdit?: () => void;
  onDeleteGeofence?: () => void;
}

// 1. Alças de Vértices / Quinas Numeradas para Redimensionamento Livre
const createVertexIcon = (index: number) => {
  return L.divIcon({
    className: 'geofence-vertex-icon-container',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: #0891b2;
        border: 2.5px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 16px rgba(0, 240, 255, 0.95), 0 2px 8px rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 13px;
        font-weight: 900;
        font-family: monospace;
        cursor: crosshair;
        user-select: none;
        transition: transform 0.12s ease;
      " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
        ${index}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// 2a. Alça Central de Movimentação da ROI
const createCenterMoveIcon = () => {
  return L.divIcon({
    className: 'geofence-center-icon-container',
    html: `
      <div style="
        width: 154px;
        height: 38px;
        background: linear-gradient(135deg, rgba(8, 145, 178, 0.98), rgba(6, 182, 212, 0.98));
        border: 2px solid #ffffff;
        border-radius: 19px;
        box-shadow: 0 0 20px rgba(0, 240, 255, 0.95), 0 4px 12px rgba(0, 0, 0, 0.85);
        color: #ffffff;
        font-size: 11px;
        font-weight: 900;
        font-family: monospace;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: grab;
        user-select: none;
        letter-spacing: 0.5px;
      " onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">
        <span style="font-size: 15px;">✋</span>
        <span>ARRASTAR CERCA</span>
      </div>
    `,
    iconSize: [154, 38],
    iconAnchor: [77, -6],
  });
};

// 2b. Botão Central de Salvar e Fechar Diretamente na Cerca
const createSaveCloseIcon = () => {
  return L.divIcon({
    className: 'geofence-save-close-icon-container',
    html: `
      <div style="
        width: 170px;
        height: 38px;
        background: linear-gradient(135deg, #059669, #10b981);
        border: 2px solid #ffffff;
        border-radius: 19px;
        box-shadow: 0 0 24px rgba(16, 185, 129, 0.98), 0 4px 14px rgba(0, 0, 0, 0.85);
        color: #ffffff;
        font-size: 11.5px;
        font-weight: 900;
        font-family: monospace;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
        user-select: none;
        letter-spacing: 0.5px;
        white-space: nowrap;
        transition: transform 0.12s ease;
      " onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
        <span style="font-size: 14px;">💾</span>
        <span>SALVAR E FECHAR</span>
      </div>
    `,
    iconSize: [170, 38],
    iconAnchor: [85, 44],
  });
};

// 3. Alça do Eixo X (Largura Leste-Oeste)
const createAxisXIcon = () => {
  return L.divIcon({
    className: 'geofence-axis-x-icon-container',
    html: `
      <div style="
        width: 114px;
        height: 32px;
        background: #f59e0b;
        border: 2px solid #ffffff;
        border-radius: 16px;
        box-shadow: 0 0 16px rgba(245, 158, 11, 0.95), 0 2px 8px rgba(0, 0, 0, 0.7);
        color: #000000;
        font-size: 10px;
        font-weight: 900;
        font-family: monospace;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: ew-resize;
        user-select: none;
        white-space: nowrap;
      " onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
        ↔️ LARGURA X
      </div>
    `,
    iconSize: [114, 32],
    iconAnchor: [57, 16],
  });
};

// 4. Alça do Eixo Y (Altura Norte-Sul)
const createAxisYIcon = () => {
  return L.divIcon({
    className: 'geofence-axis-y-icon-container',
    html: `
      <div style="
        width: 114px;
        height: 32px;
        background: #a855f7;
        border: 2px solid #ffffff;
        border-radius: 16px;
        box-shadow: 0 0 16px rgba(168, 85, 247, 0.95), 0 2px 8px rgba(0, 0, 0, 0.7);
        color: #ffffff;
        font-size: 10px;
        font-weight: 900;
        font-family: monospace;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: ns-resize;
        user-select: none;
        white-space: nowrap;
      " onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
        ↕️ ALTURA Y
      </div>
    `,
    iconSize: [114, 32],
    iconAnchor: [57, 16],
  });
};

// 5. Botões de Adição de Vértices nas Arestas (Midpoints)
const createMidpointIcon = () => {
  return L.divIcon({
    className: 'geofence-midpoint-icon-container',
    html: `
      <div style="
        width: 22px;
        height: 22px;
        background: #0284c7;
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(2, 132, 199, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
        opacity: 0.9;
        transition: transform 0.15s ease;
      " onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'" title="Clique para adicionar vértice nesta aresta">
        +
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

export const EditableGeofenceLayer: React.FC<EditableGeofenceLayerProps> = ({
  geofence,
  isEditing,
  onUpdateGeofence,
  onToggleEdit,
  onDeleteGeofence,
}) => {
  const map = useMap();
  const [polygon, setPolygon] = useState<[number, number][]>(() =>
    normalizeGeofenceToPolygon(geofence)
  );

  // Referência contínua do polígono para evitar stale closures em eventos de drag a 60 FPS
  const polygonRef = useRef<[number, number][]>(polygon);
  polygonRef.current = polygon;

  // Snapshots de início de arrasto
  const dragStartCenterRef = useRef<{ lat: number; lng: number; polygon: [number, number][] } | null>(null);
  const dragStartAxisRef = useRef<{ polygon: [number, number][]; centroid: [number, number]; halfWidth: number; halfHeight: number } | null>(null);

  // Controle de arrasto direto do corpo do polígono
  const isDraggingBodyRef = useRef<boolean>(false);
  const startDragPointRef = useRef<L.LatLng | null>(null);
  const startDragPolygonRef = useRef<[number, number][] | null>(null);
  const hasMovedRef = useRef<boolean>(false);

  const [placeInfo, setPlaceInfo] = useState<ReverseGeocodingResult | null>(null);

  // Sincroniza quando a geofence mudar externamente
  useEffect(() => {
    const normalized = normalizeGeofenceToPolygon(geofence);
    setPolygon(normalized);
    polygonRef.current = normalized;

    const c = getPolygonCentroid(normalized);
    reverseGeocode(c[0], c[1])
      .then((res) => setPlaceInfo(res))
      .catch(() => {});
  }, [geofence.id, geofence.bounds, geofence.polygon]);

  if (!polygon || polygon.length < 3) return null;

  const centroid = getPolygonCentroid(polygon);
  const bbox = getPolygonBoundingBox(polygon);
  const dimensions = getPolygonDimensionsKm(polygon);

  // Posições das alças dos eixos X (Leste) e Y (Norte)
  const midLat = (bbox[0][0] + bbox[1][0]) / 2;
  const midLng = (bbox[0][1] + bbox[1][1]) / 2;
  const axisXPosition: [number, number] = [midLat, bbox[1][1]];
  const axisYPosition: [number, number] = [bbox[1][0], midLng];

  // -------------------------------------------------------------
  // 1. ARRASTO DIRETO NO CORPO DA ROI (CLICOU, SEGUROU E ARRASTOU)
  // -------------------------------------------------------------
  const handlePolygonMouseDown = (e: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(e.originalEvent);
    map.dragging.disable();
    isDraggingBodyRef.current = true;
    hasMovedRef.current = false;
    startDragPointRef.current = e.latlng;
    startDragPolygonRef.current = [...polygonRef.current];

    const onWindowMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingBodyRef.current || !startDragPointRef.current || !startDragPolygonRef.current) return;
      
      const currentLatLng = map.mouseEventToLatLng(moveEvt);
      const deltaLat = currentLatLng.lat - startDragPointRef.current.lat;
      const deltaLng = currentLatLng.lng - startDragPointRef.current.lng;
      
      if (Math.abs(deltaLat) > 0.00005 || Math.abs(deltaLng) > 0.00005) {
        hasMovedRef.current = true;
      }

      const shifted = translatePolygon(startDragPolygonRef.current, deltaLat, deltaLng);
      setPolygon(shifted);
    };

    const onWindowMouseUp = () => {
      if (!isDraggingBodyRef.current) return;
      isDraggingBodyRef.current = false;
      map.dragging.enable();
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);

      if (hasMovedRef.current) {
        handleCommit();
      }
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
  };

  // -------------------------------------------------------------
  // 2. ARRASTO PELO BOTÃO CENTRAL (✋ ARRASTAR CERCA)
  // -------------------------------------------------------------
  const handleCenterDragStart = (e: any) => {
    const latLng = e.target.getLatLng();
    dragStartCenterRef.current = {
      lat: latLng.lat,
      lng: latLng.lng,
      polygon: [...polygonRef.current],
    };
  };

  const handleCenterDrag = (e: any) => {
    if (!dragStartCenterRef.current) return;
    const current = e.target.getLatLng();
    const deltaLat = current.lat - dragStartCenterRef.current.lat;
    const deltaLng = current.lng - dragStartCenterRef.current.lng;
    const shifted = translatePolygon(dragStartCenterRef.current.polygon, deltaLat, deltaLng);
    setPolygon(shifted);
  };

  // -------------------------------------------------------------
  // 3. ARRASTO DE VÉRTICES / QUINAS PARA REDIMENSIONAR
  // -------------------------------------------------------------
  const handleVertexDrag = (index: number, e: any) => {
    const latLng = e.target.getLatLng();
    setPolygon((prev) => {
      const updated = [...prev];
      updated[index] = [latLng.lat, latLng.lng];
      return updated;
    });
  };

  // -------------------------------------------------------------
  // 4. ARRASTO DAS ALÇAS DE LARGURA (X) E ALTURA (Y)
  // -------------------------------------------------------------
  const handleAxisXDragStart = () => {
    const c = getPolygonCentroid(polygonRef.current);
    const bb = getPolygonBoundingBox(polygonRef.current);
    dragStartAxisRef.current = {
      polygon: [...polygonRef.current],
      centroid: c,
      halfWidth: Math.abs(bb[1][1] - c[1]),
      halfHeight: Math.abs(bb[1][0] - c[0]),
    };
  };

  const handleAxisXDrag = (e: any) => {
    if (!dragStartAxisRef.current) return;
    const { polygon: startPoly, centroid: c, halfWidth } = dragStartAxisRef.current;
    const currentLng = e.target.getLatLng().lng;
    const targetHalfWidth = Math.abs(currentLng - c[1]);
    if (halfWidth > 0.0001 && targetHalfWidth > 0.0001) {
      const factorX = targetHalfWidth / halfWidth;
      const scaled = scalePolygonXY(startPoly, factorX, 1.0);
      setPolygon(scaled);
    }
  };

  const handleAxisYDragStart = () => {
    const c = getPolygonCentroid(polygonRef.current);
    const bb = getPolygonBoundingBox(polygonRef.current);
    dragStartAxisRef.current = {
      polygon: [...polygonRef.current],
      centroid: c,
      halfWidth: Math.abs(bb[1][1] - c[1]),
      halfHeight: Math.abs(bb[1][0] - c[0]),
    };
  };

  const handleAxisYDrag = (e: any) => {
    if (!dragStartAxisRef.current) return;
    const { polygon: startPoly, centroid: c, halfHeight } = dragStartAxisRef.current;
    const currentLat = e.target.getLatLng().lat;
    const targetHalfHeight = Math.abs(currentLat - c[0]);
    if (halfHeight > 0.0001 && targetHalfHeight > 0.0001) {
      const factorY = targetHalfHeight / halfHeight;
      const scaled = scalePolygonXY(startPoly, 1.0, factorY);
      setPolygon(scaled);
    }
  };

  // -------------------------------------------------------------
  // 5. SALVAR E ENRIQUECER GEOMETRIA
  // -------------------------------------------------------------
  const handleCommit = async () => {
    dragStartCenterRef.current = null;
    dragStartAxisRef.current = null;

    const currentPoly = polygonRef.current;
    const newAreaKm2 = calculatePolygonAreaKm2(currentPoly);
    const newBounds = getPolygonBoundingBox(currentPoly);
    const c = getPolygonCentroid(currentPoly);

    let updated: ActiveGeofenceState = {
      ...geofence,
      polygon: currentPoly,
      bounds: newBounds,
      areaKm2: newAreaKm2,
    };

    onUpdateGeofence(updated);

    try {
      const rev = await reverseGeocode(c[0], c[1]);
      const land = queryLandRegistry(c[0], c[1], rev.city, rev.state);
      setPlaceInfo(rev);

      const placeLabel = rev.road
        ? `${rev.road}${rev.neighborhood ? `, ${rev.neighborhood}` : ''} (${rev.city} - ${rev.state})`
        : land.property_name && land.property_name !== 'Setor Territorial'
        ? `${land.property_name} (${rev.city || 'AM'})`
        : `${rev.city} - ${rev.state}`;

      const fullyEnriched: ActiveGeofenceState = {
        ...updated,
        name: placeLabel,
        address: rev.fullAddress,
        road: rev.road || rev.formattedStreet,
        neighborhood: rev.neighborhood,
        city: rev.city,
        state: rev.state,
        postcode: rev.postcode,
        landPropertyName: land.property_name,
        carReceipt: land.car_receipt,
      };

      onUpdateGeofence(fullyEnriched);
    } catch {}
  };

  // Salvar alterações e fechar o modo de edição
  const handleSaveAndClose = async () => {
    await handleCommit();
    if (onToggleEdit) {
      onToggleEdit();
    }
    try {
      if (map && typeof map.closePopup === 'function') {
        map.closePopup();
      }
    } catch {}
  };

  // Escala rápida pelos botões
  const handleScaleXY = (factorX: number, factorY: number) => {
    const scaled = scalePolygonXY(polygonRef.current, factorX, factorY);
    setPolygon(scaled);
    polygonRef.current = scaled;
    const newAreaKm2 = calculatePolygonAreaKm2(scaled);
    const newBounds = getPolygonBoundingBox(scaled);

    onUpdateGeofence({
      ...geofence,
      polygon: scaled,
      bounds: newBounds,
      areaKm2: newAreaKm2,
    });
  };

  // Adição de vértice
  const handleAddVertex = (midpointIndex: number) => {
    const withVertex = addVertexAtMidpoint(polygonRef.current, midpointIndex);
    setPolygon(withVertex);
    polygonRef.current = withVertex;
    const newAreaKm2 = calculatePolygonAreaKm2(withVertex);
    const newBounds = getPolygonBoundingBox(withVertex);

    onUpdateGeofence({
      ...geofence,
      polygon: withVertex,
      bounds: newBounds,
      areaKm2: newAreaKm2,
    });
  };

  // Remoção de vértice
  const handleRemoveVertex = (vertexIndex: number) => {
    if (polygonRef.current.length <= 3) return;
    const withoutVertex = removeVertex(polygonRef.current, vertexIndex);
    setPolygon(withoutVertex);
    polygonRef.current = withoutVertex;
    const newAreaKm2 = calculatePolygonAreaKm2(withoutVertex);
    const newBounds = getPolygonBoundingBox(withoutVertex);

    onUpdateGeofence({
      ...geofence,
      polygon: withoutVertex,
      bounds: newBounds,
      areaKm2: newAreaKm2,
    });
  };

  return (
    <>
      {/* 1. POLÍGONO DA CERCA VIRTUAL / ROI */}
      <Polygon
        positions={polygon}
        pathOptions={{
          color: isEditing ? '#00f0ff' : '#06b6d4',
          fillColor: '#0891b2',
          fillOpacity: isEditing ? 0.32 : 0.20,
          weight: isEditing ? 3.5 : 2.5,
          dashArray: isEditing ? '4, 4' : '8, 6',
          className: isEditing ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        }}
        eventHandlers={{
          mousedown: isEditing ? handlePolygonMouseDown : undefined,
        }}
      >
        <Tooltip direction="center" permanent={false} opacity={0.95}>
          <div className="font-mono text-[10.5px] font-bold text-cyan-950 bg-white/95 px-2.5 py-1 rounded shadow-lg border border-cyan-400 select-none">
            {isEditing
              ? '✋ Segure e arraste para mover • Quinas para redimensionar'
              : `🛰️ ROI Ativa: ${(geofence.areaKm2 * 100).toFixed(0)} ha • Clique para opções`}
          </div>
        </Tooltip>

        <Popup>
          <div className="font-mono text-xs text-slate-900 min-w-[270px]">
            <div className="font-bold text-cyan-800 text-[12px] flex items-center justify-between border-b pb-1 mb-1.5">
              <span className="truncate">🛰️ ROI: {geofence.name}</span>
            </div>

            {/* Card de Informações Precisas do Lugar (Rua, Bairro, Cidade, CAR) */}
            <div className="bg-slate-100 p-2 rounded border border-slate-300 text-[10.5px] space-y-1 mb-2">
              <div className="font-bold text-cyan-900 flex items-start gap-1">
                <span>📍</span>
                <span className="leading-tight">
                  {placeInfo?.road || geofence.road || geofence.name}
                </span>
              </div>
              {(placeInfo?.neighborhood || geofence.neighborhood) && (
                <div className="text-slate-600">
                  Bairro: <strong>{placeInfo?.neighborhood || geofence.neighborhood}</strong>
                </div>
              )}
              {(placeInfo?.city || geofence.city) && (
                <div className="text-slate-700">
                  Município: <strong>{placeInfo?.city || geofence.city} - {placeInfo?.state || geofence.state || 'AM'}</strong>
                  {(placeInfo?.postcode || geofence.postcode) && (
                    <span className="text-slate-500"> • CEP {placeInfo?.postcode || geofence.postcode}</span>
                  )}
                </div>
              )}
              {geofence.landPropertyName && (
                <div className="text-[9.5px] text-emerald-800 font-semibold truncate">
                  🏛️ CAR: {geofence.landPropertyName}
                </div>
              )}
              <div className="text-[9px] text-slate-500 pt-0.5 border-t border-slate-200">
                Coordenadas: {centroid[0] ? centroid[0].toFixed(5) : '-3.10190'}°, {centroid[1] ? centroid[1].toFixed(5) : '-60.02500'}°
              </div>
            </div>

            <div className="text-[11px] text-slate-700 space-y-0.5 mb-2">
              <div>
                Área: <strong>{(geofence.areaKm2 || 0).toFixed(3)} km²</strong> ({((geofence.areaKm2 || 0) * 100).toFixed(1)} ha)
              </div>
              <div>
                Eixo X (Largura): <strong>{(dimensions?.widthKm || 0).toFixed(2)} km</strong>
              </div>
              <div>
                Eixo Y (Altura): <strong>{(dimensions?.heightKm || 0).toFixed(2)} km</strong>
              </div>
              <div>Vértices: <strong>{polygon.length} pontos</strong></div>
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={isEditing ? handleSaveAndClose : () => onToggleEdit && onToggleEdit()}
                className={`w-full py-2 px-3 rounded-lg font-bold text-xs text-center cursor-pointer transition shadow flex items-center justify-center gap-1.5 ${
                  isEditing
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-300 shadow-emerald-950'
                    : 'bg-cyan-700 hover:bg-cyan-600 text-white'
                }`}
              >
                <span>{isEditing ? '💾 Salvar e Fechar' : '✏️ Ajustar / Mover ROI'}</span>
              </button>

              <div className="space-y-1 pt-1 border-t border-slate-200">
                {/* Dimensionar Eixo X */}
                <div className="flex items-center justify-between bg-amber-50 p-1 rounded border border-amber-200 text-[10px]">
                  <span className="font-bold text-amber-900">↔️ Eixo X (Largura):</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleScaleXY(0.88, 1.0)}
                      className="px-1.5 py-0.5 rounded bg-amber-200 hover:bg-amber-300 font-bold cursor-pointer"
                      title="Reduzir largura horizontal em 12%"
                    >
                      -12%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScaleXY(1.12, 1.0)}
                      className="px-1.5 py-0.5 rounded bg-amber-200 hover:bg-amber-300 font-bold cursor-pointer"
                      title="Expandir largura horizontal em 12%"
                    >
                      +12%
                    </button>
                  </div>
                </div>

                {/* Dimensionar Eixo Y */}
                <div className="flex items-center justify-between bg-purple-50 p-1 rounded border border-purple-200 text-[10px]">
                  <span className="font-bold text-purple-900">↕️ Eixo Y (Altura):</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleScaleXY(1.0, 0.88)}
                      className="px-1.5 py-0.5 rounded bg-purple-200 hover:bg-purple-300 font-bold text-purple-950 cursor-pointer"
                      title="Reduzir altura vertical em 12%"
                    >
                      -12%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScaleXY(1.0, 1.12)}
                      className="px-1.5 py-0.5 rounded bg-purple-200 hover:bg-purple-300 font-bold text-purple-950 cursor-pointer"
                      title="Expandir altura vertical em 12%"
                    >
                      +12%
                    </button>
                  </div>
                </div>

                {/* Botão Secundário de Salvar e Fechar no Rodapé dos Ajustes */}
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleSaveAndClose}
                    className="w-full mt-1.5 py-2 px-3 rounded-lg font-black text-xs text-center cursor-pointer transition shadow-md flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400"
                  >
                    <span>💾 Salvar e Fechar</span>
                  </button>
                )}

                {/* Excluir Cerca Inteira */}
                {onDeleteGeofence && (
                  <button
                    type="button"
                    onClick={() => onDeleteGeofence()}
                    className="w-full mt-1 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>🗑️ Excluir Cerca Virtual</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </Popup>
      </Polygon>

      {/* 2. ALÇAS INTERATIVAS (VISÍVEIS APENAS NO MODO EDIÇÃO) */}
      {isEditing && (
        <>
          {/* Botão Salvar e Fechar Diretamente no Centro da Cerca */}
          <Marker
            position={centroid}
            icon={createSaveCloseIcon()}
            zIndexOffset={1000}
            eventHandlers={{
              click: handleSaveAndClose,
            }}
          >
            <Tooltip direction="top" offset={[0, -28]} opacity={0.95}>
              <span className="font-mono text-[10.5px] font-bold text-emerald-950 bg-white px-2 py-0.5 rounded shadow border border-emerald-400">
                💾 Clique para Salvar e Fechar a edição da cerca
              </span>
            </Tooltip>
          </Marker>

          {/* Alça Central de Translação (Mover a cerca completa) */}
          <Marker
            position={centroid}
            draggable={true}
            icon={createCenterMoveIcon()}
            eventHandlers={{
              dragstart: handleCenterDragStart,
              drag: handleCenterDrag,
              dragend: handleCommit,
            }}
          >
          <Tooltip direction="top" offset={[0, -15]} opacity={0.95}>
            <span className="font-mono text-[10.5px] font-bold">
              ✋ Segure e arraste aqui para mover a ROI inteira
            </span>
          </Tooltip>
        </Marker>

        {/* Alça Direcional: Dimensionar Eixo X (Largura L-O) */}
        <Marker
          position={axisXPosition}
          draggable={true}
          icon={createAxisXIcon()}
          eventHandlers={{
            dragstart: handleAxisXDragStart,
            drag: handleAxisXDrag,
            dragend: handleCommit,
          }}
        >
          <Tooltip direction="right" offset={[10, 0]} opacity={0.9}>
            <span className="font-mono text-[9.5px] font-bold">
              ↔️ Puxe para esticar ou encolher a Largura (Eixo X)
            </span>
          </Tooltip>
        </Marker>

        {/* Alça Direcional: Dimensionar Eixo Y (Altura N-S) */}
        <Marker
          position={axisYPosition}
          draggable={true}
          icon={createAxisYIcon()}
          eventHandlers={{
            dragstart: handleAxisYDragStart,
            drag: handleAxisYDrag,
            dragend: handleCommit,
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
            <span className="font-mono text-[9.5px] font-bold">
              ↕️ Puxe para esticar ou encolher a Altura (Eixo Y)
            </span>
          </Tooltip>
        </Marker>

        {/* Alças de Vértices / Quinas Numeradas para Redimensionamento Livre */}
        {polygon.map((point, idx) => (
          <Marker
            key={`geofence-vertex-${idx}`}
            position={point}
            draggable={true}
            icon={createVertexIcon(idx + 1)}
            eventHandlers={{
              drag: (e: any) => handleVertexDrag(idx, e),
              dragend: handleCommit,
            }}
          >
            <Popup>
              <div className="font-mono text-xs text-slate-800 p-1 space-y-1.5 min-w-[160px]">
                <div className="font-bold text-[11px] border-b pb-0.5">
                  Vértice #{idx + 1}
                </div>
                <div className="text-[10px] text-slate-600">
                  Lat: {point[0].toFixed(5)}°<br />
                  Lng: {point[1].toFixed(5)}°
                </div>
                {polygon.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveVertex(idx)}
                    className="w-full py-0.5 px-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[9.5px] transition cursor-pointer"
                  >
                    🗑️ Excluir Vértice #{idx + 1}
                  </button>
                ) : (
                  <div className="text-[9px] text-slate-400 italic">
                    Mínimo de 3 vértices obrigatório
                  </div>
                )}
              </div>
            </Popup>
            <Tooltip direction="top" offset={[0, -12]} opacity={0.9}>
              <span className="font-mono text-[9.5px] font-bold">
                Quina #{idx + 1} • Segure e arraste para redimensionar
              </span>
            </Tooltip>
          </Marker>
        ))}

        {/* Pontos de Adição de Vértices nas Arestas (Midpoints) */}
        {polygon.map((point, idx) => {
          const nextPoint = polygon[(idx + 1) % polygon.length];
          const midL = (point[0] + nextPoint[0]) / 2;
          const midG = (point[1] + nextPoint[1]) / 2;

          return (
            <Marker
              key={`geofence-midpoint-${idx}`}
              position={[midL, midG]}
              icon={createMidpointIcon()}
              eventHandlers={{
                click: () => handleAddVertex(idx),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.85}>
                <span className="font-mono text-[9px] font-bold">
                  ➕ Clique para adicionar vértice entre #{idx + 1} e #{((idx + 1) % polygon.length) + 1}
                </span>
              </Tooltip>
            </Marker>
          );
        })}
        </>
      )}
    </>
  );
};
