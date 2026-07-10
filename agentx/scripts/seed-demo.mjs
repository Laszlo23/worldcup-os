#!/usr/bin/env node
/**
 * Seed demo World Cup data for TxLINE AI Trader hackathon demo.
 * Run: ALLOW_DEMO_SEED=true node scripts/seed-demo.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

if (process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Set ALLOW_DEMO_SEED=true to run seed");
  process.exit(1);
}

const DEMO_MATCH = {
  externalId: "demo-bra-fra",
  txlineFixtureId: 2026071,
  homeTeam: { name: "Brazil", flag: "🇧🇷" },
  awayTeam: { name: "France", flag: "🇫🇷" },
  scoreHome: 2,
  scoreAway: 1,
  status: "live",
  minute: 71,
  stadium: "MetLife Stadium",
  stage: "World Cup 2026 · Semi-Final",
  kickoffAt: new Date(),
  stats: { possession: { home: 63, away: 37 }, shots: { home: 14, away: 8 }, pressure: "high" },
  odds: { home: 1.68, draw: 3.4, away: 5.2, updatedAt: Date.now() },
  oddsHistory: [
    { t: Date.now() - 300000, home: 1.92, draw: 3.55, away: 4.1 },
    { t: Date.now() - 180000, home: 1.85, draw: 3.48, away: 4.35 },
    { t: Date.now() - 60000, home: 1.78, draw: 3.42, away: 4.8 },
    { t: Date.now(), home: 1.68, draw: 3.4, away: 5.2 },
  ],
  momentum: 78,
  winProbability: { home: 63, draw: 22, away: 15 },
};

const OTHER_MATCHES = [
  {
    externalId: "demo-arg-cro",
    txlineFixtureId: 2026072,
    homeTeam: { name: "Argentina", flag: "🇦🇷" },
    awayTeam: { name: "Croatia", flag: "🇭🇷" },
    scoreHome: 1,
    scoreAway: 1,
    status: "live",
    minute: 54,
    stage: "World Cup 2026 · Quarter-Final",
    kickoffAt: new Date(),
    stats: { possession: { home: 55, away: 45 } },
    odds: { home: 2.1, draw: 3.15, away: 3.6 },
    oddsHistory: [],
    momentum: 52,
    winProbability: { home: 42, draw: 28, away: 30 },
  },
  {
    externalId: "demo-esp-ger",
    homeTeam: { name: "Spain", flag: "🇪🇸" },
    awayTeam: { name: "Germany", flag: "🇩🇪" },
    scoreHome: 0,
    scoreAway: 0,
    status: "scheduled",
    minute: 0,
    stage: "World Cup 2026 · Semi-Final",
    kickoffAt: new Date(Date.now() + 86400000),
    stats: {},
    odds: { home: 2.35, draw: 3.25, away: 2.95 },
    oddsHistory: [],
    momentum: 50,
    winProbability: { home: 38, draw: 27, away: 35 },
  },
];

const REASONING = [
  { type: "odds_shift", label: "Odds shortened 12.4% in last 60s", impact: "positive" },
  { type: "possession", label: "Brazil possession increased to 63%", impact: "positive" },
  { type: "pressure", label: "France defenders showing fatigue patterns", impact: "positive" },
  { type: "pattern", label: "Historical model: 62% next-goal in similar states", impact: "positive" },
];

try {
  const match = await prisma.match.upsert({
    where: { externalId: DEMO_MATCH.externalId },
    create: DEMO_MATCH,
    update: DEMO_MATCH,
  });

  for (const m of OTHER_MATCHES) {
    await prisma.match.upsert({
      where: { externalId: m.externalId },
      create: m,
      update: m,
    });
  }

  await prisma.agent.upsert({
    where: { name: "Alpha" },
    create: { name: "Alpha", strategy: "conservative", strategyConfig: { min_confidence: 75, stake_pct: 0.02 }, balance: 10250, totalTrades: 14, wins: 9, losses: 5, roi: 2.5, riskScore: 2 },
    update: {},
  });
  await prisma.agent.upsert({
    where: { name: "Beta" },
    create: { name: "Beta", strategy: "aggressive", strategyConfig: { min_confidence: 60, stake_pct: 0.05 }, balance: 10890, totalTrades: 22, wins: 14, losses: 8, roi: 8.9, riskScore: 5 },
    update: {},
  });

  const existingSignals = await prisma.signal.count();
  if (existingSignals < 5) {
    for (let i = 0; i < 8; i++) {
      const signal = await prisma.signal.create({
        data: {
          matchId: match.id,
          type: "bullish",
          headline: i === 0 ? "Brazil likely to score next" : `Brazil momentum signal #${i + 1}`,
          prediction: "Brazil next goal within 15 minutes",
          confidence: 72 + (i % 5) * 2,
          impact: i === 0 ? "high" : "medium",
          reasoning: REASONING,
          metrics: { momentum: 78, xg_next_15m: 1.45, attack_pressure: "HIGH", odds_home: 1.68 },
          expectedValue: 18.6,
          createdAt: new Date(Date.now() - i * 3600000),
        },
      });

      const pred = await prisma.prediction.create({
        data: {
          signalId: signal.id,
          matchId: match.id,
          marketLabel: "Brazil next goal",
          side: "yes",
          odds: 1.68,
          virtualStake: 100,
          confidence: signal.confidence,
          result: i < 5 ? "win" : "pending",
          roi: i < 5 ? 68 : null,
        },
      });

      if (i < 3) {
        await prisma.onChainCertificate.create({
          data: {
            predictionId: pred.id,
            memo: JSON.stringify({ match: "Brazil vs France", prediction: signal.prediction, confidence: signal.confidence }),
            txHash: `5xYdemo${i}...9kLm`,
            explorerUrl: `https://explorer.solana.com/tx/demo_${i}?cluster=devnet`,
            status: "anchored",
            anchoredAt: new Date(),
          },
        });
      }
    }
  }

  await prisma.portfolioSnapshot.create({
    data: {
      balance: 11245.68,
      pnl: 1245.68,
      pnlPercent: 12.46,
      winRate: 64,
      totalTrades: 28,
      equityCurve: Array.from({ length: 20 }, (_, i) => ({ t: new Date(Date.now() - (19 - i) * 86400000).toISOString(), v: 10000 + i * 62 })),
      dailyPnl: [
        { day: "Mon", pnl: 120 },
        { day: "Tue", pnl: -45 },
        { day: "Wed", pnl: 210 },
        { day: "Thu", pnl: 85 },
        { day: "Fri", pnl: 340 },
        { day: "Sat", pnl: -30 },
        { day: "Sun", pnl: 180 },
      ],
    },
  });

  await prisma.matchEvent.create({
    data: {
      matchId: match.id,
      eventType: "goal",
      minute: 68,
      team: "Brazil",
      player: "Vini Jr",
      detail: "68' Goal Brazil",
    },
  });

  console.log("Demo seed complete");
} finally {
  await prisma.$disconnect();
}
