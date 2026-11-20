from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

class AppError(Exception):
    status_code = 400
    code: str | None = None

    def __init__(self, detail: str, **extra):
        self.detail = detail
        self.extra = extra
        super().__init__(detail)

class NotFoundError(AppError):
    status_code = 404

class UnauthorizedError(AppError):
    status_code = 401

class ForbiddenError(AppError):
    status_code = 403

class ConflictError(AppError):
    status_code = 409

class SpecConflictError(ConflictError):
    code = "spec_version_conflict"

class ElementLockedError(AppError):
    status_code = 423
    code = "element_locked"

class ServiceUnavailableError(AppError):
    status_code = 503

class PayloadTooLargeError(AppError):
    status_code = 413

class PlanLimitExceededError(AppError):
    status_code = 402

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        content = {"detail": exc.detail, **exc.extra}
        if exc.code:
            content["code"] = exc.code
        return JSONResponse(status_code=exc.status_code, content=content)