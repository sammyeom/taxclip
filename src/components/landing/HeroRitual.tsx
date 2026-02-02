'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, CheckCircle2, Zap, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect, useCallback } from 'react';

// Animation phases
type Phase = 'snap' | 'auto-sort' | 'export' | 'complete';

// Phone with camera capture animation
function PhoneCapture({ phase }: { phase: Phase }) {
  return (
    <div className="relative">
      {/* Phone frame */}
      <div className="bg-slate-900 rounded-[24px] p-2 shadow-2xl w-[140px] h-[200px] sm:w-[160px] sm:h-[220px] relative overflow-hidden">
        {/* Phone screen */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[18px] w-full h-full flex flex-col items-center justify-center relative">
          {/* Camera viewfinder */}
          <motion.div
            animate={phase === 'snap' ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 1, repeat: phase === 'snap' ? Infinity : 0 }}
            className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-dashed border-cyan-400 rounded-lg flex items-center justify-center bg-white/60"
          >
            <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-600" />
          </motion.div>

          {/* Capture button */}
          <div className="absolute bottom-3 sm:bottom-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-4 border-cyan-500 bg-white flex items-center justify-center">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-500" />
            </div>
          </div>
        </div>

        {/* Phone notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-slate-900 rounded-full" />
      </div>

      {/* Capturing receipts status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap"
      >
        <div className="flex items-center gap-2 bg-white border border-cyan-200 rounded-full px-3 py-1.5 shadow-lg">
          {phase === 'snap' ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-4 h-4 text-cyan-500" />
            </motion.div>
          ) : (
            <CheckCircle2 className="w-4 h-4 text-cyan-500" />
          )}
          <span className="text-xs sm:text-sm text-cyan-600 font-medium">
            {phase === 'snap' ? 'Capturing receipts...' : 'Captured!'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export default function HeroRitual() {
  const [phase, setPhase] = useState<Phase>('snap');
  const [headerProgress, setHeaderProgress] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);

  // Animation cycle controller
  const runCycle = useCallback(() => {
    // Reset
    setPhase('snap');
    setHeaderProgress(0);

    // Animate header progress to 80%
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 1;
      setHeaderProgress(Math.min(progress, 80));
      if (progress >= 80) clearInterval(progressInterval);
    }, 50);

    // Phase 2: Auto-Sort (starts at 2.5s)
    setTimeout(() => {
      setPhase('auto-sort');
    }, 2500);

    // Phase 3: Export (starts at 5s)
    setTimeout(() => {
      setPhase('export');
    }, 5000);

    // Phase 4: Complete (starts at 6.5s)
    setTimeout(() => {
      setPhase('complete');
      setHeaderProgress(100);
    }, 6500);

    // Restart cycle (after 10s)
    setTimeout(() => {
      setCycleKey(k => k + 1);
    }, 10000);
  }, []);

  useEffect(() => {
    runCycle();
  }, [cycleKey, runCycle]);

  // Determine step states based on phase
  const getStepState = (step: number) => {
    if (step === 1) {
      return phase === 'snap' ? 'active' : 'complete';
    }
    if (step === 2) {
      if (phase === 'snap') return 'pending';
      if (phase === 'auto-sort') return 'active';
      return 'complete';
    }
    if (step === 3) {
      if (phase === 'snap' || phase === 'auto-sort') return 'pending';
      if (phase === 'export') return 'active';
      return 'complete';
    }
    return 'pending';
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 w-full max-w-[420px] mx-auto lg:mx-0">
      {/* Header: 5-Minute Sprint with Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 sm:mb-6"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-500" />
            <span className="text-base sm:text-lg font-bold text-cyan-600">Done in 5 mins</span>
          </div>
          <div className="w-24 sm:w-28">
            <Progress value={headerProgress} className="h-2 bg-cyan-100 [&>div]:bg-cyan-500" />
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 ml-7">Your weekly bookkeeping sprint</p>
      </motion.div>

      {/* Steps container */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
        {/* Step 1: Snap */}
        <div className={`text-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 ${
          getStepState(1) === 'active'
            ? 'border-cyan-400 bg-cyan-50'
            : getStepState(1) === 'complete'
              ? 'border-cyan-200 bg-white'
              : 'border-slate-100 bg-slate-50'
        }`}>
          <div className={`text-xs font-bold mb-1.5 ${
            getStepState(1) === 'active' ? 'text-cyan-600' : 'text-slate-400'
          }`}>Step 1</div>
          <div className={`text-sm font-semibold mb-2 ${
            getStepState(1) === 'active' ? 'text-cyan-700' : 'text-slate-600'
          }`}>Snap</div>
          <div className="flex justify-center">
            {getStepState(1) === 'complete' ? (
              <CheckCircle2 className="w-6 h-6 text-cyan-500" />
            ) : (
              <Camera className={`w-6 h-6 ${
                getStepState(1) === 'active' ? 'text-cyan-600' : 'text-slate-400'
              }`} />
            )}
          </div>
        </div>

        {/* Step 2: Auto-Sort */}
        <div className={`text-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 ${
          getStepState(2) === 'active'
            ? 'border-cyan-400 bg-cyan-50'
            : getStepState(2) === 'complete'
              ? 'border-cyan-200 bg-white'
              : 'border-slate-100 bg-slate-50'
        }`}>
          <div className={`text-xs font-bold mb-1.5 ${
            getStepState(2) === 'active' ? 'text-cyan-600' : 'text-slate-400'
          }`}>Step 2</div>
          <div className={`text-sm font-semibold mb-2 ${
            getStepState(2) === 'active' ? 'text-cyan-700' : 'text-slate-600'
          }`}>Auto-Sort</div>
          <div className="flex justify-center">
            {getStepState(2) === 'complete' ? (
              <CheckCircle2 className="w-6 h-6 text-cyan-500" />
            ) : getStepState(2) === 'active' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-6 h-6 text-cyan-600" />
              </motion.div>
            ) : (
              <Sparkles className="w-6 h-6 text-slate-400" />
            )}
          </div>
        </div>

        {/* Step 3: Export */}
        <div className={`text-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 ${
          getStepState(3) === 'active'
            ? 'border-cyan-400 bg-cyan-50'
            : getStepState(3) === 'complete'
              ? 'border-green-200 bg-green-50'
              : 'border-slate-100 bg-slate-50'
        }`}>
          <div className={`text-xs font-bold mb-1.5 ${
            getStepState(3) === 'active'
              ? 'text-cyan-600'
              : getStepState(3) === 'complete'
                ? 'text-green-600'
                : 'text-slate-400'
          }`}>{getStepState(3) === 'active' ? 'Processing...' : 'Step 3'}</div>
          <div className={`text-sm font-semibold mb-2 ${
            getStepState(3) === 'active'
              ? 'text-cyan-700'
              : getStepState(3) === 'complete'
                ? 'text-green-700'
                : 'text-slate-600'
          }`}>Export</div>
          <div className="flex justify-center">
            {getStepState(3) === 'complete' ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </motion.div>
            ) : getStepState(3) === 'active' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-6 h-6 text-cyan-600" />
              </motion.div>
            ) : (
              <CheckCircle2 className="w-6 h-6 text-slate-300" />
            )}
          </div>
        </div>
      </div>

      {/* Main visualization area - Phone */}
      <div className="relative min-h-[260px] sm:min-h-[280px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100">
        <AnimatePresence mode="wait">
          {(phase === 'snap' || phase === 'auto-sort') && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center pt-4"
            >
              <PhoneCapture phase={phase} />
            </motion.div>
          )}

          {(phase === 'export' || phase === 'complete') && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
              className="text-center px-4"
            >
              <div className="mb-4">
                <div className="text-sm text-slate-500 uppercase tracking-wider mb-2">This Week's Total</div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl sm:text-5xl font-extrabold text-slate-900">$342.50</span>
                </div>
                <div className="text-sm text-slate-400 mt-1">across 7 receipts</div>
              </div>

              {phase === 'complete' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full shadow-lg"
                >
                  <span>🎉</span>
                  <span className="text-sm sm:text-base font-semibold">Done! Ready to export</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
