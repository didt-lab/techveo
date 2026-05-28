"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Carousel } from "@/components/display/Carousel";
import { Ticker } from "@/components/display/Ticker";
import { EmptyState } from "@/components/display/EmptyState";
import type { EventsResponse, NewHiresResponse, TickerResponse } from "@/lib/domain/types";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_KEY_EVENTS = "techveo:last-events";
const CACHE_KEY_NEWHIRES = "techveo:last-newhires";

function isCacheFresh(fetchedAt: string): boolean {
  try {
    return Date.now() - new Date(fetchedAt).getTime() < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

function loadEventsCache(): EventsResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_EVENTS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EventsResponse;
    return isCacheFresh(parsed.fetchedAt) ? parsed : null;
  } catch {
    return null;
  }
}

function loadNewHiresCache(): NewHiresResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_NEWHIRES);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NewHiresResponse;
    return isCacheFresh(parsed.fetchedAt) ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchEvents(): Promise<EventsResponse> {
  const res = await fetch("/api/events", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchNewHires(): Promise<NewHiresResponse> {
  const res = await fetch("/api/nuevo-ingreso", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchTicker(): Promise<TickerResponse> {
  const res = await fetch("/api/ticker", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function DisplayPage() {
  const { data: eventsData, isPending: eventsPending, refetch: refetchEvents } = useQuery<EventsResponse>({
    queryKey: ["events"],
    queryFn: fetchEvents,
    refetchInterval: POLL_INTERVAL_MS,
    initialData: loadEventsCache() ?? undefined,
  });

  const { data: newHiresData, isPending: newHiresPending, refetch: refetchNewHires } = useQuery<NewHiresResponse>({
    queryKey: ["nuevo-ingreso"],
    queryFn: fetchNewHires,
    refetchInterval: POLL_INTERVAL_MS,
    initialData: loadNewHiresCache() ?? undefined,
  });

  const { data: tickerData, refetch: refetchTicker } = useQuery<TickerResponse>({
    queryKey: ["ticker"],
    queryFn: fetchTicker,
    refetchInterval: POLL_INTERVAL_MS,
    initialData: { mensajes: [] },
  });

  // Save to cache on successful fetch
  useEffect(() => {
    if (eventsData) {
      try { localStorage.setItem(CACHE_KEY_EVENTS, JSON.stringify(eventsData)); } catch {}
    }
  }, [eventsData]);

  useEffect(() => {
    if (newHiresData) {
      try { localStorage.setItem(CACHE_KEY_NEWHIRES, JSON.stringify(newHiresData)); } catch {}
    }
  }, [newHiresData]);

  // Refetch on visibility change (TV waking from sleep / Ablesign tab switch)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refetchEvents();
        refetchNewHires();
        refetchTicker();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refetchEvents, refetchNewHires, refetchTicker]);

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

  const cumpleanos = eventsData?.cumpleanos ?? [];
  const aniversarios = eventsData?.aniversarios ?? [];
  const nuevosIngresos = newHiresData?.nuevosIngresos ?? [];
  const tickerMensajes = (tickerData?.mensajes ?? []).map((m) => m.texto);

  const isPending = eventsPending && newHiresPending;
  const hasContent = cumpleanos.length > 0 || aniversarios.length > 0 || nuevosIngresos.length > 0;
  const showEmpty = !isPending && !hasContent;

  return (
    <main className="h-screen flex flex-col bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Content — ocupa todo el espacio disponible */}
      <div className="flex-1 relative overflow-hidden">
        {hasContent ? (
          <Carousel
            cumpleanos={cumpleanos}
            aniversarios={aniversarios}
            nuevosIngresos={nuevosIngresos}
          />
        ) : showEmpty ? (
          <EmptyState />
        ) : null}
      </div>

      {/* Ticker fijo en la parte inferior */}
      <Ticker mensajes={tickerMensajes} />
    </main>
  );
}
