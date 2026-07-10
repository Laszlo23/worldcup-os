import { Wallet, Copy, LogOut, ChevronDown, AlertCircle, RefreshCw, Smartphone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useAppStore } from "@/lib/store";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { authenticateWallet, logoutWallet, refreshWalletSession } from "@/lib/wallet/auth";
import { useWalletUiReady } from "@/lib/wallet/wallet-ui-ready";
import { getPhantomProvider, waitForPhantom } from "@/lib/wallet/phantom-connect";
import {
  connectInjectedWallet,
  getOkxProvider,
  getInjectedWallet,
  injectedSignMessage,
  waitForAnyInjectedWallet,
  type InjectedWallet,
  type InjectedWalletName,
} from "@/lib/wallet/injected-wallet";
import { ensureWalletNetwork, WalletNetworkError } from "@/lib/wallet/ensure-wallet-network";
import { getClientSolanaNetwork } from "@/lib/wallet/config";
import {
  consumePhantomConnectIntent,
  isInAppBrowser,
  isMobileViewport,
  markPhantomConnectPending,
  openPhantomMobileBrowser,
} from "@/lib/wallet/device";
import { usePhantomMobileStatus } from "@/lib/wallet/use-phantom-mobile";
import { useEffect, useRef, useState } from "react";
import { DevnetUsdcFaucet } from "@/components/devnet-usdc-faucet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { cn } from "@/lib/utils";

export function ConnectWalletButton({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const walletUiReady = useWalletUiReady();
  if (!walletUiReady) {
    return (
      <Button
        size={size}
        className={cn("bg-gradient-primary text-primary-foreground border-0 font-medium opacity-90", className)}
        onClick={() => toast("Wallet loading…", { description: "One moment — then try again." })}
      >
        <Wallet className="h-4 w-4" />
        <span className="hidden sm:inline">Connect Wallet</span>
        <span className="sm:hidden">Connect</span>
      </Button>
    );
  }
  return <ConnectWalletButtonCore size={size} className={className} />;
}

function ConnectWalletButtonCore({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const { wallet: adapterWallet, publicKey, connected, connecting, disconnect, signMessage, wallets, select, connect } =
    useWallet();
  const { setVisible } = useWalletModal();
  const { wallet, connectWallet, disconnectWallet } = useAppStore();
  const authAttempted = useRef<string | null>(null);
  const authInFlight = useRef(false);
  const pendingConnectRan = useRef(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showInjectionHelp, setShowInjectionHelp] = useState(false);
  const [connectingMobile, setConnectingMobile] = useState(false);
  const [mobile, setMobile] = useState(false);
  const phantomStatus = usePhantomMobileStatus();
  const needsPhantomBrowse =
    phantomStatus === "mobile_external" || phantomStatus === "phantom_browser";

  useEffect(() => {
    const update = () => setMobile(isMobileViewport());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  async function runAuth(pubkey: string, signFn: (message: Uint8Array) => Promise<Uint8Array>) {
    if (authInFlight.current) return;
    authInFlight.current = true;
    setAuthError(null);
    try {
      authAttempted.current = pubkey;
      const current = useAppStore.getState().wallet;
      if (current.connected && current.address && current.address !== pubkey) {
        try {
          await logoutWallet();
        } catch {
          // stale session cookie — safe to ignore
        }
      }
      const { balance } = await authenticateWallet(pubkey, signFn);
      connectWallet(pubkey, balance);
    } catch (err) {
      authAttempted.current = null;
      const message = err instanceof Error ? err.message : "Wallet authentication failed";
      setAuthError(message);
      toast.error(message, {
        description:
          err instanceof WalletNetworkError
            ? "Approve the devnet switch in your wallet, then retry."
            : "Click Retry sign-in and approve the message in your wallet.",
      });
    } finally {
      authInFlight.current = false;
    }
  }

  async function retrySignIn() {
    authAttempted.current = null;
    const injected = getInjectedWallet() ?? (wallet.address ? findInjectedBySession(wallet.address) : null);
    if (injected?.provider.publicKey) {
      const pk = injected.provider.publicKey.toString();
      await runAuth(pk, injectedSignMessage(injected));
      return;
    }
    if (connected && publicKey && signMessage) {
      await runAuth(publicKey.toBase58(), signMessage);
    }
  }

  function findInjectedBySession(address: string): InjectedWallet | null {
    const okx = getOkxProvider();
    if (okx?.publicKey?.toString() === address) return { name: "OKX Wallet", provider: okx };
    const phantom = getPhantomProvider();
    if (phantom?.publicKey?.toString() === address) return { name: "Phantom", provider: phantom };
    return null;
  }

  async function connectWithInjected(injected: InjectedWallet) {
    await ensureWalletNetwork(injected.name);
    const pubkey = await connectInjectedWallet(injected);
    await runAuth(pubkey, injectedSignMessage(injected));
    void syncAdapterIfInstalled(injected.name, pubkey);
  }

  useEffect(() => {
    if (wallet.connected && wallet.address) {
      authAttempted.current = wallet.address;
    }
  }, [wallet.connected, wallet.address]);

  useEffect(() => {
    if (!connected || !publicKey || connecting || !signMessage || wallet.connected) return;
    const pubkey = publicKey.toBase58();
    if (authAttempted.current === pubkey || authInFlight.current) return;

    void (async () => {
      const session = await refreshWalletSession();
      if (session?.wallet === pubkey) {
        authAttempted.current = pubkey;
        connectWallet(pubkey, session.balance);
        return;
      }
      await runAuth(pubkey, signMessage);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, connecting, publicKey, signMessage, wallet.connected]);

  // Only disconnect when Phantom actually disconnects — not when adapter is unsynced.
  useEffect(() => {
    if (!wallet.connected) return;
    const provider = getPhantomProvider();
    if (!provider) return;

    const onDisconnect = () => {
      void (async () => {
        try {
          await logoutWallet();
        } catch {
          // ignore
        }
        disconnectWallet({ silent: true });
        authAttempted.current = null;
        pendingConnectRan.current = false;
        setAuthError(null);
        toast.message("Wallet disconnected");
      })();
    };

    provider.on?.("disconnect", onDisconnect);
    return () => {
      provider.removeListener?.("disconnect", onDisconnect);
    };
  }, [wallet.connected, disconnectWallet]);

  // After Phantom browse redirect, auto-connect when provider injects in Phantom browser.
  useEffect(() => {
    if (wallet.connected || pendingConnectRan.current) return;
    const shouldAutoConnect = consumePhantomConnectIntent();
    if (!shouldAutoConnect) return;

    pendingConnectRan.current = true;
    void (async () => {
      const provider = await waitForPhantom(10_000);
      if (!provider || wallet.connected) {
        pendingConnectRan.current = false;
        return;
      }
      try {
        await connectWithInjected({ name: "Phantom", provider });
      } catch (err) {
        pendingConnectRan.current = false;
        const message = err instanceof Error ? err.message : "Could not connect wallet";
        if (!message.toLowerCase().includes("user rejected") && !message.toLowerCase().includes("cancel")) {
          setAuthError(message);
          console.error("[wallet auto-connect]", err);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.connected]);

  async function syncAdapterIfInstalled(name: InjectedWalletName, pubkey: string) {
    const entry = wallets.find((w) => w.adapter.name === name);
    if (entry?.readyState !== WalletReadyState.Installed) return;
    try {
      select(name as WalletName);
      await connect();
    } catch {
      console.debug("[wallet] adapter sync skipped for", pubkey.slice(0, 8));
    }
  }

  async function handleConnectClick() {
    setShowInjectionHelp(false);
    setAuthError(null);

    if (phantomStatus === "in_app_blocked" || isInAppBrowser()) {
      setShowInjectionHelp(true);
      toast.error("Open in Safari or Chrome", {
        description: "In-app browsers cannot connect wallets. Copy the link and open it in your phone browser.",
      });
      return;
    }

    setConnectingMobile(true);
    try {
      const injected = await waitForAnyInjectedWallet(phantomStatus === "mobile_external" ? 2500 : 1800);
      if (injected) {
        try {
          await connectWithInjected(injected);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not connect wallet";
          console.error("[wallet connect]", err);
          if (message.toLowerCase().includes("user rejected") || message.toLowerCase().includes("cancel")) {
            toast.message("Connection cancelled");
          } else {
            toast.error(message);
            setShowInjectionHelp(true);
          }
        }
        return;
      }

      const hasInstalledAdapter = wallets.some((w) => w.readyState === WalletReadyState.Installed);
      if (hasInstalledAdapter) {
        setVisible(true);
        toast.message("Select your wallet", {
          description:
            getClientSolanaNetwork() === "devnet"
              ? "OKX will prompt to switch to Solana devnet before signing."
              : undefined,
        });
        return;
      }

      if (phantomStatus === "mobile_external" || phantomStatus === "checking") {
        markPhantomConnectPending();
        toast.message("Opening Phantom browser…", {
          description: "Approve connect + sign in Phantom, then you'll return here signed in.",
          duration: 6000,
        });
        openPhantomMobileBrowser();
        return;
      }

      setShowInjectionHelp(true);
      toast.error("Wallet extension not detected", {
        description: "Install Phantom or OKX Wallet in Chrome/Firefox, then reload.",
      });
    } finally {
      setConnectingMobile(false);
    }
  }

  async function handleDisconnect() {
    authAttempted.current = null;
    pendingConnectRan.current = false;
    setAuthError(null);
    try {
      await logoutWallet();
    } catch {
      // session may already be cleared
    }
    const phantom = getPhantomProvider();
    const okx = getOkxProvider();
    if (phantom?.isConnected) {
      try {
        await phantom.disconnect();
      } catch {
        // ignore
      }
    }
    if (okx?.isConnected) {
      try {
        await okx.disconnect();
      } catch {
        // ignore
      }
    }
    await disconnect();
    disconnectWallet();
  }

  const connectLabel =
    phantomStatus === "checking" || connectingMobile
      ? "Connecting…"
      : phantomStatus === "injected" || phantomStatus === "phantom_browser"
        ? mobile
          ? "Connect"
          : "Connect Wallet"
        : needsPhantomBrowse
          ? "Connect"
          : connecting
            ? "Connecting…"
            : mobile
              ? "Connect"
              : "Connect Wallet";

  if (!wallet.connected) {
    return (
      <div className={cn("flex flex-col gap-2 w-full sm:w-auto sm:items-end", className)}>
        <Button
          size={size}
          type="button"
          onClick={() => void handleConnectClick()}
          disabled={connecting || connectingMobile || phantomStatus === "checking"}
          className="bg-gradient-primary text-primary-foreground border-0 hover:opacity-90 glow-primary font-medium w-full sm:w-auto min-h-[44px]"
        >
          {needsPhantomBrowse ? <Smartphone className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
          {connectLabel}
        </Button>
        {showInjectionHelp && (
          <div className="glass rounded-lg p-3 text-xs w-full sm:max-w-xs text-left space-y-2 border border-warning/30">
            <div className="flex items-center gap-2 text-warning font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {phantomStatus === "in_app_blocked" || isInAppBrowser()
                ? "Use your phone browser"
                : needsPhantomBrowse
                  ? "Connect via Phantom browser"
                  : "Wallet extension required"}
            </div>
            <ul className="text-muted-foreground space-y-1 list-disc pl-4">
              {phantomStatus === "in_app_blocked" || isInAppBrowser() ? (
                <>
                  <li>Copy this URL and open it in Safari or Chrome</li>
                  <li>In-app browsers (X, Instagram, Telegram) block wallets</li>
                </>
              ) : needsPhantomBrowse ? (
                <>
                  <li>Tap Connect — opens the site inside Phantom&apos;s browser</li>
                  <li>Approve connect, then sign the login message</li>
                  <li>Use Safari/Chrome on your phone (not the X in-app browser)</li>
                  <li>Phantom must be on devnet for predictions</li>
                </>
              ) : (
                <>
                  <li>Use Chrome or Firefox with Phantom or OKX Wallet</li>
                  <li>OKX auto-prompts to switch to Solana devnet on connect</li>
                  <li>Phantom: set network to Devnet in wallet settings</li>
                  <li>Reload after installing a wallet extension</li>
                </>
              )}
            </ul>
          </div>
        )}
        {authError && (
          <div className="glass rounded-lg p-3 text-xs w-full sm:max-w-xs text-left space-y-2 border border-destructive/30">
            <p className="text-destructive">{authError}</p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 w-full min-h-[44px]"
              onClick={() => void retrySignIn()}
            >
              <RefreshCw className="h-3 w-3" /> Retry sign-in
            </Button>
          </div>
        )}
      </div>
    );
  }

  const short = wallet.address.slice(0, 4) + "…" + wallet.address.slice(-4);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={cn("glass gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs min-h-[44px] max-w-[min(100vw-8rem,16rem)]", className)}
        >
          <span className="h-2 w-2 rounded-full bg-primary animate-live-dot shrink-0" />
          <span className="truncate">{short}</span>
          {!mobile && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="font-sans truncate">{wallet.balance.toFixed(2)} USDC</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,16rem)] glass-strong">
        <DropdownMenuLabel className="font-mono text-xs break-all">{wallet.address}</DropdownMenuLabel>
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {wallet.balance.toFixed(2)} USDC
          {adapterWallet?.adapter.name ? ` · ${adapterWallet.adapter.name}` : ""}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DevnetUsdcFaucet variant="menu" />
        <DropdownMenuItem asChild className="min-h-[44px]">
          <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-[44px]"
          onClick={() => {
            void refreshWalletSession().then((session) => {
              if (session) {
                useAppStore.getState().updateWalletBalance(session.balance);
                toast.success("Balance updated", { description: `${session.balance.toFixed(2)} USDC` });
              } else {
                void retrySignIn();
              }
            });
          }}
        >
          <RefreshCw className="h-4 w-4" /> Refresh session
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-[44px]"
          onClick={() => {
            void navigator.clipboard.writeText(wallet.address);
            toast("Address copied");
          }}
        >
          <Copy className="h-4 w-4" /> Copy address
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-[44px] text-destructive" onClick={() => void handleDisconnect()}>
          <LogOut className="h-4 w-4" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
