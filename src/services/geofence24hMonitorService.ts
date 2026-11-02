/**
 * 24/7 Automated Geofence Tactical Surveillance & Anomaly Dispatch Service.
 * 
 * Capabilities:
 * 1. 24/7 real-time continuous perimeter scanning against orbital telemetry (NASA FIRMS, GOES, INPE).
 * 2. Instant automated multi-channel reporting:
 *    - Automated C2 Tactical Voice synthesis
 *    - Automated WhatsApp Dispatch
 *    - HUD Perimeter Breach Banner
 *    - Persistent 24/7 Incident Audit Trail in localStorage
 */

import { FireSpot, ActiveGeofenceState } from '../types';
import { normalizeGeofenceToPolygon, isPointInPolygon } from './geofenceGeometryService';
import { sendWhatsAppFireAlert } from './alertService';
import { speakTacticalAlert } from './voiceAlertService';
import { reverseGeocode } from './geocodingService';

export interface GeofenceIncident {
  id: string;
  geofenceId: string;
  geofenceName: string;
  spotId: string;
  latitude: number;
  longitude: number;
  frpMw: number;
  satellite: string;
  detectedAt: string;
  reportedAt: string;
  roadAddress?: string;
  actionsTaken: string[];
  severity: 'CRÍTICA' | 'ALTA' | 'MODERADA';
}

class Geofence24hMonitorService {
  private reportedSpotIds: Set<string> = new Set();
  private incidents: GeofenceIncident[] = [];
  private autoReportEnabled: boolean = true;
  private isProcessing: boolean = false;
  private listeners: ((incidents: GeofenceIncident[]) => void)[] = [];
  private alertListeners: ((incident: GeofenceIncident, spot: FireSpot) => void)[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const savedReported = localStorage.getItem('afw_geofence_reported_spots');
      if (savedReported) {
        const arr = JSON.parse(savedReported);
        this.reportedSpotIds = new Set(arr);
      }

      const savedIncidents = localStorage.getItem('afw_geofence_incidents_24h');
      if (savedIncidents) {
        this.incidents = JSON.parse(savedIncidents);
      }

      const savedAutoReport = localStorage.getItem('afw_geofence_auto_report_enabled');
      if (savedAutoReport !== null) {
        this.autoReportEnabled = JSON.parse(savedAutoReport);
      }
    } catch (e) {
      console.warn('Erro ao carregar estado do monitor 24h da cerca virtual:', e);
    }
  }

  private persistState() {
    try {
      localStorage.setItem('afw_geofence_reported_spots', JSON.stringify(Array.from(this.reportedSpotIds)));
      localStorage.setItem('afw_geofence_incidents_24h', JSON.stringify(this.incidents.slice(-100))); // guarda os últimos 100
      localStorage.setItem('afw_geofence_auto_report_enabled', JSON.stringify(this.autoReportEnabled));
    } catch (e) {
      console.warn('Erro ao salvar estado do monitor 24h:', e);
    }
  }

  public isAutoReportActive(): boolean {
    return this.autoReportEnabled;
  }

  public setAutoReportActive(enabled: boolean) {
    this.autoReportEnabled = enabled;
    this.persistState();
  }

  public getIncidents(): GeofenceIncident[] {
    return [...this.incidents];
  }

  public clearIncidents() {
    this.incidents = [];
    this.reportedSpotIds.clear();
    this.persistState();
    this.notifyListeners();
  }

  public subscribe(listener: (incidents: GeofenceIncident[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.incidents]);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public onPerimeterBreach(listener: (incident: GeofenceIncident, spot: FireSpot) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l([...this.incidents]));
  }

  /**
   * Varredura Contínua 24h:
   * Verifica se qualquer foco de calor violou o perímetro da cerca virtual.
   * Se violar e ainda não tiver sido reportado, dispara os canais de emergência automaticamente.
   */
  public async scanGeofenceForAnomalies(
    geofence: ActiveGeofenceState | null,
    fireSpots: FireSpot[],
    isSimulation: boolean = false
  ): Promise<GeofenceIncident[]> {
    if (!geofence || !fireSpots || fireSpots.length === 0 || this.isProcessing) {
      return [];
    }

    const polygon = normalizeGeofenceToPolygon(geofence);
    if (!polygon || polygon.length < 3) {
      return [];
    }

    this.isProcessing = true;
    const newIncidents: GeofenceIncident[] = [];

    try {
      // 1. Filtra todos os focos dentro do perímetro da cerca
      const spotsInside = fireSpots.filter(spot => {
        return isPointInPolygon([spot.latitude, spot.longitude], polygon);
      });

      for (const spot of spotsInside) {
        // Gera chave única por foco e data
        const spotKey = `${geofence.id}_${spot.id || `${spot.latitude.toFixed(4)}_${spot.longitude.toFixed(4)}`}`;

        // Se já reportamos este foco específico nesta cerca, não duplicar despacho
        if (this.reportedSpotIds.has(spotKey)) {
          continue;
        }

        // Nova anomalia detectada dentro do perímetro!
        this.reportedSpotIds.add(spotKey);

        // Geocodificação reversa para rua/rodovia exata
        let roadAddress = spot.address;
        try {
          const rev = await reverseGeocode(spot.latitude, spot.longitude);
          if (rev && rev.road) {
            roadAddress = rev.road + (rev.neighborhood ? `, Bairro ${rev.neighborhood}` : '');
          }
        } catch {}

        const now = new Date();
        const reportedAt = now.toLocaleTimeString('pt-BR');
        const actionsTaken: string[] = [];

        // 2. DISPARO AUTOMÁTICO SE REPORTE ESTIVER ATIVO
        if (this.autoReportEnabled) {
          // A. Alerta Tático de Voz C2
          const voiceMessage =
            `Atenção Central C2! Violação do perímetro detectada na Cerca Virtual ${geofence.name}. ` +
            `Foco térmico ativo com potência de ${Math.round(spot.frp_mw)} megawatts. ` +
            `Localizado em ${roadAddress || spot.municipality || 'área monitorada'}. ` +
            `Protocolo de emergência despachado automaticamente.`;
          
          speakTacticalAlert(voiceMessage);
          actionsTaken.push('Alerta de Voz Tática C2 Sintetizado');

          // B. Despacho Automático WhatsApp CBMAM / Operador
          try {
            await sendWhatsAppFireAlert({
              lat: spot.latitude,
              lng: spot.longitude,
              areaSqKm: geofence.areaKm2,
              criticidade: spot.frp_mw >= 50 ? 'CRÍTICA' : 'ALTA',
              municipio: spot.municipality,
              isRecurrent: spot.is_recurrent,
              isSimulation,
              customMessage:
                `🚨 *[REPORTE AUTOMÁTICO 24H: VIOLAÇÃO DE CERCA VIRTUAL]*\n` +
                `🔒 *Cerca Monitorada:* ${geofence.name}\n` +
                `📍 *Logradouro:* ${roadAddress || 'Perímetro Tático'}\n` +
                `🔥 *Potência Radiativa:* ${spot.frp_mw} MW\n` +
                `🛰️ *Sensor:* ${spot.satellite || 'Orbital'}\n` +
                `⏱️ *Hora da Violação:* ${reportedAt}\n` +
                `⚡ _Disparo automático 24h executado pelo sistema Amazônia Fire Watch AI._`,
            });
            actionsTaken.push('Despacho Automático WhatsApp C2 (+55 92 99374-6740)');
          } catch (err) {
            console.warn('Erro no despacho automático WhatsApp:', err);
          }

          actionsTaken.push('Alerta Visual HUD Acionado');
        } else {
          actionsTaken.push('Detecção 24h Registrada (Reporte automático silenciado pelo operador)');
        }

        const incident: GeofenceIncident = {
          id: `inc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          geofenceId: geofence.id,
          geofenceName: geofence.name,
          spotId: spot.id,
          latitude: spot.latitude,
          longitude: spot.longitude,
          frpMw: spot.frp_mw,
          satellite: spot.satellite || 'VIIRS / GOES',
          detectedAt: spot.detected_at || reportedAt,
          reportedAt,
          roadAddress,
          actionsTaken,
          severity: spot.frp_mw >= 50 ? 'CRÍTICA' : spot.frp_mw >= 25 ? 'ALTA' : 'MODERADA',
        };

        this.incidents.unshift(incident);
        newIncidents.push(incident);

        // Notifica ouvintes de alerta imediato
        this.alertListeners.forEach(cb => cb(incident, spot));
      }

      if (newIncidents.length > 0) {
        this.persistState();
        this.notifyListeners();
      }
    } finally {
      this.isProcessing = false;
    }

    return newIncidents;
  }
}

export const geofence24hMonitor = new Geofence24hMonitorService();

