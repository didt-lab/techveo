import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNewHiresInWindow } from "@/lib/domain/events";
import type { Empleado, NewHiresResponse } from "@/lib/domain/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 300; // 5 min cache

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("empleados")
      .select("*");

    if (error) throw error;

    const now = new Date();

    const response: NewHiresResponse = {
      nuevosIngresos: getNewHiresInWindow(data as Empleado[], now),
      fetchedAt: now.toISOString(),
    };

    return NextResponse.json(response, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("[/api/nuevo-ingreso] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener nuevos ingresos" },
      { status: 500 }
    );
  }
}
