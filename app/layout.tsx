import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TerraPulse — Multimodal Micro-Climate & Crop Yield Engine",
  description:
    "Autonomous agent pipeline combining live Copernicus Sentinel-2 satellite imagery, ISRO Bhuvan overlays, root-zone soil telemetry, and monsoon reanalysis for micro-climate risk mitigation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-[#121212] text-[#F4F4F4] flex flex-col antialiased selection:bg-[#9CAF88] selection:text-[#121212]">
        {children}
      </body>
    </html>
  );
}
