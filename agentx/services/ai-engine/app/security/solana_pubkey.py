from urllib.parse import urlparse

from solders.pubkey import Pubkey


def is_valid_solana_pubkey(value: str) -> bool:
    try:
        key = Pubkey.from_string(value.strip())
        return key.is_on_curve()
    except Exception:
        return False


def extract_domain_from_auth_message(message: str) -> str | None:
    for line in message.split("\n"):
        if line.startswith("URI: "):
            uri = line.replace("URI: ", "").strip()
            return urlparse(uri).hostname
    return None


def is_allowed_auth_domain(message_domain: str | None, app_url: str) -> bool:
    if not message_domain:
        return False
    try:
        app_host = urlparse(app_url).hostname
    except Exception:
        return False
    if not app_host:
        return False
    normalized = message_domain.split(":")[0]
    return normalized == app_host.split(":")[0]
