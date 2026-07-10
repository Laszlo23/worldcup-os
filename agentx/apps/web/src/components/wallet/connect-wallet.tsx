"use client";

import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/lib/store/wallet";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { authenticateWallet, logoutWallet } from "@/lib/wallet/auth";
import { useWalletUiReady } from "@/lib/wallet/wallet-ui-ready";
import { getPreferredWalletName, isOkxInstalled } from "@/lib/wallet/detect";
import { OkxWalletName } from "@/lib/wallet/okx-wallet-adapter";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function ConnectWalletButton({ size = "sm" }: { size?: "sm" | "default" }) {
  const walletUiReady = useWalletUiReady();
  if (!walletUiReady) {
    return (
      <Button size={size} className="gap-1.5" disabled>
        <Wallet className="h-3.5 w-3.5" />
        Connect
      </Button>
    );
  }
  return <ConnectWalletButtonCore size={size} />;
}

function ConnectWalletButtonCore({ size = "sm" }: { size?: "sm" | "default" }) {
  const { publicKey, connected, connecting, signMessage, disconnect, select, wallets, connect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const { wallet: session, connectWallet, disconnectWallet } = useWalletStore();
  const authInFlight = useRef(false);
  const connectInFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || !publicKey || !signMessage || session.connected) return;
    const pubkey = publicKey.toBase58();
    if (authInFlight.current) return;
    authInFlight.current = true;
    void (async () => {
      try {
        const { balance } = await authenticateWallet(pubkey, (msg) => signMessage(msg));
        connectWallet(pubkey, balance);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Auth failed");
        toast.error("Sign in failed");
        await disconnect();
      } finally {
        authInFlight.current = false;
      }
    })();
  }, [connected, publicKey, signMessage, session.connected, connectWallet, disconnect]);

  const connectPreferred = async () => {
    if (connectInFlight.current || connecting) return;
    connectInFlight.current = true;
    setError(null);
    try {
      const preferred = getPreferredWalletName();
      if (preferred === "OKX Wallet") {
        const okx = wallets.find((w) => w.adapter.name === OkxWalletName);
        if (okx?.readyState === WalletReadyState.Installed) {
          if (wallet?.adapter.name !== OkxWalletName) select(OkxWalletName);
          await connect();
          return;
        }
      }
      if (preferred === "Phantom") {
        const phantom = wallets.find((w) => w.adapter.name === "Phantom");
        if (phantom?.readyState === WalletReadyState.Installed) {
          if (wallet?.adapter.name !== "Phantom") select("Phantom" as typeof OkxWalletName);
          await connect();
          return;
        }
      }
      const installed = wallets.filter((w) => w.readyState === WalletReadyState.Installed);
      if (installed.length === 1) {
        const only = installed[0];
        if (wallet?.adapter.name !== only.adapter.name) select(only.adapter.name);
        await connect();
        return;
      }
      setVisible(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open wallet";
      setError(message);
      if (isOkxInstalled()) {
        toast.error(message, { description: "Approve the connection in OKX Wallet, or enable Solana Devnet." });
      } else {
        toast.error(message);
      }
    } finally {
      connectInFlight.current = false;
    }
  };

  if (session.connected) {
    return (
      <Button
        size={size}
        variant="outline"
        className="font-mono text-[10px] uppercase tracking-wider"
        onClick={() => {
          void logoutWallet();
          disconnectWallet();
          void disconnect();
        }}
      >
        {session.address.slice(0, 4)}…{session.address.slice(-4)}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      className="gap-1.5"
      disabled={connecting}
      onClick={() => {
        void connectPreferred();
      }}
    >
      <Wallet className="h-3.5 w-3.5" />
      {connecting ? "Connecting…" : isOkxInstalled() ? "Connect OKX" : "Connect"}
      {error ? <span className="sr-only">{error}</span> : null}
    </Button>
  );
}
