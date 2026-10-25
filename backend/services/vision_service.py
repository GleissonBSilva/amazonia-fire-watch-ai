"""
Módulo de Visão Computacional Zero-Disk
Processa vídeo diretamente em streaming na memória RAM através de buffer de bytes (io.BytesIO),
sem salvar arquivos no disco rígido.
"""
import io
import gc
import cv2
import numpy as np
from typing import Dict, Any, Optional

from backend.app.services.vision_pipeline import vision_pipeline, InMemoryVisionPipeline


class VisionService:
    def __init__(self):
        self._pipeline = vision_pipeline

    def process_frame_buffer(self, frame_bytes: bytes) -> Dict[str, Any]:
        """
        Processa um único frame de bytes em memória RAM, executa inferência YOLOv8,
        descarta se confiança < 0.70 via del/gc.collect, ou gera thumbnail Base64.
        """
        return self._pipeline.process_frame_buffer(frame_bytes)

    def generate_synthetic_live_frame(self) -> bytes:
        return self._pipeline.generate_synthetic_live_frame()

    def get_latest_telemetry(self) -> Dict[str, Any]:
        return self._pipeline.latest_telemetry


vision_service = VisionService()
