import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = { title: "Turpilot", description: "Lokal GPX-navigasjon for mobil testing", manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", themeColor: "#f3f5ef" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="no"><body>{children}</body></html>; }
