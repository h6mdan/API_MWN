/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Coordinates, 
  BaseMapId, 
  WeatherOverlaySettings, 
  WeatherData, 
  RouteData, 
  RadarData, 
  RadarFrame,
  LocationResult
} from './types';
import { AppleSidebar } from './components/Sidebar/AppleSidebar';
import { MapView } from './components/Map/MapView';
import { AppleSearchSheet } from './components/Search/AppleSearchSheet';
import { AppleDirectionsSheet } from './components/Navigation/AppleDirectionsSheet';
import { AppleNavigationHud } from './components/Navigation/AppleNavigationHud';
import { AppleWeatherSheet } from './components/Weather/AppleWeatherSheet';
import { RadarControls } from './components/Radar/RadarControls';
import { ApiInspectorModal } from './components/ApiExplorer/ApiInspectorModal';
import { fetchWeatherData } from './services/weatherService';
import { reverseGeocode } from './services/geocodingService';
import { fetchRadarFrames } from './services/radarService';
import { apiLogger } from './services/apiLogger';
import { saveRecentSearch } from './services/recentSearchesService';
import { CloudSun } from 'lucide-react';

const INITIAL_COORDS: Coordinates = { lat: 51.5074, lng: -0.1278 }; // London

export default function App() {
  // Map State: Default base map is 'street_en' for English labels everywhere
  const [center, setCenter] = useState<Coordinates>(INITIAL_COORDS);
  const [zoom, setZoom] = useState<number>(12);
  const [baseMap, setBaseMap] = useState<BaseMapId>('street_en');
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Active sidebar drawer: 'search' | 'directions' | 'weather' | 'none'
  const [activePanel, setActivePanel] = useState<'search' | 'directions' | 'weather' | 'none'>('search');

  // Weather Overlays & Radar
  const [overlays, setOverlays] = useState<WeatherOverlaySettings>({
    radar: false,
    satellite: false,
    windVectors: false,
    tempMarkers: true,
    radarOpacity: 0.75,
  });
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [currentRadarFrameIdx, setCurrentRadarFrameIdx] = useState<number>(0);
  const [isRadarPlaying, setIsRadarPlaying] = useState<boolean>(false);

  // Weather State
  const [weatherLocation, setWeatherLocation] = useState<Coordinates | null>(INITIAL_COORDS);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);

  // Selected Place (for Search Place View)
  const [selectedPlace, setSelectedPlace] = useState<LocationResult | null>(null);

  // Destination for Directions (Strictly NULL by default!)
  const [selectedDestination, setSelectedDestination] = useState<LocationResult | Coordinates | null>(null);

  // Navigation & Routing State
  const [activeRoute, setActiveRoute] = useState<RouteData | null>(null);
  const [isNavigatingLive, setIsNavigatingLive] = useState<boolean>(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [focusedStepCoords, setFocusedStepCoords] = useState<Coordinates | null>(null);

  // Settings & Learning Explorer
  const [useImperial, setUseImperial] = useState<boolean>(false);
  const [isApiInspectorOpen, setIsApiInspectorOpen] = useState<boolean>(false);
  const [apiLogCount, setApiLogCount] = useState<number>(0);

  // Theme: Keep dark mode as default, with calm eye-friendly light mode option
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('openmap_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  // Sync theme class to document root
  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('openmap_theme', theme);
    } catch (e) {}
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (next === 'light' && baseMap === 'dark') {
        setBaseMap('light');
      } else if (next === 'dark' && baseMap === 'light') {
        setBaseMap('dark');
      }
      return next;
    });
  };

  // Subscribe to API Logger count
  useEffect(() => {
    const unsub = apiLogger.subscribe((logs) => {
      setApiLogCount(logs.length);
    });
    return () => unsub();
  }, []);

  // Fetch weather for coordinates
  const loadWeatherForCoords = useCallback(async (coords: Coordinates, customName?: string) => {
    setIsWeatherLoading(true);
    setWeatherLocation(coords);
    try {
      const locationName = customName || (await reverseGeocode(coords));
      const data = await fetchWeatherData(coords, locationName);
      setCurrentWeather(data);
    } catch (err) {
      console.error('Failed to load weather:', err);
    } finally {
      setIsWeatherLoading(false);
    }
  }, []);

  // Initial load: Fetch weather & radar data + attempt Geolocation
  useEffect(() => {
    loadWeatherForCoords(INITIAL_COORDS, 'London, United Kingdom');

    fetchRadarFrames()
      .then((data) => {
        setRadarData(data);
        if (data.past.length > 0) {
          setCurrentRadarFrameIdx(data.past.length - 1);
        }
      })
      .catch((err) => console.warn('Radar frame prefetch error:', err));

    // Fallback to IP geolocation if browser GPS is unavailable or blocked
    const tryFallbackIpLocation = async () => {
      try {
        const res = await fetch('https://freeipapi.com/api/json');
        if (res.ok) {
          const d = await res.json();
          if (d.latitude && d.longitude) {
            const ipCoords = { lat: d.latitude, lng: d.longitude };
            setUserLocation(ipCoords);
            setCenter(ipCoords);
            setZoom(13);
            loadWeatherForCoords(ipCoords, d.cityName ? `${d.cityName}, ${d.countryName}` : undefined);
            return;
          }
        }
      } catch (e) {}
      try {
        const res2 = await fetch('https://ipapi.co/json/');
        if (res2.ok) {
          const d = await res2.json();
          if (d.latitude && d.longitude) {
            const ipCoords = { lat: d.latitude, lng: d.longitude };
            setUserLocation(ipCoords);
            setCenter(ipCoords);
            setZoom(13);
            loadWeatherForCoords(ipCoords, d.city ? `${d.city}, ${d.country_name}` : undefined);
          }
        }
      } catch (e) {}
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords: Coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(userCoords);
          setCenter(userCoords);
          setZoom(13);
          loadWeatherForCoords(userCoords);
        },
        (error) => {
          console.log('Using IP geolocation fallback:', error.message);
          tryFallbackIpLocation();
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      tryFallbackIpLocation();
    }
  }, [loadWeatherForCoords]);

  // Voice speech synthesis helper
  const speakInstruction = useCallback(
    (text: string) => {
      if (!isVoiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis unavailable', e);
      }
    },
    [isVoiceEnabled]
  );

  // Live Navigation auto-simulation timer
  useEffect(() => {
    let interval: any = null;
    if (isNavigatingLive && isAutoPlaying && activeRoute) {
      interval = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev + 1 < activeRoute.steps.length) {
            const nextIdx = prev + 1;
            const nextStep = activeRoute.steps[nextIdx];
            speakInstruction(nextStep.maneuver.instruction || nextStep.name);
            setFocusedStepCoords({ lat: nextStep.maneuver.location[1], lng: nextStep.maneuver.location[0] });
            return nextIdx;
          } else {
            setIsAutoPlaying(false);
            speakInstruction('You have arrived at your destination.');
            return prev;
          }
        });
      }, 4500);
    }
    return () => clearInterval(interval);
  }, [isNavigatingLive, isAutoPlaying, activeRoute, speakInstruction]);

  // Radar playback timer
  useEffect(() => {
    let timer: any = null;
    if (isRadarPlaying && radarData && radarData.past.length > 0) {
      const allFrames = [...radarData.past, ...radarData.nowcast];
      timer = setInterval(() => {
        setCurrentRadarFrameIdx((prev) => (prev + 1) % allFrames.length);
      }, 700);
    }
    return () => clearInterval(timer);
  }, [isRadarPlaying, radarData]);

  // Locate Me Handler
  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);
        setCenter(coords);
        setZoom(14);
        loadWeatherForCoords(coords);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Map Click Handler:
  // In weather mode: instantly fetches and displays weather for that spot!
  // In search mode: reveals place details for that coordinate.
  // In directions mode: allows setting destination directly by clicking.
  const handleMapClick = async (coords: Coordinates) => {
    if (isNavigatingLive) return;

    loadWeatherForCoords(coords);

    if (activePanel === 'weather') {
      // In weather mode: user clicks anywhere on map and sees instant weather for that coordinate
      return;
    }

    if (activePanel === 'directions') {
      // In directions mode: clicking sets destination
      try {
        const resolvedName = await reverseGeocode(coords);
        const destPlace: LocationResult = {
          id: `dest-${coords.lat}-${coords.lng}`,
          name: resolvedName.split(',')[0],
          displayName: resolvedName,
          lat: coords.lat,
          lng: coords.lng,
          category: 'place',
        };
        saveRecentSearch(destPlace);
        setSelectedDestination(destPlace);
      } catch (e) {
        setSelectedDestination(coords);
      }
      return;
    }

    // Otherwise, in explore/search mode: resolve place
    setCenter(coords);
    try {
      const resolvedName = await reverseGeocode(coords);
      const clickedPlace: LocationResult = {
        id: `click-${coords.lat}-${coords.lng}`,
        name: resolvedName.split(',')[0],
        displayName: resolvedName,
        lat: coords.lat,
        lng: coords.lng,
        category: 'place',
      };
      saveRecentSearch(clickedPlace);
      setSelectedPlace(clickedPlace);
      setActivePanel('search');
    } catch (e) {
      const fallbackPlace: LocationResult = {
        id: `click-${coords.lat}-${coords.lng}`,
        name: `Map Location`,
        displayName: `Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
        lat: coords.lat,
        lng: coords.lng,
        category: 'place',
      };
      saveRecentSearch(fallbackPlace);
      setSelectedPlace(fallbackPlace);
      setActivePanel('search');
    }
  };

  // Start navigation to selected place
  const handleStartDirectionsToPlace = (loc: LocationResult) => {
    saveRecentSearch(loc);
    setSelectedDestination(loc);
    setActivePanel('directions');
  };

  // Direct route to current weather location
  const handleGetDirectionsToWeatherLocation = () => {
    if (weatherLocation) {
      if (currentWeather) {
        setSelectedDestination({
          id: `weather-dest-${weatherLocation.lat}-${weatherLocation.lng}`,
          name: currentWeather.locationName.split(',')[0],
          displayName: currentWeather.locationName,
          lat: weatherLocation.lat,
          lng: weatherLocation.lng,
          category: 'place',
        });
      } else {
        setSelectedDestination(weatherLocation);
      }
      setActivePanel('directions');
    }
  };

  // Start Live Navigation HUD
  const handleStartLiveNavigation = () => {
    if (!activeRoute || activeRoute.steps.length === 0) return;
    setIsNavigatingLive(true);
    setCurrentStepIdx(0);
    const firstStep = activeRoute.steps[0];
    speakInstruction(`Starting route to ${activeRoute.endName}. ${firstStep.maneuver.instruction || firstStep.name}`);
    setFocusedStepCoords({ lat: firstStep.maneuver.location[1], lng: firstStep.maneuver.location[0] });
    setZoom(16);
  };

  // Exit Live Navigation HUD
  const handleExitLiveNavigation = () => {
    setIsNavigatingLive(false);
    setIsAutoPlaying(false);
    setFocusedStepCoords(null);
    setActiveRoute(null); // Clear route from map once navigation is ended
    setSelectedDestination(null);
    setActivePanel('none');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Toggle Radar Overlay
  const handleToggleRadar = () => {
    setOverlays((prev) => {
      const nextRadar = !prev.radar;
      if (nextRadar && !radarData) {
        fetchRadarFrames().then((data) => {
          setRadarData(data);
          if (data.past.length > 0) {
            setCurrentRadarFrameIdx(data.past.length - 1);
          }
        });
      }
      return { ...prev, radar: nextRadar };
    });
  };

  const allRadarFrames: RadarFrame[] = radarData ? [...radarData.past, ...radarData.nowcast] : [];
  const currentRadarFrame = allRadarFrames[currentRadarFrameIdx] || null;
  const currentSatelliteFrame = radarData?.satellite?.[radarData.satellite.length - 1] || null;

  return (
    <div className={`flex h-screen w-screen overflow-hidden select-none transition-colors duration-300 ${theme === 'dark' ? 'dark bg-slate-950 text-white' : 'bg-slate-100 text-slate-800'}`}>
      {/* 1. Sidebar (clean icon dock) */}
      {!isNavigatingLive && (
        <AppleSidebar
          activePanel={activePanel}
          onSelectPanel={setActivePanel}
          baseMap={baseMap}
          onSelectBaseMap={setBaseMap}
          isRadarActive={overlays.radar}
          onToggleRadar={handleToggleRadar}
          onLocateMe={handleLocateMe}
          isLocating={isLocating}
          useImperial={useImperial}
          onToggleUnits={() => setUseImperial(!useImperial)}
          onOpenApiInspector={() => setIsApiInspectorOpen(true)}
          apiLogCount={apiLogCount}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      )}

      {/* 2. Slide-out Panels */}
      {!isNavigatingLive && activePanel === 'search' && (
        <AppleSearchSheet
          onSelectLocation={(loc) => {
            saveRecentSearch(loc);
            const coords = { lat: loc.lat, lng: loc.lng };
            setCenter(coords);
            setZoom(14);
            setSelectedPlace(loc);
            loadWeatherForCoords(coords, loc.displayName);
          }}
          onGetDirectionsTo={handleStartDirectionsToPlace}
          onViewWeather={(loc) => {
            loadWeatherForCoords({ lat: loc.lat, lng: loc.lng }, loc.name);
            setActivePanel('weather');
          }}
          selectedPlace={selectedPlace}
          onClearSelectedPlace={() => setSelectedPlace(null)}
          proximityCoords={userLocation || center}
          weather={currentWeather}
          useImperial={useImperial}
          onClose={() => setActivePanel('none')}
        />
      )}

      {!isNavigatingLive && activePanel === 'directions' && (
        <AppleDirectionsSheet
          userLocation={userLocation}
          proximityCoords={userLocation || center}
          selectedDestination={selectedDestination}
          onClose={() => {
            setActivePanel('none');
            setActiveRoute(null);
            setSelectedDestination(null);
          }}
          onRouteCalculated={setActiveRoute}
          onStartLiveNavigation={handleStartLiveNavigation}
          activeRoute={activeRoute}
          useImperial={useImperial}
        />
      )}

      {!isNavigatingLive && activePanel === 'weather' && (
        <AppleWeatherSheet
          weather={currentWeather}
          isLoading={isWeatherLoading}
          onRefresh={() => weatherLocation && loadWeatherForCoords(weatherLocation)}
          onGetDirections={handleGetDirectionsToWeatherLocation}
          onClose={() => setActivePanel('none')}
          useImperial={useImperial}
        />
      )}

      {/* 3. Main Full-Bleed Map Canvas */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <MapView
          center={center}
          zoom={zoom}
          baseMap={baseMap}
          overlays={overlays}
          currentRadarFrame={currentRadarFrame}
          currentSatelliteFrame={currentSatelliteFrame}
          radarHost={radarData?.host || 'https://tilecache.rainviewer.com'}
          userLocation={userLocation}
          weatherLocation={weatherLocation}
          currentWeather={currentWeather}
          activeRoute={activeRoute}
          onMapClick={handleMapClick}
          focusedStepCoords={focusedStepCoords}
          useImperial={useImperial}
        />

        {/* 4. Live Turn-by-Turn Navigation HUD */}
        {isNavigatingLive && activeRoute && (
          <AppleNavigationHud
            route={activeRoute}
            currentStepIdx={currentStepIdx}
            onSelectStep={(idx) => {
              setCurrentStepIdx(idx);
              const st = activeRoute.steps[idx];
              speakInstruction(st.maneuver.instruction || st.name);
              setFocusedStepCoords({ lat: st.maneuver.location[1], lng: st.maneuver.location[0] });
            }}
            isVoiceEnabled={isVoiceEnabled}
            onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
            isAutoPlaying={isAutoPlaying}
            onToggleAutoPlay={() => setIsAutoPlaying(!isAutoPlaying)}
            onExitNavigation={handleExitLiveNavigation}
            onRecenter={() => {
              if (focusedStepCoords) {
                setCenter(focusedStepCoords);
                setZoom(16);
              }
            }}
            useImperial={useImperial}
          />
        )}

        {/* 5. Minimal Apple Weather Floating Badge (when weather panel is closed) */}
        {!isNavigatingLive && currentWeather && activePanel !== 'weather' && (
          <div className="absolute bottom-20 md:bottom-6 right-3 md:right-6 z-20 hidden sm:block">
            <button
              onClick={() => setActivePanel('weather')}
              className="flex items-center gap-2.5 px-3.5 py-2 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-lg text-slate-900 dark:text-white transition-all hover:scale-105 active:scale-95"
              title="Open Weather"
            >
              <CloudSun className="w-5 h-5 text-amber-500" />
              <div className="text-left">
                <div className="text-xs font-bold leading-tight tabular-nums">
                  {useImperial
                    ? `${Math.round((currentWeather.current.temperature * 9) / 5 + 32)}°F`
                    : `${Math.round(currentWeather.current.temperature)}°C`}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate max-w-[110px]">
                  {currentWeather.locationName.split(',')[0]}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* 6. Precipitation Radar Playback Timeline Controls */}
        {!isNavigatingLive && overlays.radar && allRadarFrames.length > 0 && (
          <div className="absolute bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-3 sm:px-4">
            <RadarControls
              frames={allRadarFrames}
              currentIndex={currentRadarFrameIdx}
              onSelectIndex={setCurrentRadarFrameIdx}
              isPlaying={isRadarPlaying}
              onTogglePlay={() => setIsRadarPlaying(!isRadarPlaying)}
              opacity={overlays.radarOpacity}
              onChangeOpacity={(val) => setOverlays((prev) => ({ ...prev, radarOpacity: val }))}
            />
          </div>
        )}
      </main>

      {/* API Learning Inspector Modal */}
      <ApiInspectorModal
        isOpen={isApiInspectorOpen}
        onClose={() => setIsApiInspectorOpen(false)}
      />
    </div>
  );
}
