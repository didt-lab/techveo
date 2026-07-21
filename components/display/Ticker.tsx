"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface Props {
  mensajes: string[];
}

export function Ticker({ mensajes }: Props) {
  const [time, setTime] = useState<string>("");
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  // Clock
  useEffect(() => {
    function tick() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setTime(`${hh}:${mm}:${ss}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // JS scroll — immune to proxies, CSP and prefers-reduced-motion
  useEffect(() => {
    const el = textRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const containerW = container.offsetWidth;
    const textW = el.offsetWidth;

    // Start just off the right edge
    posRef.current = containerW;
    el.style.transform = `translateX(${posRef.current}px)`;

    const speed = 1.5; // px per frame (~90px/s at 60fps)

    function step() {
      posRef.current -= speed;
      // Reset when fully off the left edge
      if (posRef.current < -(textW)) {
        posRef.current = containerW;
      }
      if (el) el.style.transform = `translateX(${posRef.current}px)`;
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mensajes]);

  const tickerText = mensajes.length > 0
    ? mensajes.join("   ●   ")
    : "";

  return (
    <div className="flex items-stretch h-16 flex-shrink-0" style={{ backgroundColor: "#3bb5a6" }}>
      {/* Logo */}
      <div className="bg-white flex items-center px-6 flex-shrink-0">
        <Image
          src="/techveo-logo.png"
          alt="TechVeo"
          width={140}
          height={46}
          className="object-contain"
          priority
        />
      </div>

      {/* Hora */}
      <div
        className="flex items-center px-6 flex-shrink-0 text-white font-bold tabular-nums"
        style={{
          fontSize: "40px",
          backgroundColor: "rgba(0,0,0,0.12)",
          borderLeft: "1px solid rgba(255,255,255,0.2)",
          borderRight: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {time}
      </div>

      {/* Texto desfilante */}
      <div ref={containerRef} className="flex-1 overflow-hidden flex items-center">
        {tickerText && (
          <span
            ref={textRef}
            className="whitespace-nowrap text-white font-medium"
            style={{ fontSize: "40px", display: "inline-block", willChange: "transform" }}
          >
            {tickerText}
          </span>
        )}
      </div>
    </div>
  );
}
