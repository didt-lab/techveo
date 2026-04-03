"use client";

import { motion } from "framer-motion";
import { InitialsAvatar } from "./InitialsAvatar";
import type { BirthdayEvent, AnniversaryEvent } from "@/lib/domain/types";

interface BirthdayProps {
  type: "birthday";
  event: BirthdayEvent;
}

interface AnniversaryProps {
  type: "anniversary";
  event: AnniversaryEvent;
}

type Props = BirthdayProps | AnniversaryProps;

export function EmployeeCard(props: Props) {
  const isBirthday = props.type === "birthday";
  const empleado = isBirthday ? props.event.empleado : props.event.empleado;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className={`
        flex flex-col items-center text-center p-8 rounded-3xl border flex-1
        ${
          isBirthday
            ? "bg-gradient-to-b from-pink-950/60 to-pink-900/30 border-pink-700/40"
            : "bg-gradient-to-b from-amber-950/60 to-amber-900/30 border-amber-700/40"
        }
      `}
    >
      {empleado.foto_url ? (
        <img
          src={empleado.foto_url}
          alt={empleado.nombre}
          className="w-32 h-32 rounded-full object-cover border-4 border-white/20 mb-6"
        />
      ) : (
        <InitialsAvatar
          nombre={empleado.nombre}
          className="w-32 h-32 rounded-full border-4 border-white/20 mb-6"
        />
      )}

      <h3 className="text-2xl font-bold text-white leading-tight mb-3">
        {empleado.nombre}
      </h3>

      {isBirthday ? (
        <p className="text-pink-300 text-lg font-medium">
          {props.event.fechaCumple}
        </p>
      ) : (
        <p className="text-amber-300 text-lg font-medium">
          {props.event.anosServicio}{" "}
          {props.event.anosServicio === 1 ? "año" : "años"} de servicio
        </p>
      )}
    </motion.div>
  );
}
