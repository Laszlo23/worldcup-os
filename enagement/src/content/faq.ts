export type FaqItem = { q: string; a: string };

export const FAQ_SECTIONS: { title: string; items: FaqItem[] }[] = [
  {
    title: "Getting started",
    items: [
      {
        q: "What is MatchMind?",
        a: "MatchMind is the fan layer of the World Cup OS stack — live XP polls, goal drops, Crew chat, collectables, and a passport that tracks your terrace energy on Solana.",
      },
      {
        q: "Do I need a wallet?",
        a: "Yes for claiming rewards and locking on-chain proofs. Use Phantom/OKX, or tap Create to spin up an in-app smart wallet encrypted with your PIN — no extension required.",
      },
      {
        q: "Is this real money betting?",
        a: "XP polls are free fan predictions that settle for XP. Optional USDC markets may appear separately and always require an explicit on-chain sign. Devnet USDC has no real-world value.",
      },
    ],
  },
  {
    title: "My picks & claims",
    items: [
      {
        q: "Where do I see my predictions?",
        a: "Open Polls → My picks (third tab). You’ll see every XP poll vote and USDC market position. The same panel is on Profile (You). Match Desk also lists “My picks”.",
      },
      {
        q: "How do I claim a USDC win?",
        a: "When a market settles in your favour, open My picks → filter Won → tap Claim. USDC pays from the settlement pool into your MatchMind wallet; you’ll get an explorer link for the payout tx.",
      },
      {
        q: "How do I claim a goal drop?",
        a: "Open Drops (Moments), tap Claim on a card, and sign the Solana memo with your wallet. That writes an on-chain receipt and adds +50 XP plus the collectable to your album.",
      },
    ],
  },
  {
    title: "Polls & Agent Pilot",
    items: [
      {
        q: "What is Follow the Crowd / Follow the Agent?",
        a: "One-tap vote helpers. Crowd locks the terrace majority. Agent maps the latest AgentX signal onto yes/no for the open window.",
      },
      {
        q: "What is Agent Pilot?",
        a: "With your smart wallet (or any signed-in session), enable Agent Pilot to auto-lock open XP polls using AgentX signals — you stay in control and can turn it off anytime.",
      },
      {
        q: "How do 7-minute polls work?",
        a: "While a match is live, micro-windows open for goals and cards. You sign a Solana memo to lock the vote on-chain; correct calls pay XP when the window settles. Find your history under My picks.",
      },
    ],
  },
  {
    title: "XP, staking & MM",
    items: [
      {
        q: "How do I earn XP?",
        a: "Win polls, claim goal drops (+50), stadium check-in (+100), complete community tasks, and convert mined MM tokens.",
      },
      {
        q: "What is XP staking?",
        a: "Lock liquid XP in the Mine. Staked XP accrues soft MM tokens over time (about 5% MM per day on staked XP). Claim MM, or convert 1 MM → 2 XP.",
      },
      {
        q: "Is MM a real on-chain token?",
        a: "MM is MatchMind’s in-app mining balance for this season — soft ledger rewards tied to your passport. Future seasons may bridge to SPL; today’s MM is claimable as XP boosts.",
      },
    ],
  },
  {
    title: "Community & drops",
    items: [
      {
        q: "What are community tasks?",
        a: "Growth quests — share the app, post in Crew, enable Agent Pilot, stake XP, and more. Each claim pays passport XP once.",
      },
      {
        q: "How do Drops work?",
        a: "TxLINE goals mint collectible moments. Sign a Solana memo with your wallet (or smart wallet) to claim into the sticker album — proof is on-chain and listed in Wallet Desk → History.",
      },
      {
        q: "What are collectables?",
        a: "Legend cards and goal moments you mint or claim into your album. Trade them peer-to-peer for XP on the Market.",
      },
    ],
  },
];
