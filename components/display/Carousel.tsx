"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Slide } from "./Slide";
import { AnniversarySlide } from "./AnniversarySlide";
import { NewHireSlide } from "./NewHireSlide";
import { CapsuleHeader } from "./CapsuleHeader";
import type { BirthdayEvent, AnniversaryEvent, NewHireEvent } from "@/lib/domain/types";

const BIRTHDAY_SLIDE_MS = 5000;
const ANNIVERSARY_SLIDE_MS = 8000;
const NEWHIRE_SLIDE_MS = 6000;

interface BirthdaySlideData {
  type: "birthday";
  events: BirthdayEvent[];
}

interface AnniversarySlideData {
  type: "anniversary";
  event: AnniversaryEvent;
}

interface NewHireSlideData {
  type: "newhire";
  event: NewHireEvent;
}

type SlideData = BirthdaySlideData | AnniversarySlideData | NewHireSlideData;

function buildSlides(
  cumpleanos: BirthdayEvent[],
  aniversarios: AnniversaryEvent[],
  nuevosIngresos: NewHireEvent[]
): SlideData[] {
  const slides: SlideData[] = [];

  for (let i = 0; i < cumpleanos.length; i += 2) {
    slides.push({ type: "birthday", events: cumpleanos.slice(i, i + 2) });
  }

  for (const event of aniversarios) {
    slides.push({ type: "anniversary", event });
  }

  for (const event of nuevosIngresos) {
    slides.push({ type: "newhire", event });
  }

  return slides;
}

export function Carousel({
  cumpleanos,
  aniversarios,
  nuevosIngresos = [],
}: {
  cumpleanos: BirthdayEvent[];
  aniversarios: AnniversaryEvent[];
  nuevosIngresos?: NewHireEvent[];
}) {
  const slides = buildSlides(cumpleanos, aniversarios, nuevosIngresos);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentSlide = slides[currentIndex];
  const duration =
    currentSlide?.type === "anniversary" ? ANNIVERSARY_SLIDE_MS :
    currentSlide?.type === "newhire" ? NEWHIRE_SLIDE_MS :
    BIRTHDAY_SLIDE_MS;

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
      {/* Header — cumpleaños o nuevos ingresos */}
      {slide.type === "birthday" && <CapsuleHeader type="birthday" />}
      {slide.type === "newhire" && <CapsuleHeader type="newhire" />}

      {/* Contenido animado */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {slide.type === "birthday" ? (
            <Slide
              key={`birthday-${currentIndex}`}
              type="birthday"
              events={(slide as BirthdaySlideData).events}
            />
          ) : slide.type === "anniversary" ? (
            <AnniversarySlide
              key={`anniversary-${currentIndex}`}
              event={(slide as AnniversarySlideData).event}
            />
          ) : (
            <NewHireSlide
              key={`newhire-${currentIndex}`}
              event={(slide as NewHireSlideData).event}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Party popper — solo cumpleaños */}
      {slide.type === "birthday" && (
        <div className="absolute bottom-4 right-8 opacity-70 pointer-events-none" style={{ fontSize: "11rem" }}>
          🎉
        </div>
      )}
    </div>
  );
}
