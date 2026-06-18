"use client";

import { ethers } from "ethers";
import { useCallback, useEffect, useRef, useState } from "react";

import { ensureDiscovered, pickDetail, pickProvider, setChosenRdns, type Eip1193Provider } from "./wallet";
import { ARC_CHAIN_HEX, ARC_RPC, switchToArc } from "./arcNetwork";

// localStorage flag remembering that the user deliberately disconnected.
// Built from a namespace + slot so it differs per deployment.
const SESSION_NS = "fmn";
const DISCONNECT_KEY = `${SESSION_NS}:session-off`;

export function useWallet() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [chainOk, setChainOk] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const disconnectedRef = useRef(false);
  const subRef = useRef<{ provider: Eip1193Provider; cleanup: () => void } | null>(null);

  // Read the native USDC balance off the public RPC (not the wallet provider).
  const refreshBalance = useCallback(async (addr: string) => {
    try {
      const rpc = new ethers.JsonRpcProvider(ARC_RPC);
      const wei = await rpc.getBalance(addr);
      setBalance(parseFloat(ethers.formatEther(wei)).toFixed(3));
    } catch {
      setBalance("—");
    }
  }, []);

  // Wire account/chain change listeners onto the active provider.
  const subscribe = useCallback(
    (eth: Eip1193Provider) => {
      if (!eth?.on) return;
      if (subRef.current?.provider === eth) return;
      subRef.current?.cleanup();

      const handleAccounts = (payload: unknown) => {
        if (disconnectedRef.current) return;
        const list = payload as string[];
        if (list.length) {
          setAccount(list[0]);
          refreshBalance(list[0]);
        } else {
          setAccount("");
          setBalance("");
          setChainOk(false);
        }
      };
      const handleChain = (payload: unknown) =>
        setChainOk((payload as string).toLowerCase() === ARC_CHAIN_HEX.toLowerCase());

      eth.on("accountsChanged", handleAccounts);
      eth.on("chainChanged", handleChain);
      subRef.current = {
        provider: eth,
        cleanup: () => {
          eth.removeListener?.("accountsChanged", handleAccounts);
          eth.removeListener?.("chainChanged", handleChain);
        },
      };
    },
    [refreshBalance]
  );

  const connect = useCallback(async () => {
    disconnectedRef.current = false;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(DISCONNECT_KEY);
      } catch {
        /* ignore */
      }
    }
    await ensureDiscovered();
    const detail = pickDetail();
    const eth = detail?.provider;
    if (!eth) return;
    setChosenRdns(detail.rdns);
    setConnecting(true);
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) return;
      setAccount(accounts[0]);
      subscribe(eth);
      try {
        await switchToArc(eth);
      } catch {
        /* user declined the network switch */
      }
      try {
        const cid = (await eth.request({ method: "eth_chainId" })) as string;
        setChainOk(cid.toLowerCase() === ARC_CHAIN_HEX.toLowerCase());
      } catch {
        setChainOk(false);
      }
      refreshBalance(accounts[0]);
    } catch {
      /* user rejected the connection */
    } finally {
      setConnecting(false);
    }
  }, [refreshBalance, subscribe]);

  const disconnect = useCallback(() => {
    disconnectedRef.current = true;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(DISCONNECT_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    setAccount("");
    setBalance("");
    setChainOk(false);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(DISCONNECT_KEY) === "1") {
      disconnectedRef.current = true;
    }
    (async () => {
      await ensureDiscovered();
      const eth = pickProvider();
      if (!eth) return;
      // Silently rehydrate an existing session unless the user opted out.
      if (!disconnectedRef.current) {
        try {
          const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
          if (accounts.length) {
            setAccount(accounts[0]);
            refreshBalance(accounts[0]);
            eth
              .request({ method: "eth_chainId" })
              .then((cid) => setChainOk((cid as string).toLowerCase() === ARC_CHAIN_HEX.toLowerCase()))
              .catch(() => {});
          }
        } catch {
          /* ignore — no prior authorization */
        }
      }
      subscribe(eth);
    })();
    return () => {
      subRef.current?.cleanup();
      subRef.current = null;
    };
  }, [refreshBalance, subscribe]);

  return { account, balance, chainOk, connecting, connect, disconnect, refreshBalance };
}
