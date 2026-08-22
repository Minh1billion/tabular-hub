# Tabular Manner App

MVP app: Authentication (Google/GitHub OAuth2, account merge by email) and Workspace management.
Separate from the `tabular-manner` engine for now; will import it as a package later.

## Run with Docker

```bash
cp .env.example .env
docker compose up --build
```

API available at `http://localhost:8000`, docs at `http://localhost:8000/docs`.

## Run locally

```bash
cp .env.example .env
uv venv
uv pip install -e ".[dev]"
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

## Tests

```bash
uv run pytest tests -q
```
