"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Credenciales incorrectas");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
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

      <div className="flex-1 flex">
      {/* Panel de bienvenida institucional */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <Image
          src="/login-bg-wave.png"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-brand-primary/75" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <Image
            src="/imss-logo.svg"
            alt="IMSS"
            width={44}
            height={53}
            className="object-contain brightness-0 invert mb-8"
          />
          <h1 className="text-4xl font-bold leading-tight">
            Bienvenido al
            <br />
            Sistema TechVeo
          </h1>
          <p className="mt-4 text-white/80 max-w-sm text-sm leading-relaxed">
            Plataforma institucional de cumpleaños y aniversarios laborales — Dirección de
            Innovación y Desarrollo Tecnológico, IMSS.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden bg-white">
        <Image
          src="/login-bg-signage.png"
          alt=""
          fill
          className="object-cover object-[70%_55%]"
        />
        <form
          onSubmit={handleLogin}
          className="relative z-10 w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-8 shadow-lg"
        >
          <h1 className="text-2xl font-bold mb-2">Iniciar sesión</h1>
          <p className="text-gray-500 text-sm mb-8">Acceso administrativo — TechVeo</p>

          <label className="block text-sm text-gray-600 mb-1">Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full mb-4 px-4 py-3 bg-[#F5F6F7] border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-brand-secondary"
          />

          <label className="block text-sm text-gray-600 mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full mb-6 px-4 py-3 bg-[#F5F6F7] border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-brand-secondary"
          />

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 rounded-xl font-semibold text-white transition-colors"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
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
    </main>
  );
}
