#!/bin/sh
set -e
alembic upgrade head
if [ "$#" -eq 0 ]; then
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000
else
  exec "$@"
fi