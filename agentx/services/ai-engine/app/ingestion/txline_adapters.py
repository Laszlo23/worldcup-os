"""Normalize TxLINE fixture and score payloads (aligned with World Cup OS adapters)."""

from __future__ import annotations

from typing import Any

SOCCER_PHASE: dict[int, str] = {
    1: "scheduled",
    2: "live",
    3: "halftime",
    4: "live",
    5: "finished",
    7: "live",
    8: "halftime",
    9: "live",
    10: "finished",
    12: "live",
    13: "finished",
    100: "finished",
}

TEAM_FLAGS: dict[str, str] = {
    "ARG": "🇦🇷",
    "BRA": "🇧🇷",
    "FRA": "🇫🇷",
    "GER": "🇩🇪",
    "ESP": "🇪🇸",
    "ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "POR": "🇵🇹",
    "NED": "🇳🇱",
    "ITA": "🇮🇹",
    "BEL": "🇧🇪",
    "USA": "🇺🇸",
    "MEX": "🇲🇽",
    "NOR": "🇳🇴",
    "SUI": "🇨🇭",
    "MAR": "🇲🇦",
    "VIE": "🇻🇳",
    "MYA": "🇲🇲",
}


def map_game_state_to_status(game_state: int | None, action: str | None = None) -> str:
    if action and action.lower() in ("game_finalised", "game_finalized"):
        return "finished"
    if game_state and game_state in SOCCER_PHASE:
        return SOCCER_PHASE[game_state]
    return "scheduled"


def _team(name: str, code: str = "") -> dict[str, str]:
    c = (code or name[:3]).upper()
    return {"name": name, "flag": TEAM_FLAGS.get(c, "⚽"), "code": c}


def team_from_participant(participant: dict[str, Any] | None, fallback: str) -> dict[str, str]:
    if not participant:
        return _team(fallback, fallback[:3])
    code = str(participant.get("code") or participant.get("Code") or fallback[:3]).upper()
    name = str(participant.get("name") or participant.get("Name") or code)
    return _team(name, code)


def fixture_id_from(raw: dict[str, Any]) -> int | None:
    for key in ("fixtureId", "FixtureId", "fixture_id", "id", "FixtureGroupId"):
        val = raw.get(key)
        if val is not None:
            try:
                return int(val)
            except (TypeError, ValueError):
                continue
    return None


def external_id_for_fixture(fixture_id: int | None, raw: dict[str, Any] | None = None) -> str:
    if raw and raw.get("external_id"):
        return str(raw["external_id"])
    if fixture_id:
        return f"fx-{fixture_id}"
    return "unknown"


def _read_participant_goals(participant: Any) -> int:
    if not participant or not isinstance(participant, dict):
        return 0
    total = participant.get("Total") or participant.get("total") or {}
    if isinstance(total, dict):
        return int(total.get("Goals") or total.get("goals") or 0)
    return int(participant.get("Goals") or participant.get("goals") or 0)


def normalize_score_payload(raw: dict[str, Any]) -> dict[str, Any]:
    """Convert TxLINE score SSE/snapshot row into upsert-friendly dict."""
    fixture_id = fixture_id_from(raw)
    action = str(raw.get("Action") or raw.get("action") or "").lower()
    if action == "disconnected":
        return {}

    score = raw.get("Score") or raw.get("score") or {}
    status_id = int(raw.get("StatusId") or raw.get("statusId") or raw.get("GameState") or raw.get("gameState") or 0)
    clock = raw.get("Clock") or raw.get("clock") or {}
    minute = 0
    if isinstance(clock, dict) and clock.get("Seconds") is not None:
        minute = max(0, int(float(clock["Seconds"]) // 60))
    elif raw.get("minute") is not None:
        minute = int(raw["minute"])

    score_home = int(raw.get("scoreHome") or raw.get("ScoreHome") or 0)
    score_away = int(raw.get("scoreAway") or raw.get("ScoreAway") or 0)
    if isinstance(score, dict):
        if score_home == 0 and score_away == 0:
            score_home = _read_participant_goals(score.get("Participant1") or score.get("participant1"))
            score_away = _read_participant_goals(score.get("Participant2") or score.get("participant2"))
        nested = score.get("score") if isinstance(score.get("score"), dict) else score
        if isinstance(nested, dict):
            score_home = int(nested.get("home") or score_home)
            score_away = int(nested.get("away") or score_away)

    status = map_game_state_to_status(status_id or None, action)
    if str(raw.get("status") or "").lower() in ("live", "scheduled", "finished", "halftime"):
        status = str(raw["status"]).lower()

    out: dict[str, Any] = {
        "fixtureId": fixture_id,
        "fixture_id": fixture_id,
        "external_id": external_id_for_fixture(fixture_id, raw),
        "scoreHome": score_home,
        "scoreAway": score_away,
        "homeScore": score_home,
        "awayScore": score_away,
        "minute": minute,
        "matchMinute": minute,
        "status": status,
        "seq": raw.get("Seq") or raw.get("seq"),
        "action": action,
    }
    if raw.get("stats"):
        out["stats"] = raw["stats"]
    return out


def fixture_to_match_row(fixture: dict[str, Any]) -> dict[str, Any]:
    fixture_id = fixture_id_from(fixture)
    participants = fixture.get("participants") or fixture.get("Participants") or []
    if isinstance(participants, list) and len(participants) >= 2:
        home = team_from_participant(participants[0] if isinstance(participants[0], dict) else None, "Home")
        away = team_from_participant(participants[1] if isinstance(participants[1], dict) else None, "Away")
    else:
        home = team_from_participant(
            {
                "name": fixture.get("Participant1") or fixture.get("participant1") or "Home",
                "code": str(fixture.get("Participant1") or "HOM")[:3],
            },
            "Home",
        )
        away = team_from_participant(
            {
                "name": fixture.get("Participant2") or fixture.get("participant2") or "Away",
                "code": str(fixture.get("Participant2") or "AWA")[:3],
            },
            "Away",
        )

    kickoff_raw = fixture.get("startTime") or fixture.get("StartTime") or fixture.get("Ts")
    kickoff_at = None
    if kickoff_raw is not None:
        try:
            from datetime import datetime, timezone

            kickoff_at = datetime.fromtimestamp(int(kickoff_raw) / 1000, tz=timezone.utc)
        except (TypeError, ValueError, OSError):
            kickoff_at = None

    game_state = int(fixture.get("gameState") or fixture.get("GameState") or 1)
    score = fixture.get("score") if isinstance(fixture.get("score"), dict) else {}
    score_home = int(
        score.get("home")
        or fixture.get("ScoreHome")
        or fixture.get("scoreHome")
        or fixture.get("Score1")
        or fixture.get("Participant1Score")
        or 0
    )
    score_away = int(
        score.get("away")
        or fixture.get("ScoreAway")
        or fixture.get("scoreAway")
        or fixture.get("Score2")
        or fixture.get("Participant2Score")
        or 0
    )

    return {
        "external_id": external_id_for_fixture(fixture_id, fixture),
        "txline_fixture_id": fixture_id,
        "home_team": home,
        "away_team": away,
        "score_home": score_home,
        "score_away": score_away,
        "status": map_game_state_to_status(game_state),
        "minute": int(fixture.get("minute") or fixture.get("Minute") or 0),
        "stadium": fixture.get("venue") or fixture.get("Venue") or fixture.get("stadium"),
        "stage": fixture.get("competition") or fixture.get("Competition") or fixture.get("stage") or "World Cup",
        "kickoff_at": kickoff_at,
        "stats": fixture.get("stats") or {},
        "odds": fixture.get("odds") or {},
        "odds_history": [],
        "momentum": 50.0,
        "win_probability": {},
        "raw_payload": fixture,
    }
