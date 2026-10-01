import { Coordinates, RouteData, RouteStep, TravelMode } from '../types';
import { apiLogger } from './apiLogger';

const GOOGLE_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyC-vjODesiwoh0QQ_C3VCgHbDw-TdJfjas';

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

function parseDurationSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  return parseInt(durationStr.replace('s', ''), 10) || 0;
}

export async function calculateRoute(
  start: Coordinates,
  end: Coordinates,
  profile: TravelMode = 'driving',
  startName: string = 'Starting Point',
  endName: string = 'Destination'
): Promise<RouteData> {
  const startTime = performance.now();

  const travelMode = profile === 'bike' ? 'BICYCLE' : profile === 'foot' ? 'WALK' : 'DRIVE';

  const logId = apiLogger.logStart({
    apiName: 'Google Routes API',
    endpoint: 'https://routes.googleapis.com/directions/v2:computeRoutes',
    method: 'POST',
    requestParams: {
      travelMode,
      from: `${start.lat.toFixed(4)}, ${start.lng.toFixed(4)}`,
      to: `${end.lat.toFixed(4)}, ${end.lng.toFixed(4)}`,
    },
    documentationUrl: 'https://developers.google.com/maps/documentation/routes',
    purpose: `Google Maps route from ${startName} to ${endName}`,
  });

  // 1. Try Google Routes API (Real-time high accuracy turn-by-turn)
  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: start.lat, longitude: start.lng } } },
        destination: { location: { latLng: { latitude: end.lat, longitude: end.lng } } },
        travelMode,
        languageCode: 'en',
        polylineQuality: 'HIGH_QUALITY',
      }),
    });

    const duration = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data = await res.json();
      const route = data.routes?.[0];

      if (route && route.polyline?.encodedPolyline) {
        apiLogger.logComplete(logId, res.status, duration, {
          source: 'Google Routes API',
          distanceMeters: route.distanceMeters,
          duration: route.duration,
        });

        const geometry = decodePolyline(route.polyline.encodedPolyline);
        const leg = route.legs?.[0];
        const rawSteps = leg?.steps || [];

        const steps: RouteStep[] = rawSteps.map((st: any, idx: number) => {
          const instruction = st.navigationInstruction?.instructions || `Step ${idx + 1}`;
          const rawManeuver = (st.navigationInstruction?.maneuver || 'turn').toLowerCase();
          const startLat = st.startLocation?.latLng?.latitude || geometry[0]?.[0] || start.lat;
          const startLng = st.startLocation?.latLng?.longitude || geometry[0]?.[1] || start.lng;

          return {
            name: instruction.split('\n')[0] || `Turn ${idx + 1}`,
            distance: st.distanceMeters || 0,
            duration: parseDurationSeconds(st.staticDuration),
            mode: profile,
            maneuver: {
              type: rawManeuver,
              location: [startLng, startLat],
              instruction,
            },
          };
        });

        // Ensure at least arrival step exists
        if (steps.length === 0) {
          steps.push({
            name: endName,
            distance: route.distanceMeters || 0,
            duration: parseDurationSeconds(route.duration),
            mode: profile,
            maneuver: {
              type: 'arrive',
              location: [end.lng, end.lat],
              instruction: `Arrive at ${endName}`,
            },
          });
        }

        return {
          geometry,
          distance: route.distanceMeters || 0,
          duration: parseDurationSeconds(route.duration),
          steps,
          startCoords: start,
          endCoords: end,
          startName,
          endName,
          profile,
        };
      }
    }
  } catch (err: any) {
    console.warn('Google Routes API notice, falling back to OSRM:', err);
  }

  // 2. Fallback to Open Source Routing Machine (OSRM)
  return calculateOsrmFallback(start, end, profile, startName, endName, logId, startTime);
}

async function calculateOsrmFallback(
  start: Coordinates,
  end: Coordinates,
  profile: TravelMode,
  startName: string,
  endName: string,
  logId: string,
  startTime: number
): Promise<RouteData> {
  const targetProfile = profile === 'driving' ? 'driving' : profile === 'bike' ? 'bicycle' : 'walking';
  const url = `https://router.project-osrm.org/route/v1/${targetProfile}/${start.lng.toFixed(6)},${start.lat.toFixed(6)};${end.lng.toFixed(6)},${end.lat.toFixed(6)}?overview=full&geometries=geojson&steps=true`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Routing server HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(data.message || 'No road route found between points');
  }

  const route = data.routes[0];
  const leg = route.legs[0];
  const duration = Math.round(performance.now() - startTime);

  apiLogger.logComplete(logId, 200, duration, {
    source: 'OSRM Fallback',
    distanceMeters: route.distance,
  });

  const geometry: [number, number][] = route.geometry.coordinates.map((pt: [number, number]) => [pt[1], pt[0]]);
  const steps: RouteStep[] = leg.steps.map((st: any) => ({
    name: st.name || 'Road',
    distance: Math.round(st.distance),
    duration: Math.round(st.duration),
    mode: profile,
    maneuver: {
      type: st.maneuver?.type || 'turn',
      modifier: st.maneuver?.modifier,
      location: st.maneuver?.location || [start.lng, start.lat],
      instruction: st.maneuver?.instruction || st.name,
    },
  }));

  return {
    geometry,
    distance: Math.round(route.distance),
    duration: Math.round(route.duration),
    steps,
    startCoords: start,
    endCoords: end,
    startName,
    endName,
    profile,
  };
}

export function formatDistance(meters: number, useImperial: boolean = false): string {
  if (useImperial) {
    const miles = meters / 1609.344;
    if (miles < 0.1) {
      const feet = Math.round(meters * 3.28084);
      return `${feet} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours} hr ${remainingMins > 0 ? `${remainingMins} min` : ''}`;
}

export function formatArrivalTime(durationSeconds: number): string {
  const arrival = new Date(Date.now() + durationSeconds * 1000);
  return arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
