import type { Variants } from 'framer-motion';

export const fadeSlideUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease: 'easeIn' } },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
};

export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

export const collapseExpand: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
};
