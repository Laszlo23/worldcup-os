export type FaqItem = { q: string; a: string };

export const FAQ_SECTIONS: { title: string; items: FaqItem[] }[] = [
  {
    title: "Getting started",
    items: [
      {
        q: "What is MatchMind?",
        a: "MatchMind is the fan layer of the World Cup OS stack — live XP polls, goal drops, Crew chat, and a passport that tracks your terrace energy on Solana.",
      },
      {
        q: "Do I need a wallet?",
        a: "Yes for claiming rewards. Use Phantom/OKX, or tap Create to spin up an in-app smart wallet encrypted with your PIN — no extension required.",
      },
      {
        q: "Is this real money betting?",
        a: "XP polls are free fan predictions that settle for XP. Optional USDC markets may appear separately and always require an explicit on-chain sign.",
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
        a: "While a match is live, micro-windows open for goals and yellow cards. Call it before the timer hits zero; correct calls pay XP when the window settles.",
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
        a: "TxLINE goals mint collectible moments. Sign a Solana memo with your wallet (or smart wallet) to claim into the sticker album.",
      },
    ],
  },
];
