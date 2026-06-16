import { ethers } from "ethers";
import { ARC_RPC } from "./arcNetwork";

// ─────────────────────────────────────────────────────────────
// Foreman — an on-chain work log, signed off and paid by an agent.
// One deployed contract; the single source of truth.
// ─────────────────────────────────────────────────────────────
export const CONTRACT_ADDRESS = "0x9aFb21905f694eb4133B96c3e5714C3f5085b165";

export const FOREMAN_ABI = [
  "function logJob(string beforeUri, string afterUri, string title, string kind, string location, bool isPrivate) returns (uint256)",
  "function signOff(uint256 id) payable",
  "function endorse(uint256 id) payable",
  "function jobCount() view returns (uint256)",
  "function verifiedCount() view returns (uint256)",
  "function bountiesPaid() view returns (uint256)",
  "function endorsedTotal() view returns (uint256)",
  "function earned(address) view returns (uint256)",
  "function getJob(uint256) view returns (tuple(uint256 id, address builder, string beforeUri, string afterUri, string title, string kind, string location, uint64 loggedAt, bool isPrivate, bool verified, uint64 verifiedAt, address signedBy, uint256 bounty, uint256 endorsedTotal, uint32 endorsements))",
  "function jobsOf(address) view returns (uint256[])",
  "function latest(uint256 n) view returns (uint256[])",
  "event Logged(uint256 indexed id, address indexed builder, string title, string kind, bool isPrivate)",
  "event SignedOff(uint256 indexed id, address indexed builder, address indexed agent, uint256 bounty)",
  "event Endorsed(uint256 indexed id, address indexed builder, address indexed from, uint256 amount)",
];

export interface Job {
  id: number;
  builder: string;
  beforeUri: string;
  afterUri: string;
  title: string;
  kind: string;
  location: string;
  loggedAt: number;
  isPrivate: boolean;
  verified: boolean;
  verifiedAt: number;
  signedBy: string;
  bounty: bigint;
  endorsedTotal: bigint;
  endorsements: number;
}

export interface Stats {
  jobs: number;
  verified: number;
  bounties: bigint;
  endorsed: bigint;
}

export const EMPTY_STATS: Stats = { jobs: 0, verified: 0, bounties: 0n, endorsed: 0n };

export const MAX = 48;

// ── connection ───────────────────────────────────────────────
export function readProvider() {
  return new ethers.JsonRpcProvider(ARC_RPC);
}
export function readContract(provider?: ethers.Provider) {
  return new ethers.Contract(CONTRACT_ADDRESS, FOREMAN_ABI, provider ?? readProvider());
}
export function hasContract(): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  const failed: T[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const settled = await Promise.allSettled(batch.map(fn));
    settled.forEach((s, j) => (s.status === "fulfilled" ? out.push(s.value) : failed.push(batch[j])));
  }
  const stillFailed: T[] = [];
  for (let i = 0; i < failed.length; i += limit) {
    const batch = failed.slice(i, i + limit);
    const settled = await Promise.allSettled(batch.map(fn));
    settled.forEach((s, j) => (s.status === "fulfilled" ? out.push(s.value) : stillFailed.push(batch[j])));
  }
  if (stillFailed.length) console.warn(`foreman: ${stillFailed.length} read(s) failed after retry`);
  return out;
}

type RawJob = {
  id: bigint; builder: string; beforeUri: string; afterUri: string; title: string; kind: string;
  location: string; loggedAt: bigint; isPrivate: boolean; verified: boolean; verifiedAt: bigint;
  signedBy: string; bounty: bigint; endorsedTotal: bigint; endorsements: bigint;
};
export function toJob(j: RawJob): Job {
  return {
    id: Number(j.id),
    builder: j.builder,
    beforeUri: j.beforeUri,
    afterUri: j.afterUri,
    title: j.title,
    kind: j.kind,
    location: j.location,
    loggedAt: Number(j.loggedAt),
    isPrivate: j.isPrivate,
    verified: j.verified,
    verifiedAt: Number(j.verifiedAt),
    signedBy: j.signedBy,
    bounty: j.bounty,
    endorsedTotal: j.endorsedTotal,
    endorsements: Number(j.endorsements),
  };
}

// ── reads ────────────────────────────────────────────────────
export async function fetchStats(contract?: ethers.Contract): Promise<Stats> {
  const c = contract ?? readContract();
  const [jobs, verified, bounties, endorsed] = await Promise.all([
    c.jobCount(),
    c.verifiedCount(),
    c.bountiesPaid(),
    c.endorsedTotal(),
  ]);
  return { jobs: Number(jobs), verified: Number(verified), bounties, endorsed };
}

/** Latest jobs (newest first), windowed to MAX. Private jobs are kept — filter on the client by viewer. */
export async function fetchLatest(contract?: ethers.Contract): Promise<Job[]> {
  const c = contract ?? readContract();
  const ids: bigint[] = await c.latest(MAX);
  const raw = await mapLimit(ids.map(Number), 8, async (id) => toJob(await c.getJob(id)));
  raw.sort((a, b) => b.id - a.id);
  return raw;
}

export async function fetchJobsOf(addr: string, contract?: ethers.Contract): Promise<Job[]> {
  const c = contract ?? readContract();
  const ids: bigint[] = await c.jobsOf(addr);
  const raw = await mapLimit(ids.slice(-MAX).map(Number), 8, async (id) => toJob(await c.getJob(id)));
  raw.sort((a, b) => b.id - a.id);
  return raw;
}

export async function fetchEarned(addr: string, contract?: ethers.Contract): Promise<bigint> {
  const c = contract ?? readContract();
  return await c.earned(addr);
}

// ── formatting ───────────────────────────────────────────────
export function shortAddr(addr: string, lead = 6, tail = 4): string {
  if (!addr) return "";
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

export function fmtUsdc(wei: bigint, dp = 2): string {
  const n = parseFloat(ethers.formatEther(wei));
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  if (n < 0.01) {
    const s = n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return s === "0" ? "<0.0001" : s;
  }
  const s = n.toFixed(dp);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

export function timeAgo(unixSeconds: number): string {
  if (!unixSeconds) return "";
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function looksLikeUrl(u: string): boolean {
  return /^https:\/\/.{3,}/.test(u.trim());
}
