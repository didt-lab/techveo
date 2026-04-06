"use client";

import { motion } from "framer-motion";
import { InitialsAvatar } from "./InitialsAvatar";
import type { BirthdayEvent, AnniversaryEvent } from "@/lib/domain/types";

interface BirthdayProps {
  type: "birthday";
  event: BirthdayEvent;
  index: number;
}

interface AnniversaryProps {
  type: "anniversary";
  event: AnniversaryEvent;
  index: number;
}

type Props = BirthdayProps | AnniversaryProps;

export function EmployeeCard(props: Props) {
  const isBirthday = props.type === "birthday";
  const empleado = props.event.empleado;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: props.index * 0.3 }}
      className="flex items-center gap-10"
    >
      {/* Foto circular */}
      {empleado.foto_url ? (
        <img
          src={empleado.foto_url}
          alt={empleado.nombre}
          className="w-36 h-36 rounded-full object-cover border-4 border-white shadow-lg flex-shrink-0"
        />
      ) : (
        <InitialsAvatar
          nombre={empleado.nombre}
          className="w-36 h-36 rounded-full border-4 border-white shadow-lg flex-shrink-0"
        />
      )}

      {/* Info */}
      <div className="flex flex-col items-start">
        <span className="bg-teal-500 text-white text-3xl font-semibold px-8 py-2.5 rounded-full shadow whitespace-nowrap">
          {empleado.nombre}
        </span>
        <p className="text-gray-700 text-4xl font-bold mt-4 ml-2">
          {isBirthday
            ? props.event.fechaCumple
            : `${props.event.anosServicio} ${props.event.anosServicio === 1 ? "a\u00f1o" : "a\u00f1os"} de servicio`}
        </p>
      </div>
    </motion.div>
  );
}
