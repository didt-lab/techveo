import type { Metadata } from "next";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechVeo — DIDT",
  description: "Pantalla de cumpleaños y aniversarios DIDT IMSS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              var tvRoutes = ["/", "/aniversarios", "/nuevo-ingreso", "/techndencias"];
              if (tvRoutes.indexOf(location.pathname) !== -1) {
                document.documentElement.style.fontSize = "1.2vw";
              }
            })();`,
          }}
        />
      </head>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
