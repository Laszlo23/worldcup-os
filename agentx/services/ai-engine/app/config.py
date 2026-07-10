from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://txline:txline_dev@localhost:5433/txline_ai_trader"
    txline_api_origin: str = "https://txline.txodds.com"
    txline_guest_jwt: str = ""
    txline_api_token: str = ""
    txline_service_level: int = 12
    demo_mode: bool = False
    solana_rpc_url: str = "https://api.devnet.solana.com"
    solana_network: str = "devnet"
    usdc_mint: str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    settlement_authority_secret: str = ""
    anchor_authority_secret: str = ""
    agent_alpha_treasury_secret: str = ""
    agent_beta_treasury_secret: str = ""
    session_secret: str = "txline-ai-trader-dev-secret-change-in-prod"
    app_url: str = "https://agentx.buildingcultureid.space"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    api_port: int = 8041
    cors_origins: str = "http://localhost:3041,https://agentx.buildingcultureid.space"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
