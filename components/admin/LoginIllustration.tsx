export function LoginIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 640" fill="none" className={className}>
      {/* fondo suave */}
      <circle cx="360" cy="300" r="260" fill="#0aa16e" opacity="0.06" />

      {/* patrón de puntos, esquina inferior izquierda */}
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: 6 }).map((_, col) => (
          <circle
            key={`dot-${row}-${col}`}
            cx={70 + col * 20}
            cy={430 + row * 20}
            r="2.2"
            fill="#0aa16e"
            opacity={0.35 - row * 0.04}
          />
        ))
      )}

      {/* líneas onduladas decorativas, esquina superior derecha */}
      <path d="M420 70c40 30 90 30 150-10" stroke="#611232" strokeWidth="2" opacity="0.25" fill="none" strokeLinecap="round" />
      <path d="M410 92c40 30 90 30 150-10" stroke="#0aa16e" strokeWidth="2" opacity="0.2" fill="none" strokeLinecap="round" />
      <path d="M400 114c40 30 90 30 150-10" stroke="#006455" strokeWidth="2" opacity="0.15" fill="none" strokeLinecap="round" />

      {/* pantalla secundaria, atrás a la izquierda */}
      <rect x="86" y="300" width="188" height="128" rx="12" fill="#006455" />
      <rect x="98" y="312" width="164" height="94" rx="5" fill="#ffffff" />
      <circle cx="128" cy="342" r="14" fill="#611232" />
      <rect x="150" y="334" width="90" height="8" rx="4" fill="#E5E7EB" />
      <rect x="150" y="349" width="66" height="7" rx="3.5" fill="#EEF0F3" />
      <rect x="110" y="376" width="130" height="6" rx="3" fill="#0aa16e" opacity="0.35" />
      {/* soporte pantalla secundaria */}
      <rect x="172" y="428" width="8" height="26" fill="#9CA3AF" />
      <rect x="150" y="452" width="52" height="6" rx="3" fill="#9CA3AF" />

      {/* pantalla principal */}
      <rect x="230" y="140" width="340" height="230" rx="16" fill="#1f2937" />
      <rect x="248" y="158" width="304" height="176" rx="6" fill="#F4F7FC" />

      {/* contenido: avatar + nombre */}
      <circle cx="312" cy="222" r="30" fill="#0aa16e" />
      <path
        d="M296 232c4-8 12-12 16-12s12 4 16 12"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="312" cy="212" r="8" fill="#ffffff" />
      <rect x="356" y="208" width="150" height="11" rx="5.5" fill="#D6DBE3" />
      <rect x="356" y="228" width="110" height="9" rx="4.5" fill="#E5E9EF" />

      {/* badge celebración */}
      <rect x="470" y="172" width="62" height="24" rx="12" fill="#611232" />
      <circle cx="484" cy="184" r="3" fill="#ffffff" />
      <circle cx="494" cy="184" r="3" fill="#ffffff" />
      <circle cx="504" cy="184" r="3" fill="#ffffff" />

      {/* barra inferior tipo ticker */}
      <rect x="264" y="288" width="272" height="8" rx="4" fill="#0aa16e" opacity="0.3" />
      <rect x="264" y="304" width="180" height="8" rx="4" fill="#006455" opacity="0.18" />

      {/* soporte pantalla principal */}
      <rect x="392" y="370" width="12" height="46" fill="#374151" />
      <rect x="356" y="416" width="84" height="10" rx="5" fill="#374151" />

      {/* confeti */}
      <circle cx="540" cy="120" r="5" fill="#0aa16e" opacity="0.6" />
      <circle cx="566" cy="150" r="4" fill="#611232" opacity="0.5" />
      <circle cx="220" cy="180" r="4" fill="#006455" opacity="0.4" />
      <circle cx="600" cy="220" r="3.5" fill="#0aa16e" opacity="0.5" />
      <circle cx="196" cy="260" r="3" fill="#611232" opacity="0.4" />
    </svg>
  );
}
