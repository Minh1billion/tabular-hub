import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test")
os.environ.setdefault("GITHUB_CLIENT_ID", "test")
os.environ.setdefault("GITHUB_CLIENT_SECRET", "test")
os.environ.setdefault("OAUTH_REDIRECT_BASE_URL", "http://testserver")
os.environ.setdefault("FRONTEND_URL", "http://testserver")

import fakeredis
from fakeredis import aioredis as fakeaioredis
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.core.queue as queue_module
from app.auth.models import User
from app.core.security import create_access_token
from app.database import Base, get_db
from app.main import app

_fake_redis_server = fakeredis.FakeServer()
queue_module._client = fakeredis.FakeRedis(server=_fake_redis_server, decode_responses=True)
queue_module._async_client = fakeaioredis.FakeRedis(server=_fake_redis_server, decode_responses=True)

engine = create_engine("sqlite:///./test.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        for table in reversed(Base.metadata.sorted_tables):
            session.execute(table.delete())
        session.commit()
        session.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db_session):
    user = User(email="test@example.com", display_name="Test User")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def auth_client(client, test_user):
    token = create_access_token(str(test_user.id))
    client.cookies.set("access_token", token)
    return client