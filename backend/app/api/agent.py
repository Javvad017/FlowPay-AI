from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.gemini_agent import run_gemini_agent


# =========================================
# Router
# =========================================

router = APIRouter(
    prefix="/api/agent",
    tags=["Commerce Agent"],
)


# =========================================
# Request Model
# =========================================

class ChatRequest(BaseModel):
    message: str


# =========================================
# Gemini Commerce Agent
# =========================================

@router.post("/chat")
def chat(request: ChatRequest) -> dict[str, Any]:

    result = run_gemini_agent(
        request.message
    )

    return result