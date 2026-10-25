"""
In-Memory Video Streaming & Detection Endpoints (Zero-Disk MJPEG Stream).
"""

from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse
import asyncio
import time
from ..services.vision_pipeline import vision_pipeline
from ..models import VideoDetectionStatus

router = APIRouter(prefix="/stream", tags=["Video Stream"])

async def frame_generator():
    """
    Yields in-memory MJPEG frames with zero disk consumption.
    Samples detection every 1.5s in memory.
    """
    try:
        while True:
            # Generate synthetic or pull from memory camera feed
            frame_bytes = vision_pipeline.generate_synthetic_live_frame()
            
            # Process in-memory (samples every 1.5s, drops low-confidence)
            if frame_bytes:
                vision_pipeline.process_frame_buffer(frame_bytes)
                
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
            
            await asyncio.sleep(0.1) # ~10 FPS smooth streaming with low CPU load
    except (asyncio.CancelledError, GeneratorExit):
        pass

@router.get("/live.mjpg")
async def live_stream():
    """
    Live in-memory MJPEG video stream accessible directly by <img> or <canvas>.
    Zero files created on disk.
    """
    return StreamingResponse(
        frame_generator(), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/status", response_model=VideoDetectionStatus)
async def detection_status():
    """
    Returns latest detection telemetry from the in-memory vision pipeline.
    """
    res = vision_pipeline.latest_result
    return VideoDetectionStatus(
        camera_id=vision_pipeline.active_camera_id,
        timestamp=time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(res["timestamp"])),
        fps=16.0,
        fire_detected=res["fire_detected"],
        confidence=res["confidence"],
        expansion_rate=res["expansion_rate"],
        has_snapshot=bool(res["snapshot_base64"]),
        snapshot_base64=res["snapshot_base64"]
    )
