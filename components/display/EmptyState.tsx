"use client";

import { motion } from "framer-motion";

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full text-gray-400"
    >
      <span className="text-9xl mb-8">📅</span>
      <p className="text-3xl font-medium text-gray-500">Sin eventos este periodo</p>
      <p className="text-lg mt-3">DIDT — Dirección de Innovación y Desarrollo Tecnológico</p>
    </motion.div>
  );
}
