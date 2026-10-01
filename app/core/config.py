from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    database_url: str = 'sqlite+aiosqlite:///./reviewlens.db'
    mongo_url: str = 'mongodb://localhost:27017'
    mongo_db: str = 'reviewlens'
    redis_url: str = 'redis://localhost:6379/0'
    jwt_secret: str = 'change-me-in-production'
    admin_username: str = 'admin'
    admin_password: str = 'admin123'
    frontend_origin: str = 'http://localhost:3000'
    analysis_version: str = 'mock-v2.0.0'
    prompt_version: str = 'summary-prompt-v1.0.0'
    model_version: str = 'deterministic-mock-v1.0.0'
    max_upload_mb: int = 10
    demo_mode: bool = True
settings = Settings()
