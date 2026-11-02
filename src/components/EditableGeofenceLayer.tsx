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
  scalePolygon,
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

// Custom Leaflet DivIcon para as alças de vértices (dimensionamento livre)
const createVertexIcon = (index: number) => {
  return L.divIcon({
    className: 'geofence-vertex-icon-container',
    html: `
      <div style="
        width: 22px;
        height: 22px;
        background: #0891b2;
        border: 2px solid #00f0ff;
        border-radius: 50%;
        box-shadow: 0 0 12px #00f0ff, 0 0 20px rgba(0, 240, 255, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: 900;
        font-family: monospace;
        cursor: crosshair;
        user-select: none;
        transition: transform 0.15s ease;
      " onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">
        ${index}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

// Custom Leaflet DivIcon para o centroide (mover a cerca inteira)
const createCenterMoveIcon = () => {
  return L.divIcon({
    className: 'geofence-center-icon-container',
    html: `
      <div style="
        padding: 5px 10px;
        background: rgba(8, 145, 178, 0.95);
        border: 2px solid #00f0ff;
        border-radius: 8px;
        box-shadow: 0 0 16px rgba(0, 240, 255, 0.8), 0 4px 12px rgba(0, 0, 0, 0.9);
        color: #ffffff;
        font-size: 10.5px;
        font-weight: 900;
        font-family: monospace;
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: grab;
        user-select: none;
        white-space: nowrap;
        transform: translate(-50%, -50%);
      " onmouseover="this.style.transform='translate(-50%, -50%) scale(1.1)'" onmouseout="this.style.transform='translate(-50%, -50%) scale(1)'">
        <span style="font-size: 12px;">✋</span>
        <span>MOVER CERCA</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

// Custom Leaflet DivIcon para alça de esticar Eixo X (Largura L-O)
const createAxisXIcon = () => {
  return L.divIcon({
    className: 'geofence-axis-x-icon-container',
    html: `
      <div style="
        padding: 3px 7px;
        background: #f59e0b;
        border: 2px solid #ffffff;
        border-radius: 6px;
        box-shadow: 0 0 12px #f59e0b;
        color: #000;
        font-size: 9px;
        font-weight: 900;
        font-family: monospace;
        cursor: ew-resize;
        user-select: none;
        white-space: nowrap;
        transform: translate(-50%, -50%);
      " title="Arraste para dimensionar o Eixo X (Largura)">
        ↔️ EIXO X
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

// Custom Leaflet DivIcon para alça de esticar Eixo Y (Altura N-S)
const createAxisYIcon = () => {
  return L.divIcon({
    className: 'geofence-axis-y-icon-container',
    html: `
      <div style="
        padding: 3px 7px;
        background: #a855f7;
        border: 2px solid #ffffff;
        border-radius: 6px;
        box-shadow: 0 0 12px #a855f7;
        color: #ffffff;
        font-size: 9px;
        font-weight: 900;
        font-family: monospace;
        cursor: ns-resize;
        user-select: none;
        white-space: nowrap;
        transform: translate(-50%, -50%);
      " title="Arraste para dimensionar o Eixo Y (Altura)">
        ↕️ EIXO Y
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

// Custom Leaflet DivIcon para botões de inserção de vértices no meio das arestas
const createMidpointIcon = () => {
  return L.divIcon({
    className: 'geofence-midpoint-icon-container',
    html: `
      <div style="
        width: 16px;
        height: 16px;
        background: #0284c7;
        border: 1.5px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(2, 132, 199, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        font-weight: bold;
        cursor: pointer;
        opacity: 0.85;
      " title="Clique para adicionar vértice nesta aresta">
        +
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
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

  const prevCentroidRef = useRef<[number, number]>(getPolygonCentroid(polygon));
  const [placeInfo, setPlaceInfo] = useState<ReverseGeocodingResult | null>(null);

  // Sincroniza com as props externas quando a geofence mudar
  useEffect(() => {
    const normalized = normalizeGeofenceToPolygon(geofence);
    setPolygon(normalized);
    const c = getPolygonCentroid(normalized);
    prevCentroidRef.current = c;

    reverseGeocode(c[0], c[1])
      .then((res) => setPlaceInfo(res))
      .catch(() => {});
  }, [geofence.id, geofence.bounds, geofence.polygon]);

  if (!polygon || polygon.length < 3) return null;

  const centroid = getPolygonCentroid(polygon);
  const bbox = getPolygonBoundingBox(polygon);
  const dimensions = getPolygonDimensionsKm(polygon);

  // Posições das alças de eixo X (Leste) e eixo Y (Norte)
  const midLat = (bbox[0][0] + bbox[1][0]) / 2;
  const midLng = (bbox[0][1] + bbox[1][1]) / 2;
  const axisXPosition: [number, number] = [midLat, bbox[1][1]];
  const axisYPosition: [number, number] = [bbox[1][0], midLng];

  // Manipulador de arrasto de vértice individual (Dimensionamento livre)
  const handleVertexDrag = (index: number, newLat: number, newLng: number) => {
    const updated = [...polygon];
    updated[index] = [newLat, newLng];
    setPolygon(updated);
    prevCentroidRef.current = getPolygonCentroid(updated);
  };

  // Manipulador de arrasto do centroide (Mover toda a cerca)
  const handleCenterDrag = (newLat: number, newLng: number) => {
    const [oldLat, oldLng] = prevCentroidRef.current;
    const deltaLat = newLat - oldLat;
    const deltaLng = newLng - oldLng;

    const shifted = translatePolygon(polygon, deltaLat, deltaLng);
    setPolygon(shifted);
    prevCentroidRef.current = [newLat, newLng];
  };

  // Manipulador de arrasto da alça do Eixo X (Alonga ou encolhe a largura horizontal)
  const handleAxisXDrag = (newLng: number) => {
    const currentHalfWidth = Math.abs(bbox[1][1] - centroid[1]);
    const targetHalfWidth = Math.abs(newLng - centroid[1]);
    if (currentHalfWidth > 0.0001 && targetHalfWidth > 0.0001) {
      const factorX = targetHalfWidth / currentHalfWidth;
      const scaled = scalePolygonXY(polygon, factorX, 1.0);
      setPolygon(scaled);
    }
  };

  // Manipulador de arrasto da alça do Eixo Y (Alonga ou encolhe a altura vertical)
  const handleAxisYDrag = (newLat: number) => {
    const currentHalfHeight = Math.abs(bbox[1][0] - centroid[0]);
    const targetHalfHeight = Math.abs(newLat - centroid[0]);
    if (currentHalfHeight > 0.0001 && targetHalfHeight > 0.0001) {
      const factorY = targetHalfHeight / currentHalfHeight;
      const scaled = scalePolygonXY(polygon, 1.0, factorY);
      setPolygon(scaled);
    }
  };

  // Comita as alterações, calcula a nova área e enriquece com dados precisos do lugar
  const handleCommit = async () => {
    const newAreaKm2 = calculatePolygonAreaKm2(polygon);
    const newBounds = getPolygonBoundingBox(polygon);
    const c = getPolygonCentroid(polygon);

    let updated: ActiveGeofenceState = {
      ...geofence,
      polygon,
      bounds: newBounds,
      areaKm2: newAreaKm2,
    };

    try {
      const rev = await reverseGeocode(c[0], c[1]);
      const land = queryLandRegistry(c[0], c[1], rev.city, rev.state);
      setPlaceInfo(rev);

      const placeLabel = rev.road
        ? `${rev.road}${rev.neighborhood ? `, ${rev.neighborhood}` : ''} (${rev.city} - ${rev.state})`
        : land.property_name && land.property_name !== 'Setor Territorial'
        ? `${land.property_name} (${rev.city || 'AM'})`
        : `${rev.city} - ${rev.state}`;

      updated = {
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
    } catch {}

    onUpdateGeofence(updated);
  };

  // Escala independente nos eixos X e Y
  const handleScaleXY = (factorX: number, factorY: number) => {
    const scaled = scalePolygonXY(polygon, factorX, factorY);
    setPolygon(scaled);
    const newAreaKm2 = calculatePolygonAreaKm2(scaled);
    const newBounds = getPolygonBoundingBox(scaled);

    onUpdateGeofence({
      ...geofence,
      polygon: scaled,
      bounds: newBounds,
      areaKm2: newAreaKm2,
    });
  };

  // Inserção de novo vértice
  const handleAddVertex = (midpointIndex: number) => {
    const withVertex = addVertexAtMidpoint(polygon, midpointIndex);
    setPolygon(withVertex);
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
    if (polygon.length <= 3) return;
    const withoutVertex = removeVertex(polygon, vertexIndex);
    setPolygon(withoutVertex);
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
      {/* 1. POLÍGONO DA CERCA VIRTUAL (NEON CIANO) */}
      <Polygon
        positions={polygon}
        pathOptions={{
          color: isEditing ? '#00f0ff' : '#06b6d4',
          fillColor: '#0891b2',
          fillOpacity: isEditing ? 0.28 : 0.16,
          weight: isEditing ? 3.5 : 2.5,
          dashArray: isEditing ? '4, 4' : '8, 6',
        }}
      >
        <Popup>
          <div className="font-mono text-xs text-slate-900 min-w-[260px]">
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
                className="w-full py-1 px-2 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-[10.5px] text-center"
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
                        className="px-1 py-0.2 rounded bg-amber-200 hover:bg-amber-300 font-bold"
                        title="Reduzir largura horizontal em 12%"
                      >
                        -12%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScaleXY(1.12, 1.0)}
                        className="px-1 py-0.2 rounded bg-amber-200 hover:bg-amber-300 font-bold"
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
                        className="px-1 py-0.2 rounded bg-purple-200 hover:bg-purple-300 font-bold text-purple-950"
                        title="Reduzir altura vertical em 12%"
                      >
                        -12%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScaleXY(1.0, 1.12)}
                        className="px-1 py-0.2 rounded bg-purple-200 hover:bg-purple-300 font-bold text-purple-950"
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
                      className="w-full mt-1 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 text-[10px] font-bold transition flex items-center justify-center gap-1"
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

      {/* 2. ALÇAS INTERATIVAS EM MODO DE EDIÇÃO */}
      {isEditing && (
        <>
          {/* Alça Central de Translação (Mover a cerca completa) */}
          <Marker
            position={centroid}
            draggable={true}
            icon={createCenterMoveIcon()}
            eventHandlers={{
              drag: (e: any) => {
                const latLng = e.target.getLatLng();
                handleCenterDrag(latLng.lat, latLng.lng);
              },
              dragend: handleCommit,
            }}
          >
            <Tooltip direction="top" offset={[0, -15]} opacity={0.95}>
              <span className="font-mono text-[10px] font-bold">
                ✋ Arraste para mover a cerca virtual completa
              </span>
            </Tooltip>
          </Marker>

          {/* Alça Direcional: Dimensionar Eixo X (Largura L-O) */}
          <Marker
            position={axisXPosition}
            draggable={true}
            icon={createAxisXIcon()}
            eventHandlers={{
              drag: (e: any) => {
                const latLng = e.target.getLatLng();
                handleAxisXDrag(latLng.lng);
              },
              dragend: handleCommit,
            }}
          >
            <Tooltip direction="right" offset={[10, 0]} opacity={0.9}>
              <span className="font-mono text-[9px] font-bold">
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
              drag: (e: any) => {
                const latLng = e.target.getLatLng();
                handleAxisYDrag(latLng.lat);
              },
              dragend: handleCommit,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
              <span className="font-mono text-[9px] font-bold">
                ↕️ Puxe para esticar ou encolher a Altura (Eixo Y)
              </span>
            </Tooltip>
          </Marker>

          {/* Alças de Vértices Numeradas para Dimensionamento Livre e Formato */}
          {polygon.map((point, idx) => (
            <Marker
              key={`geofence-vertex-${idx}`}
              position={point}
              draggable={true}
              icon={createVertexIcon(idx + 1)}
              eventHandlers={{
                drag: (e: any) => {
                  const latLng = e.target.getLatLng();
                  handleVertexDrag(idx, latLng.lat, latLng.lng);
                },
                dragend: handleCommit,
              }}
            >
              <Popup>
                <div className="font-mono text-xs text-slate-800 p-1 space-y-1.5 min-w-[150px]">
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
                      className="w-full py-0.5 px-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[9.5px] transition"
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
              <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                <span className="font-mono text-[9px]">
                  Vértice #{idx + 1} • Clique para excluir ou arraste para mover
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
                  <span className="font-mono text-[9px]">
                    ➕ Adicionar Vértice entre #{idx + 1} e #{((idx + 1) % polygon.length) + 1}
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
