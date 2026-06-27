import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";

import { PitchBackground } from "@/components/PitchBackground";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata = {
  title: "한국 32강 진출 확정",
  description:
    "2026 월드컵 한국 32강 진출 확정 — 조 3위 12팀 중 8위로 마지막 와일드카드 획득.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <PitchBackground />
        {children}
      </body>
    </html>
  );
}
