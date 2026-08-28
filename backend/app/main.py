from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.dashboard import router as dashboard_router
from app.api.catalog import router as catalog_router
from app.api.agent import router as agent_router




app = FastAPI(
    title="FlowPay AI",
    description="Autonomous Commerce Agent for Merchant Growth & Secure Payments",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(dashboard_router)
app.include_router(catalog_router)
app.include_router(agent_router)


@app.get("/")
def root():
    return {
        "name": "FlowPay AI",
        "status": "online",
        "version": "0.1.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }