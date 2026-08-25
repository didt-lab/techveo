import type { ReactNode } from "react";
import Image from "next/image";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { ExternalIcon } from "@/components/admin/icons";

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
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Barra guinda de gobierno */}
      <div className="h-8 bg-brand-gob shrink-0 flex items-center px-6">
        <Image
          src="/gobierno-mexico-logo.png"
          alt="Gobierno de México"
          width={72}
          height={24}
          className="object-contain"
          priority
        />
      </div>

      {/* Barra de marca */}
      <div className="flex items-center justify-between px-6 h-16 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <Image
            src="/imss-logo.svg"
            alt="IMSS"
            width={33}
            height={40}
            className="object-contain"
            priority
          />
          <div className="h-8 w-px bg-gray-200" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-brand-primary font-bold text-lg leading-none">TechVeo</span>
              <span className="bg-brand-secondary text-white text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none">
                DIDT
              </span>
            </div>
            <span className="text-xs text-gray-500 mt-0.5">Cumpleaños &amp; Aniversarios</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-brand-secondary hover:border-brand-secondary text-xs font-medium transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
            Ver pantalla TV
            <ExternalIcon className="w-3 h-3" />
          </a>
          <div className="h-8 w-px bg-gray-200" />
          <span className="text-sm text-gray-600">{user.email}</span>
          <LogoutButton />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <AdminSidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>

      {/* Footer guinda institucional */}
      <footer className="bg-brand-gob text-white flex items-center justify-center gap-3 py-2.5 shrink-0">
        <Image
          src="/imss-logo.svg"
          alt="IMSS"
          width={20}
          height={24}
          className="object-contain brightness-0 invert"
        />
        <span className="text-[11px] tracking-wide">
          INSTITUTO MEXICANO DEL SEGURO SOCIAL &middot; DIRECCIÓN DE INNOVACIÓN Y DESARROLLO TECNOLÓGICO
        </span>
      </footer>
    </div>
  );
}
