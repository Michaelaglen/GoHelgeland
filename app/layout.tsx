import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = { title: "GoHelgeland", description: "Lokal GPX-navigasjon for mobil og felt", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "GoHelgeland" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", themeColor: "#f3f5ef" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="no"><body><PwaRegister />{children}</body></html>; }
