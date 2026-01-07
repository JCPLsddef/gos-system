'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_LINES = [
  'Initializing systems...',
  'Syncing battlefronts...',
  'Loading missions engine...',
  'Calibrating war room...',
  'Establishing command link...',
  'Ready.',
];

const LINE_DELAY = 250;
const FADE_OUT_DELAY = 400;
const TOTAL_DURATION = BOOT_LINES.length * LINE_DELAY + FADE_OUT_DELAY + 800;

type BootSequenceProps = {
  onComplete: () => void;
};

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    if (mediaQuery.matches) {
      setTimeout(onComplete, 500);
      return;
    }

    const lineTimers: NodeJS.Timeout[] = [];

    BOOT_LINES.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleLines(index + 1);
      }, index * LINE_DELAY + 300);
      lineTimers.push(timer);
    });

    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, BOOT_LINES.length * LINE_DELAY + FADE_OUT_DELAY);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, TOTAL_DURATION);

    return () => {
      lineTimers.forEach(clearTimeout);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (prefersReducedMotion) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">GOS Command Center</h1>
          <p className="text-slate-400">AI Life OS</p>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 pointer-events-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black" />

          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }} />
          </div>

          <div className="relative z-10 text-center max-w-lg px-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                GOS Command Center
              </h1>
              <p className="text-slate-500 text-lg mb-12 tracking-widest uppercase">
                AI Life OS
              </p>
            </motion.div>

            <div className="text-left font-mono text-sm space-y-2">
              {BOOT_LINES.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{
                    opacity: visibleLines > index ? 1 : 0,
                    x: visibleLines > index ? 0 : -10,
                  }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    visibleLines > index
                      ? index === BOOT_LINES.length - 1
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                      : 'bg-slate-700'
                  }`} />
                  <span className={
                    index === BOOT_LINES.length - 1
                      ? 'text-green-400 font-semibold'
                      : 'text-slate-400'
                  }>
                    {line}
                  </span>
                  {visibleLines === index + 1 && index < BOOT_LINES.length - 1 && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="w-2 h-4 bg-blue-500 ml-1"
                    />
                  )}
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: visibleLines / BOOT_LINES.length }}
              transition={{ duration: 0.3 }}
              className="mt-8 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full origin-left"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
