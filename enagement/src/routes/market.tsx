import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Store, Tag } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/matchmind/AppShell";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { queryKeys, usePassport } from "@/lib/queries/hooks";

export const Route = createFileRoute("/market")({
  component: MarketScreen,
});

type Listing = {
  id: string;
  stickerId: string;
  title: string;
  rarity: string;
  imageUrl: string;
  setId: string;
  priceXp: number;
  mine: boolean;
  seller: { wallet: string; nickname: string | null; displayName: string | null };
};

type InvItem = {
  stickerId: string;
  title: string;
  rarity: string;
  imageUrl: string;
  setId: string;
  listed: boolean;
};

function MarketScreen() {
  const wallet = useAppStore((s) => s.wallet);
  const { data: passportData } = usePassport(wallet.connected);
  const xp = passportData?.passport.xp ?? 0;
  const qc = useQueryClient();
  const [listSticker, setListSticker] = useState<string>("");
  const [price, setPrice] = useState("100");

  const listingsQ = useQuery({
    queryKey: queryKeys.marketListings,
    queryFn: () => apiFetch<{ listings: Listing[] }>("/api/engagement/market/listings"),
    refetchInterval: 10_000,
  });

  const invQ = useQuery({
    queryKey: queryKeys.marketInventory,
    queryFn: () => apiFetch<{ inventory: InvItem[] }>("/api/engagement/market/inventory"),
    enabled: wallet.connected,
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.marketListings });
    void qc.invalidateQueries({ queryKey: queryKeys.marketInventory });
    void qc.invalidateQueries({ queryKey: queryKeys.passport });
    void qc.invalidateQueries({ queryKey: queryKeys.stickerAlbum });
  };

  const listMut = useMutation({
    mutationFn: () =>
      apiFetch("/api/engagement/market/list", {
        method: "POST",
        body: JSON.stringify({ stickerId: listSticker, priceXp: Number(price) }),
      }),
    onSuccess: () => {
      toast.success("Listed on market");
      setListSticker("");
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "List failed"),
  });

  const buyMut = useMutation({
    mutationFn: (listingId: string) =>
      apiFetch("/api/engagement/market/buy", {
        method: "POST",
        body: JSON.stringify({ listingId }),
      }),
    onSuccess: () => {
      toast.success("Bought — sticker moved to your album");
      refresh();
    },
    onError: (err) => toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Buy failed"),
  });

  const cancelMut = useMutation({
    mutationFn: (listingId: string) =>
      apiFetch("/api/engagement/market/cancel", {
        method: "POST",
        body: JSON.stringify({ listingId }),
      }),
    onSuccess: () => {
      toast.message("Listing cancelled");
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Cancel failed"),
  });

  const listings = listingsQ.data?.listings ?? [];
  const inventory = (invQ.data?.inventory ?? []).filter((i) => !i.listed);
  const sellable = inventory;

  return (
    <AppShell title="Market" subtitle="Trade collectables for XP">
      <section className="px-4 pt-4">
        <div className="rounded-3xl border border-primary/30 bg-primary/8 p-4">
          <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <Store className="size-3.5" />
            Collectables market
          </p>
          <h2 className="mt-1 font-display text-xl font-bold italic tracking-tight">List · buy · collect</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Peer-to-peer collectables trades settled in MatchMind XP. Mint legends first, then flip or collect.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {wallet.connected ? (
              <span className="rounded-full border border-primary/35 bg-background/50 px-2.5 py-1 font-mono text-[10px] font-bold text-primary">
                {xp.toLocaleString()} XP
              </span>
            ) : (
              <ConnectWalletButton size="sm" />
            )}
            <Link to="/legends" className="text-xs font-semibold text-accent">
              Legends →
            </Link>
            <Link to="/moments" className="text-xs font-semibold text-accent">
              Album →
            </Link>
          </div>
        </div>
      </section>

      {wallet.connected ? (
        <section className="mt-4 px-4">
          <div className="rounded-3xl border border-border bg-card/80 p-4">
            <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              <Tag className="size-3.5" />
              Sell from album
            </p>
            {sellable.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No unlisted stickers. Earn on matchday, mint a{" "}
                <Link to="/legends" className="font-semibold text-accent">
                  legend
                </Link>
                , then come back.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                <select
                  value={listSticker}
                  onChange={(e) => setListSticker(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm"
                >
                  <option value="">Pick a sticker…</option>
                  {sellable.map((i) => (
                    <option key={i.stickerId} value={i.stickerId}>
                      {i.title} · {i.rarity}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={25}
                    max={50000}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-28 rounded-xl border border-border bg-background/70 px-3 py-2 font-mono text-sm"
                    placeholder="XP"
                  />
                  <Button
                    className="flex-1"
                    disabled={!listSticker || listMut.isPending}
                    onClick={() => listMut.mutate()}
                  >
                    {listMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "List for XP"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="mt-5 px-4 pb-4">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Open listings
        </h3>
        {listingsQ.isPending ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading market…</p>
        ) : listings.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No open listings yet.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {listings.map((l) => {
              const seller =
                l.seller.displayName?.trim() ||
                l.seller.nickname ||
                `${l.seller.wallet.slice(0, 4)}…${l.seller.wallet.slice(-4)}`;
              return (
                <li
                  key={l.id}
                  className="flex gap-3 rounded-2xl border border-border bg-card/70 p-3"
                >
                  <img
                    src={l.imageUrl}
                    alt=""
                    className="size-16 shrink-0 rounded-xl object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{l.title}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {l.rarity} · {seller}
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-primary">
                      {l.priceXp.toLocaleString()} XP
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {l.mine ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cancelMut.isPending}
                          onClick={() => cancelMut.mutate(l.id)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!wallet.connected || buyMut.isPending || xp < l.priceXp}
                          onClick={() => buyMut.mutate(l.id)}
                        >
                          {buyMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Buy"}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
