import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseBirthdayCsv } from "@/lib/domain/csv-parser";
import type { ImportResult } from "@/lib/domain/types";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
  }

  const text = await file.text();
  const { valid, errors } = parseBirthdayCsv(text);

  let created = 0;
  let updated = 0;

  for (const row of valid) {
    const { data: existing } = await supabase
      .from("empleados")
      .select("id")
      .eq("matricula", row.matricula)
      .single();

    if (existing) {
      await supabase
        .from("empleados")
        .update({
          nombre: row.nombre,
          fecha_nacimiento: row.fecha_nacimiento,
        })
        .eq("matricula", row.matricula);
      updated++;
    } else {
      await supabase.from("empleados").insert({
        matricula: row.matricula,
        nombre: row.nombre,
        fecha_nacimiento: row.fecha_nacimiento,
        fecha_ingreso: "1900-01-01",
      });
      created++;
    }
  }

  const result: ImportResult = { created, updated, errors };
  return NextResponse.json(result);
}
