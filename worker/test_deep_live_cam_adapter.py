"""Small CPU-only integration test for FaceHub's vendored Deep-Live-Cam adapter."""
from __future__ import annotations

import unittest
import numpy as np


class FakeFace:
    def __init__(self, source=False):
        self.normed_embedding = np.ones(512, dtype=np.float32) if source else None
        self.bbox = np.array([20, 20, 200, 200], dtype=np.float32)
        self.kps = np.array([[60, 70], [150, 70], [105, 110], [75, 150], [140, 150]], dtype=np.float32)


class FakeSwapper:
    def get(self, frame, target_face, source_face, paste_back=False):
        assert paste_back is False
        assert source_face.normed_embedding is not None
        aligned = np.full((128, 128, 3), 240, dtype=np.uint8)
        affine = np.array([[1, 0, 64], [0, 1, 64]], dtype=np.float32)
        return aligned, affine


class DeepLiveCamAdapterTest(unittest.TestCase):
    def test_adapter_calls_vendored_swapper_and_returns_composited_frame(self):
        from deep_live_cam_adapter import DeepLiveCamPasteBack

        adapter = DeepLiveCamPasteBack(["CPUExecutionProvider"], 640)
        adapter.bind_model(FakeSwapper())
        frame = np.zeros((256, 256, 3), dtype=np.uint8)
        output = adapter.apply(frame, FakeFace(source=True), FakeFace())

        self.assertEqual(output.shape, frame.shape)
        self.assertEqual(output.dtype, np.uint8)
        self.assertGreater(int(output.max()), 0)
        self.assertEqual(int(frame.max()), 0, "adapter must not mutate FaceHub's original input")


if __name__ == "__main__":
    unittest.main()
