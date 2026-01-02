from routes.auth import router as auth_router
from routes.projects import router as projects_router
from routes.simulations import router as simulations_router

__all__ = ["auth_router", "projects_router", "simulations_router"]
