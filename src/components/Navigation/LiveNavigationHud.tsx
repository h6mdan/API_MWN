import React from 'react';
import { 
  CornerUpRight, 
  CornerUpLeft, 
  ArrowUp, 
  RotateCw, 
  Flag, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  X, 
  Compass, 
  MapPin
} from 'lucide-react';
import { RouteData, RouteStep } from '../../types';
import { formatDistance, formatDuration, formatArrivalTime } from '../../services/routingService';

interface LiveNavigationHudProps {
  route: RouteData;
  currentStepIdx: number;
  onSelectStep: (idx: number) => void;
  isVoiceEnabled: boolean;
  onToggleVoice: () => void;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
  onExitNavigation: () => void;
  onRecenter: () => void;
  useImperial?: boolean;
}

export const LiveNavigationHud: React.FC<LiveNavigationHudProps> = ({
  route,
  currentStepIdx,
  onSelectStep,
  isVoiceEnabled,
  onToggleVoice,
  isAutoPlaying,
  onToggleAutoPlay,
  onExitNavigation,
  onRecenter,
  useImperial = false,
}) => {
  const currentStep: RouteStep = route.steps[currentStepIdx] || route.steps[0];
  const nextStep: RouteStep | undefined = route.steps[currentStepIdx + 1];

  const getManeuverIcon = (step: RouteStep, size = 'w-7 h-7') => {
    const type = step.maneuver.type;
    const mod = step.maneuver.modifier || '';

    if (type === 'arrive') return <Flag className={`${size} text-emerald-300`} />;
    if (type === 'roundabout' || type === 'rotary') return <RotateCw className={`${size} text-emerald-300`} />;
    if (mod.includes('right')) return <CornerUpRight className={`${size} text-white`} />;
    if (mod.includes('left')) return <CornerUpLeft className={`${size} text-white`} />;
    return <ArrowUp className={`${size} text-white`} />;
  };

  // Remaining distance & duration
  const remainingSteps = route.steps.slice(currentStepIdx);
  const remainingDistance = remainingSteps.reduce((acc, s) => acc + s.distance, 0);
  const remainingDuration = remainingSteps.reduce((acc, s) => acc + s.duration, 0);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* Top Banner: Google Maps Dark Green Turn Banner */}
      <div className="pointer-events-auto max-w-lg w-full mx-auto bg-gradient-to-b from-[#064e3b] to-[#043d2e] border border-emerald-600/50 text-white rounded-3xl shadow-2xl p-4 sm:p-5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/40 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
            {getManeuverIcon(currentStep, 'w-8 h-8')}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-2xl font-black tracking-tight tabular-nums text-white">
              {formatDistance(currentStep.distance, useImperial)}
            </div>
            <div className="text-sm font-semibold text-emerald-100 truncate mt-0.5">
              {currentStep.maneuver.instruction || currentStep.name}
            </div>
          </div>

          <button
            onClick={onExitNavigation}
            className="p-2 rounded-full bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 hover:text-white transition-colors shrink-0"
            title="Exit navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Next maneuver sneak-peek */}
        {nextStep && (
          <div className="mt-3 pt-2.5 border-t border-emerald-700/50 flex items-center gap-2 text-xs text-emerald-200">
            <span className="text-emerald-400 font-medium">Then:</span>
            <span className="truncate">{nextStep.maneuver.instruction || nextStep.name}</span>
          </div>
        )}
      </div>

      {/* Floating Center Re-center button */}
      <div className="pointer-events-auto self-end mb-2 mr-2">
        <button
          onClick={onRecenter}
          className="p-3 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 rounded-full shadow-2xl transition-all"
          title="Re-center on vehicle"
        >
          <Compass className="w-6 h-6 text-emerald-400" />
        </button>
      </div>

      {/* Bottom Bar: Google Maps Navigation Bar */}
      <div className="pointer-events-auto max-w-lg w-full mx-auto bg-slate-950/95 border border-slate-800 text-white rounded-3xl shadow-2xl p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-emerald-400 tabular-nums">
              {formatDuration(remainingDuration)}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              <span>{formatDistance(remainingDistance, useImperial)}</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{formatArrivalTime(remainingDuration)} ETA</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Step manual navigation */}
            <button
              onClick={() => onSelectStep(Math.max(0, currentStepIdx - 1))}
              disabled={currentStepIdx === 0}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
              title="Previous maneuver"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleAutoPlay}
              className={`p-2 rounded-xl border transition-colors ${
                isAutoPlaying
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500/50'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
              title={isAutoPlaying ? 'Pause simulation' : 'Auto-simulate drive'}
            >
              {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onSelectStep(Math.min(route.steps.length - 1, currentStepIdx + 1))}
              disabled={currentStepIdx >= route.steps.length - 1}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
              title="Next maneuver"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Voice toggle */}
            <button
              onClick={onToggleVoice}
              className={`p-2 rounded-xl border transition-colors ${
                isVoiceEnabled
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400'
              }`}
              title={isVoiceEnabled ? 'Voice Guidance On' : 'Voice Guidance Muted'}
            >
              {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Red Exit Button */}
            <button
              onClick={onExitNavigation}
              className="py-2 px-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
