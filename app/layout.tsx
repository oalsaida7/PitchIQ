import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PitchIQ — AI Football Scout & Match Analyst",
  description:
    "AI-powered football app. Live match analysis, player scouting reports, player comparison, and similarity search. Built with Next.js and Claude AI.",
  openGraph: {
    title: "PitchIQ",
    description: "AI-powered football match analyst and player scout",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
