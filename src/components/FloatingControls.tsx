import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Compass,
  Eye,
  EyeOff,
  Activity,
  HelpCircle,
  X,
  Share2,
  Sparkles,
  GitBranch
} from 'lucide-react';
import { CanvasViewport } from '../types';

interface FloatingControlsProps {
  viewport: CanvasViewport;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  showLines: boolean;
  onToggleLines: () => void;
  starsCount: number;
  edgesCount: number;
}

export const FloatingControls: React.FC<FloatingControlsProps> = ({
  viewport,
  onZoomIn,
  onZoomOut,
  onResetView,
  showLabels,
  onToggleLabels,
  showLines,
  onToggleLines,
  starsCount,
  edgesCount,
}) => {
  const [showHelp, setShowHelp] = useState(false);

  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <>
      {/* Bottom Floating Toolbar */}
      <div
        id="floating-canvas-controls"
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 dark:bg-[#0c0d1c]/80 border border-slate-200 dark:border-white/15 shadow-[0_8px_30px_rgba(15,23,42,0.1)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl text-slate-800 dark:text-slate-200"
      >
        {/* Zoom Out Button */}
        <button
          id="btn-zoom-out"
          onClick={onZoomOut}
          title="Zoom Out"
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Zoom Level Indicator / Reset */}
        <button
          id="btn-zoom-reset"
          onClick={onResetView}
          title="Reset Cosmos View (100%)"
          className="px-2.5 py-1 text-xs font-mono font-medium rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300" />
          <span>{zoomPercent}%</span>
        </button>

        {/* Zoom In Button */}
        <button
          id="btn-zoom-in"
          onClick={onZoomIn}
          title="Zoom In"
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-0.5" />

        {/* Toggle Labels */}
        <button
          id="btn-toggle-labels"
          onClick={onToggleLabels}
          title={showLabels ? 'Hide Star Titles' : 'Show Star Titles'}
          className={`p-2 rounded-xl transition-all cursor-pointer backdrop-blur-md ${
            showLabels
              ? 'bg-teal-500 text-white shadow-xs dark:bg-teal-400/20 dark:text-teal-300 dark:border dark:border-teal-400/40 dark:shadow-[0_0_12px_rgba(79,209,197,0.35)]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10'
          }`}
        >
          {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        {/* Toggle Constellation Lines */}
        <button
          id="btn-toggle-lines"
          onClick={onToggleLines}
          title={showLines ? 'Hide Constellation Lines' : 'Show Constellation Lines'}
          className={`p-2 rounded-xl transition-all cursor-pointer backdrop-blur-md ${
            showLines
              ? 'bg-indigo-600 text-white shadow-xs dark:bg-purple-400/20 dark:text-purple-300 dark:border dark:border-purple-400/40 dark:shadow-[0_0_12px_rgba(167,139,250,0.35)]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10'
          }`}
        >
          <GitBranch className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-0.5" />

        {/* Help / Guide button */}
        <button
          id="btn-toggle-help"
          onClick={() => setShowHelp(!showHelp)}
          title="Asterful Guide & Shortcuts"
          className={`p-2 rounded-xl transition-all cursor-pointer backdrop-blur-md ${
            showHelp
              ? 'bg-pink-600 text-white shadow-xs dark:bg-pink-400/20 dark:text-pink-300 dark:border dark:border-pink-400/40 dark:shadow-[0_0_12px_rgba(244,114,182,0.35)]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Left Quick Status Pill */}
      <div className="fixed bottom-5 left-5 z-20 hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-[#0c0d1c]/80 border border-slate-200 dark:border-white/12 text-xs font-medium text-slate-700 dark:text-slate-300 pointer-events-none select-none shadow-[0_4px_16px_rgba(15,23,42,0.06)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
        <span className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(79,209,197,0.8)]" />
        <span>{starsCount} stars</span>
        <span className="text-slate-400 dark:text-slate-500">•</span>
        <span>{edgesCount} active links</span>
      </div>

      {/* Cosmic Navigation Guide Modal / Popover */}
      {showHelp && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-80 sm:w-96 p-4.5 rounded-2xl bg-white dark:bg-[#0c0d1c]/95 border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 shadow-xl dark:shadow-2xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 dark:text-teal-300" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Cosmic Navigation Guide
              </h4>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-800 dark:text-teal-300 border border-slate-300 dark:border-white/10 shrink-0">
                Drag / Touch
              </span>
              <span>Pan smoothly across the infinite cosmos</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-800 dark:text-teal-300 border border-slate-300 dark:border-white/10 shrink-0">
                Scroll / Pinch
              </span>
              <span>Zoom in to inspect details or zoom out for the macro constellation</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-800 dark:text-teal-300 border border-slate-300 dark:border-white/10 shrink-0">
                Click Star
              </span>
              <span>Open the insight drawer and highlight connected ideas</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-800 dark:text-teal-300 border border-slate-300 dark:border-white/10 shrink-0">
                Double-Click
              </span>
              <span>Instantly ignite a new star at that position in space</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-800 dark:text-pink-300 border border-slate-300 dark:border-white/10 shrink-0">
                Remix Button
              </span>
              <span>Evolve an idea with a glowing pulsating lineage line</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
