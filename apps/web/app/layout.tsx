import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "FactorIA — Tu Fábrica de Agentes",
  description: "Panel de control multi-tenant para el Agente IA de WhatsApp",
};

// Se ejecuta antes del primer paint para que el modo oscuro no "parpadee"
// en blanco al cargar la página (evita el flash of unstyled content).
const THEME_INIT_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('factoria-theme');
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" data-palette="apple" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
