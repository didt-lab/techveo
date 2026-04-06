"use client";

import { motion } from "framer-motion";
import { EmployeeCard } from "./EmployeeCard";
import type { BirthdayEvent, AnniversaryEvent } from "@/lib/domain/types";

interface BirthdaySlideProps {
  type: "birthday";
  events: BirthdayEvent[];
}

interface AnniversarySlideProps {
  type: "anniversary";
  events: AnniversaryEvent[];
}

type Props = BirthdaySlideProps | AnniversarySlideProps;

export function Slide(props: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center px-16"
    >
      <div className="grid grid-cols-2 gap-x-12 gap-y-8 w-full max-w-5xl">
        {props.type === "birthday"
          ? (props.events as BirthdayEvent[]).map((event, i) => (
              <EmployeeCard
                key={event.empleado.id}
                type="birthday"
                event={event}
                index={i}
              />
            ))
          : (props.events as AnniversaryEvent[]).map((event, i) => (
              <EmployeeCard
                key={event.empleado.id}
                type="anniversary"
                event={event}
                index={i}
              />
            ))}
      </div>
    </motion.div>
  );
}
