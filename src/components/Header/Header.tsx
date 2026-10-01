import React from 'react';
import { 
  Compass, 
  MapPin, 
  Layers, 
  Terminal, 
  Navigation, 
  CloudRain, 
  RotateCcw
} from 'lucide-react';
import { BaseMapId, WeatherOverlaySettings } from '../../types';

interface HeaderProps {
  baseMap: BaseMapId;
  onSelectBaseMap: (id: BaseMapId) => void;
  overlays: WeatherOverlaySettings;
  onToggleOverlay: (key: keyof WeatherOverlaySettings, val?: boolean | number) => void;
  activeTab: 'explore' | 'directions' | 'weather';
  onChangeTab: (tab: 'explore' | 'directions' | 'weather') => void;
  onLocateMe: () => void;
  isLocating: boolean;
  onOpenApiInspector: () => void;
  apiLogCount: number;
  useImperial: boolean;
  onToggleUnits: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  baseMap,
  onSelectBaseMap,
  overlays,
  onToggleOverlay,
  activeTab,
  onChangeTab,
  onLocateMe,
  isLocating,
  onOpenApiInspector,
  apiLogCount,
  useImperial,
  onToggleUnits,
}) => {
  return (
    <header className="relative z-30 flex items-center justify-between px-4 lg:px-6 h-14 bg-slate-900 border-b border-slate-800 text-slate-100 select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
          <Compass className="w-5 h-5 text-blue-100" />
        </div>
        <button
          onClick={() => onChangeTab('explore')}
          className="text-base font-semibold tracking-tight text-white hover:text-blue-300 transition-colors cursor-pointer text-left whitespace-nowrap"
        >
          OpenMap & Weather
        </button>
      </div>

      {/* Zone 2: Navigation & Feature Tabs */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
        <button
          onClick={() => onChangeTab('explore')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'explore'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Explore</span>
        </button>

        <button
          onClick={() => onChangeTab('directions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'directions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Navigation</span>
        </button>

        <button
          onClick={() => onChangeTab('weather')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'weather'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <CloudRain className="w-3.5 h-3.5" />
          <span>Apple Weather</span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2">
        {/* Layer Switcher Dropdown */}
        <div className="relative group">
          <button
            title="Change Map Style"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">
              {baseMap === 'osm' ? 'Standard OSM' : baseMap === 'hot' ? 'Humanitarian' : baseMap === 'light' ? 'Clean Gray' : baseMap === 'dark' ? 'Dark Gray' : baseMap === 'satellite' ? 'Satellite' : 'Topographic'}
            </span>
          </button>
          
          <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1.5 hidden group-hover:block z-50">
            <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
              Map Style
            </div>
            {[
              { id: 'osm', label: 'Standard OpenStreetMap' },
              { id: 'hot', label: 'Humanitarian (HOT)' },
              { id: 'light', label: 'Clean Light Canvas' },
              { id: 'dark', label: 'Dark Mode Canvas' },
              { id: 'satellite', label: 'Satellite Imagery' },
              { id: 'topo', label: 'Topographic' },
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => onSelectBaseMap(style.id as BaseMapId)}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                  baseMap === style.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {style.label}
              </button>
            ))}

            <div className="h-px bg-slate-700 my-1" />
            <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
              Overlays
            </div>
            <button
              onClick={() => onToggleOverlay('radar', !overlays.radar)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                overlays.radar ? 'bg-blue-600/30 text-blue-200' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>Rain Radar</span>
              <span className="text-[10px] font-mono">{overlays.radar ? 'ON' : 'OFF'}</span>
            </button>
            <button
              onClick={() => onToggleOverlay('satellite', !overlays.satellite)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                overlays.satellite ? 'bg-blue-600/30 text-blue-200' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>Clouds (Satellite)</span>
              <span className="text-[10px] font-mono">{overlays.satellite ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Locate Me Button */}
        <button
          onClick={onLocateMe}
          disabled={isLocating}
          title="Detect Current Location"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <MapPin className={`w-3.5 h-3.5 text-blue-400 ${isLocating ? 'animate-bounce' : ''}`} />
          <span className="hidden sm:inline">My Location</span>
        </button>

        {/* Units Toggle (°C / °F) */}
        <button
          onClick={onToggleUnits}
          title={`Switch to ${useImperial ? 'Metric (°C, km)' : 'Imperial (°F, mi)'}`}
          className="flex items-center justify-center px-2 py-1.5 text-xs font-mono font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
        >
          {useImperial ? '°F / mi' : '°C / km'}
        </button>

        {/* API Learning Inspector Button */}
        <button
          onClick={onOpenApiInspector}
          title="Inspect Live Free APIs & Network Logs"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 rounded-lg transition-colors whitespace-nowrap"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">API Inspector</span>
          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono rounded">
            {apiLogCount}
          </span>
        </button>
      </div>
    </header>
  );
};
