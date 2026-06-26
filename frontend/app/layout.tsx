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
  title: "한국 32강 경우의 수",
  description:
    "2026 월드컵 한국 32강 진출 시나리오 — 조 3위 상위 8팀 경쟁을 실시간으로 계산하는 관제 도구.",
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
