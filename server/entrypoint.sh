#!/bin/sh
set -e
alembic upgrade head
if [ "$#" -eq 0 ]; then
  python -m app.worker.main &
  exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
else
  exec "$@"
fi