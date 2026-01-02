from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "mysql+pymysql://thermal_user:thermal_password@mysql:3306/thermal_sim"
    
    # RabbitMQ
    rabbitmq_url: str = "amqp://thermal:thermal_queue@rabbitmq:5672/"
    simulation_queue: str = "simulation_jobs"
    
    # MinIO
    minio_endpoint: str = "minio:9000"
    minio_root_user: str = "minioadmin"
    minio_root_password: str = "minioadmin123"
    minio_bucket: str = "thermal-sim-files"
    minio_use_ssl: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
