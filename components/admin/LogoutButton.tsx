"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoutIcon } from "./icons";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      title="Cerrar sesión"
      className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-brand-danger hover:bg-red-50 transition-colors"
    >
      <LogoutIcon className="w-4 h-4" />
    </button>
  );
}
