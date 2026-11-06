"use client";

import { motion, useReducedMotion } from "motion/react";

export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
      className="min-h-0"
    >
      {children}
    </motion.div>
  );
}
