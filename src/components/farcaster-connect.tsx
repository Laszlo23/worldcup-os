import { useCallback, useState } from "react";
import { AuthKitProvider, SignInButton } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function getFarcasterDomain(): string {
  if (typeof window === "undefined") return "localhost";
  return import.meta.env.VITE_FARCASTER_DOMAIN ?? window.location.hostname;
}

type FarcasterConnectProps = {
  onLinked: () => void;
  disabled?: boolean;
};

export function FarcasterConnect({ onLinked, disabled }: FarcasterConnectProps) {
  const [linking, setLinking] = useState(false);

  const handleSuccess = useCallback(
    async (res: { message: string; signature: string; nonce: string }) => {
      setLinking(true);
      try {
        await apiFetch("/api/profile/farcaster", {
          method: "POST",
          body: JSON.stringify({
            message: res.message,
            signature: res.signature,
            nonce: res.nonce,
          }),
        });
        toast.success("Farcaster connected");
        onLinked();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to link Farcaster");
      } finally {
        setLinking(false);
      }
    },
    [onLinked],
  );

  const getNonce = useCallback(async () => {
    const res = await apiFetch<{ nonce: string }>("/api/profile/farcaster/nonce");
    return res.nonce;
  }, []);

  const domain = getFarcasterDomain();
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <AuthKitProvider config={{ domain, siweUri: `${origin}/profile` }}>
      {linking ? (
        <Button disabled className="w-full glass">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…
        </Button>
      ) : (
        <SignInButton
          onSuccess={handleSuccess}
          getNonce={getNonce}
        >
          {({ isLoading }) => (
            <Button disabled={disabled || isLoading} className="w-full bg-[#8a63d2] hover:bg-[#7a53c2] text-white border-0">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening Farcaster…
                </>
              ) : (
                "Connect Farcaster"
              )}
            </Button>
          )}
        </SignInButton>
      )}
    </AuthKitProvider>
  );
}
