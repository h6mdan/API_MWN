import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  Car, 
  Bike, 
  Footprints, 
  ArrowUpDown, 
  MapPin, 
  CornerUpRight, 
  CornerUpLeft, 
  ArrowUp, 
  RotateCw, 
  Flag, 
  X, 
  Loader2, 
  Play, 
  ChevronDown, 
  ChevronUp,
  Compass
} from 'lucide-react';
import { Coordinates, RouteData, TravelMode, RouteStep, LocationResult } from '../../types';
import { calculateRoute, formatDistance, formatDuration, formatArrivalTime } from '../../services/routingService';
import { searchLocations } from '../../services/geocodingService';

interface DirectionsPanelProps {
  userLocation: Coordinates | null;
  selectedDestination: LocationResult | Coordinates | null;
  onClose: () => void;
  onRouteCalculated: (route: RouteData | null) => void;
  onStartLiveNavigation: () => void;
  activeRoute: RouteData | null;
  useImperial?: boolean;
}

export const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  userLocation,
  selectedDestination,
  onClose,
  onRouteCalculated,
  onStartLiveNavigation,
  activeRoute,
  useImperial = false,
}) => {
  const [profile, setProfile] = useState<TravelMode>('driving');
  const [startQuery, setStartQuery] = useState('Your Location');
  const [destQuery, setDestQuery] = useState('');
  
  const [startCoords, setStartCoords] = useState<Coordinates | null>(userLocation);
  const [destCoords, setDestCoords] = useState<Coordinates | null>(null);

  const [startResults, setStartResults] = useState<LocationResult[]>([]);
  const [destResults, setDestResults] = useState<LocationResult[]>([]);
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Sync user location as start
  useEffect(() => {
    if (userLocation && !startCoords) {
      setStartCoords(userLocation);
      setStartQuery('Your Location');
    }
  }, [userLocation]);

  // Sync selected destination if provided
  useEffect(() => {
    if (selectedDestination) {
      if ('name' in selectedDestination) {
        setDestCoords({ lat: selectedDestination.lat, lng: selectedDestination.lng });
        setDestQuery(selectedDestination.name);
      } else {
        setDestCoords(selectedDestination);
        setDestQuery(`Map Pin (${selectedDestination.lat.toFixed(3)}, ${selectedDestination.lng.toFixed(3)})`);
      }
    }
  }, [selectedDestination]);

  // Auto calculate when both coordinates are available
  useEffect(() => {
    if (startCoords && destCoords) {
      handleCalculate(startCoords, destCoords, profile);
    }
  }, [startCoords, destCoords, profile]);

  // Search start
  useEffect(() => {
    if (!startQuery || startQuery === 'Your Location' || startQuery.startsWith('Map Pin')) {
      setStartResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearchingStart(true);
      try {
        const res = await searchLocations(startQuery, userLocation);
        setStartResults(res);
      } finally {
        setIsSearchingStart(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [startQuery, userLocation]);

  // Search dest
  useEffect(() => {
    if (!destQuery || destQuery.startsWith('Map Pin')) {
      setDestResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const res = await searchLocations(destQuery, userLocation);
        setDestResults(res);
      } finally {
        setIsSearchingDest(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [destQuery, userLocation]);

  const handleCalculate = async (
    start: Coordinates,
    end: Coordinates,
    prof: TravelMode
  ) => {
    setIsCalculating(true);
    setRouteError(null);
    try {
      const data = await calculateRoute(start, end, prof, startQuery, destQuery);
      onRouteCalculated(data);
    } catch (err: any) {
      setRouteError(err.message || 'Route calculation failed');
      onRouteCalculated(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSwap = () => {
    const sC = startCoords;
    const sQ = startQuery;
    setStartCoords(destCoords);
    setStartQuery(destQuery);
    setDestCoords(sC);
    setDestQuery(sQ);
  };

  const getManeuverIcon = (step: RouteStep) => {
    const type = step.maneuver.type;
    const mod = step.maneuver.modifier || '';
    if (type === 'arrive') return <Flag className="w-4 h-4 text-emerald-400" />;
    if (type === 'roundabout' || type === 'rotary') return <RotateCw className="w-4 h-4 text-amber-400" />;
    if (mod.includes('right')) return <CornerUpRight className="w-4 h-4 text-blue-400" />;
    if (mod.includes('left')) return <CornerUpLeft className="w-4 h-4 text-blue-400" />;
    return <ArrowUp className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 text-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm sm:max-w-md flex flex-col max-h-[85vh] select-none transition-all">
      {/* Top Header */}
      <div className="p-4 pb-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Navigation className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Google Maps Directions</h3>
            <p className="text-[11px] text-slate-400 font-mono">Turn-by-turn routing</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Selector Tabs */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/40">
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-800/80 rounded-2xl">
          {[
            { id: 'driving', label: 'Driving', icon: Car },
            { id: 'bike', label: 'Cycling', icon: Bike },
            { id: 'foot', label: 'Walking', icon: Footprints },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setProfile(id as TravelMode)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                profile === id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Origin & Destination Inputs with Swap */}
      <div className="p-4 space-y-2.5 border-b border-slate-800 relative">
        {/* Origin */}
        <div className="relative">
          <div className="flex items-center gap-2.5 bg-slate-800/90 border border-slate-700 rounded-2xl px-3.5 py-2 focus-within:ring-2 focus-within:ring-blue-500">
            <span className="w-3 h-3 rounded-full border-2 border-emerald-400 bg-emerald-500/20 shrink-0" />
            <input
              type="text"
              value={startQuery}
              onChange={(e) => setStartQuery(e.target.value)}
              placeholder="Choose starting point"
              className="bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 w-full focus:outline-none"
            />
            {userLocation && (
              <button
                type="button"
                onClick={() => {
                  setStartCoords(userLocation);
                  setStartQuery('Your Location');
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium whitespace-nowrap"
              >
                My GPS
              </button>
            )}
          </div>

          {/* Autocomplete for start */}
          {startResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-800">
              {startResults.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    setStartCoords({ lat: r.lat, lng: r.lng });
                    setStartQuery(r.name);
                    setStartResults([]);
                  }}
                  className="p-2.5 hover:bg-slate-800 cursor-pointer text-xs"
                >
                  <div className="font-semibold text-white">{r.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{r.subtitle || r.displayName}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Swap button */}
        <div className="flex justify-end pr-2 -my-1">
          <button
            onClick={handleSwap}
            title="Swap locations"
            className="p-1.5 text-slate-400 hover:text-blue-400 rounded-full hover:bg-slate-800 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* Destination */}
        <div className="relative">
          <div className="flex items-center gap-2.5 bg-slate-800/90 border border-slate-700 rounded-2xl px-3.5 py-2 focus-within:ring-2 focus-within:ring-blue-500">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <input
              type="text"
              value={destQuery}
              onChange={(e) => setDestQuery(e.target.value)}
              placeholder="Search destination, shop, landmark..."
              className="bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 w-full focus:outline-none"
            />
          </div>

          {/* Autocomplete for destination */}
          {destResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-800">
              {destResults.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    setDestCoords({ lat: r.lat, lng: r.lng });
                    setDestQuery(r.name);
                    setDestResults([]);
                  }}
                  className="p-2.5 hover:bg-slate-800 cursor-pointer text-xs"
                >
                  <div className="font-semibold text-white">{r.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{r.subtitle || r.displayName}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {routeError && (
          <div className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800 p-2.5 rounded-xl">
            {routeError}
          </div>
        )}
      </div>

      {/* Route Summary & Google Maps Start Button */}
      {isCalculating && (
        <div className="p-6 flex items-center justify-center gap-2 text-sm text-blue-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Finding best route...</span>
        </div>
      )}

      {activeRoute && !isCalculating && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Google Maps Route Card */}
          <div className="p-4 bg-gradient-to-b from-slate-800/60 to-transparent border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-black text-emerald-400 tabular-nums">
                  {formatDuration(activeRoute.duration)}
                </div>
                <div className="text-xs text-slate-300 font-mono mt-0.5">
                  <span>{formatDistance(activeRoute.distance, useImperial)}</span>
                  <span className="mx-1.5">·</span>
                  <span>Arrive {formatArrivalTime(activeRoute.duration)}</span>
                </div>
                <div className="text-[11px] text-emerald-400/90 font-medium mt-1">
                  Fastest route now · free OSRM engine
                </div>
              </div>

              {/* Start Live Navigation CTA Button */}
              <button
                onClick={onStartLiveNavigation}
                className="py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-emerald-950/50 transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start</span>
              </button>
            </div>

            {/* Toggle turn-by-turn steps */}
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="mt-3 w-full py-1.5 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium flex items-center justify-between transition-colors"
            >
              <span>{showSteps ? 'Hide steps' : `View ${activeRoute.steps.length} turn-by-turn steps`}</span>
              {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Steps List */}
          {showSteps && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-slate-800/60">
              {activeRoute.steps.map((step, idx) => (
                <div key={idx} className="pt-2.5 pb-2 px-2 flex items-start gap-3 text-xs">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 text-blue-400 shrink-0">
                    {getManeuverIcon(step)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white leading-snug">
                      {step.maneuver.instruction || step.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {formatDistance(step.distance, useImperial)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
