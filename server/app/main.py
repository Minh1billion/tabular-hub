from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.auth.router import router as auth_router
from app.nodes.router import router as nodes_router
from app.resources.router import router as resources_router
from app.run.router import router as run_router
from app.workspace.router import router as workspace_router
from app.config import settings
from app.core.engine import engine_lifespan
from app.core.exceptions import register_exception_handlers

app = FastAPI(title="Tabular Manner App", lifespan=engine_lifespan)

app.add_middleware(SessionMiddleware, secret_key=settings.SESSION_SECRET)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(workspace_router)
app.include_router(run_router)
app.include_router(nodes_router)
app.include_router(resources_router)

@app.get("/health")
def health():
    return {"status": "ok"}