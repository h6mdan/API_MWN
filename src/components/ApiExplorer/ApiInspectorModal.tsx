import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink, 
  Trash2, 
  Clock, 
  Globe, 
  Code2, 
  BookOpen, 
  Layers, 
  Info,
  ChevronLeft,
  Activity,
  ShieldCheck,
  Zap,
  MapPin,
  Compass,
  CloudSun,
  CloudRain,
  Navigation
} from 'lucide-react';
import { apiLogger } from '../../services/apiLogger';
import { ApiLogEntry } from '../../types';

interface ApiInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ApiDirectoryItem {
  id: string;
  name: string;
  provider: 'Google Maps Platform' | 'Open-Meteo' | 'RainViewer' | 'OpenStreetMap' | 'CartoDB / OpenStreetMap';
  method: 'GET' | 'POST';
  endpoint: string;
  purpose: string;
  authType: 'Google API Key' | 'No Key (100% Free)' | 'Open Tile Service';
  documentationUrl: string;
  sampleRequest: string;
  keyFeatures: string[];
}

const ALL_APIS_CATALOG: ApiDirectoryItem[] = [
  {
    id: 'google-places',
    name: 'Google Places API (New)',
    provider: 'Google Maps Platform',
    method: 'POST',
    endpoint: 'https://places.googleapis.com/v1/places:searchText',
    purpose: 'Real-time text search, local bounding-box autocomplete, and nearby category exploration (Food, Coffee, Shopping, Gas, Groceries, Hotels, Landmarks, Transit).',
    authType: 'Google API Key',
    documentationUrl: 'https://developers.google.com/maps/documentation/places/web-service/text-search',
    sampleRequest: `curl -X POST "https://places.googleapis.com/v1/places:searchText" \\
  -H "Content-Type: application/json" \\
  -H "X-Goog-Api-Key: YOUR_API_KEY" \\
  -H "X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.types" \\
  -d '{"textQuery": "coffee", "languageCode": "en", "pageSize": 20}'`,
    keyFeatures: [
      'Strict local rectangle restriction to prioritize immediate neighborhood/city places',
      'Location biasing for regional and international destinations',
      'Rich metadata: display names, coordinates, and place categories',
    ],
  },
  {
    id: 'google-routes',
    name: 'Google Routes API (v2)',
    provider: 'Google Maps Platform',
    method: 'POST',
    endpoint: 'https://routes.googleapis.com/directions/v2:computeRoutes',
    purpose: 'High-precision turn-by-turn routing for Driving, Walking, and Cycling with live traffic estimates, encoded polylines, and step maneuvers.',
    authType: 'Google API Key',
    documentationUrl: 'https://developers.google.com/maps/documentation/routes',
    sampleRequest: `curl -X POST "https://routes.googleapis.com/directions/v2:computeRoutes" \\
  -H "Content-Type: application/json" \\
  -H "X-Goog-Api-Key: YOUR_API_KEY" \\
  -H "X-Goog-FieldMask: routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps" \\
  -d '{"origin":{"location":{"latLng":{"latitude":51.5074,"longitude":-0.1278}}},"destination":{"location":{"latLng":{"latitude":51.5033,"longitude":-0.1195}}},"travelMode":"DRIVE"}'`,
    keyFeatures: [
      'Multi-modal navigation: DRIVE, WALK, and BICYCLE support',
      'High-quality encoded polylines decoded smoothly on the Leaflet canvas',
      'Step-by-step turn maneuvers with voice guidance instructions',
    ],
  },
  {
    id: 'google-geocoding',
    name: 'Google Maps Geocoding API',
    provider: 'Google Maps Platform',
    method: 'GET',
    endpoint: 'https://maps.googleapis.com/maps/api/geocode/json',
    purpose: 'Reverse geocodes latitude/longitude coordinates from map clicks or GPS location into formatted postal street addresses.',
    authType: 'Google API Key',
    documentationUrl: 'https://developers.google.com/maps/documentation/geocoding/requests-reverse-geocoding',
    sampleRequest: `curl "https://maps.googleapis.com/maps/api/geocode/json?latlng=51.5074,-0.1278&key=YOUR_API_KEY&language=en"`,
    keyFeatures: [
      'Translates coordinate taps into human-readable street names and house numbers',
      'Returns structured address components (neighborhood, locality, postal code, country)',
      'Sub-100ms response time for instant reverse geocode feedback',
    ],
  },
  {
    id: 'open-meteo-weather',
    name: 'Open-Meteo Weather Forecast API',
    provider: 'Open-Meteo',
    method: 'GET',
    endpoint: 'https://api.open-meteo.com/v1/forecast',
    purpose: 'Fetches real-time temperature, apparent feels-like, 24-hour hourly forecasts, 7-day daily high/lows, precipitation, humidity, UV index, and wind speeds.',
    authType: 'No Key (100% Free)',
    documentationUrl: 'https://open-meteo.com/en/docs',
    sampleRequest: `curl "https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min&timezone=auto"`,
    keyFeatures: [
      '100% free with no API key or credit card needed (up to 10,000 calls/day)',
      'Aggregated from leading global national weather services (ECMWF, NOAA GFS, DWD ICON)',
      'WMO standard weather condition interpretation (clear, rain, snow, thunderstorms)',
    ],
  },
  {
    id: 'open-meteo-aqi',
    name: 'Open-Meteo Air Quality API',
    provider: 'Open-Meteo',
    method: 'GET',
    endpoint: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    purpose: 'Real-time air pollution indices: European AQI, US AQI, particulate matter (PM2.5, PM10), carbon monoxide, ozone, and nitrogen dioxide.',
    authType: 'No Key (100% Free)',
    documentationUrl: 'https://open-meteo.com/en/docs/air-quality-api',
    sampleRequest: `curl "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=51.5074&longitude=-0.1278&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,ozone"`,
    keyFeatures: [
      'Atmospheric pollutant measurements updated hourly',
      'Provides color-coded health risk indices (Good, Moderate, Unhealthy, Hazardous)',
      'Zero API key requirement and high reliability',
    ],
  },
  {
    id: 'rainviewer-radar',
    name: 'RainViewer Radar & Satellite Maps API',
    provider: 'RainViewer',
    method: 'GET',
    endpoint: 'https://api.rainviewer.com/public/weather-maps.json',
    purpose: 'Retrieves live Doppler precipitation radar timestamps and infrared cloud satellite layers with animated 10-minute historical and nowcast frames.',
    authType: 'No Key (100% Free)',
    documentationUrl: 'https://www.rainviewer.com/api/weather-maps-api.html',
    sampleRequest: `curl "https://api.rainviewer.com/public/weather-maps.json"`,
    keyFeatures: [
      'Global precipitation Doppler radar coverage (rain, snow, ice, hail)',
      'Infrared satellite cloud coverage overlay',
      'Interactive timeline playback directly over Leaflet map canvas',
    ],
  },
  {
    id: 'osrm-routing',
    name: 'OSRM (Open Source Routing Machine)',
    provider: 'OpenStreetMap',
    method: 'GET',
    endpoint: 'https://router.project-osrm.org/route/v1/...',
    purpose: 'Reliable open-source turn-by-turn routing engine fallback based on global OpenStreetMap highway networks.',
    authType: 'No Key (100% Free)',
    documentationUrl: 'https://project-osrm.org/docs/v5.24.0/api/',
    sampleRequest: `curl "https://router.project-osrm.org/route/v1/driving/-0.1278,51.5074;-0.1195,51.5033?overview=full&geometries=geojson&steps=true"`,
    keyFeatures: [
      'Ultra-fast open routing algorithm without rate charges',
      'Provides full turn maneuvers, roundabouts, ramps, and road names',
      'Serves as dependable offline/fallback router',
    ],
  },
  {
    id: 'nominatim-geocoding',
    name: 'Nominatim OpenStreetMap Geocoding',
    provider: 'OpenStreetMap',
    method: 'GET',
    endpoint: 'https://nominatim.openstreetmap.org/search',
    purpose: 'Open-source forward text search and reverse coordinate lookup fallback using the complete OpenStreetMap geographic database.',
    authType: 'No Key (100% Free)',
    documentationUrl: 'https://nominatim.org/release-docs/latest/api/Overview/',
    sampleRequest: `curl "https://nominatim.openstreetmap.org/search?q=London&format=json&limit=5"`,
    keyFeatures: [
      'OpenStreetMap-powered forward geocoding across worldwide addresses',
      'Bounding-box viewbox filtering for city-level search accuracy',
      'Free community-driven worldwide database',
    ],
  },
  {
    id: 'basemap-tiles',
    name: 'CartoDB & OSM Base Map Tiles',
    provider: 'CartoDB / OpenStreetMap',
    method: 'GET',
    endpoint: 'https://basemaps.cartocdn.com & https://tile.openstreetmap.org',
    purpose: 'High-performance Slippy raster map tile rendering for 7 styles: English Standard, Positron Light, Dark Matter, Humanitarian, Satellite, and Topographic.',
    authType: 'Open Tile Service',
    documentationUrl: 'https://carto.com/help/building-maps/basemap-list/',
    sampleRequest: `curl "https://a.basemaps.cartocdn.com/rastertiles/voyager/12/2074/1409.png"`,
    keyFeatures: [
      'Full English label translation layer on global cities and streets',
      'Eye-friendly calm light mode and dark slate night mode themes',
      'Smooth tile caching and pinch-to-zoom Leaflet compatibility',
    ],
  },
];

export const ApiInspectorModal: React.FC<ApiInspectorModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'catalog'>('logs');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiFilter, setApiFilter] = useState<string>('all');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = apiLogger.subscribe((newLogs) => {
      setLogs(newLogs);
      if (newLogs.length > 0 && !selectedLogId) {
        setSelectedLogId(newLogs[0].id);
      }
    });
    return () => unsubscribe();
  }, [selectedLogId]);

  if (!isOpen) return null;

  // Filter logs by API
  const filteredLogs = logs.filter((log) => {
    if (apiFilter === 'all') return true;
    return log.apiName.toLowerCase().includes(apiFilter.toLowerCase());
  });

  const selectedLog = logs.find((l) => l.id === selectedLogId) || filteredLogs[0] || logs[0];

  const handleCopyCurl = (log: ApiLogEntry) => {
    let curl = `curl -X ${log.method} "${log.endpoint}"`;
    if (log.method === 'POST' && log.requestParams) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(log.requestParams)}'`;
    }
    navigator.clipboard.writeText(curl);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopySnippet = (snippet: string, key: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group unique APIs hit in this session
  const uniqueApisHit = Array.from(new Set(logs.map((l) => l.apiName)));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] sm:h-[86vh] flex flex-col overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  API Learning Inspector & Logs
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 hidden xs:inline-block">
                  Live Network
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                All 9 real APIs powering maps, routing, weather, radar & places
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Tab switcher */}
            <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 text-xs">
              <button
                onClick={() => {
                  setActiveTab('logs');
                  setIsMobileDetailOpen(false);
                }}
                className={`px-3 py-1.5 font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'logs'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Live Logs ({logs.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1.5 font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'catalog'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>All 9 APIs Hit</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Close Inspector"
              aria-label="Close Inspector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Live Requests & Logs Inspector */}
        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* Left Column: Requests list (Hidden on small screens if inspecting a detail) */}
            <div
              className={`w-full md:w-84 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-900/60 overflow-hidden shrink-0 ${
                isMobileDetailOpen ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Filter and stats header */}
              <div className="p-3 border-b border-slate-800 bg-slate-950/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-300">Live Traffic</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      {filteredLogs.length} events
                    </span>
                  </div>
                  {logs.length > 0 && (
                    <button
                      onClick={() => apiLogger.clear()}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                      title="Clear session history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {/* API Quick Filter bar */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-medium no-scrollbar">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'places', label: 'Places' },
                    { id: 'routes', label: 'Routes' },
                    { id: 'geocoding', label: 'Geocode' },
                    { id: 'weather', label: 'Weather' },
                    { id: 'air quality', label: 'AQI' },
                    { id: 'radar', label: 'Radar' },
                    { id: 'osrm', label: 'OSRM' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setApiFilter(filter.id)}
                      className={`px-2 py-1 rounded-md shrink-0 transition-colors ${
                        apiFilter === filter.id
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Request items */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                    <Activity className="w-8 h-8 text-slate-600 animate-pulse" />
                    <p className="font-medium text-slate-300">No requests recorded yet</p>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Search for a place, get directions, tap on the map, or toggle radar to see live network telemetry!
                    </p>
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const isSelected = selectedLog?.id === log.id;
                    const statusColor =
                      log.status === 200
                        ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40'
                        : log.status === 'PENDING'
                        ? 'text-amber-400 bg-amber-950/60 border-amber-800/40'
                        : 'text-rose-400 bg-rose-950/60 border-rose-800/40';

                    return (
                      <div
                        key={log.id}
                        onClick={() => {
                          setSelectedLogId(log.id);
                          setIsMobileDetailOpen(true);
                        }}
                        className={`p-3 text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-600/15 border-l-2 border-blue-500'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-200 truncate">{log.apiName}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${statusColor}`}>
                            {log.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mb-1">
                          {log.purpose}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                            {log.method}
                          </span>
                          {log.durationMs !== undefined && (
                            <span className="text-slate-400">{log.durationMs}ms</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Selected Request Details */}
            <div
              className={`flex-1 flex flex-col overflow-y-auto bg-slate-950 p-4 sm:p-6 ${
                !isMobileDetailOpen ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Mobile Back Button */}
              <div className="md:hidden mb-3">
                <button
                  onClick={() => setIsMobileDetailOpen(false)}
                  className="flex items-center gap-1 text-xs text-blue-400 font-medium py-1 px-2 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Request List</span>
                </button>
              </div>

              {selectedLog ? (
                <div className="space-y-4">
                  {/* Endpoint Header Card */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono text-xs font-bold">
                          {selectedLog.method}
                        </span>
                        <span className="text-sm sm:text-base font-bold text-white">
                          {selectedLog.apiName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyCurl(selectedLog)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
                        >
                          {copiedId === selectedLog.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedId === selectedLog.id ? 'Copied cURL!' : 'Copy cURL'}</span>
                        </button>

                        <a
                          href={selectedLog.endpoint}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Browser</span>
                        </a>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-blue-300 break-all select-all">
                      {selectedLog.endpoint}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3 gap-2">
                      <div>
                        Purpose: <span className="text-slate-200 font-medium">{selectedLog.purpose}</span>
                      </div>
                      <a
                        href={selectedLog.documentationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Official Documentation</span>
                      </a>
                    </div>
                  </div>

                  {/* Query or Post Parameters */}
                  {selectedLog.requestParams && Object.keys(selectedLog.requestParams).length > 0 && (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                        Request Parameters
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {Object.entries(selectedLog.requestParams).map(([key, value]) => (
                          <div
                            key={key}
                            className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex justify-between items-center"
                          >
                            <span className="font-mono text-slate-400">{key}:</span>
                            <span className="font-mono text-emerald-400 truncate ml-2">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Response Body Preview */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Response Payload ({selectedLog.durationMs !== undefined ? `${selectedLog.durationMs}ms latency` : 'Pending'})
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400">JSON</span>
                    </div>

                    <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-72">
                      {selectedLog.responseData
                        ? JSON.stringify(selectedLog.responseData, null, 2)
                        : selectedLog.error
                        ? `Error: ${selectedLog.error}`
                        : 'Waiting for response...'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  Select a request from the list to view its parameters and payload.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: ALL APIs HIT IN THIS APP (Comprehensive Directory) */}
        {activeTab === 'catalog' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-950 text-slate-300">
            {/* Header intro */}
            <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-950/40 border border-blue-500/20 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Complete API Architecture & Directory</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                All 9 APIs Hit by this Navigator Application
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                This application is engineered with a hybrid multi-cloud geography architecture: high-precision Google Maps Platform services for places, turn-by-turn routing, and geocoding, combined with 100% free open APIs (Open-Meteo for atmospheric forecasts, RainViewer for live Doppler radar, and OpenStreetMap/OSRM for resilience).
              </p>

              {/* Status counter pill */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400">APIs currently triggered in this session:</span>
                {uniqueApisHit.length > 0 ? (
                  uniqueApisHit.map((name) => (
                    <span
                      key={name}
                      className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono text-[11px]"
                    >
                      ✓ {name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 italic">No network calls made yet</span>
                )}
              </div>
            </div>

            {/* Grid of All 9 APIs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {ALL_APIS_CATALOG.map((api, index) => {
                const isTriggered = uniqueApisHit.some((u) =>
                  u.toLowerCase().includes(api.name.toLowerCase().split(' ')[0])
                );

                return (
                  <div
                    key={api.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors"
                  >
                    <div>
                      {/* Top tags */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{index + 1}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            {api.provider}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isTriggered && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Active in Session
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60">
                            {api.authType}
                          </span>
                        </div>
                      </div>

                      {/* API Title */}
                      <h4 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
                        {api.name}
                      </h4>

                      {/* Purpose */}
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {api.purpose}
                      </p>

                      {/* Endpoint box */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-blue-300 break-all mb-3 flex items-center justify-between">
                        <span>
                          <strong className="text-amber-400 mr-1.5">{api.method}</strong>
                          {api.endpoint}
                        </span>
                      </div>

                      {/* Key features */}
                      <div className="space-y-1 text-[11px] text-slate-400 mb-4">
                        {api.keyFeatures.map((feat, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 shrink-0">✦</span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom actions: Copy cURL and Official Docs */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                      <button
                        onClick={() => handleCopySnippet(api.sampleRequest, api.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                      >
                        {copiedId === api.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === api.id ? 'Copied Recipe!' : 'Copy cURL Recipe'}</span>
                      </button>

                      <a
                        href={api.documentationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Docs</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
