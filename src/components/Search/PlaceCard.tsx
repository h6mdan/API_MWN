import React from 'react';
import { 
  X, 
  Navigation, 
  MapPin, 
  Share2, 
  Compass, 
  Clock, 
  Phone, 
  ExternalLink,
  ShoppingBag,
  Utensils,
  Coffee,
  Building,
  Landmark,
  Hotel,
  Hospital,
  CloudSun,
  Layers
} from 'lucide-react';
import { LocationResult, WeatherData } from '../../types';
import { formatDistance } from '../../services/routingService';

interface PlaceCardProps {
  place: LocationResult;
  onClose: () => void;
  onGetDirections: (place: LocationResult) => void;
  onViewWeather: (place: LocationResult) => void;
  weather?: WeatherData | null;
  useImperial?: boolean;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  onClose,
  onGetDirections,
  onViewWeather,
  weather,
  useImperial = false,
}) => {
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'shop':
        return <ShoppingBag className="w-5 h-5 text-amber-400" />;
      case 'food':
        return <Utensils className="w-5 h-5 text-rose-400" />;
      case 'hotel':
        return <Hotel className="w-5 h-5 text-indigo-400" />;
      case 'health':
        return <Hospital className="w-5 h-5 text-emerald-400" />;
      case 'landmark':
        return <Landmark className="w-5 h-5 text-purple-400" />;
      case 'transit':
        return <Compass className="w-5 h-5 text-sky-400" />;
      default:
        return <MapPin className="w-5 h-5 text-blue-400" />;
    }
  };

  const getCategoryLabel = (category?: string, osmValue?: string) => {
    if (osmValue) {
      return osmValue.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    switch (category) {
      case 'shop':
        return 'Shopping & Retail';
      case 'food':
        return 'Restaurant / Cafe';
      case 'hotel':
        return 'Hotel & Lodging';
      case 'health':
        return 'Medical & Pharmacy';
      case 'landmark':
        return 'Landmark & Attraction';
      case 'transit':
        return 'Transit Station';
      case 'street':
        return 'Street / Road';
      default:
        return 'Location';
    }
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 text-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm sm:max-w-md transition-all duration-300">
      {/* Visual Accent Top Bar */}
      <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />

      <div className="p-5">
        {/* Header row with Icon, Title, and Close */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-inner">
              {getCategoryIcon(place.category)}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white tracking-tight leading-snug line-clamp-2">
                {place.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                <span className="text-blue-400 font-medium">
                  {getCategoryLabel(place.category, place.osmValue)}
                </span>
                {place.distanceFromUser !== undefined && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-300">
                      {formatDistance(place.distanceFromUser, useImperial)} away
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Address and details */}
        <div className="mt-3.5 text-xs text-slate-300 leading-relaxed bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="break-words">{place.displayName}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1.5 border-t border-slate-700/60">
            <span>Coordinates:</span>
            <span>{place.lat.toFixed(4)}°N, {place.lng.toFixed(4)}°E</span>
          </div>
        </div>

        {/* Weather at this place preview */}
        {weather && (
          <div 
            onClick={() => onViewWeather(place)}
            className="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/40 flex items-center justify-between cursor-pointer hover:border-blue-600 transition-all group"
          >
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-amber-400" />
              <div className="text-xs">
                <span className="font-semibold text-white">
                  {useImperial
                    ? `${Math.round((weather.current.temperature * 9) / 5 + 32)}°F`
                    : `${Math.round(weather.current.temperature)}°C`}
                </span>
                <span className="text-slate-300 ml-1.5 font-normal">
                  {weather.current.weatherDescription}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-blue-400 group-hover:underline">
              Apple Weather &rarr;
            </span>
          </div>
        )}

        {/* Google Maps style Primary Action Buttons */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => onGetDirections(place)}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4 fill-current" />
            <span>Directions</span>
          </button>

          <button
            onClick={() => onViewWeather(place)}
            className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            title="Inspect Apple Weather data"
          >
            <CloudSun className="w-4 h-4 text-amber-400" />
            <span>Weather</span>
          </button>
        </div>
      </div>
    </div>
  );
};
