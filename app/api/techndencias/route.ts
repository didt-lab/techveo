import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TechNoticia, TechNoticiasResponse } from "@/lib/domain/types";

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabasePublic
    .from("tech_noticias")
    .select("id, titulo, parrafo, media_url, media_type, orden, activo, created_at")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response: TechNoticiasResponse = {
    noticias: (data as TechNoticia[]) ?? [],
    fetchedAt: new Date().toISOString(),
  };
  return NextResponse.json(response, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, titulo, parrafo, media_url, media_type } = await request.json();

  if (!id || !titulo?.trim() || !parrafo?.trim() || !media_url || !media_type) {
    return NextResponse.json(
      { error: "Campos requeridos: id, titulo, parrafo, media_url, media_type" },
      { status: 400 }
    );
  }
  if (media_type !== "imagen" && media_type !== "video") {
    return NextResponse.json(
      { error: "media_type debe ser 'imagen' o 'video'" },
      { status: 400 }
    );
  }

  const { data: maxRow } = await supabasePublic
    .from("tech_noticias")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .single();

  const orden = maxRow ? (maxRow.orden as number) + 1 : 0;

  const { data, error } = await supabasePublic
    .from("tech_noticias")
    .insert({
      id,
      titulo: titulo.trim(),
      parrafo: parrafo.trim(),
      media_url,
      media_type,
      orden,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
