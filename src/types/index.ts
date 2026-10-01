export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationResult {
  id: string | number;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
  category?: 'shop' | 'food' | 'landmark' | 'street' | 'hotel' | 'transit' | 'health' | 'place';
  osmKey?: string;
  osmValue?: string;
  subtitle?: string;
  distanceFromUser?: number; // in meters
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    road?: string;
    postcode?: string;
    houseNumber?: string;
  };
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  weatherDescription: string;
  isDay: boolean;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  cloudCover: number;
  pressure: number;
  uvIndex: number;
  time: string;
}

export interface HourlyForecast {
  time: string[];
  temperature: number[];
  weatherCode: number[];
  precipitationProbability: number[];
  precipitation: number[];
  windSpeed: number[];
}

export interface DailyForecastItem {
  date: string;
  weatherCode: number;
  weatherDescription: string;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
  windSpeedMax: number;
}

export interface AirQuality {
  europeanAqi?: number;
  usAqi?: number;
  pm10?: number;
  pm2_5?: number;
  carbonMonoxide?: number;
  nitrogenDioxide?: number;
  sulphurDioxide?: number;
  ozone?: number;
}

export interface WeatherData {
  coordinates: Coordinates;
  locationName: string;
  current: CurrentWeather;
  hourly: HourlyForecast;
  daily: DailyForecastItem[];
  airQuality?: AirQuality;
  updatedAt: Date;
}

export type TravelMode = 'driving' | 'bike' | 'foot';

export interface RouteStep {
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number]; // [lng, lat]
    instruction?: string;
  };
  name: string;
  distance: number; // in meters
  duration: number; // in seconds
  mode: string;
}

export interface RouteData {
  geometry: [number, number][]; // [lat, lng] array for Leaflet polyline
  distance: number; // meters
  duration: number; // seconds
  steps: RouteStep[];
  startCoords: Coordinates;
  endCoords: Coordinates;
  startName: string;
  endName: string;
  profile: TravelMode;
}

export interface RadarFrame {
  time: number;
  path: string;
}

export interface RadarData {
  host: string;
  past: RadarFrame[];
  nowcast: RadarFrame[];
  satellite: RadarFrame[];
}

export type BaseMapId = 'street_en' | 'osm' | 'hot' | 'light' | 'dark' | 'satellite' | 'topo';

export interface WeatherOverlaySettings {
  radar: boolean;
  satellite: boolean;
  windVectors: boolean;
  tempMarkers: boolean;
  radarOpacity: number;
}

export interface ApiLogEntry {
  id: string;
  timestamp: Date;
  apiName:
    | 'Open-Meteo Weather'
    | 'Open-Meteo Air Quality'
    | 'OSRM Routing'
    | 'Nominatim Geocoding'
    | 'RainViewer Radar'
    | 'Google Places API (New)'
    | 'Google Routes API'
    | 'Google Geocoding API'
    | 'CartoDB / OSM Base Maps';
  endpoint: string;
  method: 'GET' | 'POST';
  status: number | 'PENDING' | 'ERROR';
  durationMs?: number;
  requestParams?: Record<string, string | number | boolean>;
  responseData?: any;
  error?: string;
  documentationUrl: string;
  purpose: string;
}
