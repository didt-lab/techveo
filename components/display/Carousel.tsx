"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Slide } from "./Slide";
import type { BirthdayEvent, AnniversaryEvent } from "@/lib/domain/types";

const SLIDE_DURATION_MS = 8000;

interface SlideData {
  type: "birthday" | "anniversary";
  events: [BirthdayEvent] | [BirthdayEvent, BirthdayEvent] | [AnniversaryEvent] | [AnniversaryEvent, AnniversaryEvent];
}

function buildSlides(
  cumpleanos: BirthdayEvent[],
  aniversarios: AnniversaryEvent[]
): SlideData[] {
  const slides: SlideData[] = [];

  for (let i = 0; i < cumpleanos.length; i += 2) {
    const pair = cumpleanos.slice(i, i + 2) as [BirthdayEvent] | [BirthdayEvent, BirthdayEvent];
    slides.push({ type: "birthday", events: pair });
  }

  for (let i = 0; i < aniversarios.length; i += 2) {
    const pair = aniversarios.slice(i, i + 2) as [AnniversaryEvent] | [AnniversaryEvent, AnniversaryEvent];
    slides.push({ type: "anniversary", events: pair });
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
    <div className="relative w-full h-full">
      <AnimatePresence mode="wait">
        {slide.type === "birthday" ? (
          <Slide
            key={`birthday-${currentIndex}`}
            type="birthday"
            events={slide.events as [BirthdayEvent] | [BirthdayEvent, BirthdayEvent]}
          />
        ) : (
          <Slide
            key={`anniversary-${currentIndex}`}
            type="anniversary"
            events={slide.events as [AnniversaryEvent] | [AnniversaryEvent, AnniversaryEvent]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
