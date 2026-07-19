export type DocSection = {
  id: string;
  title: string;
  body: string[];
};

export const DOCS_SECTIONS: DocSection[] = [
  {
    id: "stack",
    title: "Product stack",
    body: [
      "World Cup OS (WMOS) is the trust / oracle layer. AgentX is the AI trading desk. MatchMind is the fan experience — polls, drops, Crew, passport, collectables.",
      "Live match state and events flow from TxLINE. Engagement XP polls settle against those events in the shared Postgres ledger.",
    ],
  },
  {
    id: "my-picks",
    title: "My picks (predictions)",
    body: [
      "Every fan’s history lives under Polls → My picks (also on Profile).",
      "USDC markets: open / won / lost / settled positions from GET /api/predictions/mine. Claim wins with POST /api/predictions/claim.",
      "XP polls: each vote is a Solana memo receipt. History from GET /api/engagement/polls/mine includes choice, outcome, XP awarded, and explorer links.",
    ],
  },
  {
    id: "wallet",
    title: "Wallets & sessions",
    body: [
      "Login uses Sign-In with Solana (message signature → session cookie). Phantom, OKX, Solflare, and MatchMind smart wallets are supported.",
      "Smart wallets are generated in-browser, encrypted with your PIN (AES-GCM + PBKDF2), and never leave the device unencrypted. Export the secret once when creating.",
      "On create/unlock, MatchMind drips gas SOL + test USDC (when balances are low) and grants Lace-your-boots welcome XP.",
      "Moment/stadium memos and USDC place-prediction txs are fee-sponsored on Solana devnet when the settlement pool can cover rent + fees.",
      "XP poll votes require an on-chain memo signed by your session wallet — verification binds the memo text to the poll + choice.",
    ],
  },
  {
    id: "agent-pilot",
    title: "Agent Pilot",
    body: [
      "Agent Pilot reads AgentX /api/signals. Mode Agent maps signals onto XP polls and optional pre-match USDC winner markets. Mode Crowd only auto-locks XP polls with terrace majority.",
      "Set usdcBudget + usdcStake on the Agent page. The server plans placements; your unlocked smart wallet signs on-chain (memo votes + SPL USDC escrow). Spent amount is tracked and cannot exceed the budget.",
      "Background AutoAgentRunner ticks while MatchMind is open and the smart wallet is unlocked. Manual “Run pilot now” plans and signs the next batch on-chain. See My picks for history.",
    ],
  },
  {
    id: "mine",
    title: "XP Mine (staking)",
    body: [
      "Stake liquid XP (≥10) into the Mine. While staked, XP accrues MM at ~0.05 MM per staked XP per day.",
      "Claim settles pending MM into your MM balance. Convert MM → XP at 1 MM = 2 XP whenever you want liquid passport power again.",
      "Unstaking returns XP after settling pending MM. Staked XP cannot be spent in the Shop until unstaked.",
    ],
  },
  {
    id: "tasks",
    title: "Community tasks",
    body: [
      "Tasks are one-time XP grants for helping grow MatchMind — shares, Crew posts, first vote, drops, Agent Pilot, staking.",
      "Each successful claim also drips ~0.012 SOL on devnet (capped) so smart wallets stay ready for on-chain moment/stadium txs.",
      "Auto tasks unlock when the server sees the action on your passport. Link tasks are honor-claim after you open the share target.",
    ],
  },
  {
    id: "api",
    title: "Useful endpoints",
    body: [
      "GET /api/engagement/featured — active match",
      "GET /api/engagement/polls?matchId= — XP polls",
      "GET /api/engagement/polls/mine — your XP poll vote history",
      "GET /api/predictions/mine — your USDC market positions",
      "POST /api/predictions/claim — claim a won USDC payout",
      "GET /api/engagement/signals?matchId= — AgentX proxy",
      "POST /api/engagement/auto-agent — enable / tick Agent Pilot",
      "GET|POST /api/engagement/stake — mine status & actions",
      "GET /api/engagement/tasks · POST /api/engagement/tasks/:id/claim",
      "POST /api/engagement/wallet/fund — gas SOL + welcome XP",
      "POST /api/faucet/sol — top up gas when below threshold",
    ],
  },
];
