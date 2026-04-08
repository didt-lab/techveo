"use client";

import { motion } from "framer-motion";
import { InitialsAvatar } from "./InitialsAvatar";
import type { NewHireEvent } from "@/lib/domain/types";

export function NewHireSlide({ event }: { event: NewHireEvent }) {
  const empleado = event.empleado;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 flex items-center justify-center px-20 -mt-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex items-center gap-10"
      >
        {/* Circular photo */}
        {empleado.foto_url ? (
          <img
            src={empleado.foto_url}
            alt={empleado.nombre}
            className="w-52 h-52 rounded-full object-cover border-4 border-white shadow-lg flex-shrink-0"
          />
        ) : (
          <InitialsAvatar
            nombre={empleado.nombre}
            className="w-52 h-52 rounded-full border-4 border-white shadow-lg flex-shrink-0"
          />
        )}

        {/* Info */}
        <div className="flex flex-col items-start">
          <span className="bg-teal-500 text-white text-5xl font-semibold px-10 py-4 rounded-full shadow whitespace-nowrap">
            {empleado.nombre}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
