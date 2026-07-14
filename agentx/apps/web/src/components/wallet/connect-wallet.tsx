"use client";

import { Copy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/lib/store/wallet";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { authenticateWallet, logoutWallet } from "@/lib/wallet/auth";
import { useWalletUiReady } from "@/lib/wallet/wallet-ui-ready";
import { getPreferredWalletName, isOkxInstalled } from "@/lib/wallet/detect";
import { OkxWalletName } from "@/lib/wallet/okx-wallet-adapter";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import {
  connectInjectedWallet,
  getInjectedWallet,
  injectedSignMessage,
  waitForAnyInjectedWallet,
} from "@/lib/wallet/injected-wallet";
import {
  consumePhantomConnectIntent,
  isMobileViewport,
  isSocialInAppBrowser,
  shouldBlockWalletConnect,
} from "@/lib/wallet/device";
import { usePhantomMobileStatus } from "@/lib/wallet/use-phantom-mobile";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ConnectWalletButton({
  size = "sm",
  compact = false,
}: {
  size?: "sm" | "default";
  compact?: boolean;
}) {
  const walletUiReady = useWalletUiReady();
  if (!walletUiReady) {
    return (
      <Button size={size} className="min-h-11 gap-1.5" disabled>
        <Wallet className="h-3.5 w-3.5" />
        Connect
      </Button>
    );
  }
  return <ConnectWalletButtonCore size={size} compact={compact} />;
}

function ConnectWalletButtonCore({
  size = "sm",
  compact = false,
}: {
  size?: "sm" | "default";
  compact?: boolean;
}) {
  const { publicKey, connected, connecting, signMessage, disconnect, select, wallets, connect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const { wallet: session, connectWallet, disconnectWallet } = useWalletStore();
  const authInFlight = useRef(false);
  const connectInFlight = useRef(false);
  const pendingConnectRan = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const mobileStatus = usePhantomMobileStatus();

  async function runAuth(pubkey: string, signFn: (msg: Uint8Array) => Promise<Uint8Array>) {
    const { balance } = await authenticateWallet(pubkey, signFn);
    connectWallet(pubkey, balance);
  }

  useEffect(() => {
    if (!connected || !publicKey || !signMessage || session.connected) return;
    const pubkey = publicKey.toBase58();
    if (authInFlight.current) return;
    authInFlight.current = true;
    void (async () => {
      try {
        await runAuth(pubkey, (msg) => signMessage(msg));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Auth failed");
        toast.error("Sign in failed");
        await disconnect();
      } finally {
        authInFlight.current = false;
      }
    })();
  }, [connected, publicKey, signMessage, session.connected, connectWallet, disconnect]);

  useEffect(() => {
    if (pendingConnectRan.current || session.connected) return;
    if (!consumePhantomConnectIntent()) return;
    pendingConnectRan.current = true;
    void (async () => {
      const injected = await waitForAnyInjectedWallet(8000);
      if (!injected) return;
      try {
        const pubkey = await connectInjectedWallet(injected);
        await runAuth(pubkey, injectedSignMessage(injected));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Connect failed");
      }
    })();
  }, [session.connected, connectWallet]);

  const connectPreferred = async () => {
    if (connectInFlight.current || connecting) return;
    if (shouldBlockWalletConnect()) {
      toast.error("Open in Safari or Chrome", {
        description: "Copy this URL out of Telegram/X, or use Phantom's in-app browser.",
      });
      return;
    }
    connectInFlight.current = true;
    setError(null);
    try {
      const waitMs = isMobileViewport() ? 8000 : 2000;
      const injected = await waitForAnyInjectedWallet(waitMs);
      if (injected) {
        const pubkey = await connectInjectedWallet(injected);
        await runAuth(pubkey, injectedSignMessage(injected));
        return;
      }

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
      toast.error(message, {
        description: isMobileViewport()
          ? "Use WalletConnect in the modal, or open this site inside Phantom."
          : undefined,
      });
    } finally {
      connectInFlight.current = false;
    }
  };

  const showMobileHelp =
    !compact &&
    isMobileViewport() &&
    !session.connected &&
    (mobileStatus === "mobile_external" || mobileStatus === "in_app_blocked");

  if (session.connected) {
    return (
      <Button
        size={size}
        variant="outline"
        className="min-h-11 font-mono text-[10px] uppercase tracking-wider"
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
    <div className="flex flex-col items-end gap-1">
      <Button
        size={size}
        className={cn("min-h-11 gap-1.5", size === "default" && "px-4")}
        disabled={connecting || mobileStatus === "checking"}
        onClick={() => {
          void connectPreferred();
        }}
      >
        <Wallet className="h-3.5 w-3.5" />
        {connecting ? "Connecting…" : isOkxInstalled() ? "Connect OKX" : "Connect"}
      </Button>
      {showMobileHelp ? (
        <button
          type="button"
          className="flex max-w-[220px] items-center gap-1 text-right text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied — open in Phantom or scan with WalletConnect");
          }}
        >
          <Copy className="h-3 w-3 shrink-0" />
          Mobile: open in Phantom app or use WalletConnect QR
        </button>
      ) : null}
      {error ? <span className="sr-only">{error}</span> : null}
      {!compact && isSocialInAppBrowser() && !getInjectedWallet() ? (
        <span className="max-w-[200px] text-right text-[10px] text-amber-500/90">
          In-app browser — copy URL to Safari/Phantom
        </span>
      ) : null}
    </div>
  );
}
