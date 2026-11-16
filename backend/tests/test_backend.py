"""
AMAZÔNIA FIRE-WATCH AI • Suíte de Testes Unitários do Backend (Python)
Valida cálculos de qualidade do ar (AQI/PM2.5), classificação espacial de biomas/UF e sanitização de dados.
"""

import unittest
import math
from backend.app.services.inpe_firms_ingestion import compute_air_quality, get_brazil_location
from backend.app.services.spatial_classifier import classify_location


class TestBackendEngine(unittest.TestCase):

    def test_air_quality_calculation_levels(self):
        """Valida que o cálculo do AQI segue as faixas oficiais (EPA/CONAMA) baseadas em PM2.5"""
        # 1. Foco fraco a distância -> AQI BOM
        low = compute_air_quality(frp_mw=2.0, distance_km=5.0)
        self.assertIn("aqi", low)
        self.assertIn("pm25", low)
        self.assertIn(low["air_quality_level"], ["BOA", "MODERADA"])
        self.assertTrue(1 <= low["aqi"] <= 100)

        # 2. Foco severo próximo -> AQI CRÍTICO (RUIM, MUITO RUIM, PÉSSIMA ou PERIGOSA)
        high = compute_air_quality(frp_mw=350.0, distance_km=0.5)
        self.assertTrue(high["aqi"] > 100)
        self.assertIn(high["air_quality_level"], ["RUIM", "MUITO RUIM", "PÉSSIMA", "PERIGOSA"])

    def test_brazil_location_classification(self):
        """Valida a resolução espacial de Estado (UF) e Bioma por coordenadas"""
        # Manaus / Amazonas
        uf, state_name, biome = get_brazil_location(-3.119027, -60.021731)
        self.assertEqual(uf, "AM")
        self.assertEqual(state_name, "Amazonas")
        self.assertEqual(biome, "Amazônia")

        # Corumbá / Mato Grosso do Sul (Pantanal)
        uf_ms, state_ms, biome_ms = get_brazil_location(-19.0094, -57.6533)
        self.assertEqual(uf_ms, "MS")
        self.assertEqual(biome_ms, "Pantanal")

        # Ribeirão Preto / São Paulo (Mata Atlântica)
        uf_sp, state_sp, biome_sp = get_brazil_location(-21.1704, -47.8103)
        self.assertEqual(uf_sp, "SP")
        self.assertEqual(biome_sp, "Mata Atlântica")

    def test_spatial_classifier_fallback(self):
        """Valida fallback e robustez do classificador espacial contra valores atípicos"""
        # Ponto em alto mar / fora do polígono do Brasil
        loc = classify_location(0.0, 0.0)
        self.assertIsInstance(loc, dict)
        self.assertIn("state", loc)
        self.assertIn("biome", loc)


if __name__ == "__main__":
    unittest.main()
