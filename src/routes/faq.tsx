import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, HelpCircle, ShieldCheck, Wallet, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { canonicalUrl, faqJsonLd, pageTitle, SITE_DESCRIPTION } from "@/lib/seo";

const FAQ_ITEMS = [
  {
    question: "What is World Cup OS?",
    answer:
      "World Cup OS is a non-custodial prediction layer for World Cup fixtures. Match data flows from the TxLINE oracle, predictions lock USDC in Solana escrow PDAs, and winners claim verified payouts after on-chain settlement.",
  },
  {
    question: "How do I place a prediction on an upcoming match?",
    answer:
      "Connect your Solana wallet (Phantom), sign the auth message, open an upcoming fixture under Matches, pick a market outcome, enter your USDC stake, and approve the escrow transfer. Markets close five minutes before kickoff.",
  },
  {
    question: "Where does my USDC go when I predict?",
    answer:
      "Your stake is transferred to a program-derived escrow token account tied to your wallet and the market. Funds stay locked until the match settles — you always sign the transfer from your wallet.",
  },
  {
    question: "How are winners determined?",
    answer:
      "When a fixture finishes, TxLINE publishes a verified final state. Our settlement worker resolves markets against that oracle proof, marks winning predictions, and anchors settlement metadata on Solana.",
  },
  {
    question: "How do I claim my reward?",
    answer:
      "Open Portfolio, find predictions marked WON under Pending rewards, and click Claim. The protocol sends your USDC payout on-chain; you'll see a Solana explorer link once the transfer confirms.",
  },
  {
    question: "Is my wallet custodied by World Cup OS?",
    answer:
      "No. You connect with your own wallet, sign every stake transfer, and claim payouts to the same wallet. Session cookies only store a signed auth token — never your private keys.",
  },
  {
    question: "Which network and tokens are supported?",
    answer:
      "The live deployment runs on Solana devnet with USDC for stakes and payouts. Mainnet configuration is supported via environment variables when you're ready to graduate.",
  },
  {
    question: "What happens if a market closes before I predict?",
    answer:
      "Markets lock automatically five minutes before kickoff and when a fixture goes live. Only scheduled upcoming fixtures accept new predictions — this protects against stale odds after kickoff.",
  },
] as const;

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: pageTitle("FAQ") },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:title", content: pageTitle("FAQ") },
      { property: "og:url", content: canonicalUrl("/faq") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/faq") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(faqJsonLd([...FAQ_ITEMS])),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,oklch(0.72_0.19_155/12%),transparent_45%),radial-gradient(circle_at_80%_90%,oklch(0.62_0.22_300/10%),transparent_40%)]" />

      <header className="border-b border-border/40 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Help center</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono text-primary">
            <HelpCircle className="h-3.5 w-3.5" /> FAQ
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold">Questions & answers</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Everything you need to predict safely, understand escrow, and claim rewards on World Cup OS.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon: Wallet, label: "Non-custodial stakes" },
            { icon: ShieldCheck, label: "TxLINE verified results" },
            { icon: Zap, label: "One-click claim payouts" },
          ].map((item) => (
            <Card key={item.label} className="glass p-4 flex items-center gap-3 text-sm">
              <item.icon className="h-5 w-5 text-primary shrink-0" />
              {item.label}
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, i) => (
            <motion.div
              key={item.question}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="glass p-5 sm:p-6">
                <h2 className="font-display font-semibold text-lg mb-2">{item.question}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center pt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link to="/legal/terms" className="hover:text-foreground underline-offset-4 hover:underline">
              Terms of Service
            </Link>
            <Link to="/legal/privacy" className="hover:text-foreground underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
          </div>
          <Link
            to="/matches"
            className="inline-flex items-center rounded-md bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Browse upcoming matches
          </Link>
        </div>
      </main>
    </div>
  );
}
