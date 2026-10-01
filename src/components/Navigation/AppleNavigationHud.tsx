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
  X,
  Compass
} from 'lucide-react';
import { RouteData, RouteStep } from '../../types';
import { formatDistance, formatDuration, formatArrivalTime } from '../../services/routingService';

interface AppleNavigationHudProps {
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

export const AppleNavigationHud: React.FC<AppleNavigationHudProps> = ({
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

  const getManeuverIcon = (step: RouteStep) => {
    const type = step.maneuver.type;
    const mod = step.maneuver.modifier || '';
    if (type === 'arrive') return <Flag className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />;
    if (type === 'roundabout' || type === 'rotary') return <RotateCw className="w-8 h-8 text-amber-500 dark:text-amber-300" />;
    if (mod.includes('right')) return <CornerUpRight className="w-8 h-8 text-blue-600 dark:text-white" />;
    if (mod.includes('left')) return <CornerUpLeft className="w-8 h-8 text-blue-600 dark:text-white" />;
    return <ArrowUp className="w-8 h-8 text-blue-600 dark:text-white" />;
  };

  const remainingSteps = route.steps.slice(currentStepIdx);
  const remainingDistance = remainingSteps.reduce((acc, s) => acc + s.distance, 0);
  const remainingDuration = remainingSteps.reduce((acc, s) => acc + s.duration, 0);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-2 sm:p-4 select-none">
      {/* Top Navigation Card */}
      <div className="pointer-events-auto max-w-md w-full mx-auto bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/15 text-slate-900 dark:text-white rounded-3xl shadow-xl dark:shadow-2xl p-3 sm:p-4 transition-colors duration-300">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 flex items-center justify-center shrink-0">
            {getManeuverIcon(currentStep)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatDistance(currentStep.distance, useImperial)}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 truncate mt-0.5">
              {currentStep.maneuver.instruction || currentStep.name}
            </div>
          </div>

          <button
            onClick={onExitNavigation}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors"
            title="End Navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {nextStep && (
          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Then:</span>
            <span className="truncate">{nextStep.maneuver.instruction || nextStep.name}</span>
          </div>
        )}
      </div>

      {/* Floating Re-center button */}
      <div className="pointer-events-auto self-end mb-2 mr-2">
        <button
          onClick={onRecenter}
          className="p-3 sm:p-3.5 bg-white/95 hover:bg-white text-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800 dark:text-white border border-slate-200/80 dark:border-white/15 rounded-full shadow-xl dark:shadow-2xl transition-all"
          title="Re-center"
        >
          <Compass className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </button>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="pointer-events-auto max-w-md w-full mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/15 text-slate-900 dark:text-white rounded-3xl shadow-xl dark:shadow-2xl p-3 sm:p-4 mb-2 flex items-center justify-between transition-colors duration-300">
        <div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
            {formatDuration(remainingDuration)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            <span>{formatDistance(remainingDistance, useImperial)}</span>
            <span className="mx-1.5">·</span>
            <span>{formatArrivalTime(remainingDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Step simulator */}
          <button
            onClick={onToggleAutoPlay}
            className={`p-2.5 rounded-2xl border transition-colors ${
              isAutoPlaying
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200/80 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/10 dark:text-slate-300'
            }`}
            title={isAutoPlaying ? 'Pause drive simulation' : 'Auto drive simulation'}
          >
            {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onSelectStep(Math.min(route.steps.length - 1, currentStepIdx + 1))}
            disabled={currentStepIdx >= route.steps.length - 1}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-slate-700 disabled:opacity-40 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/10 dark:text-slate-300 transition-colors"
            title="Next turn"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Voice toggle */}
          <button
            onClick={onToggleVoice}
            className={`p-2.5 rounded-2xl border transition-colors ${
              isVoiceEnabled
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-600/30 dark:text-blue-300 dark:border-blue-500/40'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200/80 text-slate-500 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/10 dark:text-slate-400'
            }`}
            title={isVoiceEnabled ? 'Voice Guidance On' : 'Voice Guidance Muted'}
          >
            {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Red End Button */}
          <button
            onClick={onExitNavigation}
            className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-lg transition-all"
          >
            End
          </button>
        </div>
      </div>
    </div>
  );
};
