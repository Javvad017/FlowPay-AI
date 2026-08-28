"use client";

import { FormEvent, useState } from "react";

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  inventory: number;
  features: string[];
  tags: string[];
};

type AgentResponse = {
  agent: string;
  message: string;
  intent: string;
  tool_called: string;
  query: string;
  max_price: number | null;
  products_found: number;
  recommendations: Product[];
};

export default function AgentPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const examplePrompts = [
    "I need earbuds under ₹5000 for gym",
    "I need a laptop for programming under ₹60000",
    "Show me a smartwatch for fitness",
  ];

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("http://localhost:8000/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Agent request failed: ${res.status}`);
      }

      const data: AgentResponse = await res.json();

      setResponse(data);
    } catch (err) {
      console.error("Agent error:", err);

      setError(
        "Unable to connect to FlowPay Agent. Make sure FastAPI is running on localhost:8000."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      {/* ================= HEADER ================= */}
      <header className="border-b border-white/10 bg-[#0b0c10]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          {/* Logo */}
          <div>
            <a
              href="/"
              className="text-xl font-semibold tracking-tight"
            >
              FlowPay{" "}
              <span className="text-cyan-400">
                AI
              </span>
            </a>

            <p className="mt-1 text-xs text-gray-500">
              Autonomous Commerce Engine
            </p>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Agent Online
            </div>

            <a
              href="/"
              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-300 transition hover:bg-white/5"
            >
              Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        {/* Intro */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium tracking-wide text-cyan-400">
            FLOWPAY COMMERCE AGENT
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Tell the agent what
            <br />
            <span className="text-gray-500">
              your customer needs.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-gray-400">
            FlowPay understands customer intent, searches the
            merchant catalog and generates relevant product
            recommendations.
          </p>
        </div>

        {/* ================= AGENT CONSOLE ================= */}
        <div className="mx-auto mt-12 max-w-4xl">
          <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 shadow-2xl shadow-black/20 md:p-7">
            {/* Session status */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">
                  AI COMMERCE SESSION
                </p>

                <p className="mt-1 text-sm text-gray-300">
                  Product discovery
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                Ready
              </div>
            </div>

            {/* Customer request */}
            <form onSubmit={sendMessage}>
              <label className="mb-3 block text-sm text-gray-400">
                Customer request
              </label>

              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="text"
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  placeholder="e.g. I need earbuds under ₹5000 for gym"
                  className="min-h-12 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none placeholder:text-gray-700 transition focus:border-cyan-400/40"
                />

                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="min-h-12 rounded-xl bg-cyan-400 px-6 text-sm font-medium text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? "Thinking..." : "Ask Agent"}
                </button>
              </div>
            </form>

            {/* Example prompts */}
            <div className="mt-4 flex flex-wrap gap-2">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setMessage(prompt)}
                  className="rounded-full border border-white/10 px-3 py-2 text-xs text-gray-500 transition hover:border-cyan-400/30 hover:text-gray-300"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/5 p-4">
                <p className="text-sm text-red-300">
                  {error}
                </p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-6">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />

                  <p className="text-sm text-gray-300">
                    FlowPay Agent is analyzing the request...
                  </p>
                </div>
              </div>
            )}

            {/* ================= RESPONSE ================= */}
            {response && !loading && (
              <div className="mt-8 space-y-5">
                {/* Agent message */}
                <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.03] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-sm text-cyan-300">
                      AI
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        FlowPay Commerce Agent
                      </p>

                      <p className="text-xs text-gray-600">
                        Decision completed
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    {response.message}
                  </p>
                </div>

                {/* Agent metadata */}
                <div className="grid gap-3 md:grid-cols-4">
                  <InfoCard
                    label="Intent"
                    value={formatValue(response.intent)}
                  />

                  <InfoCard
                    label="Tool"
                    value={formatValue(response.tool_called)}
                  />

                  <InfoCard
                    label="Products"
                    value={String(response.products_found)}
                  />

                  <InfoCard
                    label="Max budget"
                    value={
                      response.max_price != null
                        ? `₹${Number(response.max_price).toLocaleString("en-IN")}`
                        : "Not specified"
                    }
                  />
                </div>

                {/* ================= RECOMMENDATIONS ================= */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        CATALOG RESULTS
                      </p>

                      <h2 className="mt-1 text-lg font-medium">
                        Recommended products
                      </h2>
                    </div>

                    <span className="text-xs text-gray-600">
                      {response.products_found} found
                    </span>
                  </div>

                  {response.recommendations.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
                      <p className="text-sm text-gray-400">
                        No matching products found.
                      </p>

                      <p className="mt-2 text-xs text-gray-600">
                        Try changing the product category or
                        budget.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                      {response.recommendations.map(
                        (product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                          />
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Next action */}
                {response.recommendations.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs text-gray-600">
                          NEXT AGENT ACTION
                        </p>

                        <p className="mt-2 text-sm text-gray-300">
                          Product recommendation completed.
                        </p>
                      </div>

                      <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-300">
                        Ready for checkout
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================= ARCHITECTURE ================= */}
        <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs font-medium text-gray-500">
            CURRENT AGENT PIPELINE
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {[
              "Customer Intent",
              "Commerce Agent",
              "Catalog Tool",
              "Product Ranking",
              "Recommendation",
            ].map((step, index, array) => (
              <div
                key={step}
                className="flex items-center gap-3"
              >
                <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-gray-400">
                  {step}
                </div>

                {index < array.length - 1 && (
                  <span className="text-gray-700">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

/* ================================================= */
/* PRODUCT CARD                                      */
/* ================================================= */

function ProductCard({
  product,
}: {
  product: Product;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-black/25 p-5 transition hover:border-cyan-400/20 hover:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-cyan-400">
            {product.category}
          </p>

          <h3 className="mt-2 text-base font-medium">
            {product.name}
          </h3>
        </div>

        <span className="rounded-lg border border-white/10 px-2 py-1 text-xs text-gray-600">
          {product.id}
        </span>
      </div>

      <p className="mt-4 text-xs leading-6 text-gray-500">
        {product.description}
      </p>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-xs text-gray-600">
            Price
          </p>

          <p className="mt-1 text-xl font-semibold">
            ₹{product.price.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-600">
            Inventory
          </p>

          <p
            className={`mt-1 text-sm ${product.inventory > 0
                ? "text-emerald-400"
                : "text-red-400"
              }`}
          >
            {product.inventory} available
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {product.features.slice(0, 2).map(
          (feature) => (
            <span
              key={feature}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-gray-500"
            >
              {feature}
            </span>
          )
        )}
      </div>
    </div>
  );
}

/* ================================================= */
/* INFO CARD                                         */
/* ================================================= */

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {label}
      </p>

      <p className="mt-2 truncate text-sm text-gray-300">
        {value}
      </p>
    </div>
  );
}

/* ================================================= */
/* HELPERS                                           */
/* ================================================= */

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "Not specified";
  }

  return String(value)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}