import { ethers } from "ethers";
import { ARC_RPC } from "@/lib/arcNetwork";
import { CONTRACT_ADDRESS, FOREMAN_ABI, hasContract, toJob } from "@/lib/foreman";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The Foreman agent. Finds jobs that haven't been signed off and signs them off,
 * paying each builder a USDC bounty straight from the agent's own wallet — a
 * machine-to-person payment with no human signature.
 *
 * Runs are serialized (one at a time per instance) with a short cooldown so a
 * double-click or the post-log auto-trigger can't race the wallet's nonce.
 */

let running: Promise<Response> | null = null;
let lastRun = 0;

async function doRun(): Promise<Response> {
  const key = process.env.AGENT_PRIVATE_KEY;
  if (!key) return Response.json({ error: "Agent not configured" }, { status: 500 });
  if (!hasContract()) return Response.json({ error: "Contract not wired in" }, { status: 500 });

  const bounty = ethers.parseEther(process.env.AGENT_BOUNTY || "0.05");

  try {
    const provider = new ethers.JsonRpcProvider(ARC_RPC);
    const wallet = new ethers.Wallet(key, provider);
    const c = new ethers.Contract(CONTRACT_ADDRESS, FOREMAN_ABI, wallet);

    const ids: bigint[] = await c.latest(24);
    const all = await Promise.all(ids.map(async (id) => toJob(await c.getJob(id))));
    const pending = all.filter((j) => !j.verified).sort((a, b) => a.id - b.id).slice(0, 4);

    let balance = await provider.getBalance(wallet.address);
    if (pending.length === 0) {
      return Response.json({ address: wallet.address, balance: ethers.formatEther(balance), signed: [] });
    }

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 1_000_000_000n;

    const signed: number[] = [];
    const failures: { id: number; reason: string }[] = [];
    let nonce = await provider.getTransactionCount(wallet.address, "pending");
    let needsFunds = false;

    for (const j of pending) {
      // estimateGas doubles as a fresh "is this still unverified / would it succeed?" check —
      // it reverts if the job was just signed off by a concurrent run, or if the builder rejects funds.
      let gas: bigint;
      try {
        gas = await c.signOff.estimateGas(j.id, { value: bounty });
      } catch {
        continue; // already settled or would revert — skip quietly
      }
      const cost = bounty + (gas * gasPrice * 13n) / 10n; // bounty + ~30% gas headroom
      if (balance < cost) {
        needsFunds = true;
        break;
      }
      try {
        const tx = await c.signOff(j.id, { value: bounty, nonce: nonce++, gasLimit: (gas * 13n) / 10n });
        await tx.wait();
        signed.push(j.id);
        balance = await provider.getBalance(wallet.address);
      } catch (e) {
        nonce = await provider.getTransactionCount(wallet.address, "pending"); // resync after a failed send
        const fresh = toJob(await c.getJob(j.id));
        if (!fresh.verified) {
          const reason = (e as Error)?.message?.slice(0, 90) || "sign-off failed";
          failures.push({ id: j.id, reason });
          console.error("foreman agent: signOff failed for job", j.id, reason);
        }
      }
    }

    const finalBal = await provider.getBalance(wallet.address);
    return Response.json({
      address: wallet.address,
      balance: ethers.formatEther(finalBal),
      signed,
      failures,
      needsFunds,
      bounty: ethers.formatEther(bounty),
    });
  } catch {
    return Response.json({ error: "Agent run failed" }, { status: 500 });
  }
}

export async function POST() {
  if (running) return (await running).clone();
  if (Date.now() - lastRun < 2500) {
    return Response.json({ signed: [], message: "The Foreman just ran — give it a second" });
  }
  lastRun = Date.now();
  running = doRun();
  try {
    return (await running).clone();
  } finally {
    running = null;
  }
}
