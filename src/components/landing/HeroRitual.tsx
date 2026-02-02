'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, CheckCircle2, Zap, Loader2, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect, useCallback } from 'react';

// Animation phases
type Phase = 'snap' | 'auto-sort' | 'export' | 'complete';

// Receipt card for suction animation
function ReceiptCard({ index, isActive }: { index: number; isActive: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30, y: 0, scale: 1, rotate: (index - 1) * 12 }}
      animate={isActive ? {
        opacity: [0, 1, 1, 0],
        x: [-30, 0, 40, 80],
        y: [0, 0, -10, 30],
        scale: [1, 1, 0.8, 0.3],
        rotate: [(index - 1) * 12, (index - 1) * 5, 0, 0],
      } : { opacity: 0 }}
      transition={{
        duration: 1.2,
        delay: index * 0.25,
        ease: 'easeInOut',
      }}
      className="absolute"
      style={{
        left: `${15 + index * 12}px`,
        top: `${50 + index * 8}px`,
      }}
    >
      <div className="w-10 h-14 bg-white rounded-lg shadow-lg border border-slate-200 flex items-center justify-center">
        <FileText className="w-5 h-5 text-slate-400" />
      </div>
    </motion.div>
  );
}

// Count-up animation hook
function useCountUp(end: number, duration: number, isActive: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCount(0);
      return;
    }

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(end * easeOutQuart);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isActive]);

  return count.toFixed(2);
}

// Phone with camera capture animation
function PhoneCapture({ isActive }: { isActive: boolean }) {
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 150);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return (
    <div className="relative">
      {/* Phone frame */}
      <div className="bg-slate-900 rounded-[24px] p-2 shadow-2xl w-[160px] h-[240px] sm:w-[180px] sm:h-[270px] relative overflow-hidden">
        {/* Phone screen */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[18px] w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
          {/* Camera flash */}
          <AnimatePresence>
            {showFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white z-20"
              />
            )}
          </AnimatePresence>

          {/* Receipt cards being sucked in */}
          <div className="absolute inset-0">
            <ReceiptCard index={0} isActive={isActive} />
            <ReceiptCard index={1} isActive={isActive} />
            <ReceiptCard index={2} isActive={isActive} />
          </div>

          {/* Camera viewfinder */}
          <motion.div
            animate={isActive ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.8, repeat: isActive ? 2 : 0 }}
            className="relative z-10"
          >
            <div className="w-16 h-16 sm:w-18 sm:h-18 border-2 border-dashed border-cyan-400 rounded-lg flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-600" />
            </div>
          </motion.div>

          {/* Capture button */}
          <motion.div
            animate={isActive ? { scale: [1, 0.9, 1] } : { scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="absolute bottom-4"
          >
            <div className="w-12 h-12 rounded-full border-4 border-cyan-500 bg-white flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-cyan-500" />
            </div>
          </motion.div>
        </div>

        {/* Phone notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-900 rounded-full" />
      </div>

      {/* Capturing receipts status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap"
      >
        <div className="flex items-center gap-2 bg-white border border-cyan-200 rounded-full px-3 py-1.5 shadow-lg">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-4 h-4 text-cyan-500" />
          </motion.div>
          <span className="text-xs sm:text-sm text-cyan-600 font-medium">
            Capturing receipts...
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

  const countUpValue = useCountUp(342.50, 1200, phase === 'auto-sort' || phase === 'export' || phase === 'complete');

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
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8 w-full max-w-[500px] mx-auto lg:mx-0">
      {/* Header: 5-Minute Sprint with Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-500" />
            <span className="text-base sm:text-lg font-bold text-cyan-600">Done in 5 mins</span>
          </div>
          <div className="w-24 sm:w-32">
            <Progress value={headerProgress} className="h-2 bg-cyan-100 [&>div]:bg-cyan-500" />
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 ml-7">Your weekly bookkeeping sprint</p>
      </motion.div>

      {/* Steps container */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
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
            getStepState(1) === 'active' ? 'text-cyan-600' : 'text-slate-600'
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
            getStepState(2) === 'active' ? 'text-cyan-600' : 'text-slate-600'
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
              ? 'text-cyan-600'
              : getStepState(3) === 'complete'
                ? 'text-green-600'
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

      {/* Main visualization area */}
      <div className="relative min-h-[300px] sm:min-h-[340px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100">
        <AnimatePresence mode="wait">
          {/* Step 1: Phone with receipts animation */}
          {phase === 'snap' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center pt-4"
            >
              <PhoneCapture isActive={phase === 'snap'} />
            </motion.div>
          )}

          {/* Step 2: Count-up numbers */}
          {phase === 'auto-sort' && (
            <motion.div
              key="counting"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
              className="text-center px-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="inline-block mb-4"
              >
                <Sparkles className="w-12 h-12 text-cyan-500" />
              </motion.div>
              <p className="text-lg font-medium text-slate-600 mb-4">AI Categorizing...</p>
              <div className="mb-2">
                <span className="text-5xl sm:text-6xl font-extrabold text-slate-900">
                  ${countUpValue}
                </span>
              </div>
              <div className="text-sm text-slate-400">7 receipts processed</div>
            </motion.div>
          )}

          {/* Step 3 & Complete: Results */}
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
                  <span className="text-5xl sm:text-6xl font-extrabold text-slate-900">$342.50</span>
                </div>
                <div className="text-sm text-slate-400 mt-2">across 7 receipts</div>
              </div>

              {phase === 'complete' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2.5 rounded-full shadow-lg"
                >
                  <span>🎉</span>
                  <span className="text-base font-semibold">Done! Ready to export</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
