from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "PSI_SYS 备件供应链跟踪系统"
    DEBUG: bool = True

    # Database (SQLite for development, MySQL for production)
    DATABASE_URL: str = "sqlite:///./psi_sys.db"

    # JWT
    SECRET_KEY: str = "change-this-to-a-secure-random-string-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
