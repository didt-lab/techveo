"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Carousel } from "@/components/display/Carousel";
import { Clock } from "@/components/display/Clock";
import { EmptyState } from "@/components/display/EmptyState";
import type { EventsResponse } from "@/lib/domain/types";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const CACHE_KEY = "techveo:last-events";

function loadCache(): EventsResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as EventsResponse) : null;
  } catch {
    return null;
  }
}

function saveCache(data: EventsResponse) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable in some kiosk setups
  }
}

async function fetchEvents(): Promise<EventsResponse> {
  const res = await fetch("/api/events", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function DisplayPage() {
  const { data } = useQuery<EventsResponse>({
    queryKey: ["events"],
    queryFn: fetchEvents,
    refetchInterval: POLL_INTERVAL_MS,
    initialData: loadCache() ?? undefined,
  });

  // Save to cache on successful fetch
  useEffect(() => {
    if (data) saveCache(data);
  }, [data]);

  // Refetch on visibility change (TV waking from sleep)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchEvents()
          .then(saveCache)
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Daily 3:00 AM reload as memory leak backstop
  useEffect(() => {
    const now = new Date();
    const next3AM = new Date(now);
    next3AM.setHours(3, 0, 0, 0);
    if (next3AM <= now) next3AM.setDate(next3AM.getDate() + 1);
    const ms = next3AM.getTime() - now.getTime();
    const timeout = setTimeout(() => window.location.reload(), ms);
    return () => clearTimeout(timeout);
  }, []);

  const cumpleanos = data?.cumpleanos ?? [];
  const aniversarios = data?.aniversarios ?? [];
  const hasEvents = cumpleanos.length > 0 || aniversarios.length > 0;

  return (
    <main className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-5 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">
            DIDT
          </h1>
          <p className="text-white/40 text-sm">
            Dirección de Innovación y Desarrollo Tecnológico
          </p>
        </div>
        <Clock />
      </header>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {hasEvents ? (
          <Carousel cumpleanos={cumpleanos} aniversarios={aniversarios} />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Footer */}
      <footer className="px-10 py-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-white/20 text-xs">
          IMSS · Dirección de Innovación y Desarrollo Tecnológico
        </span>
        {data && (
          <span className="text-white/20 text-xs">
            Actualizado: {new Date(data.fetchedAt).toLocaleTimeString("es-MX")}
          </span>
        )}
      </footer>
    </main>
  );
}
