from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

class AppError(Exception):
    status_code = 400

    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)

class NotFoundError(AppError):
    status_code = 404

class UnauthorizedError(AppError):
    status_code = 401

class ForbiddenError(AppError):
    status_code = 403

class ConflictError(AppError):
    status_code = 409

class PayloadTooLargeError(AppError):
    status_code = 413

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})