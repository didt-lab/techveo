"use client";

export function CapsuleHeader({
  type,
}: {
  type: "birthday" | "anniversary";
}) {
  const isBirthday = type === "birthday";

  return (
    <div
      className={`
        text-center py-4 mb-8
        ${isBirthday ? "text-pink-300" : "text-amber-300"}
      `}
    >
      <span className="text-5xl mb-2 block">
        {isBirthday ? "🎂" : "🏆"}
      </span>
      <h2 className="text-3xl font-bold uppercase tracking-wider">
        {isBirthday ? "Cumpleaños" : "Aniversarios de Servicio"}
      </h2>
    </div>
  );
}
