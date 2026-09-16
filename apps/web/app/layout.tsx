import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "FactorIA — Tu Fábrica de Agentes",
  description: "Panel de control multi-tenant para el Agente IA de WhatsApp",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" data-palette="cool" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
