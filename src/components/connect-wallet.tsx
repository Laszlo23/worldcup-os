import { Wallet, Copy, LogOut, ChevronDown, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { authenticateWallet, logoutWallet } from "@/lib/wallet/auth";
import { useWalletUiReady } from "@/lib/wallet/wallet-ui-ready";
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
    phantom?: { solana?: { isPhantom?: boolean; connect?: () => Promise<{ publicKey: { toString: () => string } }> } };
    solana?: { isPhantom?: boolean; connect?: () => Promise<{ publicKey: { toString: () => string } }> };
  }
}

function getPhantomProvider() {
  if (typeof window === "undefined") return null;
  const p = window.phantom?.solana ?? window.solana;
  return p?.isPhantom ? p : null;
}

export function ConnectWalletButton({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const walletUiReady = useWalletUiReady();
  if (!walletUiReady) {
    return (
      <Button
        size={size}
        className="bg-gradient-primary text-primary-foreground border-0 font-medium opacity-90"
        onClick={() => toast("Wallet loading…", { description: "One moment — then try again." })}
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }
  return <ConnectWalletButtonCore size={size} />;
}

function ConnectWalletButtonCore({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const { wallet: adapterWallet, publicKey, connected, connecting, disconnect, signMessage, wallets, select, connect } = useWallet();
  const { setVisible, visible } = useWalletModal();
  const { wallet, connectWallet, disconnectWallet } = useAppStore();
  const authAttempted = useRef<string | null>(null);
  const authInFlight = useRef(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showInjectionHelp, setShowInjectionHelp] = useState(false);

  useEffect(() => {
    if (wallets.length) {
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

  async function handleConnectClick() {
    setShowInjectionHelp(false);

    const phantom = getPhantomProvider();
    const phantomAdapter = wallets.find((w) => w.adapter.name === "Phantom");

    try {
      if (phantomAdapter && (phantomAdapter.readyState === "Installed" || phantomAdapter.readyState === "Loadable")) {
        select(phantomAdapter.adapter.name);
        await connect();
        return;
      }

      if (phantom) {
        select("Phantom");
        await connect();
        return;
      }

      const installed = wallets.filter((w) => w.readyState === "Installed" || w.readyState === "Loadable");
      if (installed.length === 1) {
        select(installed[0].adapter.name);
        await connect();
        return;
      }

      setVisible(true);
      if (!visible) {
        toast("Select your wallet", { description: "Choose Phantom or Solflare in the picker." });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open wallet";
      console.error("[wallet connect]", err);
      if (!phantom && wallets.length === 0) {
        setShowInjectionHelp(true);
        toast.error("No wallet extension detected", {
          description: "Install Phantom and open this site in a top-level browser tab.",
        });
      } else {
        setVisible(true);
        toast.error(message, { description: "Try selecting your wallet from the picker." });
      }
    }
  }

  if (!wallet.connected) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button
          size={size}
          type="button"
          onClick={() => void handleConnectClick()}
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
              <li>Open <a href="https://wmos.buildingcultureid.space" className="text-primary underline">wmos.buildingcultureid.space</a> in Chrome or Firefox (top-level tab)</li>
              <li>Install the <a href="https://phantom.app/download" className="text-primary underline" target="_blank" rel="noopener noreferrer">Phantom extension</a></li>
              <li>Disable other wallet extensions if they conflict</li>
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
