import time
from datetime import datetime, timezone

_demo_state = {"tick": 0, "featured_minute": 71}


def _team(name: str, flag: str) -> dict:
    return {"name": name, "flag": flag}


DEMO_MATCHES = [
    {
        "external_id": "demo-bra-fra",
        "txline_fixture_id": 2026071,
        "home_team": _team("Brazil", "🇧🇷"),
        "away_team": _team("France", "🇫🇷"),
        "score_home": 2,
        "score_away": 1,
        "status": "live",
        "minute": 71,
        "stadium": "MetLife Stadium",
        "stage": "World Cup 2026 · Semi-Final",
        "kickoff_at": datetime.now(timezone.utc).isoformat(),
        "stats": {"possession": {"home": 63, "away": 37}, "shots": {"home": 14, "away": 8}, "pressure": "high"},
        "odds": {"home": 1.68, "draw": 3.40, "away": 5.20, "updatedAt": int(time.time() * 1000)},
        "odds_history": [
            {"t": int(time.time() * 1000) - 300000, "home": 1.92, "draw": 3.55, "away": 4.10},
            {"t": int(time.time() * 1000) - 180000, "home": 1.85, "draw": 3.48, "away": 4.35},
            {"t": int(time.time() * 1000) - 60000, "home": 1.78, "draw": 3.42, "away": 4.80},
            {"t": int(time.time() * 1000), "home": 1.68, "draw": 3.40, "away": 5.20},
        ],
        "momentum": 78.0,
        "win_probability": {"home": 63.0, "draw": 22.0, "away": 15.0},
        "raw_payload": {},
    },
    {
        "external_id": "demo-arg-cro",
        "txline_fixture_id": 2026072,
        "home_team": _team("Argentina", "🇦🇷"),
        "away_team": _team("Croatia", "🇭🇷"),
        "score_home": 1,
        "score_away": 1,
        "status": "live",
        "minute": 54,
        "stadium": "SoFi Stadium",
        "stage": "World Cup 2026 · Quarter-Final",
        "kickoff_at": datetime.now(timezone.utc).isoformat(),
        "stats": {"possession": {"home": 55, "away": 45}, "shots": {"home": 9, "away": 7}},
        "odds": {"home": 2.10, "draw": 3.15, "away": 3.60, "updatedAt": int(time.time() * 1000)},
        "odds_history": [],
        "momentum": 52.0,
        "win_probability": {"home": 42.0, "draw": 28.0, "away": 30.0},
        "raw_payload": {},
    },
    {
        "external_id": "demo-esp-ger",
        "txline_fixture_id": 2026073,
        "home_team": _team("Spain", "🇪🇸"),
        "away_team": _team("Germany", "🇩🇪"),
        "score_home": 0,
        "score_away": 0,
        "status": "scheduled",
        "minute": 0,
        "stadium": "AT&T Stadium",
        "stage": "World Cup 2026 · Semi-Final",
        "kickoff_at": datetime.now(timezone.utc).isoformat(),
        "stats": {},
        "odds": {"home": 2.35, "draw": 3.25, "away": 2.95, "updatedAt": int(time.time() * 1000)},
        "odds_history": [],
        "momentum": 50.0,
        "win_probability": {"home": 38.0, "draw": 27.0, "away": 35.0},
        "raw_payload": {},
    },
    {
        "external_id": "demo-ned-eng",
        "txline_fixture_id": 2026074,
        "home_team": _team("Netherlands", "🇳🇱"),
        "away_team": _team("England", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"),
        "score_home": 0,
        "score_away": 0,
        "status": "scheduled",
        "minute": 0,
        "stadium": "Mercedes-Benz Stadium",
        "stage": "World Cup 2026 · Quarter-Final",
        "kickoff_at": datetime.now(timezone.utc).isoformat(),
        "stats": {},
        "odds": {"home": 2.80, "draw": 3.10, "away": 2.55, "updatedAt": int(time.time() * 1000)},
        "odds_history": [],
        "momentum": 50.0,
        "win_probability": {"home": 33.0, "draw": 29.0, "away": 38.0},
        "raw_payload": {},
    },
]


def simulate_demo_tick() -> dict | None:
    """Returns incremental demo events for orchestrator."""
    _demo_state["tick"] += 1
    tick = _demo_state["tick"]
    if tick % 6 == 0:
        _demo_state["featured_minute"] = min(90, _demo_state["featured_minute"] + 1)
        return {
            "external_id": "demo-bra-fra",
            "fixtureId": 2026071,
            "homeScore": 2,
            "awayScore": 1,
            "minute": _demo_state["featured_minute"],
            "status": "live",
            "stats": {"possession": {"home": 64, "away": 36}, "shots": {"home": 15, "away": 8}},
            "_event_type": "score",
        }
    if tick % 2 == 0:
        return {
            "external_id": "demo-bra-fra",
            "fixtureId": 2026071,
            "home": round(1.68 - (tick % 10) * 0.01, 2),
            "draw": 3.38,
            "away": 5.35,
            "minute": _demo_state["featured_minute"],
            "status": "live",
            "_event_type": "odds",
        }
    return None
