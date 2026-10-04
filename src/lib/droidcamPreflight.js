const DEFAULTS = {
  obsHealthUrl: 'http://127.0.0.1:4455',
  bridgeHealthUrl: 'http://127.0.0.1:8788/healthz',
};

async function probe(url, timeout = 900) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { method: 'GET', cache: 'no-store', signal: controller.signal });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, error: error?.name === 'AbortError' ? 'timeout' : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Browser-safe desktop preflight. It never assumes a device exists merely because
 * the UI is running. Camera enumeration remains permission-gated and OBS/DroidCam
 * are tested through the localhost bridge where available.
 */
export async function checkDroidCamPreflight(options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const result = {
    camera: { state: 'unknown', label: '' },
    obsBridge: { state: 'checking' },
    browserCamera: { state: 'checking' },
    ready: false,
  };

  if (navigator?.mediaDevices?.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === 'videoinput');
      const droid = cameras.find((device) => /droidcam/i.test(device.label));
      result.browserCamera = {
        state: cameras.length ? 'available' : 'missing',
        count: cameras.length,
      };
      if (droid) result.camera = { state: 'detected', label: droid.label };
      else if (cameras.length) result.camera = { state: 'available', label: cameras[0].label || 'Camera' };
      else result.camera = { state: 'missing', label: '' };
    } catch {
      result.browserCamera = { state: 'permission-required' };
      result.camera = { state: 'permission-required', label: '' };
    }
  }

  result.obsBridge = await probe(cfg.bridgeHealthUrl);
  result.ready = result.camera.state === 'detected' || result.camera.state === 'available';
  return result;
}

export function requestCameraPermission() {
  if (!navigator?.mediaDevices?.getUserMedia) return Promise.reject(new Error('Camera API unavailable'));
  return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
}
