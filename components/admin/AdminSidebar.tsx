"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UsersIcon, NewspaperIcon, UploadIcon } from "./icons";

function isActive(pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({
  href,
  icon,
  active,
  children,
}: {
  href: string;
  icon?: ReactNode;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
        active
          ? "bg-white/15 text-white font-semibold"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </a>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-brand-primary flex flex-col py-4 gap-1">
      <SidebarLink
        href="/admin"
        icon={<UsersIcon className="w-4 h-4" />}
        active={pathname === "/admin" || pathname.startsWith("/admin/empleados")}
      >
        Empleados
      </SidebarLink>
      <SidebarLink href="/admin/techndencias" icon={<NewspaperIcon className="w-4 h-4" />} active={isActive(pathname, "/admin/techndencias")}>
        TechNdencias
      </SidebarLink>

      <div className="flex items-center gap-2 px-6 mt-6 mb-1">
        <UploadIcon className="w-3.5 h-3.5 text-white/40" />
        <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
          Importar
        </span>
      </div>
      <SidebarLink href="/admin/importar/cumpleanos" active={isActive(pathname, "/admin/importar/cumpleanos")}>
        <span className="w-4" />
        Cumpleaños
      </SidebarLink>
      <SidebarLink href="/admin/importar/aniversarios" active={isActive(pathname, "/admin/importar/aniversarios")}>
        <span className="w-4" />
        Aniversarios
      </SidebarLink>
      <SidebarLink href="/admin/importar/exclusiones" active={isActive(pathname, "/admin/importar/exclusiones")}>
        <span className="w-4" />
        Exclusiones
      </SidebarLink>
      <SidebarLink href="/admin/importar/empleados" active={isActive(pathname, "/admin/importar/empleados")}>
        <span className="w-4" />
        Empleados
      </SidebarLink>
    </aside>
  );
}
