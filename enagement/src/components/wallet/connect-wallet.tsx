import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { authenticateWallet, logoutWallet } from "@/lib/wallet/auth";
import { useWalletUiReady } from "@/lib/wallet/wallet-ui-ready";
import { getPreferredWalletName, isOkxInstalled } from "@/lib/wallet/detect";
import { OkxWalletName } from "@/lib/wallet/okx-wallet-adapter";
import {
  connectInjectedWallet,
  injectedSignMessage,
  waitForAnyInjectedWallet,
  type InjectedWallet,
} from "@/lib/wallet/injected-wallet";
import { ensureWalletNetwork, WalletNetworkError } from "@/lib/wallet/ensure-wallet-network";
import { shouldBlockWalletConnect, isMobileViewport, isWalletAppBrowser } from "@/lib/wallet/device";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function ConnectWalletButton({ size = "sm" }: { size?: "sm" | "default" }) {
  const walletUiReady = useWalletUiReady();
  if (!walletUiReady) {
    return (
      <Button size={size} className="gap-1.5 bg-primary text-primary-foreground" disabled>
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
  const { wallet: session, connectWallet, disconnectWallet } = useAppStore();
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
        toast.error("Sign in failed", {
          description: "Approve the login message in your wallet, then try again.",
        });
        await disconnect();
      } finally {
        authInFlight.current = false;
      }
    })();
  }, [connected, publicKey, signMessage, session.connected, connectWallet, disconnect]);

  async function connectWithInjected(injected: InjectedWallet) {
    await ensureWalletNetwork(injected.name);
    const pubkey = await connectInjectedWallet(injected);
    const { balance } = await authenticateWallet(pubkey, injectedSignMessage(injected));
    connectWallet(pubkey, balance);

    const entry = wallets.find((w) => w.adapter.name === injected.name);
    if (entry?.readyState === WalletReadyState.Installed) {
      try {
        select(injected.name as WalletName);
        await connect();
      } catch {
        // Session is established — adapter sync is optional
      }
    }
  }

  async function connectViaAdapter() {
    const preferred = getPreferredWalletName();
    if (preferred === "OKX Wallet") {
      const okx = wallets.find((w) => w.adapter.name === OkxWalletName);
      if (okx?.readyState === WalletReadyState.Installed) {
        if (wallet?.adapter.name !== OkxWalletName) select(OkxWalletName);
        await connect();
        return true;
      }
    }
    if (preferred === "Phantom") {
      const phantom = wallets.find((w) => w.adapter.name === "Phantom");
      if (phantom?.readyState === WalletReadyState.Installed) {
        if (wallet?.adapter.name !== "Phantom") select("Phantom" as WalletName);
        await connect();
        return true;
      }
    }
    const installed = wallets.filter((w) => w.readyState === WalletReadyState.Installed);
    if (installed.length === 1) {
      const only = installed[0];
      if (wallet?.adapter.name !== only.adapter.name) select(only.adapter.name);
      await connect();
      return true;
    }
    if (installed.length > 1) {
      setVisible(true);
      toast.message("Select your wallet", {
        description: "Approve connect, then sign the login message.",
      });
      return true;
    }
    return false;
  }

  async function handleConnect() {
    if (connectInFlight.current || connecting) return;
    connectInFlight.current = true;
    setError(null);

    try {
      if (shouldBlockWalletConnect()) {
        toast.error("Open in Safari or Chrome", {
          description:
            "Social in-app browsers block wallet extensions. Copy the link and open it in your phone browser.",
        });
        return;
      }

      const waitMs = isWalletAppBrowser() || isMobileViewport() ? 6000 : 3000;
      const injected = await waitForAnyInjectedWallet(waitMs);
      if (injected) {
        await connectWithInjected(injected);
        return;
      }

      const adapterConnected = await connectViaAdapter();
      if (adapterConnected) return;

      setVisible(true);
      toast.error("No wallet detected", {
        description: isMobileViewport()
          ? "Open this page in Phantom or OKX in-app browser, or install a wallet extension on desktop."
          : "Install Phantom or OKX Wallet extension, then reload this page.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open wallet";
      setError(message);
      if (err instanceof WalletNetworkError) {
        toast.error(message, { description: "Switch your wallet to Solana devnet, then retry." });
      } else if (isOkxInstalled()) {
        toast.error(message, { description: "Approve the connection in OKX Wallet, or enable Solana Devnet." });
      } else {
        toast.error(message);
      }
    } finally {
      connectInFlight.current = false;
    }
  }

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
      className="gap-1.5 bg-primary text-primary-foreground"
      disabled={connecting || connectInFlight.current}
      onClick={() => {
        void handleConnect();
      }}
    >
      <Wallet className="h-3.5 w-3.5" />
      {connecting ? "Connecting…" : isOkxInstalled() ? "Connect OKX" : "Connect"}
      {error ? <span className="sr-only">{error}</span> : null}
    </Button>
  );
}
