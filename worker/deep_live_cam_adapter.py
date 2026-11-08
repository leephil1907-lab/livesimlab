# Deep-Live-Cam adapter used by FaceHub's authenticated GPU worker.
# The vendored processor is imported headlessly; its desktop UI is not started.
from __future__ import annotations

from typing import Any

import numpy as np


class DeepLiveCamPasteBack:
    """Run Deep-Live-Cam's optimized single-face swap and affine paste-back."""

    def __init__(self, providers: list[str], detector_size: int) -> None:
        import modules.globals as dlc_globals
        from modules.processors.frame import face_swapper

        dlc_globals.execution_providers = list(providers)
        dlc_globals.det_size = int(detector_size)
        dlc_globals.opacity = 1.0
        dlc_globals.mouth_mask = False
        dlc_globals.poisson_blend = False
        self._processor = face_swapper

    def bind_model(self, swapper: Any) -> None:
        # Reuse FaceHub's already-loaded ONNX model; do not load a second copy.
        self._processor.FACE_SWAPPER = swapper

    def apply(self, frame: np.ndarray, source_face: Any, target_face: Any) -> np.ndarray:
        return self._processor.swap_face(source_face, target_face, frame)
