import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Sliders } from 'lucide-react';
import { RadarFrame } from '../../types';

interface RadarControlsProps {
  frames: RadarFrame[];
  currentIndex: number;
  onSelectIndex: (idx: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  opacity: number;
  onChangeOpacity: (opacity: number) => void;
  isForecast?: boolean;
}

export const RadarControls: React.FC<RadarControlsProps> = ({
  frames,
  currentIndex,
  onSelectIndex,
  isPlaying,
  onTogglePlay,
  opacity,
}) => {
  if (!frames || frames.length === 0) return null;

  const currentFrame = frames[currentIndex] || frames[0];
  const frameDate = new Date(currentFrame.time * 1000);
  const now = Date.now();
  const diffMinutes = Math.round((currentFrame.time * 1000 - now) / 60000);
  const isFuture = diffMinutes > 0;

  const timeLabel = isFuture
    ? `Forecast (+${diffMinutes}m)`
    : diffMinutes === 0
    ? 'Now (Live)'
    : `${Math.abs(diffMinutes)}m ago`;

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl p-3 shadow-xl dark:shadow-2xl flex flex-col gap-2 max-w-md w-full transition-colors duration-300">
      {/* Top row: Status, Time, and Opacity */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Radar & Precipitation</span>
          <span className="text-[11px] font-mono text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-400 dark:bg-blue-950/80 dark:border-blue-800/40 px-1.5 py-0.5 rounded">
            {timeLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span>{frameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Playback Controls & Timeline Slider */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
          title="Previous frame"
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause' : 'Play animation'}
          className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>

        <button
          onClick={() => onSelectIndex(Math.min(frames.length - 1, currentIndex + 1))}
          title="Next frame"
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {/* Timeline slider */}
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={currentIndex}
          onChange={(e) => onSelectIndex(parseInt(e.target.value, 10))}
          className="flex-1 accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
        />

        {/* Opacity indicator */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] pl-1 font-mono">
          <Sliders className="w-3 h-3 text-slate-400" />
          <span>{Math.round(opacity * 100)}%</span>
        </div>
      </div>

      {/* Radar precipitation color legend */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
        <span>Intensity:</span>
        <div className="flex items-center gap-1">
          <span>Light</span>
          <div className="h-2 w-28 rounded-full bg-gradient-to-r from-[#00ffff] via-[#ffff00] via-[#ff0000] to-[#ff00ff]" />
          <span>Heavy / Hail</span>
        </div>
      </div>
    </div>
  );
};
