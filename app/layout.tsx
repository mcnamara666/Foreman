import type { Metadata } from "next";
import { Onest, Fragment_Mono } from "next/font/google";
import "./globals.css";

const inter = Onest({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = Fragment_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Foreman — your work, signed off and paid, on ARC",
  description:
    "Log a finished job with before/after photos. An autonomous agent on ARC signs it off and pays you a USDC bounty — no human in the loop. Clients endorse your work in USDC.",
  keywords: "Foreman, ARC, USDC, agent, agentic payments, trades, builder, portfolio, proof of work, web3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
