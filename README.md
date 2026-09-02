# FlowPay AI

### Autonomous Commerce Agent for Merchant Growth & Secure Payments

FlowPay AI is an AI-powered commerce platform that combines conversational product discovery, intelligent recommendations, cart management, secure Razorpay payments, and merchant growth intelligence into one system.

## Features

- AI-powered natural-language commerce agent
- Smart product recommendations based on product type, category, use case, and budget
- AI-driven cart management
- Razorpay Test Mode checkout
- Server-side payment signature verification
- Persistent SQLite order and cart data
- Merchant dashboard with revenue, orders, conversion, and transactions
- Growth intelligence with recovery opportunities and upsell recommendations
- Revenue attribution across direct checkout, AI recommendation, cross-sell, and recovery
- Demo data reset

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- React Markdown

### Backend
- FastAPI
- Python
- Pydantic
- SQLite

### AI
- Google Gemini
- Gemini tool/function calling

### Payments
- Razorpay Test Mode

## Architecture

```text
Customer
   ↓
Next.js Frontend
   ↓ HTTP
FastAPI Backend
   ├── Gemini AI Agent
   ├── Catalog
   ├── Cart
   ├── Checkout
   ├── Growth Intelligence
   └── Merchant Dashboard
          ↓
       SQLite
          ↓
       Razorpay
```

## Project Structure

```text
FlowPay-AI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   └── main.py
│   ├── flowpay.db
│   └── requirements.txt
├── frontend/
│   ├── app/
│   ├── package.json
│   └── ...
└── README.md
```

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
```

Windows:

```powershell
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend: `http://localhost:8000`

API docs: `http://localhost:8000/docs`

### Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create `.env.local` if required:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev -- -p 4000
```

Frontend: `http://localhost:4000`

## Example AI Flow

```text
Customer:
I need earbuds under ₹3000.

        ↓

Gemini Agent
        ↓
Search Merchant Catalog
        ↓
Recommend Products
        ↓
Customer:
Add FlowBuds Pro to my cart.
        ↓
AI Tool Calling
        ↓
Cart Updated
        ↓
Razorpay Checkout
        ↓
Payment
        ↓
Server-side Signature Verification
        ↓
Order Marked PAID
        ↓
Cart Cleared
```

## API Overview

### Agent

```text
POST /api/agent/chat
```

### Catalog

```text
GET /api/catalog
```

### Cart

```text
GET  /api/cart
POST /api/cart/add
POST /api/cart/remove
POST /api/cart/clear
```

### Checkout

```text
POST /api/checkout/create
POST /api/checkout/verify
GET  /api/checkout/orders
GET  /api/checkout/{order_id}
```

### Growth

```text
GET /api/growth/recovery
POST /api/growth/recovery/{order_id}
GET /api/growth/upsell
GET /api/growth/attribution
```

### Dashboard

```text
GET /api/dashboard/stats
GET /api/dashboard/revenue-intelligence
GET /api/dashboard/activity
GET /api/dashboard/merchant-insights
GET /api/dashboard/growth-intelligence
```

## Security

- Razorpay orders are created server-side.
- Razorpay secret credentials are never exposed to the frontend.
- Payment signatures are verified on the backend.
- Never commit `.env`, `.env.local`, API keys, or secrets to Git.
- Test Mode is used for the current Razorpay integration.

## Current Limitations

This project is designed as a buildathon/demo implementation.

- Razorpay integration uses Test Mode.
- Recovery workflows demonstrate merchant opportunities and workflow initiation; they are not a production SMS/email delivery system.
- SQLite is used for local persistence.
- Production deployment would require authentication, multi-tenancy, stronger infrastructure, monitoring, and webhook/event handling.

## Future Improvements

- Razorpay webhooks for payment lifecycle events
- PostgreSQL for production-scale persistence
- Customer and merchant authentication
- Multi-tenancy
- Real SMS/email recovery campaigns
- Real-time inventory synchronization
- Advanced customer analytics
- AI-driven promotions
- Production observability

## Why FlowPay AI?

Traditional commerce separates product discovery, cart management, payments, and merchant analytics.

FlowPay AI connects these capabilities into one intelligent commerce workflow:

```text
Discover
   ↓
Recommend
   ↓
Add to Cart
   ↓
Checkout
   ↓
Pay
   ↓
Analyze
   ↓
Grow
```

Customers get a conversational shopping experience, while merchants get actionable growth intelligence.

## Buildathon

Built for the **Razorpay Buildathon**.

FlowPay AI demonstrates how AI agents can move beyond simple chat interfaces and participate in real commerce workflows while keeping payment execution and verification on the backend.

## License

This project is currently intended for demonstration and buildathon purposes.
