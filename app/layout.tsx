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
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#E2DFD7] text-[#141414] flex flex-col antialiased selection:bg-[#9CAF88] selection:text-[#FFFFFF]">
        {children}
      </body>
    </html>
  );
}
