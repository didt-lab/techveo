"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Slide } from "./Slide";
import { AnniversarySlide } from "./AnniversarySlide";
import { CapsuleHeader } from "./CapsuleHeader";
import type { BirthdayEvent, AnniversaryEvent } from "@/lib/domain/types";

const BIRTHDAY_SLIDE_MS = 5000;
const ANNIVERSARY_SLIDE_MS = 8000;

interface BirthdaySlideData {
  type: "birthday";
  events: BirthdayEvent[];
}

interface AnniversarySlideData {
  type: "anniversary";
  event: AnniversaryEvent;
}

type SlideData = BirthdaySlideData | AnniversarySlideData;

function buildSlides(
  cumpleanos: BirthdayEvent[],
  aniversarios: AnniversaryEvent[]
): SlideData[] {
  const slides: SlideData[] = [];

  for (let i = 0; i < cumpleanos.length; i += 2) {
    slides.push({ type: "birthday", events: cumpleanos.slice(i, i + 2) });
  }

  for (const event of aniversarios) {
    slides.push({ type: "anniversary", event });
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

  const currentSlide = slides[currentIndex];
  const duration = currentSlide?.type === "anniversary" ? ANNIVERSARY_SLIDE_MS : BIRTHDAY_SLIDE_MS;

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(advance, duration);
    return () => clearInterval(interval);
  }, [advance, slides.length, duration]);

  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  if (slides.length === 0) return null;

  const slide = slides[currentIndex];

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Header fijo — solo para cumpleaños */}
      {slide.type === "birthday" && <CapsuleHeader type="birthday" />}

      {/* Contenido animado */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {slide.type === "birthday" ? (
            <Slide
              key={`birthday-${currentIndex}`}
              type="birthday"
              events={(slide as BirthdaySlideData).events}
            />
          ) : (
            <AnniversarySlide
              key={`anniversary-${currentIndex}`}
              event={(slide as AnniversarySlideData).event}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Party popper fijo — solo para cumpleaños */}
      {slide.type === "birthday" && (
        <div className="absolute bottom-4 right-8 opacity-70 pointer-events-none" style={{ fontSize: "11rem" }}>
          🎉
        </div>
      )}
    </div>
  );
}
