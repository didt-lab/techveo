"use client";

export function InitialsAvatar({
  nombre,
  className = "",
}: {
  nombre: string;
  className?: string;
}) {
  const initials = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div
      className={`flex items-center justify-center bg-white/10 text-white font-bold text-2xl ${className}`}
    >
      {initials}
    </div>
  );
}
