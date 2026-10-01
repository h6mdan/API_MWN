import React, { useState } from 'react';
import { 
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
  Eye, 
  ChevronRight, 
  ChevronDown, 
  Navigation, 
  RefreshCw, 
  Info,
  Calendar,
  Clock,
  Sparkles
} from 'lucide-react';
import { WeatherData } from '../../types';

interface WeatherPanelProps {
  weather: WeatherData | null;
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateHere: () => void;
  useImperial: boolean;
}

export const WeatherPanel: React.FC<WeatherPanelProps> = ({
  weather,
  isLoading,
  onRefresh,
  onNavigateHere,
  useImperial,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'hourly' | 'daily' | 'air'>('overview');
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!weather) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-xl max-w-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <CloudRain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Real-Time Weather</h3>
            <p className="text-xs text-slate-400">Click anywhere on the map or search to inspect</p>
          </div>
        </div>
      </div>
    );
  }

  const { current, hourly, daily, airQuality } = weather;

  const toTemp = (celsius: number) => {
    if (useImperial) {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${Math.round(celsius)}°C`;
  };

  const toSpeed = (kmh: number) => {
    if (useImperial) {
      return `${(kmh * 0.621371).toFixed(1)} mph`;
    }
    return `${kmh.toFixed(1)} km/h`;
  };

  const getWeatherIcon = (category: string, sizeClass = 'w-6 h-6') => {
    switch (category) {
      case 'clear':
        return <Sun className={`${sizeClass} text-amber-400`} />;
      case 'cloudy':
        return <Cloud className={`${sizeClass} text-slate-300`} />;
      case 'rain':
        return <CloudRain className={`${sizeClass} text-blue-400`} />;
      case 'snow':
        return <CloudSnow className={`${sizeClass} text-indigo-200`} />;
      case 'storm':
        return <CloudLightning className={`${sizeClass} text-amber-300`} />;
      case 'fog':
        return <CloudFog className={`${sizeClass} text-slate-400`} />;
      default:
        return <CloudSun className={`${sizeClass} text-amber-300`} />;
    }
  };

  const getAqiStatus = (aqi?: number) => {
    if (aqi === undefined) return { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-800' };
    if (aqi <= 20) return { label: 'Good (Clean Air)', color: 'text-emerald-400', bg: 'bg-emerald-950/60' };
    if (aqi <= 40) return { label: 'Fair', color: 'text-lime-400', bg: 'bg-lime-950/60' };
    if (aqi <= 60) return { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-950/60' };
    if (aqi <= 80) return { label: 'Poor', color: 'text-orange-400', bg: 'bg-orange-950/60' };
    return { label: 'Very Poor', color: 'text-red-400', bg: 'bg-red-950/60' };
  };

  const aqiInfo = getAqiStatus(airQuality?.europeanAqi);

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 text-slate-100 rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm transition-all duration-300">
      {/* Header bar */}
      <div className="p-4 pb-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
            <span>Live Weather</span>
            <span aria-hidden="true">·</span>
            <span className="text-[11px] font-mono text-slate-400">Open-Meteo API</span>
          </div>
          <h2 className="text-base font-semibold text-white truncate" title={weather.locationName}>
            {weather.locationName}
          </h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh weather data"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Main Hero Weather Badge */}
          <div className="p-4 bg-gradient-to-b from-slate-800/40 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold tracking-tight text-white tabular-nums">
                  {toTemp(current.temperature)}
                </div>
                <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                  <span>{current.weatherDescription}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400">Feels {toTemp(current.apparentTemperature)}</span>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
                  {getWeatherIcon(current.weatherDescription.toLowerCase(), 'w-8 h-8')}
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={onNavigateHere}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Directions Here</span>
              </button>
            </div>
          </div>

          {/* Subtabs: Overview | Hourly | 7-Day | Air Quality */}
          <div className="flex items-center px-3 border-y border-slate-800 text-xs bg-slate-900/60">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`py-2 px-2.5 font-medium border-b-2 transition-colors ${
                activeSubTab === 'overview'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveSubTab('hourly')}
              className={`py-2 px-2.5 font-medium border-b-2 transition-colors ${
                activeSubTab === 'hourly'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Hourly
            </button>
            <button
              onClick={() => setActiveSubTab('daily')}
              className={`py-2 px-2.5 font-medium border-b-2 transition-colors ${
                activeSubTab === 'daily'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              7-Day
            </button>
            <button
              onClick={() => setActiveSubTab('air')}
              className={`py-2 px-2.5 font-medium border-b-2 transition-colors ${
                activeSubTab === 'air'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Air Quality
            </button>
          </div>

          {/* Tab 1: Overview Details */}
          {activeSubTab === 'overview' && (
            <div className="p-3.5 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Wind className="w-3.5 h-3.5 text-blue-400" />
                  <span>Wind</span>
                </div>
                <div className="font-semibold text-slate-100 tabular-nums">
                  {toSpeed(current.windSpeed)}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Compass
                    className="w-3 h-3 text-slate-300"
                    style={{ transform: `rotate(${current.windDirection}deg)` }}
                  />
                  <span>{current.windDirection}° Gusts {toSpeed(current.windGusts)}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Humidity</span>
                </div>
                <div className="font-semibold text-slate-100 tabular-nums">
                  {current.humidity}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Precip: {current.precipitation} mm
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>UV Index</span>
                </div>
                <div className="font-semibold text-slate-100 tabular-nums">
                  {current.uvIndex.toFixed(1)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {current.uvIndex < 3 ? 'Low risk' : current.uvIndex < 6 ? 'Moderate' : 'High risk'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pressure</span>
                </div>
                <div className="font-semibold text-slate-100 tabular-nums">
                  {Math.round(current.pressure)} hPa
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Cloud Cover: {current.cloudCover}%
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Hourly Forecast Slider */}
          {activeSubTab === 'hourly' && (
            <div className="p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Next 24 Hours</span>
                <span className="font-mono text-[10px]">Hourly Steps</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {hourly.time.map((timeStr, idx) => {
                  const hourDate = new Date(timeStr);
                  const hourLabel = hourDate.toLocaleTimeString([], { hour: 'numeric' });
                  const temp = hourly.temperature[idx];
                  const rainProb = hourly.precipitationProbability[idx];

                  return (
                    <div
                      key={timeStr}
                      className="flex-shrink-0 flex flex-col items-center p-2 rounded-xl bg-slate-800/50 border border-slate-800 w-16 text-center"
                    >
                      <span className="text-[11px] text-slate-400">{hourLabel}</span>
                      <div className="my-1.5">
                        {getWeatherIcon(hourly.precipitation[idx] > 0 ? 'rain' : 'cloudy', 'w-4 h-4')}
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-slate-100">
                        {toTemp(temp)}
                      </span>
                      {rainProb > 0 && (
                        <span className="text-[10px] text-cyan-400 mt-0.5 font-mono">
                          {rainProb}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: 7-Day Forecast */}
          {activeSubTab === 'daily' && (
            <div className="p-3.5 space-y-1.5 max-h-56 overflow-y-auto">
              {daily.map((day, idx) => {
                const dayDate = new Date(day.date);
                const dayName = idx === 0 ? 'Today' : dayDate.toLocaleDateString([], { weekday: 'short' });

                return (
                  <div
                    key={day.date}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-800/80 text-xs"
                  >
                    <div className="w-14 font-medium text-slate-200">{dayName}</div>
                    <div className="flex items-center gap-1.5 flex-1 px-2">
                      {getWeatherIcon(day.weatherDescription.toLowerCase(), 'w-4 h-4')}
                      <span className="text-slate-400 truncate max-w-[110px] text-[11px]">
                        {day.weatherDescription}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                      <span className="text-slate-400">{toTemp(day.tempMin)}</span>
                      <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                        <div className="absolute inset-y-0 bg-blue-500 rounded-full w-full" />
                      </div>
                      <span className="font-semibold text-slate-100">{toTemp(day.tempMax)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 4: Air Quality */}
          {activeSubTab === 'air' && (
            <div className="p-3.5 space-y-2 text-xs">
              <div className={`p-3 rounded-xl border border-slate-700/60 ${aqiInfo.bg}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-300 font-medium">European Air Quality Index</span>
                  <span className={`font-semibold ${aqiInfo.color} font-mono`}>
                    AQI {airQuality?.europeanAqi ?? 'N/A'}
                  </span>
                </div>
                <div className={`text-sm font-bold ${aqiInfo.color}`}>
                  {aqiInfo.label}
                </div>
              </div>

              {airQuality && (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                    <span className="text-slate-400">PM2.5 Particles</span>
                    <div className="font-semibold font-mono text-slate-200 mt-0.5">
                      {airQuality.pm2_5 ? `${airQuality.pm2_5.toFixed(1)} μg/m³` : 'N/A'}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                    <span className="text-slate-400">PM10 Coarse</span>
                    <div className="font-semibold font-mono text-slate-200 mt-0.5">
                      {airQuality.pm10 ? `${airQuality.pm10.toFixed(1)} μg/m³` : 'N/A'}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                    <span className="text-slate-400">Ozone (O₃)</span>
                    <div className="font-semibold font-mono text-slate-200 mt-0.5">
                      {airQuality.ozone ? `${airQuality.ozone.toFixed(1)} μg/m³` : 'N/A'}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                    <span className="text-slate-400">Nitrogen Dioxide</span>
                    <div className="font-semibold font-mono text-slate-200 mt-0.5">
                      {airQuality.nitrogenDioxide ? `${airQuality.nitrogenDioxide.toFixed(1)} μg/m³` : 'N/A'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
