import { Coordinates, LocationResult } from '../types';
import { apiLogger } from './apiLogger';

const GOOGLE_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyC-vjODesiwoh0QQ_C3VCgHbDw-TdJfjas';

export function calculateHaversineDistance(c1: Coordinates, c2: Coordinates): number {
  const R = 6371e3; // meters
  const phi1 = (c1.lat * Math.PI) / 180;
  const phi2 = (c2.lat * Math.PI) / 180;
  const deltaPhi = ((c2.lat - c1.lat) * Math.PI) / 180;
  const deltaLambda = ((c2.lng - c1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function mapGoogleTypesToCategory(types?: string[]): 'shop' | 'food' | 'landmark' | 'street' | 'hotel' | 'transit' | 'health' | 'place' {
  if (!types || types.length === 0) return 'place';
  const t = types.join(' ').toLowerCase();

  if (t.includes('restaurant') || t.includes('cafe') || t.includes('food') || t.includes('bakery') || t.includes('bar') || t.includes('meal')) {
    return 'food';
  }
  if (t.includes('gas_station') || t.includes('fuel') || t.includes('store') || t.includes('supermarket') || t.includes('shopping') || t.includes('mall')) {
    return 'shop';
  }
  if (t.includes('lodging') || t.includes('hotel') || t.includes('motel') || t.includes('resort')) {
    return 'hotel';
  }
  if (t.includes('hospital') || t.includes('pharmacy') || t.includes('doctor') || t.includes('health') || t.includes('drugstore')) {
    return 'health';
  }
  if (t.includes('tourist_attraction') || t.includes('museum') || t.includes('park') || t.includes('landmark') || t.includes('point_of_interest')) {
    return 'landmark';
  }
  if (t.includes('transit_station') || t.includes('subway') || t.includes('bus') || t.includes('airport') || t.includes('train')) {
    return 'transit';
  }
  if (t.includes('route') || t.includes('street') || t.includes('highway')) {
    return 'street';
  }
  return 'place';
}

function mapGooglePlaceToLocationResult(place: any, proximity?: Coordinates | null): LocationResult {
  const lat = place.location?.latitude || 0;
  const lng = place.location?.longitude || 0;
  const name = place.displayName?.text || place.formattedAddress?.split(',')[0] || 'Place';
  const formattedAddress = place.formattedAddress || name;
  const dist = proximity ? calculateHaversineDistance(proximity, { lat, lng }) : undefined;
  const category = mapGoogleTypesToCategory(place.types);

  return {
    id: place.id || `gmp-${lat}-${lng}`,
    name,
    displayName: formattedAddress,
    subtitle: formattedAddress,
    lat,
    lng,
    category,
    distanceFromUser: dist,
  };
}

/**
 * Searches places, restaurants, shops, landmarks via Google Places API (New)
 * Uses strict local region restriction first, then biases globally, ensuring
 * spots like "Arabian Majlis in Sharjah" and "B60" are instantly found and prioritized.
 */
export async function searchLocations(
  query: string,
  proximityCoords?: Coordinates | null
): Promise<LocationResult[]> {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim();
  const startTime = performance.now();

  const logId = apiLogger.logStart({
    apiName: 'Google Places API (New)',
    endpoint: 'https://places.googleapis.com/v1/places:searchText',
    method: 'POST',
    requestParams: {
      textQuery: trimmed,
      proximity: proximityCoords ? `${proximityCoords.lat.toFixed(4)}, ${proximityCoords.lng.toFixed(4)}` : 'global',
    },
    documentationUrl: 'https://developers.google.com/maps/documentation/places/web-service/text-search',
    purpose: `Google Maps place search for "${trimmed}"`,
  });

  // Stage 1: If proximity is available, search with strict local rectangle restriction (~55km metropolitan radius)
  if (proximityCoords) {
    try {
      const delta = 0.50; // ~55km radius covers entire city/emirate
      const localBody = {
        textQuery: trimmed,
        languageCode: 'en',
        pageSize: 20,
        locationRestriction: {
          rectangle: {
            low: { latitude: proximityCoords.lat - delta, longitude: proximityCoords.lng - delta },
            high: { latitude: proximityCoords.lat + delta, longitude: proximityCoords.lng + delta },
          },
        },
      };

      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types',
        },
        body: JSON.stringify(localBody),
      });

      if (res.ok) {
        const data = await res.json();
        const places = data.places || [];

        if (places.length > 0) {
          const duration = Math.round(performance.now() - startTime);
          apiLogger.logComplete(logId, res.status, duration, {
            strategy: 'Google Places (Local Restriction)',
            count: places.length,
            topMatch: places[0]?.displayName?.text,
          });

          const mapped = places.map((p: any) => mapGooglePlaceToLocationResult(p, proximityCoords));
          mapped.sort((a: LocationResult, b: LocationResult) => (a.distanceFromUser ?? 9999999) - (b.distanceFromUser ?? 9999999));
          return mapped;
        }
      }
    } catch (localErr) {
      console.warn('Local restriction query note:', localErr);
    }
  }

  // Stage 2: Location bias or global search (for farther destinations or landmarks)
  try {
    const globalBody: any = {
      textQuery: trimmed,
      languageCode: 'en',
      pageSize: 20,
    };

    if (proximityCoords) {
      globalBody.locationBias = {
        circle: {
          center: {
            latitude: proximityCoords.lat,
            longitude: proximityCoords.lng,
          },
          radius: 50000.0,
        },
      };
    }

    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types',
      },
      body: JSON.stringify(globalBody),
    });

    const duration = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data = await res.json();
      const places = data.places || [];

      if (places.length > 0) {
        apiLogger.logComplete(logId, res.status, duration, {
          strategy: 'Google Places (Location Bias)',
          count: places.length,
          topMatch: places[0]?.displayName?.text,
        });

        const mapped = places.map((p: any) => mapGooglePlaceToLocationResult(p, proximityCoords));
        if (proximityCoords) {
          mapped.sort((a: LocationResult, b: LocationResult) => (a.distanceFromUser ?? 9999999) - (b.distanceFromUser ?? 9999999));
        }
        return mapped;
      }
    }
  } catch (err: any) {
    console.warn('Google Places API search error:', err);
  }

  // Stage 3: OpenStreetMap Fallback
  return searchNominatimFallback(trimmed, proximityCoords);
}

/**
 * Searches nearby categories (Food, Coffee, Gas, Shopping, Hotels, etc.)
 */
export async function searchNearbyCategory(
  categoryKey: string,
  proximity: Coordinates
): Promise<LocationResult[]> {
  const startTime = performance.now();

  const queryMap: Record<string, string> = {
    food: 'restaurants',
    coffee: 'coffee cafe',
    shopping: 'shopping malls stores',
    gas: 'gas stations petrol',
    groceries: 'supermarkets grocery stores',
    hotels: 'hotels',
    sights: 'tourist attractions landmarks',
    pharmacy: 'pharmacies',
    parking: 'parking',
    transit: 'transit metro bus stations',
  };

  const searchQuery = queryMap[categoryKey.toLowerCase()] || `${categoryKey} near me`;

  const logId = apiLogger.logStart({
    apiName: 'Google Places API (New)',
    endpoint: 'https://places.googleapis.com/v1/places:searchText',
    method: 'POST',
    requestParams: { category: categoryKey, proximity: `${proximity.lat.toFixed(4)}, ${proximity.lng.toFixed(4)}` },
    documentationUrl: 'https://developers.google.com/maps/documentation/places/web-service/text-search',
    purpose: `Find nearby ${categoryKey} within 30km`,
  });

  try {
    const delta = 0.35; // ~40km metropolitan box
    const body: any = {
      textQuery: searchQuery,
      languageCode: 'en',
      pageSize: 25,
      locationRestriction: {
        rectangle: {
          low: { latitude: proximity.lat - delta, longitude: proximity.lng - delta },
          high: { latitude: proximity.lat + delta, longitude: proximity.lng + delta },
        },
      },
    };

    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types',
      },
      body: JSON.stringify(body),
    });

    const duration = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data = await res.json();
      const places = data.places || [];

      if (places.length > 0) {
        apiLogger.logComplete(logId, res.status, duration, { count: places.length });
        const mapped = places.map((p: any) => mapGooglePlaceToLocationResult(p, proximity));
        mapped.sort((a: LocationResult, b: LocationResult) => (a.distanceFromUser ?? 9999999) - (b.distanceFromUser ?? 9999999));
        return mapped;
      }
    }
  } catch (err: any) {
    console.warn('Google Places nearby error:', err);
  }

  // Fallback to bounded Nominatim
  return searchNominatimFallback(searchQuery, proximity);
}

async function searchNominatimFallback(
  query: string,
  proximityCoords?: Coordinates | null
): Promise<LocationResult[]> {
  try {
    const nomUrl = new URL('https://nominatim.openstreetmap.org/search');
    nomUrl.searchParams.set('q', query);
    nomUrl.searchParams.set('format', 'json');
    nomUrl.searchParams.set('addressdetails', '1');
    nomUrl.searchParams.set('limit', '20');
    nomUrl.searchParams.set('accept-language', 'en');

    if (proximityCoords) {
      const delta = 0.35;
      nomUrl.searchParams.set(
        'viewbox',
        `${(proximityCoords.lng - delta).toFixed(5)},${(proximityCoords.lat + delta).toFixed(5)},${(proximityCoords.lng + delta).toFixed(5)},${(proximityCoords.lat - delta).toFixed(5)}`
      );
    }

    const res = await fetch(nomUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        const mapped: LocationResult[] = items.map((item: any) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const name = item.name || item.display_name.split(',')[0];
          const dist = proximityCoords ? calculateHaversineDistance(proximityCoords, { lat, lng }) : undefined;

          return {
            id: `nom-${item.place_id}`,
            name,
            displayName: item.display_name,
            subtitle: item.display_name.split(',').slice(1, 3).join(', ').trim(),
            lat,
            lng,
            category: 'place',
            distanceFromUser: dist,
          };
        });

        if (proximityCoords) {
          mapped.sort((a, b) => (a.distanceFromUser ?? 9999999) - (b.distanceFromUser ?? 9999999));
        }
        return mapped;
      }
    }
  } catch (e) {
    console.warn('Nominatim fallback error:', e);
  }

  return [];
}

/**
 * Reverse geocode coordinates to street address via Google Geocoding
 */
export async function reverseGeocode(coords: Coordinates): Promise<string> {
  const startTime = performance.now();
  const logId = apiLogger.logStart({
    apiName: 'Google Geocoding API',
    endpoint: `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`,
    method: 'GET',
    requestParams: {
      lat: coords.lat.toFixed(6),
      lng: coords.lng.toFixed(6),
      language: 'en',
    },
    documentationUrl: 'https://developers.google.com/maps/documentation/geocoding/requests-reverse-geocoding',
    purpose: `Reverse geocode coordinates (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) to street address`,
  });

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}&key=${GOOGLE_API_KEY}&language=en`;
    const res = await fetch(url);
    const duration = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        apiLogger.logComplete(logId, res.status, duration, {
          formatted_address: address,
          resultsCount: data.results.length,
        });
        return address;
      }
    }
  } catch (e: any) {
    console.warn('Google reverse geocode error:', e);
  }

  // Fallback to Nominatim reverse
  const nomStartTime = performance.now();
  const nomLogId = apiLogger.logStart({
    apiName: 'Nominatim Geocoding',
    endpoint: `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat.toFixed(6)}&lon=${coords.lng.toFixed(6)}&format=json`,
    method: 'GET',
    documentationUrl: 'https://nominatim.org/release-docs/latest/api/Reverse/',
    purpose: `Fallback reverse geocode (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) via OSM`,
  });

  try {
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat.toFixed(6)}&lon=${coords.lng.toFixed(6)}&format=json&accept-language=en`;
    const res = await fetch(reverseUrl, { headers: { Accept: 'application/json' } });
    const nomDuration = Math.round(performance.now() - nomStartTime);

    if (res.ok) {
      const data = await res.json();
      const address = data.display_name || `Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
      apiLogger.logComplete(nomLogId, res.status, nomDuration, { display_name: address });
      return address;
    }
  } catch (e: any) {
    const nomDuration = Math.round(performance.now() - nomStartTime);
    apiLogger.logError(nomLogId, e.message || 'Reverse error', nomDuration);
  }

  return `Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
}
