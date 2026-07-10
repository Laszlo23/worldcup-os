import { hasDatabase } from "../config/env";
import { maybeOne, one, query, withTransaction } from "../db/postgres";
import { txlineClient } from "./txline/client";
import { resolveMarketOutcome, resolveWinnerOutcome, pickLatestScoreSnapshot } from "./txline/adapters";
import { verifyTxlineStatProof } from "./txline/validation";
import { insertLiveEvent } from "../repositories/matches";
import { env } from "../config/env";
import { buildSettleMarketTx, loadSettlementAuthority } from "../blockchain/settlement";
import { simulateSettlementTx } from "../blockchain/verify";
import { getExplorerUrl } from "../blockchain/escrow";

const TXLINE_FINISHED_GAME_STATES = new Set([5, 10, 13, 100]);

/** True only when TxLINE snapshot reports the fixture has actually finished. */
export async function isFixtureFinishedOnTxline(fixtureId: number): Promise<boolean> {
  const snapshots = await txlineClient.getScoresSnapshot(fixtureId);
  const latest = pickLatestScoreSnapshot(snapshots);
  if (latest) {
    const statusId = Number(latest.StatusId ?? latest.statusId ?? 0);
    const action = String(latest.Action ?? "").toLowerCase();
    if (TXLINE_FINISHED_GAME_STATES.has(statusId) || action === "game_finalised" || action === "game_finalized") {
      return true;
    }
  }

  const fixtures = await txlineClient.getFixturesSnapshot();
  const row = fixtures.find((f) => {
    const rec = f as Record<string, unknown>;
    return Number(rec.FixtureId ?? rec.fixtureId ?? rec.fixture_id ?? 0) === fixtureId;
  });
  if (!row) return false;
  const rec = row as Record<string, unknown>;
  const gameState = Number(rec.GameState ?? rec.gameState ?? rec.game_state ?? 1);
  return TXLINE_FINISHED_GAME_STATES.has(gameState);
}

export async function processSettlementJob(matchExternalId: string, fixtureId: number) {
  if (!hasDatabase()) return { ok: false, reason: "no_db" };

  const match = await maybeOne<Record<string, unknown>>("select * from matches where external_id = $1", [matchExternalId]);
  if (!match) return { ok: false, reason: "match_not_found" };

  if (match.status === "settled") {
    const existingProof = await maybeOne<{ id: string }>(
      "select id from proofs where match_id = $1 order by created_at desc limit 1",
      [match.id],
    );
    return { ok: true, reason: "already_settled", proofId: existingProof?.id };
  }

  const inProgress = await maybeOne<{ id: string }>(
    "select id from settlements where match_id = $1 and status = 'processing' order by created_at desc limit 1",
    [match.id],
  );
  if (inProgress) return { ok: false, reason: "settlement_in_progress" };

  const txlineFinished = await isFixtureFinishedOnTxline(fixtureId);
  if (!txlineFinished) {
    if (process.env.NODE_ENV === "production" || process.env.ALLOW_SIMULATED_SETTLE !== "true") {
      return { ok: false, reason: "fixture_not_finished_on_txline" };
    }
  }
  const proofSource = txlineFinished ? "txline" : "replay_sim";

  const marketRows = await query<{
    market_id: string;
    match_id: string;
    type: string;
    on_chain_market_pda: string | null;
    option_id: string | null;
    label: string | null;
  }>(
    `
      select m.id as market_id, m.match_id, m.type, m.on_chain_market_pda, o.id as option_id, o.label
      from markets m
      left join market_options o on o.market_id = m.id
      where m.match_id = $1
      order by m.created_at asc, o.created_at asc
    `,
    [match.id],
  );
  const markets = [...new Set(marketRows.map((row) => row.market_id))].map((marketId) => ({
    id: marketId,
    type: marketRows.find((row) => row.market_id === marketId)?.type ?? "winner",
    on_chain_market_pda: marketRows.find((row) => row.market_id === marketId)?.on_chain_market_pda ?? null,
    market_options: marketRows
      .filter((row) => row.market_id === marketId && row.option_id)
      .map((row) => ({ id: row.option_id, label: row.label })),
  }));

  const seq = Number(match.score_seq ?? 0);
  const statProof = await txlineClient.getStatValidation(fixtureId, seq, 1);

  if (!statProof?.merkleRoot) {
    return { ok: false, reason: "stat_validation_unavailable" };
  }

  const proofValid = verifyTxlineStatProof(statProof);

  let solanaTx = "";
  let explorerUrl = "";
  let validationStatus: "verified" | "pending" = "pending";

  const authority = loadSettlementAuthority();
  const marketPda = markets.find((m) => m.on_chain_market_pda)?.on_chain_market_pda ?? null;
  if (authority && marketPda) {
    const onChain = await buildSettleMarketTx({
      marketPda,
      authorityKeypair: authority,
      proof: statProof,
    });
    if (onChain) {
      solanaTx = onChain.signature;
      explorerUrl = onChain.explorerUrl;
      validationStatus = (await simulateSettlementTx(solanaTx)) && proofValid ? "verified" : "pending";
    }
  } else if (process.env.SETTLEMENT_TX_SIGNATURE && process.env.NODE_ENV !== "production") {
    solanaTx = process.env.SETTLEMENT_TX_SIGNATURE;
    explorerUrl = getExplorerUrl(solanaTx);
    validationStatus = (await simulateSettlementTx(solanaTx)) && proofValid ? "verified" : "pending";
  } else if (proofValid && txlineFinished) {
    validationStatus = "verified";
  }

  const merkleRoot = statProof.merkleRoot;
  const proofHash = statProof.proofHash;
  const signature = statProof.signature;

  const settlement = await one<{ id: string }>(
    `
      insert into settlements (market_id, match_id, status, started_at)
      values ($1, $2, 'processing', $3)
      returning id
    `,
    [markets[0]?.id ?? null, match.id, new Date().toISOString()],
  );

  const proof = await one<{ id: string }>(
    `
      insert into proofs (
        match_id, settlement_id, merkle_root, proof_hash, signature, validation_status,
        solana_tx, explorer_url, final_score_home, final_score_away, validated_at, payload, source
      ) values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13
      )
      returning id
    `,
    [
      match.id,
      settlement.id,
      merkleRoot,
      proofHash,
      signature,
      validationStatus,
      solanaTx || null,
      explorerUrl || null,
      match.score_home,
      match.score_away,
      new Date().toISOString(),
      statProof.payload,
      proofSource,
    ],
  );

  await insertLiveEvent(
    matchExternalId,
    validationStatus === "verified" ? "proof_verified" : "settlement_started",
    validationStatus === "verified" ? "Proof verified" : "Settlement processing",
    validationStatus === "verified" ? "TxLINE Merkle proof validated" : "Awaiting on-chain confirmation",
    { proofId: proof?.id, merkleRoot },
  );

  for (const market of markets ?? []) {
    const options = (market.market_options as Record<string, unknown>[]) ?? [];
    const winningOptionIds = new Set<string>();

    for (const option of options) {
      let won = false;
      if (market.type === "winner") {
        won = resolveWinnerOutcome(
          match.home_team.name,
          match.away_team.name,
          String(option.label),
          match.score_home,
          match.score_away,
        );
      } else {
        won = resolveMarketOutcome(
          market.type,
          String(option.label),
          match.score_home,
          match.score_away,
        );
      }
      if (won) winningOptionIds.add(option.id as string);
    }

    const predictions = await query<{
      id: string;
      user_id: string | null;
      option_id: string;
      amount: string | number;
      price: string | number;
      outcome_label: string;
      external_id: string;
    }>("select * from predictions where market_id = $1 and status = 'open'", [market.id]);

    for (const pred of predictions) {
      const won = winningOptionIds.has(pred.option_id);
      const payout = won ? Number(pred.amount) * Number(pred.price) : 0;
      await query("update predictions set status = $1, payout = $2, updated_at = now() where id = $3", [
        won ? "won" : "lost",
        payout,
        pred.id,
      ]);

      if (won) {
        await query("update escrows set status = 'released', released_at = now(), updated_at = now() where prediction_id = $1", [pred.id]);
      }

      if (pred.user_id) {
        await query(
          "insert into notifications (user_id, type, title, body, payload) values ($1, $2, $3, $4, $5)",
          [
            pred.user_id,
            won ? "prediction_won" : "prediction_lost",
            won ? "Prediction won" : "Prediction lost",
            `${pred.outcome_label} · ${won ? `+${payout.toFixed(2)} USDC` : "Better luck next time"}`,
            { predictionId: pred.external_id, payout },
          ],
        );
      }
    }

    await query("update markets set closed = true, updated_at = now() where id = $1", [market.id]);
  }

  await withTransaction(async (client) => {
    await query("update matches set status = 'settled', updated_at = now() where id = $1", [match.id], client);
    await query("update settlements set status = 'completed', finished_at = $2, updated_at = now() where id = $1", [
      settlement.id,
      new Date().toISOString(),
    ], client);
    await query(
      "insert into transactions (type, status, signature, metadata) values ($1, $2, $3, $4)",
      ["settlement", solanaTx ? "confirmed" : "pending", solanaTx || null, { matchExternalId, fixtureId, proofId: proof.id }],
      client,
    );
    await query("insert into worker_jobs (type, status, payload) values ('leaderboard_refresh', 'pending', '{}'::jsonb)", [], client);
    await query("insert into worker_jobs (type, status, payload) values ('statistics_refresh', 'pending', '{}'::jsonb)", [], client);
  });

  await insertLiveEvent(matchExternalId, "settlement_finished", "Settlement finished", "Escrow released to winners", {
    fixtureId,
    solanaTx,
  });

  if (solanaTx) {
    await insertLiveEvent(matchExternalId, "tx_confirmed", "Transaction confirmed", explorerUrl, { solanaTx });
  }

  return { ok: true, proofId: proof.id, solanaTx };
}
