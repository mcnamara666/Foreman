import type { Metadata } from "next";
import { Saira_Condensed, Public_Sans, Courier_Prime } from "next/font/google";
import "./globals.css";

// Condensed industrial signage — site notices, stencilled headings.
const display = Saira_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Sturdy, workmanlike body copy.
const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Typewriter docket mono — for numbers, docket refs, addresses.
const mono = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Foreman — log the job, get signed off, get paid · on ARC",
  description:
    "Log a finished job with before/after photos. The Foreman — an autonomous agent on ARC — checks your work, signs the docket and pays your USDC bounty. No invoice, no waiting. Mates can endorse a good job in USDC.",
  keywords: "Foreman, ARC, USDC, agent, agentic payments, trades, builder, job ticket, sign-off, proof of work, web3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
