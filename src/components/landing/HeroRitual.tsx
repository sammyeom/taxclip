'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, CheckCircle2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect, useCallback } from 'react';

// Animation phases
type Phase = 'snap' | 'auto-sort' | 'result' | 'complete';

// Receipt card for suction animation
function ReceiptCard({
  index,
  isActive
}: {
  index: number;
  isActive: boolean;
}) {
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

// Animated phone with camera
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
    <div className="relative w-[140px] h-[230px] sm:w-[160px] sm:h-[260px]">
      {/* Phone frame */}
      <div className="bg-slate-900 rounded-[20px] sm:rounded-[24px] p-1.5 sm:p-2 shadow-2xl w-full h-full relative overflow-hidden">
        {/* Phone screen */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[14px] sm:rounded-[18px] w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
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
            <div className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-dashed border-cyan-400 rounded-lg flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-600" />
            </div>
          </motion.div>

          {/* Capture button */}
          <motion.div
            animate={isActive ? { scale: [1, 0.9, 1] } : { scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="absolute bottom-3 sm:bottom-4"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-3 sm:border-4 border-cyan-500 bg-white flex items-center justify-center">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-500" />
            </div>
          </motion.div>
        </div>

        {/* Phone notch */}
        <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 w-12 sm:w-14 h-3 sm:h-4 bg-slate-900 rounded-full" />
      </div>
    </div>
  );
}

// Count-up animation hook
function useCountUp(end: number, duration: number, isActive: boolean, decimals: number = 2) {
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

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(end * easeOutQuart);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isActive]);

  return count.toFixed(decimals);
}

export default function HeroRitual() {
  const [phase, setPhase] = useState<Phase>('snap');
  const [progress, setProgress] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);

  const countUpValue = useCountUp(342.50, 1200, phase === 'result' || phase === 'complete', 2);

  // Animation cycle controller
  const runCycle = useCallback(() => {
    // Phase 1: Snap (2 seconds)
    setPhase('snap');
    setProgress(0);

    // Phase 2: Auto-Sort (starts at 2s, progress fills in 1.5s)
    setTimeout(() => {
      setPhase('auto-sort');
      // Animate progress from 0 to 100
      let start = 0;
      const progressInterval = setInterval(() => {
        start += 2;
        setProgress(Math.min(start, 100));
        if (start >= 100) clearInterval(progressInterval);
      }, 30); // 1.5s / 50 steps = 30ms per step
    }, 2000);

    // Phase 3: Result (starts at 3.5s)
    setTimeout(() => {
      setPhase('result');
    }, 3500);

    // Phase 4: Complete badge (starts at 5s)
    setTimeout(() => {
      setPhase('complete');
    }, 5000);

    // Restart cycle (after 8s total - 3s pause at end)
    setTimeout(() => {
      setCycleKey(k => k + 1);
    }, 8000);
  }, []);

  useEffect(() => {
    runCycle();
  }, [cycleKey, runCycle]);

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-8 w-full max-w-[480px] mx-auto lg:mx-0">
      {/* Header: Time badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center mb-4 sm:mb-6"
      >
        <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg text-sm sm:text-base font-mono">
          <span className="text-cyan-400 font-semibold">9:00 AM</span>
          <span className="text-slate-500">→</span>
          <span className="text-green-400 font-semibold">9:05 AM</span>
        </div>
      </motion.div>

      {/* Steps container */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-8">
        {/* Step 1: Snap */}
        <div className={`text-center p-2 sm:p-3 rounded-xl transition-all duration-300 ${
          phase === 'snap' ? 'bg-cyan-50 border-2 border-cyan-200' : 'bg-slate-50 border border-slate-100'
        }`}>
          <div className={`text-xs sm:text-sm font-bold mb-1 ${
            phase === 'snap' ? 'text-cyan-600' : 'text-slate-400'
          }`}>Step 1</div>
          <Badge
            variant="secondary"
            className={`mb-2 text-xs sm:text-sm ${
              phase === 'snap' ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-500'
            }`}
          >
            Snap
          </Badge>
          <div className="flex justify-center">
            <motion.div
              animate={phase === 'snap' ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={{ duration: 0.5, repeat: phase === 'snap' ? 2 : 0 }}
            >
              <Camera className={`w-5 h-5 sm:w-6 sm:h-6 ${
                phase === 'snap' ? 'text-cyan-600' : 'text-slate-400'
              }`} />
            </motion.div>
          </div>
        </div>

        {/* Step 2: Auto-Sort */}
        <div className={`text-center p-2 sm:p-3 rounded-xl transition-all duration-300 ${
          phase === 'auto-sort' ? 'bg-sky-50 border-2 border-sky-200' : 'bg-slate-50 border border-slate-100'
        }`}>
          <div className={`text-xs sm:text-sm font-bold mb-1 ${
            phase === 'auto-sort' ? 'text-sky-600' : 'text-slate-400'
          }`}>Step 2</div>
          <Badge
            variant="secondary"
            className={`mb-2 text-xs sm:text-sm ${
              phase === 'auto-sort' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            Auto-Sort
          </Badge>
          <div className="flex justify-center">
            <motion.div
              animate={phase === 'auto-sort' ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 1.5, ease: 'linear' }}
            >
              <Sparkles className={`w-5 h-5 sm:w-6 sm:h-6 ${
                phase === 'auto-sort' ? 'text-sky-600' : 'text-slate-400'
              }`} />
            </motion.div>
          </div>
        </div>

        {/* Step 3: Export */}
        <div className={`text-center p-2 sm:p-3 rounded-xl transition-all duration-300 ${
          (phase === 'result' || phase === 'complete') ? 'bg-green-50 border-2 border-green-200' : 'bg-slate-50 border border-slate-100'
        }`}>
          <div className={`text-xs sm:text-sm font-bold mb-1 ${
            (phase === 'result' || phase === 'complete') ? 'text-green-600' : 'text-slate-400'
          }`}>Step 3</div>
          <Badge
            variant="secondary"
            className={`mb-2 text-xs sm:text-sm ${
              (phase === 'result' || phase === 'complete') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            Export
          </Badge>
          <div className="flex justify-center">
            <motion.div
              animate={(phase === 'result' || phase === 'complete') ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <CheckCircle2 className={`w-5 h-5 sm:w-6 sm:h-6 ${
                (phase === 'result' || phase === 'complete') ? 'text-green-600' : 'text-slate-400'
              }`} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main visualization area */}
      <div className="relative min-h-[260px] sm:min-h-[300px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Snap Phase: Phone with receipts */}
          {phase === 'snap' && (
            <motion.div
              key="snap"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center"
            >
              <PhoneCapture isActive={phase === 'snap'} />
            </motion.div>
          )}

          {/* Auto-Sort Phase: Progress bar */}
          {phase === 'auto-sort' && (
            <motion.div
              key="auto-sort"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full px-4 sm:px-6"
            >
              <div className="text-center mb-4 sm:mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="inline-block mb-2 sm:mb-3"
                >
                  <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-sky-500" />
                </motion.div>
                <p className="text-base sm:text-lg font-medium text-slate-700">AI Categorizing...</p>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-sm sm:text-base text-slate-600">
                  <span>Processing receipts</span>
                  <span className="font-semibold">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3 sm:h-4" />
                <div className="flex justify-between text-xs sm:text-sm text-slate-400">
                  <span>Meals, Transport, Software...</span>
                  <span>7 items</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Result Phase: Count-up */}
          {(phase === 'result' || phase === 'complete') && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
              className="text-center px-4"
            >
              <div className="mb-3 sm:mb-4">
                <div className="text-sm sm:text-base text-slate-500 uppercase tracking-wider mb-1">This Week's Total</div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#111111]">
                    ${countUpValue}
                  </span>
                </div>
                <div className="text-sm sm:text-base text-slate-400 mt-1">across 7 receipts</div>
              </div>

              {/* Complete Badge */}
              <AnimatePresence>
                {phase === 'complete' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 15
                    }}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-lg"
                  >
                    <motion.span
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                    >
                      🎉
                    </motion.span>
                    <span className="text-base sm:text-lg font-semibold">5-Min Ritual Complete!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
