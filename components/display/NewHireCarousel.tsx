"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { NewHireSlide } from "./NewHireSlide";
import { CapsuleHeader } from "./CapsuleHeader";
import type { NewHireEvent } from "@/lib/domain/types";

const SLIDE_MS = 8000;

export function NewHireCarousel({
  nuevosIngresos,
}: {
  nuevosIngresos: NewHireEvent[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % nuevosIngresos.length);
  }, [nuevosIngresos.length]);

  useEffect(() => {
    if (nuevosIngresos.length <= 1) return;
    const interval = setInterval(advance, SLIDE_MS);
    return () => clearInterval(interval);
  }, [advance, nuevosIngresos.length]);

  useEffect(() => {
    if (currentIndex >= nuevosIngresos.length) {
      setCurrentIndex(0);
    }
  }, [nuevosIngresos.length, currentIndex]);

  if (nuevosIngresos.length === 0) return null;

  return (
    <div className="relative w-full h-full flex flex-col">
      <CapsuleHeader type="newhire" />

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <NewHireSlide
            key={`newhire-${currentIndex}`}
            event={nuevosIngresos[currentIndex]}
          />
        </AnimatePresence>
      </div>

    </div>
  );
}
