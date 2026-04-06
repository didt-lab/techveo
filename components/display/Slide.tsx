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
      transition={{ duration: 0.2 }}
      className="absolute inset-0 flex items-center justify-center px-20"
    >
      <div className="flex flex-col gap-16 w-full max-w-4xl">
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
