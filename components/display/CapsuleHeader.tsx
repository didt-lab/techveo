"use client";

export function CapsuleHeader({
  type,
}: {
  type: "birthday" | "anniversary" | "newhire";
}) {
  if (type === "birthday") {
    return (
      <div className="text-center mb-10 pt-8">
        <h2 className="text-6xl font-extrabold">
          <span className="text-purple-600 italic">&#161;Feliz</span>{" "}
          <span className="text-teal-500 italic">Cumple!</span>
        </h2>
        <p className="text-gray-400 text-lg mt-2"></p>
      </div>
    );
  }

  if (type === "anniversary") {
    return (
      <div className="text-center mb-10 pt-8">
        <h2 className="text-5xl font-extrabold">
          <span className="text-purple-600">&#161;Felicidades!</span>
        </h2>
        <p className="text-gray-400 text-lg mt-2">Aniversario de Servicio</p>
      </div>
    );
  }

  // newhire
  return (
    <div className="text-center mb-10 pt-8">
      <h2 className="text-6xl font-extrabold">
        <span className="text-teal-500">Nuevos Ingresos</span>
      </h2>
      <p className="text-purple-600 text-4xl font-extrabold mt-4">¡Bienvenidos a la DIDT!</p>
    </div>
  );
}
