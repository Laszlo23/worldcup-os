import { ClientOnly } from "@tanstack/react-router";
import { Wallet, Copy, LogOut, ChevronDown, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { authenticateWallet, logoutWallet } from "@/lib/wallet/auth";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

declare global {
  interface Window {
    phantom?: { solana?: { isPhantom?: boolean } };
  }
}

function hasWalletInjection(wallets: { adapter: { name: string }; readyState: string }[]) {
  const phantomInjected = Boolean(window.phantom?.solana?.isPhantom);
  const standardReady = wallets.some((w) => w.readyState === "Installed" || w.readyState === "Loadable");
  return phantomInjected || standardReady;
}

export function ConnectWalletButton({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  return (
    <ClientOnly fallback={<ConnectWalletPlaceholder size={size} />}>
      <ConnectWalletButtonInner size={size} />
    </ClientOnly>
  );
}

function ConnectWalletPlaceholder({ size }: { size?: "sm" | "default" | "lg" }) {
  return (
    <Button
      size={size}
      disabled
      className="bg-gradient-primary text-primary-foreground border-0 font-medium opacity-80"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  );
}

function ConnectWalletButtonInner({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const { wallet: adapterWallet, publicKey, connected, connecting, disconnect, signMessage, wallets } = useWallet();
  const { setVisible } = useWalletModal();
  const { wallet, connectWallet, disconnectWallet } = useAppStore();
  const authAttempted = useRef<string | null>(null);
  const authInFlight = useRef(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showInjectionHelp, setShowInjectionHelp] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV && wallets.length) {
      console.debug("[wallet]", wallets.map((w) => [w.adapter.name, w.readyState]));
    }
  }, [wallets]);

  async function runAuth(pubkey: string) {
    if (!signMessage) {
      toast.error("This wallet does not support message signing");
      void disconnect();
      return;
    }
    authInFlight.current = true;
    setAuthError(null);
    try {
      authAttempted.current = pubkey;
      const { balance } = await authenticateWallet(pubkey, signMessage);
      connectWallet(pubkey, balance);
    } catch (err) {
      authAttempted.current = null;
      const message = err instanceof Error ? err.message : "Wallet authentication failed";
      setAuthError(message);
      toast.error(message, {
        description: "Wallet stays connected — retry sign-in when the API is ready.",
      });
    } finally {
      authInFlight.current = false;
    }
  }

  useEffect(() => {
    if (!connected || !publicKey || connecting) return;
    const pubkey = publicKey.toBase58();
    if (authAttempted.current === pubkey || authInFlight.current) return;
    void runAuth(pubkey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runAuth is stable enough for this effect
  }, [connected, connecting, publicKey]);

  useEffect(() => {
    if (!connected && wallet.connected) {
      disconnectWallet();
      authAttempted.current = null;
      setAuthError(null);
    }
  }, [connected, wallet.connected, disconnectWallet]);

  function handleConnectClick() {
    if (!hasWalletInjection(wallets)) {
      setShowInjectionHelp(true);
      return;
    }
    setShowInjectionHelp(false);
    setVisible(true);
  }

  if (!wallet.connected) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button
          size={size}
          onClick={handleConnectClick}
          disabled={connecting}
          className="bg-gradient-primary text-primary-foreground border-0 hover:opacity-90 glow-primary font-medium"
        >
          <Wallet className="h-4 w-4" />
          {connecting ? "Connecting…" : "Connect Wallet"}
        </Button>
        {showInjectionHelp && (
          <div className="glass rounded-lg p-3 text-xs max-w-xs text-left space-y-2 border border-warning/30">
            <div className="flex items-center gap-2 text-warning font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              No wallet extension detected
            </div>
            <ul className="text-muted-foreground space-y-1 list-disc pl-4">
              <li>Open this app in a top-level browser tab (not an embedded preview)</li>
              <li>Install the Phantom browser extension</li>
              <li>For local dev, use <a href="http://localhost:5173" className="text-primary underline">localhost:5173</a></li>
            </ul>
          </div>
        )}
        {connected && authError && (
          <div className="glass rounded-lg p-3 text-xs max-w-xs text-left space-y-2 border border-destructive/30">
            <p className="text-destructive">{authError}</p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 w-full"
              onClick={() => publicKey && void runAuth(publicKey.toBase58())}
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
        <Button variant="outline" size={size} className="glass gap-2 font-mono text-xs">
          <span className="h-2 w-2 rounded-full bg-primary animate-live-dot" />
          {short}
          <span className="text-muted-foreground">·</span>
          <span className="font-sans">{wallet.balance.toFixed(2)} USDC</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 glass-strong">
        <DropdownMenuLabel className="font-mono text-xs break-all">{wallet.address}</DropdownMenuLabel>
        {adapterWallet?.adapter.name && (
          <DropdownMenuLabel className="text-xs text-muted-foreground">{adapterWallet.adapter.name}</DropdownMenuLabel>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(wallet.address); toast("Address copied"); }}>
          <Copy className="h-4 w-4" /> Copy address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            authAttempted.current = null;
            setAuthError(null);
            try {
              await logoutWallet();
            } catch {
              // session may already be cleared
            }
            await disconnect();
            disconnectWallet();
          }}
          className="text-destructive"
        >
          <LogOut className="h-4 w-4" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
