from pathlib import Path
from urllib.parse import quote
import uuid

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config import settings

_client = boto3.client(
    "s3",
    region_name=settings.STAGING_S3_REGION,
    endpoint_url=settings.STAGING_S3_ENDPOINT_URL,
    aws_access_key_id=settings.STAGING_S3_ACCESS_KEY_ID,
    aws_secret_access_key=settings.STAGING_S3_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
)

_presign_client = boto3.client(
    "s3",
    region_name=settings.STAGING_S3_REGION,
    endpoint_url=settings.STAGING_S3_PUBLIC_ENDPOINT_URL or settings.STAGING_S3_ENDPOINT_URL,
    aws_access_key_id=settings.STAGING_S3_ACCESS_KEY_ID,
    aws_secret_access_key=settings.STAGING_S3_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
)


def is_local() -> bool:
    return settings.ENGINE_BACKEND == "local"


def local_path(key: str) -> Path:
    p = Path(key)
    if p.is_absolute():
        return p
    return Path(settings.ENGINE_STORAGE_ROOT) / ".staging" / key


def new_key(workspace_id: str, filename: str) -> str:
    return f"{workspace_id}/{uuid.uuid4()}-{filename}"


def presign_post(key: str, max_size_bytes: int) -> dict:
    if is_local():
        base = settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")
        return {"url": f"{base}/staging/{quote(key, safe='/')}", "fields": {}}
    return _presign_client.generate_presigned_post(
        Bucket=settings.STAGING_S3_BUCKET_NAME,
        Key=key,
        Conditions=[["content-length-range", 0, max_size_bytes]],
        ExpiresIn=settings.STAGING_URL_TTL_SECONDS,
    )


def presign_get(key: str, filename: str) -> str:
    if is_local():
        base = settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")
        return f"{base}/staging/{quote(key, safe='/')}?filename={quote(filename)}"
    return _presign_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.STAGING_S3_BUCKET_NAME,
            "Key": key,
            "ResponseContentDisposition": f'attachment; filename="{filename}"',
        },
        ExpiresIn=settings.STAGING_URL_TTL_SECONDS,
    )


def delete(key: str) -> None:
    if is_local():
        local_path(key).unlink(missing_ok=True)
        return
    _client.delete_object(Bucket=settings.STAGING_S3_BUCKET_NAME, Key=key)


def exists(key: str) -> bool:
    if is_local():
        return local_path(key).is_file()
    try:
        _client.head_object(Bucket=settings.STAGING_S3_BUCKET_NAME, Key=key)
        return True
    except ClientError:
        return False


def size(key: str) -> int:
    if is_local():
        return local_path(key).stat().st_size
    head = _client.head_object(Bucket=settings.STAGING_S3_BUCKET_NAME, Key=key)
    return head["ContentLength"]

def s3_reader_params(key: str) -> dict:
    return {
        "bucket_name": settings.STAGING_S3_BUCKET_NAME,
        "key": key,
        "region": settings.STAGING_S3_REGION,
        "endpoint_url": settings.STAGING_S3_ENDPOINT_URL,
        "access_key_id": settings.STAGING_S3_ACCESS_KEY_ID,
        "secret_access_key": settings.STAGING_S3_SECRET_ACCESS_KEY,
        "allow_http": settings.STAGING_S3_ALLOW_HTTP,
    }

def s3_writer_params(key: str) -> dict:
    return s3_reader_params(key)