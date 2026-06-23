export interface GeoPosition {
  lat: number;
  lng: number;
}

type GeoCallback = (pos: GeoPosition) => void;
type GeoErrorCallback = (err: string) => void;

let capacitorAvailable = false;

async function initCapacitor() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      capacitorAvailable = true;
    }
  } catch {}
}

initCapacitor();

export async function requestPermission(): Promise<boolean> {
  if (capacitorAvailable) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const perm = await Geolocation.requestPermissions();
      return perm.location === 'granted';
    } catch { return false; }
  }
  if (!navigator.geolocation) return false;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { timeout: 5000 }
    );
  });
}

export async function getCurrentPosition(): Promise<GeoPosition | null> {
  if (capacitorAvailable) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { return null; }
  }
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

let watchCleanup: (() => void) | null = null;

export function startWatching(onPosition: GeoCallback, onError?: GeoErrorCallback): () => void {
  stopWatching();

  if (capacitorAvailable) {
    let removed = false;
    (async () => {
      const { Geolocation } = await import('@capacitor/geolocation');
      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000 },
        (pos, err) => {
          if (removed) return;
          if (err) { onError?.(String(err)); return; }
          if (pos) onPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      );
      watchCleanup = () => { removed = true; Geolocation.clearWatch({ id: watchId }); };
    })();
    return () => watchCleanup?.();
  }

  if (!navigator.geolocation) {
    onError?.('Geolocation not supported');
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => onPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    (err) => onError?.(err.message),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
  watchCleanup = () => { navigator.geolocation.clearWatch(watchId); };
  return () => watchCleanup?.();
}

export function stopWatching() {
  watchCleanup?.();
  watchCleanup = null;
}
