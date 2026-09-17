import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Necesario para probar Embedded Signup de Meta en desarrollo: ese flujo
  // exige un dominio "real" (con punto) en la lista de autorizados de Meta,
  // así que accedemos vía lvh.me (resuelve a 127.0.0.1 por DNS público) en
  // vez de localhost — pero el dev server de Next.js rechaza por default
  // cualquier origen que no sea localhost/127.0.0.1, por protección contra
  // DNS rebinding. Sin esto, la hidratación de React falla en silencio.
  allowedDevOrigins: ["lvh.me", "*.lvh.me"],
};

export default nextConfig;
