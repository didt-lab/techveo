"use client";

import { motion } from "framer-motion";
import { EmployeeCard } from "./EmployeeCard";
import { CapsuleHeader } from "./CapsuleHeader";
import type { BirthdayEvent, AnniversaryEvent } from "@/lib/domain/types";

interface BirthdaySlideProps {
  type: "birthday";
  events: [BirthdayEvent] | [BirthdayEvent, BirthdayEvent];
}

interface AnniversarySlideProps {
  type: "anniversary";
  events: [AnniversaryEvent] | [AnniversaryEvent, AnniversaryEvent];
}

type Props = BirthdaySlideProps | AnniversarySlideProps;

export function Slide(props: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -80 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0 flex flex-col items-center justify-center px-16"
    >
      <CapsuleHeader type={props.type} />
      <div className="flex gap-12 w-full max-w-5xl justify-center">
        {props.type === "birthday"
          ? (props.events as BirthdayEvent[]).map((event) => (
              <EmployeeCard
                key={event.empleado.id}
                type="birthday"
                event={event}
              />
            ))
          : (props.events as AnniversaryEvent[]).map((event) => (
              <EmployeeCard
                key={event.empleado.id}
                type="anniversary"
                event={event}
              />
            ))}
      </div>
    </motion.div>
  );
}
