import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { matricula, nombre, fecha_nacimiento, fecha_ingreso, foto_url } = body;

  if (!matricula || !nombre || !fecha_nacimiento || !fecha_ingreso) {
    return NextResponse.json(
      { error: "Campos requeridos: matricula, nombre, fecha_nacimiento, fecha_ingreso" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("empleados")
    .insert({ matricula, nombre, fecha_nacimiento, fecha_ingreso, foto_url })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un empleado con esa matrícula" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
