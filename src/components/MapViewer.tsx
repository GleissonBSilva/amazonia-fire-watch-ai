import React from 'react';
import { MainMap } from './MainMap';
import {
  DelimitedArea,
  OSINTAlert,
  FireSpot,
  TemporalMode,
  MapLayerType,
  ActiveOverlaysState,
} from '../types';

export interface MapViewerProps {
  onAreaSelected: (data: DelimitedArea) => void;
  fireSpots: FireSpot[];
  heatmapSpots: any[];
  osintAlerts: OSINTAlert[];
  onOsintClick: (alert: OSINTAlert) => void;
  onHoverSpot: (spot: FireSpot, pos: { x: number; y: number }) => void;
  onLeaveSpot: () => void;
  onSpotClick: (spot: FireSpot) => void;
  temporalMode: TemporalMode;
  currentLayer?: MapLayerType;
  activeOverlays?: ActiveOverlaysState;
  showHeatmapOverlay?: boolean;
  externalTargetView?: { center: [number, number]; zoom: number; trigger?: number } | null;
  searchMarker?: { lat: number; lng: number; label: string } | null;
}

export const MapViewer: React.FC<MapViewerProps> = (props) => {
  return <MainMap {...props} />;
};

export default MapViewer;
