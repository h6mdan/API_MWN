import { RadarData, RadarFrame } from '../types';
import { apiLogger } from './apiLogger';

let cachedRadarData: RadarData | null = null;
let lastFetchTime = 0;

export async function fetchRadarFrames(): Promise<RadarData> {
  const now = Date.now();
  // Cache for 3 minutes
  if (cachedRadarData && now - lastFetchTime < 180000) {
    return cachedRadarData;
  }

  const startTime = performance.now();
  const endpoint = 'https://api.rainviewer.com/public/weather-maps.json';

  const logId = apiLogger.logStart({
    apiName: 'RainViewer Radar',
    endpoint,
    method: 'GET',
    documentationUrl: 'https://www.rainviewer.com/api/weather-maps-api.html',
    purpose: 'Retrieve global precipitation radar & satellite infrared tile timestamps',
  });

  try {
    const res = await fetch(endpoint);
    const duration = Math.round(performance.now() - startTime);

    if (!res.ok) {
      throw new Error(`RainViewer API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    apiLogger.logComplete(logId, res.status, duration, {
      pastFramesCount: data.radar?.past?.length || 0,
      nowcastCount: data.radar?.nowcast?.length || 0,
      satelliteCount: data.satellite?.infrared?.length || 0,
    });

    const radarData: RadarData = {
      host: data.host || 'https://tilecache.rainviewer.com',
      past: (data.radar?.past || []).map((f: any) => ({ time: f.time, path: f.path })),
      nowcast: (data.radar?.nowcast || []).map((f: any) => ({ time: f.time, path: f.path })),
      satellite: (data.satellite?.infrared || []).map((f: any) => ({ time: f.time, path: f.path })),
    };

    cachedRadarData = radarData;
    lastFetchTime = now;
    return radarData;
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    apiLogger.logError(logId, err.message || 'Failed to fetch radar frames', duration);
    throw err;
  }
}

export function getRadarTileUrl(host: string, frame: RadarFrame, colorScheme: number = 2): string {
  // colorScheme 2 is universal weather radar (green-yellow-red)
  // tileSize 256, smooth: 1, snow: 1
  return `${host}${frame.path}/256/{z}/{x}/{y}/${colorScheme}/1_1.png`;
}

export function getSatelliteTileUrl(host: string, frame: RadarFrame): string {
  return `${host}${frame.path}/256/{z}/{x}/{y}/0/0_0.png`;
}
