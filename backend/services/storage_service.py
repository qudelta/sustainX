from minio import Minio
from minio.error import S3Error
from typing import Optional
from io import BytesIO
from datetime import timedelta

from config import get_settings

settings = get_settings()


class StorageService:
    _client: Optional[Minio] = None
    
    @classmethod
    def get_client(cls) -> Minio:
        if cls._client is None:
            cls._client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_root_user,
                secret_key=settings.minio_root_password,
                secure=settings.minio_use_ssl,
            )
            # Ensure bucket exists
            cls._ensure_bucket()
        return cls._client
    
    @classmethod
    def _ensure_bucket(cls):
        client = cls._client
        if not client.bucket_exists(settings.minio_bucket):
            client.make_bucket(settings.minio_bucket)
    
    @classmethod
    def upload_file(cls, file_key: str, data: bytes, content_type: str = "application/octet-stream") -> bool:
        try:
            client = cls.get_client()
            client.put_object(
                settings.minio_bucket,
                file_key,
                BytesIO(data),
                len(data),
                content_type=content_type,
            )
            return True
        except S3Error as e:
            print(f"Failed to upload file: {e}")
            return False
    
    @classmethod
    def download_file(cls, file_key: str) -> Optional[bytes]:
        try:
            client = cls.get_client()
            response = client.get_object(settings.minio_bucket, file_key)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as e:
            print(f"Failed to download file: {e}")
            return None
    
    @classmethod
    def get_presigned_url(cls, file_key: str, expires_hours: int = 1) -> Optional[str]:
        try:
            client = cls.get_client()
            url = client.presigned_get_object(
                settings.minio_bucket,
                file_key,
                expires=timedelta(hours=expires_hours),
            )
            return url
        except S3Error as e:
            print(f"Failed to generate presigned URL: {e}")
            return None
    
    @classmethod
    def delete_file(cls, file_key: str) -> bool:
        try:
            client = cls.get_client()
            client.remove_object(settings.minio_bucket, file_key)
            return True
        except S3Error as e:
            print(f"Failed to delete file: {e}")
            return False
