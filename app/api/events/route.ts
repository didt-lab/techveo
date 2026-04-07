import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getBirthdaysInWindow, getAnniversariesInMonth } from "@/lib/domain/events";
import type { Empleado, EventsResponse } from "@/lib/domain/types";

// Use service role for public read — no auth needed for display
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 300; // 5 min cache on Netlify

export async function GET() {
  try {
    const [birthdayRes, anniversaryRes] = await Promise.all([
      supabase
        .from("empleados")
        .select("*")
        .eq("mostrar_cumpleanos", true),
      supabase
        .from("empleados")
        .select("*")
        .eq("mostrar_aniversario", true),
    ]);

    if (birthdayRes.error) throw birthdayRes.error;
    if (anniversaryRes.error) throw anniversaryRes.error;

    const now = new Date();

    const response: EventsResponse = {
      cumpleanos: getBirthdaysInWindow(birthdayRes.data as Empleado[], now),
      aniversarios: getAnniversariesInMonth(anniversaryRes.data as Empleado[], now),
      fetchedAt: now.toISOString(),
    };

    return NextResponse.json(response, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("[/api/events] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 }
    );
  }
}
