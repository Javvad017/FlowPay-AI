@echo off
title FlowPay AI

echo ========================================
echo          FlowPay AI Starting...
echo ========================================
echo.

echo [1/2] Starting FastAPI backend...
start "FlowPay Backend" cmd /k "cd /d C:\hobbie\Flowpay-AI\flowpay-ai\backend && call venv\Scripts\activate && uvicorn app.main:app --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Next.js frontend...
start "FlowPay Frontend" cmd /k "cd /d C:\hobbie\Flowpay-AI\flowpay-ai\frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo Opening FlowPay AI...
start http://localhost:4000

echo.
echo ========================================
echo          FlowPay AI Started
echo ========================================
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:4000
echo ========================================