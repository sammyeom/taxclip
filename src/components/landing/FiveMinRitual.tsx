'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Smartphone, FileText, Tags, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect } from 'react';

// Receipt card component for the suction animation
function ReceiptCard({ delay, index }: { delay: number; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: (index - 1) * 8 }}
      animate={{
        opacity: [1, 1, 0],
        x: [0, 20, 60],
        y: [0, -10, 20],
        scale: [1, 0.9, 0.3],
        rotate: [(index - 1) * 8, 0, 0],
      }}
      transition={{
        duration: 1.5,
        delay: delay,
        repeat: Infinity,
        repeatDelay: 4,
        ease: 'easeInOut',
      }}
      className="absolute"
      style={{
        left: `${10 + index * 8}px`,
        top: `${40 + index * 5}px`,
      }}
    >
      <div className="w-10 h-14 bg-white rounded shadow-md border border-slate-200 flex items-center justify-center">
        <FileText className="w-5 h-5 text-slate-400" />
      </div>
    </motion.div>
  );
}

// Animated phone with camera capture effect
function PhoneCapture() {
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 200);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      {/* Phone frame */}
      <div className="bg-slate-900 rounded-[24px] p-2 shadow-2xl w-[140px] h-[240px] relative overflow-hidden">
        {/* Phone screen */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[18px] w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
          {/* Camera flash effect */}
          <AnimatePresence>
            {showFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white z-20"
              />
            )}
          </AnimatePresence>

          {/* Receipt cards being sucked in */}
          <div className="absolute inset-0">
            <ReceiptCard delay={0} index={0} />
            <ReceiptCard delay={0.3} index={1} />
            <ReceiptCard delay={0.6} index={2} />
          </div>

          {/* Camera viewfinder */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative z-10"
          >
            <div className="w-20 h-20 border-2 border-dashed border-cyan-400 rounded-lg flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <Camera className="w-8 h-8 text-cyan-600" />
            </div>
          </motion.div>

          {/* Capture button */}
          <motion.div
            animate={{ scale: [1, 0.95, 1] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
            className="absolute bottom-4"
          >
            <div className="w-12 h-12 rounded-full border-4 border-cyan-500 bg-white flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-cyan-500" />
            </div>
          </motion.div>
        </div>

        {/* Phone notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-900 rounded-full" />
      </div>

      {/* Success indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg z-30"
      >
        <CheckCircle2 className="w-4 h-4" />
      </motion.div>
    </div>
  );
}

// Auto-sort visualization
function AutoSortVisualization() {
  const categories = [
    { name: 'Meals', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🍽️' },
    { name: 'Transport', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🚗' },
    { name: 'Software', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '💻' },
  ];

  return (
    <div className="space-y-3">
      {categories.map((cat, i) => (
        <motion.div
          key={cat.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.8 + i * 0.2 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cat.color}`}
        >
          <span className="text-lg">{cat.icon}</span>
          <span className="text-sm font-medium">{cat.name}</span>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, delay: 1.2 + i * 0.2 }}
            className="flex-1 h-1.5 bg-current/20 rounded-full overflow-hidden"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${70 + i * 10}%` }}
              transition={{ duration: 0.6, delay: 1.4 + i * 0.2 }}
              className="h-full bg-current/40 rounded-full"
            />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

// Results display with bold numbers
function ResultsDisplay() {
  return (
    <div className="space-y-4">
      {/* Receipts count */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.5 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"
      >
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Today</div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-[#111111]">7</span>
          <span className="text-sm text-slate-400 font-normal">receipts</span>
        </div>
      </motion.div>

      {/* Total amount */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.7 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"
      >
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">This Week</div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-[#111111]">$342</span>
          <span className="text-2xl font-extrabold text-[#111111]">.50</span>
          <span className="text-sm text-slate-400 font-normal ml-1">total</span>
        </div>
      </motion.div>

      {/* AI status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.9 }}
        className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl p-4 border border-cyan-200"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-semibold text-cyan-600">100% Auto-categorized</span>
        </div>
        <Progress value={100} className="h-1.5 mt-2" />
      </motion.div>
    </div>
  );
}

export default function FiveMinRitual() {
  return (
    <section className="py-16 sm:py-24 bg-[#F9FAFB]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with time badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-12"
        >
          {/* Time flow badge */}
          <div className="inline-flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-xl mb-3">
            <span className="text-cyan-400 font-mono font-semibold">9:00 AM</span>
            <span className="text-slate-500">→</span>
            <span className="text-green-400 font-mono font-semibold">9:05 AM</span>
            <span className="text-slate-400 text-xs italic ml-2">(Time for coffee ☕)</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 text-center">
            Your Weekly 5-Minute Ritual
          </h2>
        </motion.div>

        {/* Main content card */}
        <Card className="bg-white border-slate-200 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="grid lg:grid-cols-3 gap-0">
              {/* Step 1: Snap */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className="bg-cyan-100 text-cyan-600 border-cyan-200">
                    Step 1
                  </Badge>
                  <span className="text-sm font-semibold text-slate-900">Snap</span>
                </div>

                <div className="flex justify-center mb-4">
                  <PhoneCapture />
                </div>

                <p className="text-sm text-slate-600 text-center">
                  Take photos of your receipts. AI reads everything instantly.
                </p>
              </motion.div>

              {/* Step 2: Auto-Sort */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className="bg-sky-100 text-sky-700 border-sky-200">
                    Step 2
                  </Badge>
                  <span className="text-sm font-semibold text-slate-900">Auto-Sort</span>
                </div>

                <div className="flex justify-center mb-4">
                  <div className="w-full max-w-[200px]">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.6 }}
                      className="flex items-center gap-2 mb-4 justify-center"
                    >
                      <Tags className="w-5 h-5 text-sky-600" />
                      <span className="text-xs text-slate-500">AI categorizing...</span>
                    </motion.div>
                    <AutoSortVisualization />
                  </div>
                </div>

                <p className="text-sm text-slate-600 text-center">
                  Smart AI learns your patterns and auto-categorizes.
                </p>
              </motion.div>

              {/* Results Section */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-white"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                    Done!
                  </Badge>
                  <span className="text-sm font-semibold text-slate-900">Results</span>
                </div>

                <ResultsDisplay />

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 2.2 }}
                  className="text-sm text-slate-600 text-center mt-4"
                >
                  Ready to export to QuickBooks or Excel.
                </motion.p>
              </motion.div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom flow indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex items-center justify-center gap-4 mt-8"
        >
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
              <Camera className="w-4 h-4 text-cyan-600" />
            </div>
            <span>Capture</span>
          </div>

          <div className="w-12 h-px bg-gradient-to-r from-cyan-300 to-sky-300" />

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sky-600" />
            </div>
            <span>AI Process</span>
          </div>

          <div className="w-12 h-px bg-gradient-to-r from-sky-300 to-green-300" />

          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <span>Done!</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
