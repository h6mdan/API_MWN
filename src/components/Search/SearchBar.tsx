import React, { useState, useEffect, useRef } from 'react';
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
  Compass
} from 'lucide-react';
import { LocationResult, Coordinates } from '../../types';
import { searchLocations } from '../../services/geocodingService';
import { formatDistance } from '../../services/routingService';

interface SearchBarProps {
  onSelectLocation: (loc: LocationResult) => void;
  proximityCoords?: Coordinates | null;
  placeholder?: string;
  useImperial?: boolean;
}

const CATEGORY_CHIPS = [
  { label: 'Restaurants', query: 'restaurants', icon: Utensils },
  { label: 'Cafes', query: 'coffee shop', icon: Coffee },
  { label: 'Shops & Malls', query: 'supermarket mall', icon: ShoppingBag },
  { label: 'Gas Stations', query: 'fuel gas station', icon: Fuel },
  { label: 'Hotels', query: 'hotel', icon: Hotel },
  { label: 'Attractions', query: 'museum landmark', icon: Landmark },
  { label: 'Pharmacies', query: 'pharmacy', icon: Pill },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  onSelectLocation,
  proximityCoords,
  placeholder = 'Search places, shops, landmarks, streets...',
  useImperial = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchLocations(query, proximityCoords);
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, proximityCoords]);

  const handleSelect = (loc: LocationResult) => {
    onSelectLocation(loc);
    setQuery(loc.name);
    setIsOpen(false);
    setActiveChip(null);
  };

  const handleChipClick = (chip: typeof CATEGORY_CHIPS[0]) => {
    setActiveChip(chip.label);
    setQuery(chip.query);
  };

  const getItemIcon = (category?: string) => {
    switch (category) {
      case 'food':
        return <Utensils className="w-4 h-4 text-rose-400" />;
      case 'shop':
        return <ShoppingBag className="w-4 h-4 text-amber-400" />;
      case 'hotel':
        return <Hotel className="w-4 h-4 text-indigo-400" />;
      case 'health':
        return <Pill className="w-4 h-4 text-emerald-400" />;
      case 'landmark':
        return <Landmark className="w-4 h-4 text-purple-400" />;
      case 'transit':
        return <Compass className="w-4 h-4 text-sky-400" />;
      default:
        return <MapPin className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md sm:max-w-lg select-none">
      {/* Google Maps floating search bar */}
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center px-4 py-2.5">
          <div className="text-blue-400 mr-3 shrink-0">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            ) : (
              <Search className="w-5 h-5 text-slate-400" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />

          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setActiveChip(null);
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Category Chips underneath search input */}
        <div 
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2 border-t border-slate-800/80 overflow-x-auto scrollbar-thin text-xs"
        >
          {CATEGORY_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const isSelected = activeChip === chip.label;
            return (
              <button
                key={chip.label}
                onClick={() => handleChipClick(chip)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800 max-h-96 overflow-y-auto">
          {results.length > 0 && (
            <div className="py-1">
              <div className="px-4 py-1.5 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Free OpenStreetMap & Photon POIs</span>
                <span>{results.length} results</span>
              </div>

              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-800 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start gap-3 min-w-0 pr-3">
                    <div className="mt-0.5 p-2 rounded-xl bg-slate-800 group-hover:bg-slate-700 text-slate-300 shrink-0 border border-slate-700/60">
                      {getItemIcon(result.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {result.name}
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {result.subtitle || result.displayName}
                      </div>
                    </div>
                  </div>

                  {result.distanceFromUser !== undefined && (
                    <div className="text-xs font-mono text-blue-400 shrink-0">
                      {formatDistance(result.distanceFromUser, useImperial)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {query.trim().length >= 2 && !isLoading && results.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400">
              No matching places or shops found for &quot;{query}&quot;. Try another name, street, or category.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
