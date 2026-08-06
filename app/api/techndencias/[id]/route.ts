import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAuth() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const fields: Record<string, unknown> = {};
  if (body.titulo !== undefined) fields.titulo = body.titulo;
  if (body.parrafo !== undefined) fields.parrafo = body.parrafo;
  if (body.media_url !== undefined) fields.media_url = body.media_url;
  if (body.media_type !== undefined) fields.media_type = body.media_type;
  if (body.orden !== undefined) fields.orden = body.orden;
  if (body.activo !== undefined) fields.activo = body.activo;

  const { data, error } = await supabaseAdmin
    .from("tech_noticias")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const { data: row } = await supabaseAdmin
    .from("tech_noticias")
    .select("media_url")
    .eq("id", id)
    .single();

  if (row?.media_url) {
    const marker = "/techndencias-media/";
    const idx = row.media_url.indexOf(marker);
    if (idx !== -1) {
      const path = row.media_url.slice(idx + marker.length);
      await supabaseAdmin.storage.from("techndencias-media").remove([path]);
    }
  }

  const { error } = await supabaseAdmin.from("tech_noticias").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
