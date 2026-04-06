"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Slide } from "./Slide";
import { CapsuleHeader } from "./CapsuleHeader";
import type { BirthdayEvent, AnniversaryEvent } from "@/lib/domain/types";

const SLIDE_DURATION_MS = 10000;

interface SlideData {
  type: "birthday" | "anniversary";
  events: BirthdayEvent[] | AnniversaryEvent[];
}

function buildSlides(
  cumpleanos: BirthdayEvent[],
  aniversarios: AnniversaryEvent[]
): SlideData[] {
  const slides: SlideData[] = [];

  for (let i = 0; i < cumpleanos.length; i += 4) {
    slides.push({ type: "birthday", events: cumpleanos.slice(i, i + 4) });
  }

  for (let i = 0; i < aniversarios.length; i += 4) {
    slides.push({ type: "anniversary", events: aniversarios.slice(i, i + 4) });
  }

  return slides;
}

export function Carousel({
  cumpleanos,
  aniversarios,
}: {
  cumpleanos: BirthdayEvent[];
  aniversarios: AnniversaryEvent[];
}) {
  const slides = buildSlides(cumpleanos, aniversarios);
  const [currentIndex, setCurrentIndex] = useState(0);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(advance, SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, [advance, slides.length]);

  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  if (slides.length === 0) return null;

  const slide = slides[currentIndex];

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Header fijo — no se anima */}
      <CapsuleHeader type={slide.type} />

      {/* Contenido animado */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {slide.type === "birthday" ? (
            <Slide
              key={`birthday-${currentIndex}`}
              type="birthday"
              events={slide.events as BirthdayEvent[]}
            />
          ) : (
            <Slide
              key={`anniversary-${currentIndex}`}
              type="anniversary"
              events={slide.events as AnniversaryEvent[]}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Party popper fijo */}
      <div className="absolute bottom-8 right-12 text-8xl opacity-70 pointer-events-none">
        🎉
      </div>
    </div>
  );
}
