import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Coordinates, 
  BaseMapId, 
  WeatherOverlaySettings, 
  RadarFrame, 
  RouteData, 
  WeatherData 
} from '../../types';
import { getRadarTileUrl, getSatelliteTileUrl } from '../../services/radarService';

interface MapViewProps {
  center: Coordinates;
  zoom: number;
  baseMap: BaseMapId;
  overlays: WeatherOverlaySettings;
  currentRadarFrame: RadarFrame | null;
  currentSatelliteFrame: RadarFrame | null;
  radarHost: string;
  userLocation: Coordinates | null;
  weatherLocation: Coordinates | null;
  currentWeather: WeatherData | null;
  activeRoute: RouteData | null;
  onMapClick: (coords: Coordinates) => void;
  focusedStepCoords?: Coordinates | null;
  useImperial: boolean;
}

const BASE_MAP_URLS: Record<BaseMapId, { url: string; subdomains?: string; attribution: string; maxZoom?: number }> = {
  street_en: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 19,
  },
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  hot: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: '&copy; OpenStreetMap contributors, Tiles by Humanitarian OpenStreetMap Team',
    maxZoom: 19,
  },
  light: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
  },
  dark: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
    maxZoom: 17,
  },
};

export const MapView: React.FC<MapViewProps> = ({
  center,
  zoom,
  baseMap,
  overlays,
  currentRadarFrame,
  currentSatelliteFrame,
  radarHost,
  userLocation,
  weatherLocation,
  currentWeather,
  activeRoute,
  onMapClick,
  focusedStepCoords,
  useImperial,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const radarTileLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteTileLayerRef = useRef<L.TileLayer | null>(null);

  // Markers and route layers
  const userMarkerRef = useRef<L.Marker | null>(null);
  const weatherMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routePolylineShadowRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const stepHighlightMarkerRef = useRef<L.Marker | null>(null);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial base layer
    const baseConfig = BASE_MAP_URLS[baseMap];
    const tileLayer = L.tileLayer(baseConfig.url, {
      subdomains: baseConfig.subdomains || 'abc',
      attribution: baseConfig.attribution,
      maxZoom: baseConfig.maxZoom || 19,
    }).addTo(map);
    baseTileLayerRef.current = tileLayer;

    // Click handler on map
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update base layer when baseMap prop changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    const baseConfig = BASE_MAP_URLS[baseMap];
    const newBaseLayer = L.tileLayer(baseConfig.url, {
      subdomains: baseConfig.subdomains || 'abc',
      attribution: baseConfig.attribution,
      maxZoom: baseConfig.maxZoom || 19,
    });
    newBaseLayer.addTo(map);
    baseTileLayerRef.current = newBaseLayer;
  }, [baseMap]);

  // Center & zoom updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const dist = Math.hypot(currentCenter.lat - center.lat, currentCenter.lng - center.lng);
    if (dist > 0.0001) {
      map.flyTo([center.lat, center.lng], zoom, {
        duration: 1.2,
      });
    }
  }, [center.lat, center.lng, zoom]);

  // Focus on specific step in navigation
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusedStepCoords) return;

    map.panTo([focusedStepCoords.lat, focusedStepCoords.lng], { animate: true });

    if (stepHighlightMarkerRef.current) {
      map.removeLayer(stepHighlightMarkerRef.current);
    }

    const icon = L.divIcon({
      className: 'custom-pin-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; background: #059669; border: 3px solid #ffffff; border-radius: 50%; width: 24px; height: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
            <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    stepHighlightMarkerRef.current = L.marker([focusedStepCoords.lat, focusedStepCoords.lng], { icon }).addTo(map);
  }, [focusedStepCoords]);

  // Update Precipitation Radar Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (radarTileLayerRef.current) {
      map.removeLayer(radarTileLayerRef.current);
      radarTileLayerRef.current = null;
    }

    if (overlays.radar && currentRadarFrame && radarHost) {
      const tileUrl = getRadarTileUrl(radarHost, currentRadarFrame);
      const radarLayer = L.tileLayer(tileUrl, {
        opacity: overlays.radarOpacity,
        zIndex: 100,
        tileSize: 256,
        maxNativeZoom: 7,
        maxZoom: 19,
        errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      });
      radarLayer.addTo(map);
      radarTileLayerRef.current = radarLayer;
    }
  }, [overlays.radar, overlays.radarOpacity, currentRadarFrame, radarHost]);

  // Update Satellite Cloud Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (satelliteTileLayerRef.current) {
      map.removeLayer(satelliteTileLayerRef.current);
      satelliteTileLayerRef.current = null;
    }

    if (overlays.satellite && currentSatelliteFrame && radarHost) {
      const tileUrl = getSatelliteTileUrl(radarHost, currentSatelliteFrame);
      const satLayer = L.tileLayer(tileUrl, {
        opacity: 0.65,
        zIndex: 90,
        tileSize: 256,
        maxNativeZoom: 6,
        maxZoom: 19,
        errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      });
      satLayer.addTo(map);
      satelliteTileLayerRef.current = satLayer;
    }
  }, [overlays.satellite, currentSatelliteFrame, radarHost]);

  // Update User Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div class="pulsing-user-dot">
            <div class="pulse-ring"></div>
            <div class="core-dot"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      marker.bindPopup('<div style="font-size:12px; font-weight:600; color:#0f172a;">Your Detected Location</div>');
      userMarkerRef.current = marker;
    }
  }, [userLocation]);

  // Update Weather Pin Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (weatherMarkerRef.current) {
      map.removeLayer(weatherMarkerRef.current);
      weatherMarkerRef.current = null;
    }

    if (weatherLocation) {
      const tempString = currentWeather
        ? useImperial
          ? `${Math.round((currentWeather.current.temperature * 9) / 5 + 32)}°F`
          : `${Math.round(currentWeather.current.temperature)}°C`
        : 'Weather';

      const weatherIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
            <div style="background-color: #0f172a; color: white; border: 1.5px solid #38bdf8; border-radius: 9999px; padding: 2px 8px; font-size: 11px; font-weight: 700; white-space: nowrap; font-family: 'JetBrains Mono', monospace;">
              ${tempString}
            </div>
            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #38bdf8; margin-top: -1px;"></div>
          </div>
        `,
        iconSize: [60, 30],
        iconAnchor: [30, 30],
      });

      const marker = L.marker([weatherLocation.lat, weatherLocation.lng], {
        icon: weatherIcon,
        zIndexOffset: 500,
      }).addTo(map);

      marker.on('click', () => {
        onMapClick(weatherLocation);
      });

      weatherMarkerRef.current = marker;
    }
  }, [weatherLocation, currentWeather, useImperial]);

  // Update Turn-by-Turn Route Polyline and Start/End Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up prior route
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    if (routePolylineShadowRef.current) {
      map.removeLayer(routePolylineShadowRef.current);
      routePolylineShadowRef.current = null;
    }
    if (startMarkerRef.current) {
      map.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      map.removeLayer(endMarkerRef.current);
      endMarkerRef.current = null;
    }

    if (activeRoute && activeRoute.geometry.length > 0) {
      // Glow/casing polyline
      const shadow = L.polyline(activeRoute.geometry, {
        color: '#1e3a8a',
        weight: 9,
        opacity: 0.5,
      }).addTo(map);
      routePolylineShadowRef.current = shadow;

      // Active polyline
      const line = L.polyline(activeRoute.geometry, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      routePolylineRef.current = line;

      // Start pin (Google Maps green departure point)
      const startIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="background-color: #10b981; border: 3px solid white; border-radius: 50%; width: 22px; height: 22px; box-shadow: 0 3px 8px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;">
            <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      startMarkerRef.current = L.marker([activeRoute.startCoords.lat, activeRoute.startCoords.lng], { icon: startIcon }).addTo(map);

      // End pin (Google Maps red destination teardrop)
      const endIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45)); transform: translate(-15px, -36px);">
            <svg width="30" height="38" viewBox="0 0 30 38" fill="none">
              <path d="M15 0C6.716 0 0 6.716 0 15C0 26.25 15 38 15 38C15 38 30 26.25 30 15C30 6.716 23.284 0 15 0Z" fill="#EA4335"/>
              <circle cx="15" cy="15" r="6.5" fill="white"/>
            </svg>
          </div>
        `,
        iconSize: [30, 38],
        iconAnchor: [0, 0],
      });
      endMarkerRef.current = L.marker([activeRoute.endCoords.lat, activeRoute.endCoords.lng], { icon: endIcon }).addTo(map);

      // Zoom to fit route
      map.fitBounds(line.getBounds(), {
        padding: [60, 60],
        maxZoom: 16,
      });
    }
  }, [activeRoute]);

  return <div ref={mapContainerRef} className="w-full h-full relative" />;
};
