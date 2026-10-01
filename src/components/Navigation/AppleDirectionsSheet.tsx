import React, { useState, useEffect, useRef } from 'react';
import { 
  Car, 
  Bike, 
  Footprints, 
  ArrowUpDown, 
  MapPin, 
  X, 
  Loader2, 
  CornerUpRight, 
  CornerUpLeft, 
  ArrowUp, 
  RotateCw, 
  Flag,
  ChevronDown,
  ChevronUp,
  Utensils,
  Coffee,
  Fuel,
  ShoppingBag,
  Hotel,
  Pill,
  Clock,
  Trash2
} from 'lucide-react';
import { Coordinates, RouteData, TravelMode, RouteStep, LocationResult } from '../../types';
import { calculateRoute, formatDistance, formatDuration, formatArrivalTime } from '../../services/routingService';
import { searchLocations, searchNearbyCategory } from '../../services/geocodingService';
import { useRecentSearches, saveRecentSearch } from '../../services/recentSearchesService';

interface AppleDirectionsSheetProps {
  userLocation: Coordinates | null;
  proximityCoords?: Coordinates | null;
  selectedDestination: LocationResult | Coordinates | null;
  onClose: () => void;
  onRouteCalculated: (route: RouteData | null) => void;
  onStartLiveNavigation: () => void;
  activeRoute: RouteData | null;
  useImperial?: boolean;
}

const QUICK_DEST_CHIPS = [
  { label: 'Food', key: 'food', icon: Utensils },
  { label: 'Coffee', key: 'coffee', icon: Coffee },
  { label: 'Gas', key: 'gas', icon: Fuel },
  { label: 'Shopping', key: 'shopping', icon: ShoppingBag },
  { label: 'Hotels', key: 'hotels', icon: Hotel },
  { label: 'Pharmacy', key: 'pharmacy', icon: Pill },
];

export const AppleDirectionsSheet: React.FC<AppleDirectionsSheetProps> = ({
  userLocation,
  proximityCoords,
  selectedDestination,
  onClose,
  onRouteCalculated,
  onStartLiveNavigation,
  activeRoute,
  useImperial = false,
}) => {
  const [profile, setProfile] = useState<TravelMode>('driving');
  const [startQuery, setStartQuery] = useState('My Location');
  const [destQuery, setDestQuery] = useState('');
  
  const effectiveProximity = userLocation || proximityCoords || null;
  const [startCoords, setStartCoords] = useState<Coordinates | null>(effectiveProximity);
  // Destination is strictly null by default
  const [destCoords, setDestCoords] = useState<Coordinates | null>(null);

  const [startResults, setStartResults] = useState<LocationResult[]>([]);
  const [destResults, setDestResults] = useState<LocationResult[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Persistent recents hook
  const { recents, clearAll } = useRecentSearches(effectiveProximity);

  // Mobile swipe-down gesture support
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const diff = e.touches[0].clientY - touchStartYRef.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 70) {
      setDragY(350);
      setTimeout(() => {
        onClose();
        setDragY(0);
        setIsDragging(false);
      }, 150);
    } else {
      setDragY(0);
      setIsDragging(false);
    }
    touchStartYRef.current = null;
  };

  // Guard refs to prevent search autocomplete re-triggering when an item is selected in 1 click
  const isSelectingStartRef = useRef(false);
  const isSelectingDestRef = useRef(false);

  // Sync user location as start if available
  useEffect(() => {
    if (effectiveProximity && !startCoords) {
      isSelectingStartRef.current = true;
      setStartCoords(effectiveProximity);
      setStartQuery(userLocation ? 'My Location' : 'Current Map Location');
    }
  }, [userLocation, proximityCoords, effectiveProximity, startCoords]);

  // Sync destination ONLY when explicitly provided externally
  useEffect(() => {
    if (selectedDestination) {
      isSelectingDestRef.current = true;
      setDestResults([]);
      setIsSearchingDest(false);
      if ('name' in selectedDestination) {
        setDestCoords({ lat: selectedDestination.lat, lng: selectedDestination.lng });
        setDestQuery(selectedDestination.name);
        saveRecentSearch(selectedDestination as LocationResult);
      } else {
        setDestCoords(selectedDestination);
        setDestQuery(`Location (${selectedDestination.lat.toFixed(3)}, ${selectedDestination.lng.toFixed(3)})`);
      }
    }
  }, [selectedDestination]);

  // Auto calculate ONLY when BOTH start and destination coordinates are valid
  useEffect(() => {
    if (startCoords && destCoords) {
      handleCalculate(startCoords, destCoords, profile);
    } else {
      onRouteCalculated(null);
    }
  }, [startCoords, destCoords, profile]);

  // Search start - ONLY run when start is not yet chosen/locked
  useEffect(() => {
    if (startCoords || isSelectingStartRef.current) {
      isSelectingStartRef.current = false;
      setStartResults([]);
      return;
    }
    if (!startQuery || startQuery.trim().length < 2 || startQuery === 'My Location' || startQuery === 'Current Map Location' || startQuery.startsWith('Location (')) {
      setStartResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await searchLocations(startQuery, effectiveProximity);
        if (!startCoords) {
          setStartResults(res);
        }
      } catch (e) {
        console.warn('Start search error:', e);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [startQuery, startCoords, effectiveProximity]);

  // Search dest - ONLY run when destination is not yet chosen/locked
  useEffect(() => {
    // If destination coordinates are already chosen, NEVER search or show suggestions!
    if (destCoords || isSelectingDestRef.current) {
      isSelectingDestRef.current = false;
      setDestResults([]);
      setIsSearchingDest(false);
      return;
    }
    if (!destQuery || destQuery.trim().length < 2 || destQuery.startsWith('Location (')) {
      setDestResults([]);
      setIsSearchingDest(false);
      return;
    }
    setIsSearchingDest(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchLocations(destQuery, effectiveProximity);
        if (!destCoords) {
          setDestResults(res);
        }
      } catch (e) {
        console.warn('Dest search error:', e);
      } finally {
        setIsSearchingDest(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [destQuery, destCoords, effectiveProximity]);

  const handleSelectStart = (r: LocationResult) => {
    isSelectingStartRef.current = true;
    setStartCoords({ lat: r.lat, lng: r.lng });
    setStartQuery(r.name);
    setStartResults([]);
    saveRecentSearch(r);
  };

  const handleSelectDest = (r: LocationResult) => {
    isSelectingDestRef.current = true;
    setDestCoords({ lat: r.lat, lng: r.lng });
    setDestQuery(r.name);
    setDestResults([]);
    setIsSearchingDest(false);
    saveRecentSearch(r);
  };

  const handleQuickChip = async (key: string, label: string) => {
    isSelectingDestRef.current = false;
    setDestCoords(null);
    onRouteCalculated(null);
    setDestQuery(label);
    setIsSearchingDest(true);
    try {
      if (effectiveProximity) {
        const items = await searchNearbyCategory(key, effectiveProximity);
        setDestResults(items);
      } else {
        const items = await searchLocations(label, effectiveProximity);
        setDestResults(items);
      }
    } catch (e) {
      console.warn('Quick chip search error:', e);
    } finally {
      setIsSearchingDest(false);
    }
  };

  const handleCalculate = async (
    start: Coordinates,
    end: Coordinates,
    prof: TravelMode
  ) => {
    setIsCalculating(true);
    setRouteError(null);
    try {
      const data = await calculateRoute(start, end, prof, startQuery || 'Start', destQuery || 'Destination');
      onRouteCalculated(data);
    } catch (err: any) {
      setRouteError(err.message || 'Could not find a road route between these points');
      onRouteCalculated(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSwap = () => {
    isSelectingStartRef.current = true;
    isSelectingDestRef.current = true;
    const sC = startCoords;
    const sQ = startQuery;
    setStartCoords(destCoords);
    setStartQuery(destQuery);
    setDestCoords(sC);
    setDestQuery(sQ);
    setStartResults([]);
    setDestResults([]);
  };

  const getManeuverIcon = (step: RouteStep) => {
    const type = step.maneuver.type;
    const mod = step.maneuver.modifier || '';
    if (type === 'arrive') return <Flag className="w-4 h-4 text-emerald-500" />;
    if (type === 'roundabout' || type === 'rotary') return <RotateCw className="w-4 h-4 text-amber-500" />;
    if (mod.includes('right')) return <CornerUpRight className="w-4 h-4 text-blue-500" />;
    if (mod.includes('left')) return <CornerUpLeft className="w-4 h-4 text-blue-500" />;
    return <ArrowUp className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div 
      style={{
        transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className="fixed md:relative inset-x-0 bottom-16 md:bottom-auto top-10 sm:top-14 md:top-0 h-auto max-h-[calc(100vh-4rem)] md:h-full md:max-h-full w-full md:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t md:border-t-0 md:border-r border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white flex flex-col shadow-2xl md:shadow-xl z-30 md:z-20 rounded-t-3xl md:rounded-none overflow-hidden select-none animate-in slide-in-from-bottom-4 md:slide-in-from-left duration-200"
    >
      {/* Mobile top pull handle & swipe touch zone */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing md:hidden touch-none"
      >
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors" />
      </div>

      {/* Top Header */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="p-4 pt-1 md:pt-4 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between cursor-grab md:cursor-auto"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Directions</span>
          {activeRoute && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-medium">
              Route Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {activeRoute && (
            <button
              type="button"
              onClick={() => {
                onRouteCalculated(null);
                setDestCoords(null);
                setDestQuery('');
              }}
              className="text-[11px] font-medium text-rose-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Clear Route"
            >
              Clear Route
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs (Drive, Cycle, Walk) */}
      <div className="p-3 border-b border-slate-200/60 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40">
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {[
            { id: 'driving', label: 'Drive', icon: Car },
            { id: 'bike', label: 'Cycle', icon: Bike },
            { id: 'foot', label: 'Walk', icon: Footprints },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setProfile(id as TravelMode)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                profile === id
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Origin & Destination Inputs */}
      <div className="p-4 space-y-2 border-b border-slate-200/60 dark:border-slate-800/80 relative">
        {/* Origin */}
        <div className="relative">
          <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200/50 dark:border-slate-700/60 focus-within:ring-2 focus-within:ring-blue-500">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <input
              type="text"
              value={startQuery}
              onChange={(e) => {
                const val = e.target.value;
                isSelectingStartRef.current = false;
                setStartQuery(val);
                if (startCoords) {
                  setStartCoords(null);
                  onRouteCalculated(null);
                }
              }}
              placeholder="Starting point"
              className="bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 w-full focus:outline-none"
            />
            {startCoords && (
              <button
                type="button"
                onClick={() => {
                  isSelectingStartRef.current = true;
                  setStartCoords(null);
                  setStartQuery('');
                  setStartResults([]);
                  onRouteCalculated(null);
                }}
                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                title="Clear start location"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick "My Location" option if start is empty */}
          {(!startCoords || startQuery === '') && effectiveProximity && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  isSelectingStartRef.current = true;
                  setStartCoords(effectiveProximity);
                  setStartQuery(userLocation ? 'My Location' : 'Current Map Location');
                  setStartResults([]);
                }}
                onClick={() => {
                  isSelectingStartRef.current = true;
                  setStartCoords(effectiveProximity);
                  setStartQuery(userLocation ? 'My Location' : 'Current Map Location');
                  setStartResults([]);
                }}
                className="w-full p-2.5 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-blue-600 dark:text-blue-400 font-medium transition-colors text-left cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span>Use Current Location</span>
              </button>
            </div>
          )}

          {/* Start Results dropdown */}
          {startResults.length > 0 && !startCoords && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {startResults.map((r) => (
                <div
                  key={r.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectStart(r);
                  }}
                  onClick={() => handleSelectStart(r)}
                  className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">{r.name}</div>
                    {r.distanceFromUser !== undefined && (
                      <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 shrink-0 ml-2">
                        {formatDistance(r.distanceFromUser, useImperial)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{r.subtitle || r.displayName}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Swap button */}
        <div className="flex justify-end pr-2 -my-1">
          <button onClick={handleSwap} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="Swap start and destination">
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Destination (Null / empty by default) */}
        <div className="relative">
          <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200/50 dark:border-slate-700/60 focus-within:ring-2 focus-within:ring-blue-500">
            {isSearchingDest ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            )}
            <input
              type="text"
              value={destQuery}
              onChange={(e) => {
                const val = e.target.value;
                isSelectingDestRef.current = false;
                setDestQuery(val);
                if (destCoords) {
                  setDestCoords(null);
                  onRouteCalculated(null);
                }
              }}
              placeholder="Search destination, restaurant, shop..."
              className="bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 w-full focus:outline-none"
            />
            {destCoords && (
              <button
                type="button"
                onClick={() => {
                  isSelectingDestRef.current = true;
                  setDestCoords(null);
                  setDestQuery('');
                  setDestResults([]);
                  onRouteCalculated(null);
                }}
                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                title="Clear destination"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Nearby Destination Tags */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-thin text-[11px]">
            {QUICK_DEST_CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => handleQuickChip(chip.key, chip.label)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <Icon className="w-3 h-3" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          {/* Destination Results Autocomplete Dropdown - ONLY shown when searching without a chosen destination */}
          {destResults.length > 0 && !destCoords && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                Nearby Matches (Closest First)
              </div>
              {destResults.map((r) => (
                <div
                  key={r.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectDest(r);
                  }}
                  onClick={() => handleSelectDest(r)}
                  className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">{r.name}</div>
                    {r.distanceFromUser !== undefined && (
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0 ml-2 font-semibold">
                        {formatDistance(r.distanceFromUser, useImperial)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{r.subtitle || r.displayName}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {routeError && (
          <div className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-2.5 rounded-xl">
            {routeError}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isCalculating && (
        <div className="p-8 flex items-center justify-center gap-2 text-xs text-blue-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Calculating route...</span>
        </div>
      )}

      {/* When destination is null: Show Recent Destinations or Prompt */}
      {!destCoords && !isCalculating && (
        <div className="flex-1 overflow-y-auto">
          {recents.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              <div className="px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Recent Destinations</span>
                </div>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors font-normal flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>

              {recents.map((place) => (
                <div
                  key={place.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectDest(place);
                  }}
                  onClick={() => handleSelectDest(place)}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start gap-3"
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-500 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {place.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {place.subtitle || place.displayName}
                    </div>
                  </div>
                  {place.distanceFromUser !== undefined && (
                    <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 shrink-0 pt-0.5 font-semibold">
                      {formatDistance(place.distanceFromUser, useImperial)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
              <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2 stroke-1" />
              <p className="font-medium text-slate-600 dark:text-slate-300">No destination selected</p>
              <p className="text-[11px] text-slate-400 mt-1">Search a nearby place or tap a quick tag above to route instantly.</p>
            </div>
          )}
        </div>
      )}

      {/* Calculated Route Card & Clean Apple GO Button */}
      {activeRoute && !isCalculating && destCoords && (
        <div className="flex-1 overflow-hidden flex flex-col justify-between p-4">
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                  {formatDuration(activeRoute.duration).toUpperCase()}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  <span>{formatDistance(activeRoute.distance, useImperial)}</span>
                  <span className="mx-1.5">·</span>
                  <span>{formatArrivalTime(activeRoute.duration)}</span>
                </div>
              </div>

              {/* Clean GO Button */}
              <button
                onClick={onStartLiveNavigation}
                className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 tracking-wider"
              >
                GO
              </button>
            </div>

            {/* Turn Steps Toggle */}
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between transition-colors border border-slate-200/50 dark:border-slate-800"
            >
              <span>{showSteps ? 'Hide steps' : `View ${activeRoute.steps.length} turns`}</span>
              {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Step list */}
            {showSteps && (
              <div className="max-h-56 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60 pr-1">
                {activeRoute.steps.map((step, idx) => (
                  <div key={idx} className="pt-2 pb-1.5 flex items-start gap-2.5 text-xs">
                    <div className="mt-0.5 p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-blue-500 shrink-0">
                      {getManeuverIcon(step)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{step.maneuver.instruction || step.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {formatDistance(step.distance, useImperial)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
