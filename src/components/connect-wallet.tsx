import { ClientOnly } from "@tanstack/react-router";
import { Wallet, Copy, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { authenticateWallet, logoutWallet } from "@/lib/wallet/auth";
import { useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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
  const { wallet: adapterWallet, publicKey, connected, connecting, disconnect, signMessage } = useWallet();
  const { setVisible } = useWalletModal();
  const { wallet, connectWallet, disconnectWallet } = useAppStore();
  const authAttempted = useRef<string | null>(null);
  const authInFlight = useRef(false);

  useEffect(() => {
    if (!connected || !publicKey || connecting) return;
    if (!signMessage) {
      toast.error("This wallet does not support message signing");
      void disconnect();
      return;
    }

    const pubkey = publicKey.toBase58();
    if (authAttempted.current === pubkey || authInFlight.current) return;

    void (async () => {
      authInFlight.current = true;
      try {
        authAttempted.current = pubkey;
        const { balance } = await authenticateWallet(pubkey, signMessage);
        connectWallet(pubkey, balance);
      } catch (err) {
        authAttempted.current = null;
        const message = err instanceof Error ? err.message : "Wallet authentication failed";
        toast.error(message);
        await disconnect();
      } finally {
        authInFlight.current = false;
      }
    })();
  }, [connected, connecting, publicKey, signMessage, connectWallet, disconnect]);

  useEffect(() => {
    if (!connected && wallet.connected) {
      disconnectWallet();
      authAttempted.current = null;
    }
  }, [connected, wallet.connected, disconnectWallet]);

  if (!wallet.connected) {
    return (
      <Button
        size={size}
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="bg-gradient-primary text-primary-foreground border-0 hover:opacity-90 glow-primary font-medium"
      >
        <Wallet className="h-4 w-4" />
        {connecting ? "Connecting…" : "Connect Wallet"}
      </Button>
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
