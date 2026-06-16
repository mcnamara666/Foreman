import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foreman — your work, signed off and paid, on ARC",
  description:
    "Log a finished job with before/after photos. An autonomous agent on ARC signs it off and pays you a USDC bounty — no human in the loop. Clients endorse your work in USDC.",
  keywords: "Foreman, ARC, USDC, agent, agentic payments, trades, builder, portfolio, proof of work, web3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
