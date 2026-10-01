import React, { useState } from 'react';
import { 
  Compass, 
  Search, 
  Navigation, 
  CloudSun, 
  CloudRain, 
  Layers, 
  MapPin, 
  Terminal, 
  Sun,
  Moon,
  X
} from 'lucide-react';
import { BaseMapId } from '../../types';

interface AppleSidebarProps {
  activePanel: 'search' | 'directions' | 'weather' | 'none';
  onSelectPanel: (panel: 'search' | 'directions' | 'weather' | 'none') => void;
  baseMap: BaseMapId;
  onSelectBaseMap: (id: BaseMapId) => void;
  isRadarActive: boolean;
  onToggleRadar: () => void;
  onLocateMe: () => void;
  isLocating: boolean;
  useImperial: boolean;
  onToggleUnits: () => void;
  onOpenApiInspector: () => void;
  apiLogCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const AppleSidebar: React.FC<AppleSidebarProps> = ({
  activePanel,
  onSelectPanel,
  baseMap,
  onSelectBaseMap,
  isRadarActive,
  onToggleRadar,
  onLocateMe,
  isLocating,
  useImperial,
  onToggleUnits,
  onOpenApiInspector,
  apiLogCount,
  theme,
  onToggleTheme,
}) => {
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  return (
    <>
      {/* 
        Responsive Navigation Dock:
        - Desktop (md:): Sleek vertical sidebar dock on the left
        - Mobile (<md): Sleek bottom navigation bar dock with safe-area padding
      */}
      <aside className="fixed md:relative bottom-0 md:bottom-auto left-0 right-0 md:right-auto z-40 md:z-30 w-full md:w-16 h-16 md:h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t md:border-t-0 md:border-r border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white flex flex-row md:flex-col items-center justify-around md:justify-between px-2 md:px-2 py-1 md:py-4 select-none shrink-0 shadow-2xl md:shadow-lg transition-colors duration-300">
        
        {/* Top/Primary Section: Compass Logo & Main Feature Panels */}
        <div className="flex flex-row md:flex-col items-center justify-around md:justify-start gap-1 sm:gap-2 md:gap-3 w-full md:w-full">
          {/* Brand compass icon (hidden on small mobile to conserve horizontal space) */}
          <div 
            onClick={() => onSelectPanel(activePanel === 'search' ? 'none' : 'search')}
            className="hidden md:flex w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center text-white shadow-lg shadow-blue-500/30 cursor-pointer hover:scale-105 active:scale-95 transition-all mb-1 shrink-0"
            title="OpenMap & Weather Navigator"
          >
            <Compass className="w-6 h-6 text-white" />
          </div>

          {/* 1. Search & Explore Button */}
          <button
            onClick={() => onSelectPanel(activePanel === 'search' ? 'none' : 'search')}
            className={`min-w-[48px] h-11 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all px-1.5 ${
              activePanel === 'search'
                ? 'bg-blue-600 text-white shadow-md md:shadow-lg md:shadow-blue-600/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title="Search Places, Shops & Streets"
            aria-label="Search"
          >
            <Search className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-medium tracking-tight">Search</span>
          </button>

          {/* 2. Directions & Routing Button */}
          <button
            onClick={() => onSelectPanel(activePanel === 'directions' ? 'none' : 'directions')}
            className={`min-w-[48px] h-11 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all px-1.5 ${
              activePanel === 'directions'
                ? 'bg-blue-600 text-white shadow-md md:shadow-lg md:shadow-blue-600/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title="Directions & Turn-by-Turn Navigation"
            aria-label="Directions"
          >
            <Navigation className="w-5 h-5 fill-current shrink-0" />
            <span className="text-[9px] font-medium tracking-tight">Route</span>
          </button>

          {/* 3. Weather Button */}
          <button
            onClick={() => onSelectPanel(activePanel === 'weather' ? 'none' : 'weather')}
            className={`min-w-[48px] h-11 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all px-1.5 ${
              activePanel === 'weather'
                ? 'bg-blue-600 text-white shadow-md md:shadow-lg md:shadow-blue-600/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title="Weather Report & 7-Day Forecast"
            aria-label="Weather"
          >
            <CloudSun className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-medium tracking-tight">Weather</span>
          </button>

          {/* 4. Precipitation Radar Toggle Button */}
          <button
            onClick={onToggleRadar}
            className={`relative min-w-[48px] h-11 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all px-1.5 ${
              isRadarActive
                ? 'bg-sky-600 text-white shadow-md md:shadow-lg md:shadow-sky-600/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title={isRadarActive ? 'Disable Precipitation Radar' : 'Enable Precipitation Radar'}
            aria-label="Radar"
          >
            <CloudRain className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-medium tracking-tight">Radar</span>
            {isRadarActive && (
              <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-cyan-300 animate-ping" />
            )}
          </button>
        </div>

        {/* Bottom / Auxiliary Section: Theme, Layers, GPS, Units, API Inspector */}
        <div className="flex flex-row md:flex-col items-center justify-around md:justify-start gap-1 sm:gap-2 md:gap-2.5 w-auto md:w-full md:pt-3 md:border-t md:border-slate-200/80 md:dark:border-white/10 relative">
          
          {/* Map Layers Popover Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-colors ${
                showLayerMenu
                  ? 'bg-slate-200 dark:bg-white/20 text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              title="Map Style Layers"
              aria-label="Map Layers"
            >
              <Layers className="w-5 h-5" />
            </button>

            {/* Layer Options Popover (Responsive: above dock on mobile, right on desktop) */}
            {showLayerMenu && (
              <div className="fixed md:absolute bottom-18 md:bottom-0 left-4 md:left-14 right-4 md:right-auto md:w-52 bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-slate-200/80 dark:border-white/15 rounded-2xl shadow-2xl p-2.5 z-50 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between px-2 py-1 mb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Map Style Layers</span>
                  <button
                    onClick={() => setShowLayerMenu(false)}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-md"
                    aria-label="Close Map Styles"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-0.5">
                  {[
                    { id: 'street_en', label: 'Standard (English Labels)' },
                    { id: 'light', label: 'Calm Light Mode' },
                    { id: 'dark', label: 'Night Dark Mode' },
                    { id: 'osm', label: 'OpenStreetMap Standard' },
                    { id: 'hot', label: 'Humanitarian OSM (HOT)' },
                    { id: 'satellite', label: 'Satellite Imagery' },
                    { id: 'topo', label: 'Topographic Relief' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => {
                        onSelectBaseMap(style.id as BaseMapId);
                        setShowLayerMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between ${
                        baseMap === style.id
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{style.label}</span>
                      {baseMap === style.id && <span className="text-white text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle (Calm Light vs Dark Mode) */}
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-105"
            title={theme === 'dark' ? 'Switch to Calm Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-700" />
            )}
          </button>

          {/* GPS Location Button */}
          <button
            onClick={onLocateMe}
            disabled={isLocating}
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            title="Current GPS Location"
            aria-label="Current Location"
          >
            <MapPin className={`w-5 h-5 ${isLocating ? 'animate-bounce text-blue-500' : ''}`} />
          </button>

          {/* Metric / Imperial Unit Toggle */}
          <button
            onClick={onToggleUnits}
            className="hidden sm:flex w-9 h-7 md:w-10 md:h-8 rounded-xl items-center justify-center text-[10px] md:text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-300/80 dark:border-white/10"
            title={useImperial ? 'Switch to Metric (°C, km)' : 'Switch to Imperial (°F, mi)'}
            aria-label="Toggle Units"
          >
            {useImperial ? '°F' : '°C'}
          </button>

          {/* API Learning Inspector Button */}
          <button
            onClick={onOpenApiInspector}
            className="relative w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors border border-emerald-600/30 dark:border-emerald-800/40"
            title="API Learning Inspector & Logs (All 9 APIs Hit)"
            aria-label="API Inspector"
          >
            <Terminal className="w-4 h-4 md:w-5 md:h-5" />
            <span className="absolute -top-1 -right-1 text-[9px] font-mono bg-emerald-500 text-slate-950 font-bold px-1 rounded-full shadow-sm">
              {apiLogCount}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
