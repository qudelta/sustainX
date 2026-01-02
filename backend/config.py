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
    
    # JWT
    jwt_secret: str = "your-jwt-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24
    
    # SMTP
    smtp_host: str = "smtp.example.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@example.com"
    smtp_from_name: str = "SustainX - Qudelta"
    smtp_use_tls: bool = True
    
    # App
    app_name: str = "Thermal Simulation Platform"
    frontend_url: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
