"use client";

export function CapsuleHeader({
  type,
}: {
  type: "birthday" | "anniversary";
}) {
  const isBirthday = type === "birthday";

  return (
    <div className="text-center mb-10 pt-8">
      {isBirthday ? (
        <h2 className="text-6xl font-extrabold">
          <span className="text-purple-600 italic">&#161;Feliz</span>{" "}
          <span className="text-teal-500 italic">Cumple!</span>
        </h2>
      ) : (
        <h2 className="text-5xl font-extrabold">
          <span className="text-purple-600">&#161;Felicidades!</span>
        </h2>
      )}
      <p className="text-gray-400 text-lg mt-2">
        {isBirthday ? "" : "Aniversario de Servicio"}
      </p>
    </div>
  );
}
