import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  X, 
  Loader2, 
  MapPin, 
  Navigation, 
  ShoppingBag, 
  Utensils, 
  Coffee, 
  Fuel, 
  Hotel, 
  Landmark, 
  Pill, 
  Compass, 
  CloudSun, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Trash2
} from 'lucide-react';
import { LocationResult, Coordinates, WeatherData } from '../../types';
import { searchLocations, searchNearbyCategory } from '../../services/geocodingService';
import { formatDistance } from '../../services/routingService';
import { useRecentSearches } from '../../services/recentSearchesService';

interface AppleSearchSheetProps {
  onSelectLocation: (loc: LocationResult) => void;
  onGetDirectionsTo: (loc: LocationResult) => void;
  onViewWeather: (loc: LocationResult) => void;
  selectedPlace: LocationResult | null;
  onClearSelectedPlace: () => void;
  proximityCoords?: Coordinates | null;
  weather?: WeatherData | null;
  useImperial?: boolean;
  onClose: () => void;
}

const CATEGORY_CHIPS = [
  { label: 'Food', key: 'food', query: 'restaurant dining', icon: Utensils },
  { label: 'Coffee', key: 'coffee', query: 'coffee cafe', icon: Coffee },
  { label: 'Shopping', key: 'shopping', query: 'supermarket store mall', icon: ShoppingBag },
  { label: 'Gas', key: 'gas', query: 'gas fuel station', icon: Fuel },
  { label: 'Groceries', key: 'groceries', query: 'supermarket grocery', icon: ShoppingBag },
  { label: 'Hotels', key: 'hotels', query: 'hotel', icon: Hotel },
  { label: 'Sights', key: 'sights', query: 'attraction museum landmark', icon: Landmark },
  { label: 'Pharmacy', key: 'pharmacy', query: 'pharmacy chemist', icon: Pill },
  { label: 'Transit', key: 'transit', query: 'bus station train metro', icon: Navigation },
];

export const AppleSearchSheet: React.FC<AppleSearchSheetProps> = ({
  onSelectLocation,
  onGetDirectionsTo,
  onViewWeather,
  selectedPlace,
  onClearSelectedPlace,
  proximityCoords,
  weather,
  useImperial = false,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Recent Searches from localStorage
  const { recents, addRecent, removeRecent, clearAll } = useRecentSearches(proximityCoords);

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

  const handleSelectPlace = (place: LocationResult) => {
    addRecent(place);
    onSelectLocation(place);
  };

  // Speed Dial horizontal scrolling & dragging refs/states
  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const checkScroll = useCallback(() => {
    const el = chipsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = chipsContainerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = chipsContainerRef.current;
    if (!el) return;
    if (e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
      checkScroll();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = chipsContainerRef.current;
    if (!el) return;
    isMouseDownRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
    hasMovedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;
    const el = chipsContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
      el.scrollLeft = scrollLeftRef.current - walk;
      checkScroll();
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 50);
  };

  const handleMouseLeave = () => {
    isMouseDownRef.current = false;
  };

  const scrollChips = (direction: 'left' | 'right') => {
    const el = chipsContainerRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -160 : 160;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      if (!activeCategory) {
        setResults([]);
        setIsLoading(false);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchLocations(query, proximityCoords);
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, proximityCoords, activeCategory]);

  const handleChipClick = async (chip: typeof CATEGORY_CHIPS[0]) => {
    setActiveCategory(chip.label);
    setQuery(chip.label);
    setIsLoading(true);
    try {
      if (proximityCoords) {
        const data = await searchNearbyCategory(chip.key, proximityCoords);
        setResults(data);
      } else {
        const data = await searchLocations(chip.query, proximityCoords);
        setResults(data);
      }
    } catch (err) {
      console.error('Nearby search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getItemIcon = (category?: string) => {
    switch (category) {
      case 'food':
        return <Utensils className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
      case 'shop':
        return <ShoppingBag className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
      case 'hotel':
        return <Hotel className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
      case 'health':
        return <Pill className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
      case 'landmark':
        return <Landmark className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
      case 'transit':
        return <Compass className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
      default:
        return <MapPin className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
    }
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

      {/* Top Search Input */}
      <div className="p-4 pt-1 md:pt-4 border-b border-slate-200/60 dark:border-slate-800/80">
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex items-center justify-between mb-2.5 cursor-grab md:cursor-auto"
        >
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Search</span>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800/90 rounded-xl px-3 py-2 border border-slate-200/50 dark:border-slate-700/60 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (activeCategory) setActiveCategory(null);
            }}
            placeholder="Search restaurants, places, coffee..."
            className="bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 w-full focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setActiveCategory(null);
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Speed Dial Horizontal Carousel */}
      <div className="relative border-b border-slate-200/60 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/30">
        {canScrollLeft && (
          <button
            onClick={() => scrollChips('left')}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-md border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:scale-105 transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => scrollChips('right')}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-md border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:scale-105 transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <div
          ref={chipsContainerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="flex items-center gap-1.5 p-3 overflow-x-auto scrollbar-none cursor-grab active:cursor-grabbing scroll-smooth"
        >
          {CATEGORY_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const isActive = activeCategory === chip.label;
            return (
              <button
                key={chip.key}
                onClick={() => {
                  if (hasMovedRef.current) return;
                  handleChipClick(chip);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm scale-105'
                    : 'bg-white dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {selectedPlace ? (
        /* Place Details Card */
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  {getItemIcon(selectedPlace.category)}
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {selectedPlace.category || 'Location'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                {selectedPlace.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {selectedPlace.subtitle || selectedPlace.displayName}
              </p>
              {selectedPlace.distanceFromUser !== undefined && (
                <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-mono font-medium">
                  <Navigation className="w-3 h-3 fill-current rotate-45" />
                  <span>{formatDistance(selectedPlace.distanceFromUser, useImperial)} away</span>
                </div>
              )}
            </div>

            {/* Quick Weather Snapshot for selected place */}
            {weather && (
              <div
                onClick={() => onViewWeather(selectedPlace)}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CloudSun className="w-4 h-4 text-amber-500" />
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {useImperial
                      ? `${Math.round((weather.current.temperature * 9) / 5 + 32)}°F`
                      : `${Math.round(weather.current.temperature)}°C`}
                    <span className="font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                      {weather.current.weatherDescription}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Weather &rarr;</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 flex gap-2">
            <button
              onClick={() => {
                addRecent(selectedPlace);
                onGetDirectionsTo(selectedPlace);
              }}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Navigation className="w-4 h-4 fill-current" />
              <span>Route Here</span>
            </button>

            <button
              onClick={onClearSelectedPlace}
              className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-xl transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        /* Results List OR Persistent Recents List */
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {activeCategory && results.length > 0 && (
            <div className="px-4 py-2 text-[11px] text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/40">
              Nearby {activeCategory} ({results.length} found)
            </div>
          )}

          {results.length > 0 ? (
            results.map((place) => (
              <div
                key={place.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectPlace(place);
                }}
                onClick={() => handleSelectPlace(place)}
                className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start gap-3"
              >
                <div className="mt-0.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  {getItemIcon(place.category)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{place.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{place.subtitle || place.displayName}</div>
                </div>
                {place.distanceFromUser !== undefined && (
                  <div className="text-xs font-mono text-blue-600 dark:text-blue-400 shrink-0 pt-0.5">
                    {formatDistance(place.distanceFromUser, useImperial)}
                  </div>
                )}
              </div>
            ))
          ) : (query.trim().length >= 2 || activeCategory) && !isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No nearby places found. Try another search.
            </div>
          ) : (
            /* Persistent Recent Searches Section */
            <div>
              {recents.length > 0 ? (
                <div>
                  <div className="px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>Recent Searches</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-[11px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors flex items-center gap-1 font-normal"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear All</span>
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {recents.map((place) => (
                      <div
                        key={place.id}
                        className="group p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start gap-3 relative"
                      >
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectPlace(place);
                          }}
                          onClick={() => handleSelectPlace(place)}
                          className="mt-0.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0"
                        >
                          <Clock className="w-4 h-4 text-blue-500" />
                        </div>
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectPlace(place);
                          }}
                          onClick={() => handleSelectPlace(place)}
                          className="min-w-0 flex-1 pr-6"
                        >
                          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {place.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {place.subtitle || place.displayName}
                          </div>
                        </div>
                        {place.distanceFromUser !== undefined && (
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectPlace(place);
                            }}
                            onClick={() => handleSelectPlace(place)}
                            className="text-xs font-mono text-blue-600 dark:text-blue-400 shrink-0 pt-0.5 mr-6"
                          >
                            {formatDistance(place.distanceFromUser, useImperial)}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecent(place.id);
                          }}
                          className="absolute right-2.5 top-3.5 p-1 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors"
                          title="Remove from recents"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 stroke-1" />
                  <p className="font-medium text-slate-600 dark:text-slate-300">No recent searches</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Searched locations and routed places will stay here for quick access.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
