import { IdCard, KeyRound, LogOut, Wallet } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
import { hasSmartWallet, lockSmartWallet } from "@/lib/wallet/smart-wallet";
import { SmartWalletDialog } from "@/components/wallet/smart-wallet-dialog";
import { useWalletSigningReady } from "@/hooks/use-wallet-signing-ready";
import { getSigningStatus } from "@/lib/wallet/signing-status";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function ConnectWalletButton({
  size = "sm",
  onOpenWallet,
}: {
  size?: "sm" | "default";
  onOpenWallet?: () => void;
}) {
  const walletUiReady = useWalletUiReady();
  if (!walletUiReady) {
    return (
      <Button size={size} className="gap-1.5 bg-primary text-primary-foreground" disabled>
        <Wallet className="h-3.5 w-3.5" />
        Connect
      </Button>
    );
  }
  return <ConnectWalletButtonCore size={size} onOpenWallet={onOpenWallet} />;
}

function ConnectWalletButtonCore({
  size = "sm",
  onOpenWallet,
}: {
  size?: "sm" | "default";
  onOpenWallet?: () => void;
}) {
  const { publicKey, connected, connecting, signMessage, disconnect, select, wallets, connect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const { wallet: session, connectWallet, disconnectWallet } = useAppStore();
  const authInFlight = useRef(false);
  const connectInFlight = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [smartOpen, setSmartOpen] = useState(false);
  const [smartMode, setSmartMode] = useState<"auto" | "create" | "unlock">("auto");
  const [menuOpen, setMenuOpen] = useState(false);
  const mounted = useClientMounted();
  const smartExists = mounted && hasSmartWallet();
  const signingReady = useWalletSigningReady();
  const needsSigner = session.connected && !signingReady;

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

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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
            "Social in-app browsers block wallet extensions. Copy the link and open it in your phone browser — or create a MatchMind smart wallet.",
        });
        setSmartMode(hasSmartWallet() ? "unlock" : "create");
        setSmartOpen(true);
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

      setSmartMode(hasSmartWallet() ? "unlock" : "create");
      setSmartOpen(true);
      toast.message(hasSmartWallet() ? "Unlock smart wallet" : "Create a smart wallet", {
        description: "No extension detected — use MatchMind’s in-app Solana wallet.",
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

  async function handleLogout() {
    setMenuOpen(false);
    await logoutWallet();
    lockSmartWallet();
    disconnectWallet();
    await disconnect();
  }

  if (session.connected) {
    return (
      <>
        <div className="relative flex items-center gap-1.5" ref={menuRef}>
          {needsSigner ? (
            <Button
              size={size}
              variant="outline"
              className="gap-1 border-accent/50 bg-accent/15 px-2 text-accent"
              onClick={() => {
                const status = getSigningStatus();
                setSmartMode(status.kind === "create_smart" ? "create" : "unlock");
                setSmartOpen(true);
              }}
              title="Unlock signer for on-chain claims"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {size === "default" ? (smartExists ? "Unlock" : "Create") : null}
            </Button>
          ) : null}
          <Button
            size={size}
            variant="outline"
            className="font-mono text-[10px] uppercase tracking-wider"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {session.address.slice(0, 4)}…{session.address.slice(-4)}
          </Button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-48 overflow-hidden rounded-2xl border border-border bg-card/95 p-1 shadow-[0_16px_40px_-20px_oklch(0_0_0_/_0.75)] backdrop-blur-xl"
            >
              {needsSigner ? (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-accent transition hover:bg-accent/10"
                  onClick={() => {
                    setMenuOpen(false);
                    const status = getSigningStatus();
                    setSmartMode(status.kind === "create_smart" ? "create" : "unlock");
                    setSmartOpen(true);
                  }}
                >
                  <KeyRound className="size-4" />
                  {smartExists ? "Unlock to sign" : "Create smart wallet"}
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-foreground transition hover:bg-primary/10"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenWallet?.();
                }}
              >
                <Wallet className="size-4 text-primary" />
                Wallet
              </button>
              <Link
                to="/passport"
                role="menuitem"
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground transition hover:bg-primary/10"
                onClick={() => setMenuOpen(false)}
              >
                <IdCard className="size-4 text-primary" />
                Profile
              </Link>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-live transition hover:bg-live/10"
                onClick={() => void handleLogout()}
              >
                <LogOut className="size-4" />
                Log out
              </button>
            </div>
          ) : null}
        </div>
        <SmartWalletDialog open={smartOpen} onOpenChange={setSmartOpen} mode={smartMode} />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button
          size={size}
          variant="outline"
          className="gap-1 border-primary/40 bg-primary/10 px-2 text-primary"
          onClick={() => {
            setSmartMode(smartExists ? "unlock" : "create");
            setSmartOpen(true);
          }}
          title={smartExists ? "Unlock smart wallet" : "Create smart wallet"}
        >
          <KeyRound className="h-3.5 w-3.5" />
          {size === "default" ? (smartExists ? "Unlock" : "Create") : null}
        </Button>
        <Button
          size={size}
          className="gap-1.5 bg-primary text-primary-foreground"
          disabled={connecting || connectInFlight.current}
          onClick={() => {
            void handleConnect();
          }}
        >
          <Wallet className="h-3.5 w-3.5" />
          {connecting ? "Connecting…" : isOkxInstalled() ? "OKX" : "Connect"}
          {error ? <span className="sr-only">{error}</span> : null}
        </Button>
      </div>
      <SmartWalletDialog open={smartOpen} onOpenChange={setSmartOpen} mode={smartMode} />
    </>
  );
}
