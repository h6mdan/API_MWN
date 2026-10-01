import React, { useState, useRef } from 'react';
import { 
  X, 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  CloudFog, 
  Wind, 
  Droplets, 
  Compass, 
  Gauge, 
  Navigation,
  RefreshCw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { WeatherData } from '../../types';

interface AppleWeatherSheetProps {
  weather: WeatherData | null;
  isLoading: boolean;
  onRefresh: () => void;
  onGetDirections: () => void;
  onClose: () => void;
  useImperial?: boolean;
}

export const AppleWeatherSheet: React.FC<AppleWeatherSheetProps> = ({
  weather,
  isLoading,
  onRefresh,
  onGetDirections,
  onClose,
  useImperial = false,
}) => {
  const [isFullView, setIsFullView] = useState(false);

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

  if (!weather) {
    return (
      <div className="select-none fixed md:absolute z-30 bottom-20 md:bottom-4 left-3 right-3 md:right-auto md:left-20 md:top-4 w-auto md:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl p-5 shadow-xl animate-in fade-in duration-150">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">Weather Mode</span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Click anywhere on the map to see instant weather data.</p>
      </div>
    );
  }

  const { current, hourly, daily, airQuality } = weather;

  const toTemp = (celsius: number) => {
    if (useImperial) {
      return `${Math.round((celsius * 9) / 5 + 32)}°`;
    }
    return `${Math.round(celsius)}°`;
  };

  const toSpeed = (kmh: number) => {
    if (useImperial) {
      return `${(kmh * 0.621371).toFixed(1)} mph`;
    }
    return `${kmh.toFixed(1)} km/h`;
  };

  const getWeatherIcon = (category: string, sizeClass = 'w-5 h-5') => {
    switch (category) {
      case 'clear':
        return <Sun className={`${sizeClass} text-amber-500`} />;
      case 'cloudy':
        return <Cloud className={`${sizeClass} text-slate-400`} />;
      case 'rain':
        return <CloudRain className={`${sizeClass} text-blue-500`} />;
      case 'snow':
        return <CloudSnow className={`${sizeClass} text-sky-300`} />;
      case 'storm':
        return <CloudLightning className={`${sizeClass} text-amber-500`} />;
      case 'fog':
        return <CloudFog className={`${sizeClass} text-slate-400`} />;
      default:
        return <CloudSun className={`${sizeClass} text-amber-500`} />;
    }
  };

  const getAqiLabel = (aqi?: number) => {
    if (aqi === undefined) return { label: 'Good', color: 'text-emerald-500' };
    if (aqi <= 20) return { label: 'Good', color: 'text-emerald-500' };
    if (aqi <= 40) return { label: 'Fair', color: 'text-lime-500' };
    if (aqi <= 60) return { label: 'Moderate', color: 'text-amber-500' };
    if (aqi <= 80) return { label: 'Poor', color: 'text-orange-500' };
    return { label: 'Very Poor', color: 'text-rose-500' };
  };

  const aqiInfo = getAqiLabel(airQuality?.europeanAqi);
  const todayForecast = daily[0];

  return (
    <div
      style={{
        transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`select-none fixed md:absolute z-30 transition-all duration-300 ease-out ${
        isFullView
          ? 'inset-2 sm:inset-6 max-w-4xl mx-auto'
          : 'bottom-20 md:bottom-4 left-3 right-3 md:right-auto md:left-20 md:top-4 md:bottom-4 w-auto md:w-[400px]'
      }`}
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-6rem)] md:max-h-[85vh] h-full">
        {/* Mobile top pull handle & swipe touch zone */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing md:hidden touch-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors" />
        </div>

        {/* Header bar */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="px-5 pt-2 md:pt-4 pb-2 flex items-center justify-between cursor-grab md:cursor-auto"
        >
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            </button>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Weather</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFullView(!isFullView)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              title={isFullView ? 'Compact' : 'Expand'}
            >
              {isFullView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimal Hero Section */}
        <div className="px-6 pt-1 pb-4 text-center flex flex-col items-center">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate max-w-[280px]">
            {weather.locationName.split(',')[0]}
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
            {weather.locationName.split(',').slice(1, 3).join(',')}
          </div>

          <div className="text-5xl sm:text-6xl font-light tracking-tighter text-slate-900 dark:text-white tabular-nums my-1">
            {toTemp(current.temperature)}
          </div>

          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {current.weatherDescription}
          </div>

          {todayForecast && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span>H: {toTemp(todayForecast.tempMax)}</span>
              <span>·</span>
              <span>L: {toTemp(todayForecast.tempMin)}</span>
              <span>·</span>
              <span>Feels {toTemp(current.apparentTemperature)}</span>
            </div>
          )}

          {/* Prominent Instant Directions / Route Here Button */}
          <div className="mt-3.5 w-full max-w-[240px]">
            <button
              onClick={onGetDirections}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Navigation className="w-3.5 h-3.5 fill-current" />
              <span>Route Directions Here</span>
            </button>
          </div>
        </div>

        {/* Weather Content Sections */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {/* 1. Hourly Forecast */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/50 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">Hourly</div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {hourly.time.map((timeStr, idx) => {
                const hourDate = new Date(timeStr);
                const isNow = idx === 0;
                const hourLabel = isNow ? 'Now' : hourDate.toLocaleTimeString([], { hour: 'numeric' });

                return (
                  <div key={timeStr} className="flex-shrink-0 flex flex-col items-center min-w-[40px] text-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{hourLabel}</span>
                    <div className="my-1.5">
                      {getWeatherIcon(hourly.precipitation[idx] > 0 ? 'rain' : 'cloudy', 'w-4 h-4')}
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                      {toTemp(hourly.temperature[idx])}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. 7-Day Forecast */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/50 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">7-Day Forecast</div>
            <div className="space-y-1.5">
              {daily.map((day, idx) => {
                const dayDate = new Date(day.date);
                const dayName = idx === 0 ? 'Today' : dayDate.toLocaleDateString([], { weekday: 'short' });

                return (
                  <div key={day.date} className="flex items-center justify-between text-xs py-0.5">
                    <span className="w-12 font-medium text-slate-800 dark:text-slate-200">{dayName}</span>
                    <div className="flex items-center gap-1.5 flex-1 px-2">
                      {getWeatherIcon(day.weatherDescription.toLowerCase(), 'w-3.5 h-3.5')}
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[90px]">
                        {day.weatherDescription}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono tabular-nums shrink-0 text-[11px]">
                      <span className="text-slate-400">{toTemp(day.tempMin)}</span>
                      <div className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full w-full" />
                      </div>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{toTemp(day.tempMax)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Minimal Grid Cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Air Quality */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Air Quality</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                AQI {airQuality?.europeanAqi ?? '20'}
              </div>
              <div className={`text-[11px] font-semibold ${aqiInfo.color} mt-0.5`}>
                {aqiInfo.label}
              </div>
            </div>

            {/* Wind */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Wind</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {toSpeed(current.windSpeed)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Gusts {toSpeed(current.windGusts)}
              </div>
            </div>

            {/* Humidity */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Humidity</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {current.humidity}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Dew point {toTemp(current.temperature - ((100 - current.humidity) / 5))}
              </div>
            </div>

            {/* UV Index */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">UV Index</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {current.uvIndex.toFixed(1)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {current.uvIndex < 3 ? 'Low risk' : current.uvIndex < 6 ? 'Moderate' : 'High'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
