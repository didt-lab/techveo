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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold text-gray-900">TechVeo Admin</span>
          <a href="/admin" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Empleados
          </a>
          <a href="/admin/ticker" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Ticker
          </a>
          <a href="/admin/importar/cumpleanos" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Importar Cumpleaños
          </a>
          <a href="/admin/importar/aniversarios" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Importar Aniversarios
          </a>
          <a href="/admin/importar/exclusiones" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Importar Exclusiones
          </a>
          <a href="/admin/importar/empleados" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Importar Empleados
          </a>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" target="_blank" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
            Ver pantalla TV ↗
          </a>
        </div>
      </nav>
      <main className="p-8">{children}</main>
    </div>
  );
}
