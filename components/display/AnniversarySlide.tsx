"use client";

import { motion } from "framer-motion";
import { InitialsAvatar } from "./InitialsAvatar";
import type { AnniversaryEvent } from "@/lib/domain/types";

const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMonthYear(fechaIngreso: string): string {
  const parts = fechaIngreso.split("-");
  if (parts.length < 2) return "";
  const month = parseInt(parts[1], 10);
  const now = new Date();
  return `${MONTH_NAMES[month]} de ${now.getFullYear()}`;
}

export function AnniversarySlide({ event }: { event: AnniversaryEvent }) {
  const empleado = event.empleado;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex items-center justify-center px-16"
    >
      <div className="flex items-center gap-12 w-full max-w-5xl">
        {/* Foto + nombre en columna */}
        <div className="flex flex-col items-center flex-shrink-0">
          {empleado.foto_url ? (
            <img
              src={empleado.foto_url}
              alt={empleado.nombre}
              className="w-56 h-56 object-cover rounded-2xl shadow-lg"
            />
          ) : (
            <InitialsAvatar
              nombre={empleado.nombre}
              className="w-56 h-56 rounded-2xl shadow-lg"
            />
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-teal-600 px-6 py-3 rounded-xl -mt-5 shadow-md"
          >
            <p className="text-white text-center text-xl font-bold leading-snug">
              {empleado.nombre}
            </p>
          </motion.div>
        </div>

        {/* Info reconocimiento */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-3xl font-extrabold text-gray-800 text-center uppercase leading-tight mb-6"
          >
            Reconocimiento<br />por tus a{"\u00f1"}os<br />laborando en la DIDT
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-5xl font-extrabold text-teal-600 mb-2"
          >
            {event.anosServicio} a{"\u00f1"}o{event.anosServicio !== 1 ? "s" : ""}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="text-xl text-gray-500 mb-8"
          >
            {formatMonthYear(empleado.fecha_ingreso)}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            className="border-t-2 border-gray-200 pt-4 mb-6"
          >
            <p className="text-gray-600 text-lg font-semibold italic text-center">
              Gracias por hacer historia<br />con nosotros
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.1 }}
            className="text-7xl"
          >
            🏆
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
