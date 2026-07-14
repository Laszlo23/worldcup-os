from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_AGENTX_ROOT = Path(__file__).resolve().parents[3]
_ENV_FILE = _AGENTX_ROOT / ".env"


DEVNET_USDC_MINT = "ELWTKspHKCnCfCiCiqYw1EDH77k8VCP74dK9qytG2Ujh"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.is_file() else ".env",
        extra="ignore",
    )

    database_url: str = "postgresql://txline:txline_dev@localhost:5433/txline_ai_trader"
    txline_api_origin: str = "https://txline.txodds.com"
    txline_guest_jwt: str = ""
    txline_api_token: str = ""
    txline_service_level: int = 12
    demo_mode: bool = False
    solana_rpc_url: str = "https://api.devnet.solana.com"
    solana_network: str = "devnet"
    usdc_mint: str = DEVNET_USDC_MINT
    settlement_authority_secret: str = ""
    anchor_authority_secret: str = ""
    agent_alpha_treasury_secret: str = ""
    agent_beta_treasury_secret: str = ""
    session_secret: str = "txline-ai-trader-dev-secret-change-in-prod"
    app_url: str = "https://agentx.buildingcultureid.space"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    api_port: int = 8041
    cors_origins: str = "http://localhost:3041,http://127.0.0.1:3041,https://agentx.buildingcultureid.space"
    wmos_api_url: str = "https://wmos.buildingcultureid.space"
    worker_secret: str = "dev-worker-secret"
    agentx_api_key: str = ""
    superteam_earn_base_url: str = "https://superteam.fun"
    superteam_earn_api_key: str = ""
    superteam_earn_agent_id: str = ""
    superteam_earn_claim_code: str = ""
    webacy_api_key: str = Field(default="", validation_alias=AliasChoices("WEBACY_API_KEY", "WEBACCEL_API_KEY"))
    webacy_enabled: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_webacy_api_key(self) -> str:
        return self.webacy_api_key

    def has_webacy(self) -> bool:
        return self.webacy_enabled and bool(self.resolved_webacy_api_key)


settings = Settings()
