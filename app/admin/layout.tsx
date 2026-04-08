import type { ReactNode } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold">TechVeo Admin</span>
          <a href="/admin" className="text-white/60 hover:text-white text-sm transition-colors">
            Empleados
          </a>
          <a href="/admin/importar/cumpleanos" className="text-white/60 hover:text-white text-sm transition-colors">
            Importar Cumpleaños
          </a>
          <a href="/admin/importar/aniversarios" className="text-white/60 hover:text-white text-sm transition-colors">
            Importar Aniversarios
          </a>
          <a href="/admin/importar/exclusiones" className="text-white/60 hover:text-white text-sm transition-colors">
            Importar Exclusiones
          </a>
          <a href="/admin/importar/empleados" className="text-white/60 hover:text-white text-sm transition-colors">
            Importar Empleados
          </a>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" target="_blank" className="text-white/40 hover:text-white/70 text-sm transition-colors">
            Ver pantalla TV ↗
          </a>
        </div>
      </nav>
      <main className="p-8">{children}</main>
    </div>
  );
}
