import type { ReactNode } from "react";
import Image from "next/image";
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
      <nav className="flex items-center justify-between px-8 py-0 bg-white border-b border-gray-200 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-0">
          <a href="/admin" className="flex items-center pr-6 py-4 border-r border-gray-100">
            <Image
              src="/techveo-logo.png"
              alt="TechVeo"
              width={110}
              height={36}
              className="object-contain"
              priority
            />
          </a>

          {/* Links principales */}
          <div className="flex items-stretch h-full">
            <NavLink href="/admin">Empleados</NavLink>
            <NavLink href="/admin/ticker">Ticker</NavLink>
          </div>

          {/* Separador + grupo Importar */}
          <div className="flex items-center ml-2 pl-4 border-l border-gray-100 gap-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mr-2">
              Importar
            </span>
            <NavLink href="/admin/importar/cumpleanos">Cumpleaños</NavLink>
            <NavLink href="/admin/importar/aniversarios">Aniversarios</NavLink>
            <NavLink href="/admin/importar/exclusiones">Exclusiones</NavLink>
            <NavLink href="/admin/importar/empleados">Empleados</NavLink>
          </div>
        </div>

        {/* Acción derecha */}
        <a
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 text-xs font-medium transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Ver pantalla TV
          <span className="text-gray-400">↗</span>
        </a>
      </nav>
      <main className="p-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="flex items-center px-4 py-5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors border-b-2 border-transparent hover:border-gray-300"
    >
      {children}
    </a>
  );
}
