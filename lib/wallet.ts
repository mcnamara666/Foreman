// Wallet provider discovery via EIP-6963 (window-announced injected providers).

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isRabby?: boolean;
  isMetaMask?: boolean;
}

interface ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: Eip1193Provider;
}

// Storage key is composed from a namespace + slot so it reads distinctly per app.
const STORE_NS = "fmn";
const RDNS_KEY = `${STORE_NS}:selected-rdns`;

// Wallets we reach for first when the user hasn't pinned one yet.
const PREFERENCE = ["io.rabby", "io.metamask"];

// Registry of providers the page has heard announce themselves.
const registry: ProviderDetail[] = [];

function upsert(detail?: ProviderDetail) {
  if (!detail?.info?.rdns || !detail.provider) return;
  const at = registry.findIndex((d) => d.info.rdns === detail.info.rdns);
  if (at === -1) registry.push(detail);
  else registry[at] = detail;
}

// Kick off discovery as soon as this module loads in the browser.
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e: Event) => {
    upsert((e as CustomEvent<ProviderDetail>).detail);
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function refreshWallets() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function setChosenRdns(rdns: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RDNS_KEY, rdns);
  } catch {
    /* storage may be unavailable */
  }
}

export function getChosenRdns(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(RDNS_KEY) || "";
  } catch {
    return "";
  }
}

export function ensureDiscovered(timeoutMs = 250): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (registry.length) {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve();
    };
    const onAnnounce = () => finish();
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    setTimeout(finish, timeoutMs);
  });
}

export function listWallets() {
  refreshWallets();
  return registry.map((d) => ({ name: d.info.name, rdns: d.info.rdns, icon: d.info.icon }));
}

export function pickDetail(rdns?: string): { provider: Eip1193Provider; rdns: string } | undefined {
  refreshWallets();

  // 1) Honour an explicit request or the previously-pinned wallet.
  const want = rdns ?? getChosenRdns();
  if (want) {
    const hit = registry.find((d) => d.info.rdns === want);
    if (hit) return { provider: hit.provider, rdns: hit.info.rdns };
  }

  // 2) Fall back to the preference order.
  for (const r of PREFERENCE) {
    const hit = registry.find((d) => d.info.rdns === r);
    if (hit) return { provider: hit.provider, rdns: hit.info.rdns };
  }

  // 3) Otherwise take whatever announced first.
  if (registry[0]) return { provider: registry[0].provider, rdns: registry[0].info.rdns };
  return undefined;
}

export function pickProvider(rdns?: string): Eip1193Provider | undefined {
  const d = pickDetail(rdns);
  if (d) return d.provider;
  // Last resort: the legacy single-provider window.ethereum.
  return typeof window !== "undefined" ? (window.ethereum as Eip1193Provider | undefined) : undefined;
}
