from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    SESSION_SECRET: str

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str

    OAUTH_REDIRECT_BASE_URL: str
    FRONTEND_URL: str
    COOKIE_SECURE: bool = False

    ENGINE_BACKEND: str = "local"
    ENGINE_STORAGE_ROOT: str = ".tm"
    ENGINE_S3_BUCKET_NAME: str | None = None
    ENGINE_S3_ROOT_PREFIX: str = ""
    ENGINE_S3_REGION: str = "us-east-1"
    ENGINE_S3_ENDPOINT_URL: str | None = None
    ENGINE_S3_ACCESS_KEY_ID: str | None = None
    ENGINE_S3_SECRET_ACCESS_KEY: str | None = None
    ENGINE_MAX_CACHED_GRAPHS: int = 128
    ENGINE_BUCKET_IDLE_TTL_SECONDS: int | None = None

    REDIS_URL: str = "redis://localhost:6379/0"
    RUN_QUEUE_STREAM: str = "runs:pending"

    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024 * 1024
    UPLOAD_CHUNK_SIZE_BYTES: int = 1024 * 1024

settings = Settings()