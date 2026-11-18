from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sonora Music"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Base paths pointing to root monorepo
    SERVER_DIR: Path = Path(__file__).resolve().parent.parent.parent
    BASE_DIR: Path = SERVER_DIR.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    COOKIES_PATH: Path = DATA_DIR / "cookies.txt"
    
    # SQLite
    DB_NAME: str = "sonora.db"
    
    @property
    def SQLITE_URL(self) -> str:
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        db_path = self.DATA_DIR / self.DB_NAME
        return f"sqlite+aiosqlite:///{db_path}"

    # Auth
    AUTH_TOKEN: str = "sonora_local_dev_token"
    
    # Local music folders
    LOCAL_MUSIC_DIRS: list[str] = []
    
    # Stream settings
    PREFER_PREMIUM_AAC: bool = True
    STREAM_CACHE_TTL_HOURS: int = 5

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
