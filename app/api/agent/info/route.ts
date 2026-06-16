import { ethers } from "ethers";
import { ARC_RPC } from "@/lib/arcNetwork";

export const runtime = "nodejs";

/** Reports the Foreman agent's wallet address + USDC balance, so the UI can show it (and where to fund it). */
export async function GET() {
  const key = process.env.AGENT_PRIVATE_KEY;
  if (!key) return Response.json({ configured: false });
  try {
    const wallet = new ethers.Wallet(key);
    const provider = new ethers.JsonRpcProvider(ARC_RPC);
    const bal = await provider.getBalance(wallet.address);
    return Response.json({
      configured: true,
      address: wallet.address,
      balance: ethers.formatEther(bal),
      bounty: process.env.AGENT_BOUNTY || "0.05",
    });
  } catch {
    return Response.json({ configured: false });
  }
}
