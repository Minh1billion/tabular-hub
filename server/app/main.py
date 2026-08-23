from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.auth.router import router as auth_router
from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.data.router import router as data_router
from app.node.router import router as node_router
from app.workspace.router import router as workspace_router

app = FastAPI(title="Tabular Manner App")

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
app.include_router(node_router)
app.include_router(data_router)

@app.get("/health")
def health():
    return {"status": "ok"}