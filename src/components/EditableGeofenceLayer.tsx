import React, { useState, useEffect, useRef } from 'react';
import { Polygon, Marker, Tooltip, Popup } from 'react-leaflet';
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

// 1. Alças de Vértices Numeradas (Dimensionamento livre por vértice)
const createVertexIcon = (index: number) => {
  return L.divIcon({
    className: 'geofence-vertex-icon-container',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background: #0891b2;
        border: 2.5px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 16px rgba(0, 240, 255, 0.9), 0 2px 8px rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 12px;
        font-weight: 900;
        font-family: monospace;
        cursor: grab;
        user-select: none;
        transition: transform 0.15s ease;
      " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
        ${index}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// 2. Alça Central de Movimentação (Mover toda a cerca virtual)
const createCenterMoveIcon = () => {
  return L.divIcon({
    className: 'geofence-center-icon-container',
    html: `
      <div style="
        width: 154px;
        height: 40px;
        background: linear-gradient(135deg, rgba(8, 145, 178, 0.96), rgba(6, 182, 212, 0.96));
        border: 2.5px solid #ffffff;
        border-radius: 20px;
        box-shadow: 0 0 22px rgba(0, 240, 255, 0.95), 0 4px 14px rgba(0, 0, 0, 0.85);
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
      " onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
        <span style="font-size: 16px;">✋</span>
        <span>ARRASTAR CERCA</span>
      </div>
    `,
    iconSize: [154, 40],
    iconAnchor: [77, 20],
  });
};

// 3. Alça do Eixo X (Largura Leste-Oeste)
const createAxisXIcon = () => {
  return L.divIcon({
    className: 'geofence-axis-x-icon-container',
    html: `
      <div style="
        width: 112px;
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
    iconSize: [112, 32],
    iconAnchor: [56, 16],
  });
};

// 4. Alça do Eixo Y (Altura Norte-Sul)
const createAxisYIcon = () => {
  return L.divIcon({
    className: 'geofence-axis-y-icon-container',
    html: `
      <div style="
        width: 112px;
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
    iconSize: [112, 32],
    iconAnchor: [56, 16],
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
  const [polygon, setPolygon] = useState<[number, number][]>(() =>
    normalizeGeofenceToPolygon(geofence)
  );

  // Referência contínua do polígono para evitar stale closures em eventos de drag a 60 FPS
  const polygonRef = useRef<[number, number][]>(polygon);
  polygonRef.current = polygon;

  // Snapshots de início de arrasto (Zero jitter e zero distorção acumulada)
  const dragStartCenterRef = useRef<{ lat: number; lng: number; polygon: [number, number][] } | null>(null);
  const dragStartAxisRef = useRef<{ polygon: [number, number][]; centroid: [number, number]; halfWidth: number; halfHeight: number } | null>(null);

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
  // MANIPULADORES DE ARRASTO COM SNAPSHOTS (FÍSICA SUAVE SEM JITTER)
  // -------------------------------------------------------------

  // 1. Mover toda a cerca (Centroide)
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

  // 2. Mover vértice individual (Dimensionamento livre)
  const handleVertexDrag = (index: number, e: any) => {
    const latLng = e.target.getLatLng();
    setPolygon((prev) => {
      const updated = [...prev];
      updated[index] = [latLng.lat, latLng.lng];
      return updated;
    });
  };

  // 3. Esticar / Encolher Eixo X (Largura)
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

  // 4. Esticar / Encolher Eixo Y (Altura)
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

  // 5. Salvar e Enriquecer com dados precisos do local
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

  // Escala independente nos eixos X e Y pelos botões de clique
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

  // Inserção de novo vértice no midpoint
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
      {/* 1. POLÍGONO DA CERCA VIRTUAL (NEON CIANO COM INTERAÇÃO DE CLIQUE) */}
      <Polygon
        positions={polygon}
        pathOptions={{
          color: isEditing ? '#00f0ff' : '#06b6d4',
          fillColor: '#0891b2',
          fillOpacity: isEditing ? 0.32 : 0.18,
          weight: isEditing ? 3.5 : 2.5,
          dashArray: isEditing ? '4, 4' : '8, 6',
        }}
        eventHandlers={{
          click: () => {
            if (!isEditing && onToggleEdit) {
              onToggleEdit();
            }
          },
        }}
      >
        <Tooltip direction="center" permanent={false} opacity={0.95}>
          <div className="font-mono text-[10px] font-bold text-cyan-950 bg-white/95 px-2 py-0.5 rounded shadow-lg border border-cyan-400">
            {isEditing ? '✏️ Modo Edição Ativo (Arraste as alças)' : '🔒 Clique para Mover / Dimensionar Cerca'}
          </div>
        </Tooltip>

        <Popup>
          <div className="font-mono text-xs text-slate-900 min-w-[270px]">
            <div className="font-bold text-cyan-800 text-[12px] flex items-center justify-between border-b pb-1 mb-1.5">
              <span className="truncate">🔒 {geofence.name}</span>
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
                Coordenadas: {centroid[0].toFixed(5)}°, {centroid[1].toFixed(5)}°
              </div>
            </div>

            <div className="text-[11px] text-slate-700 space-y-0.5 mb-2">
              <div>
                Área: <strong>{geofence.areaKm2.toFixed(3)} km²</strong> ({(geofence.areaKm2 * 100).toFixed(1)} ha)
              </div>
              <div>
                Eixo X (Largura): <strong>{dimensions.widthKm.toFixed(2)} km</strong>
              </div>
              <div>
                Eixo Y (Altura): <strong>{dimensions.heightKm.toFixed(2)} km</strong>
              </div>
              <div>Vértices: <strong>{polygon.length} pontos</strong></div>
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => onToggleEdit && onToggleEdit()}
                className="w-full py-1 px-2 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-[10.5px] text-center cursor-pointer transition shadow"
              >
                {isEditing ? '✓ Concluir Edição' : '✏️ Mover / Dimensionar X, Y'}
              </button>

              {isEditing && (
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
              )}
            </div>
          </div>
        </Popup>
      </Polygon>

      {/* 2. ALÇAS INTERATIVAS DE ALTA PRECISÃO (RENDERIZADAS EM MODO DE EDIÇÃO) */}
      {isEditing && (
        <>
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
                ✋ Clique e arraste aqui para mover a cerca inteira
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

          {/* Alças de Vértices Numeradas para Dimensionamento Livre */}
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
                  Vértice #{idx + 1} • Arraste para mover ou clique para excluir
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
