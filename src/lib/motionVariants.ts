import type { Variants } from "framer-motion";

/** Same stagger/fade-up pattern as the homepage stat bar — applied to project KPI grids. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};
