import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PitchIQ — AI Football Intelligence",
  description: "Live scores, AI predictions, player scouting, transfer news. World Cup 2026 & all major leagues.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "#0B0C10", minHeight: "100vh" }}>{children}</body>
    </html>
  );
}
