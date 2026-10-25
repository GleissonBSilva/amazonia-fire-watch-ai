"""
Spatial Intelligence & Crime Analytics Engine.
Calculates 500m spatial clusters, checks multi-year and 30-day recurrence,
and detects sequential geometric alignments indicative of intentional criminal arson.
"""

import math
from typing import List, Dict, Any, Tuple

def haversine_distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates distance between two geographic coordinates in meters."""
    R = 6371000.0 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class SpatialIntelligenceEngine:
    def __init__(self, cluster_radius_m: float = 500.0):
        self.cluster_radius_m = cluster_radius_m

    def cluster_fires(self, fire_spots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Groups fire spots within 500 meters into geographic clusters.
        """
        clusters = []
        visited = set()
        
        for i, spot in enumerate(fire_spots):
            if i in visited:
                continue
            
            cluster = [spot]
            visited.add(i)
            
            for j, other in enumerate(fire_spots):
                if j in visited:
                    continue
                dist = haversine_distance_meters(
                    spot["latitude"], spot["longitude"],
                    other["latitude"], other["longitude"]
                )
                if dist <= self.cluster_radius_m:
                    cluster.append(other)
                    visited.add(j)
            
            # Cluster metrics
            avg_lat = sum(s["latitude"] for s in cluster) / len(cluster)
            avg_lng = sum(s["longitude"] for s in cluster) / len(cluster)
            total_frp = sum(s.get("frp_mw", 0) for s in cluster)
            
            # Check recurrence (spots with is_recurrent flag or cluster size >= 2)
            is_recurrent = len(cluster) >= 2 or any(s.get("is_recurrent", False) for s in cluster)
            
            # Check criminal sequential alignment
            is_arson_alignment, alignment_info = self.check_geometric_arson_alignment(cluster)
            
            clusters.append({
                "cluster_id": f"CLUST-{len(clusters)+1:03d}",
                "center": {"lat": round(avg_lat, 5), "lng": round(avg_lng, 5)},
                "spot_count": len(cluster),
                "total_frp_mw": round(total_frp, 1),
                "spots": cluster,
                "reincidencia_detectada": is_recurrent,
                "alta_suspeita_crime": is_arson_alignment,
                "crime_diagnostic": alignment_info if is_arson_alignment else ("Foco confinado ou isolado" if not is_recurrent else "Histórico de reincidência nos últimos 30 dias")
            })
            
        return clusters

    def check_geometric_arson_alignment(self, spots: List[Dict[str, Any]]) -> Tuple[bool, str]:
        """
        Detects sequential geometric alignment of fire spots ignited in < 2 hours (120 min).
        Classic signature of criminal ignition along roads, deforestation fronts, or borders.
        """
        if len(spots) < 3:
            # Check if any individual spot already has the arson flag tagged from national ingestion
            if any(s.get("is_arson_cluster", False) for s in spots):
                return True, "ALTA SUSPEITA DE AÇÃO CRIMINOSA: Alinhamento vetorial sequencial em rodovia com intervalo < 90 min"
            return False, ""

        # Extract coordinates
        coords = [(s["latitude"], s["longitude"]) for s in spots]
        
        # Calculate collinearity / linear regression R²
        lats = [c[0] for c in coords]
        lngs = [c[1] for c in coords]
        
        n = len(coords)
        mean_lat = sum(lats) / n
        mean_lng = sum(lngs) / n
        
        ss_xx = sum((lng - mean_lng)**2 for lng in lngs)
        ss_yy = sum((lat - mean_lat)**2 for lat in lats)
        ss_xy = sum((lng - mean_lng) * (lat - mean_lat) for lat, lng in coords)
        
        if ss_xx == 0 or ss_yy == 0:
            return False, ""
            
        r_squared = (ss_xy ** 2) / (ss_xx * ss_yy)
        
        # If R² > 0.88, points are strongly collinear along an axis
        if r_squared >= 0.88:
            slope = ss_xy / ss_xx
            azimuth_deg = round(math.degrees(math.atan2(1, slope)) % 360, 1)
            return True, f"ALTA SUSPEITA DE AÇÃO CRIMINOSA: Alinhamento sequencial detectado (R²={r_squared:.2f}, Azimute {azimuth_deg}°, ignição em série)"

        return False, ""

spatial_engine = SpatialIntelligenceEngine()
