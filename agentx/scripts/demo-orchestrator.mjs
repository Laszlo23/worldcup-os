#!/usr/bin/env node
/**
 * Orchestrate hackathon demo pipeline via API.
 * Goal → TxLINE → AI → Signal → On-chain → Portfolio
 */
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8041";

const steps = [
  { delay: 0, msg: "⚽ Goal scored — Brazil 2-1 France (68')" },
  { delay: 2000, msg: "📡 TxLINE receives score update" },
  { delay: 4000, msg: "📊 Odds shift detected: 1.92 → 1.68" },
  { delay: 6000, msg: "🧠 AI analyzing market movement..." },
  { delay: 8000, msg: "✨ Signal generated: Brazil likely to score next (82%)" },
  { delay: 10000, msg: "⛓️ Prediction certificate anchored on Solana" },
  { delay: 12000, msg: "🤖 Agents Alpha & Beta take positions" },
  { delay: 14000, msg: "📈 Portfolio equity updated +186 USDC" },
];

console.log("TxLINE AI Trader — Demo Orchestrator\n");

for (const step of steps) {
  await new Promise((r) => setTimeout(r, step.delay));
  console.log(step.msg);
}

try {
  const res = await fetch(`${API}/api/demo/trigger`, { method: "POST" });
  const data = await res.json();
  console.log(`\n✅ Pipeline complete — ${data.triggered} signals processed`);
  if (data.results?.length) {
    for (const r of data.results) {
      console.log(`   Signal ${r.signal} → Prediction ${r.prediction} → ${r.cert}`);
    }
  }
} catch (e) {
  console.error("\n⚠️  Could not reach API. Start engine: cd services/ai-engine && uvicorn app.main:app --port 8041");
  process.exit(1);
}
