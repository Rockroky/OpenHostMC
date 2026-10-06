'use client';

import { motion, useMotionValue, animate, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

// ─── FadeIn ────────────────────────────────────────────────────────────────
export const FadeIn = ({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
}) => {
  const shouldReduce = useReducedMotion();
  const directionMap = {
    up: { y: 24 },
    down: { y: -24 },
    left: { x: 24 },
    right: { x: -24 },
    none: {},
  };

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directionMap[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── StaggerContainer ──────────────────────────────────────────────────────
export const StaggerContainer = ({
  children,
  className = '',
  staggerDelay = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) => {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Child item for StaggerContainer
export const StaggerItem = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── HoverCard ─────────────────────────────────────────────────────────────
export const HoverCard = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      whileHover={shouldReduce ? undefined : { scale: 1.02, y: -2 }}
      whileTap={shouldReduce ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── PulseDot ──────────────────────────────────────────────────────────────
export const PulseDot = ({
  status,
}: {
  status: 'online' | 'offline' | 'starting' | 'stopping';
}) => {
  const shouldReduce = useReducedMotion();
  const colorMap = {
    online: 'bg-emerald-400',
    offline: 'bg-zinc-500',
    starting: 'bg-amber-400',
    stopping: 'bg-orange-400',
  };

  const ringColorMap = {
    online: 'bg-emerald-400',
    offline: 'bg-zinc-500',
    starting: 'bg-amber-400',
    stopping: 'bg-orange-400',
  };

  const shouldAnimate = !shouldReduce && (status === 'online' || status === 'starting' || status === 'stopping');

  return (
    <span className="relative inline-flex items-center justify-center w-2.5 h-2.5">
      {shouldAnimate && (
        <motion.span
          className={`absolute inline-flex rounded-full w-full h-full ${ringColorMap[status]} opacity-75`}
          animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span className={`relative inline-flex rounded-full w-2 h-2 ${colorMap[status]}`} />
    </span>
  );
};

// ─── SlideIn ───────────────────────────────────────────────────────────────
export const SlideIn = ({
  children,
  from = 'right',
  className = '',
  isVisible = true,
}: {
  children: React.ReactNode;
  from?: 'right' | 'left' | 'top' | 'bottom';
  className?: string;
  isVisible?: boolean;
}) => {
  const shouldReduce = useReducedMotion();
  const initial = {
    right: { x: shouldReduce ? 0 : '100%', opacity: 0 },
    left: { x: shouldReduce ? 0 : '-100%', opacity: 0 },
    top: { y: shouldReduce ? 0 : '-100%', opacity: 0 },
    bottom: { y: shouldReduce ? 0 : '100%', opacity: 0 },
  }[from];

  return (
    <motion.div
      initial={initial}
      animate={isVisible ? { x: 0, y: 0, opacity: 1 } : initial}
      exit={initial}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── AnimatedCounter ───────────────────────────────────────────────────────
export const AnimatedCounter = ({
  value,
  duration = 1.5,
  suffix = '',
  prefix = '',
  decimals = 0,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => {
        if (ref.current) {
          ref.current.textContent = `${prefix}${latest.toFixed(decimals)}${suffix}`;
        }
      },
    });
    return controls.stop;
  }, [value, duration, suffix, prefix, decimals, motionValue]);

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
    >
      {prefix}0{suffix}
    </motion.span>
  );
};

// ─── ModalOverlay ──────────────────────────────────────────────────────────
export const ModalOverlay = ({
  children,
  onClose,
  isOpen,
}: {
  children: React.ReactNode;
  onClose: () => void;
  isOpen: boolean;
}) => {
  const shouldReduce = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduce ? 0 : 0.2 }}
        >
          <motion.div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full flex items-center justify-center pointer-events-auto"
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── TabPanel ──────────────────────────────────────────────────────────────
export const TabPanel = ({
  children,
  tabKey,
  className = '',
}: {
  children: React.ReactNode;
  tabKey: string;
  className?: string;
}) => {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      key={tabKey}
      initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── SkeletonCard ──────────────────────────────────────────────────────────
export const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-zinc-800/50 rounded-xl p-5 space-y-3 ${className}`}>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-zinc-700 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-700 rounded w-3/4" />
        <div className="h-3 bg-zinc-700 rounded w-1/2" />
      </div>
    </div>
    <div className="grid grid-cols-4 gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 bg-zinc-700/60 rounded-xl" />
      ))}
    </div>
    <div className="h-10 bg-zinc-700/40 rounded-lg" />
  </div>
);

// ─── PageTransition ────────────────────────────────────────────────────────
export const PageTransition = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
