# Deep-Live-Cam adapter used by FaceHub's authenticated GPU worker.
# The vendored processor is imported headlessly; its desktop UI is not started.
from __future__ import annotations

from typing import Any

import numpy as np


class DeepLiveCamPasteBack:
    """Apply Deep-Live-Cam's affine-aware optimized paste-back to a FaceHub frame."""

    def __init__(self, providers: list[str], detector_size: int) -> None:
        import modules.globals as dlc_globals
        from modules.processors.frame import face_swapper

        dlc_globals.execution_providers = list(providers)
        dlc_globals.det_size = int(detector_size)
        dlc_globals.opacity = 1.0
        dlc_globals.mouth_mask = False
        dlc_globals.poisson_blend = False
        self._paste = face_swapper.paste_swapped_face

    def apply(
        self,
        frame: np.ndarray,
        aligned_face: np.ndarray,
        affine: np.ndarray,
        target_face: Any,
    ) -> np.ndarray:
        return self._paste(frame, aligned_face, affine, target_face)
