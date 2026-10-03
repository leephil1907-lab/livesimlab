"""Realtime Deep-Live-Cam adapter.

Keeps the face model loaded once per GPU worker process and transforms each
incoming camera frame against the selected uploaded source face.
"""
import os,sys,cv2,numpy as np

ENGINE_ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","vendor","DeepLiveCam"))
if ENGINE_ROOT not in sys.path: sys.path.insert(0,ENGINE_ROOT)

import modules.globals as globals
from modules.face_analyser import get_one_face
from modules.processors.frame.face_swapper import get_face_swapper,process_frame

class RealtimeRenderer:
    def __init__(self,provider="cuda"):
        self.provider=provider
        self.source_face=None
        self.ready=False
        providers={"cuda":["CUDAExecutionProvider","CPUExecutionProvider"],"cpu":["CPUExecutionProvider"],"directml":["DmlExecutionProvider","CPUExecutionProvider"]}
        globals.execution_providers=providers.get(provider,providers["cpu"])
        globals.execution_threads=int(os.getenv("LIVE_EXECUTION_THREADS","4"))
        globals.many_faces=False
        globals.opacity=1.0
        globals.mouth_mask=bool(int(os.getenv("LIVE_MOUTH_MASK","0")))
        globals.map_faces=False
        self.swapper=get_face_swapper()
        if self.swapper is None:
            raise RuntimeError("Deep-Live-Cam face swapper model could not be loaded")
        self.ready=True

    def set_source(self,image):
        face=get_one_face(image)
        if face is None: raise ValueError("No face detected in uploaded avatar image")
        self.source_face=face

    def process(self,frame):
        if not self.ready or self.source_face is None: return frame
        return process_frame(self.source_face,frame)

    @staticmethod
    def decode(payload):
        arr=np.frombuffer(payload,dtype=np.uint8)
        return cv2.imdecode(arr,cv2.IMREAD_COLOR)

    @staticmethod
    def encode(frame,quality=80):
        ok,buf=cv2.imencode(".jpg",frame,[int(cv2.IMWRITE_JPEG_QUALITY),quality])
        if not ok: raise RuntimeError("JPEG encode failed")
        return buf.tobytes()
