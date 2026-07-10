from datetime import datetime, timezone

ingestion_state = {
    "scores_connected": False,
    "odds_connected": False,
    "last_event_at": None,
    "last_error": None,
}


def touch_event() -> None:
    ingestion_state["last_event_at"] = datetime.now(timezone.utc).isoformat()
