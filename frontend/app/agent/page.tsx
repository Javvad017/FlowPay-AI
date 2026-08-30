"use client";

import { FormEvent, useEffect, useState } from "react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

/* ================================================= */
/* TYPES                                             */
/* ================================================= */

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
  tool_called: string | null;
  query: string;
  product_type?: string | null;
  category?: string | null;
  use_case?: string | null;
  max_price: number | null;
  products_found: number;
  recommendations: Product[];
};

type CartItem = {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
};

type Cart = {
  items: CartItem[];
  total_items: number;
  subtotal: number;
};

type CheckoutResponse = {
  order_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  items: CartItem[];
  attribution_source?: string;
};

type AttributionSource =
  | "direct_checkout"
  | "ai_recommendation"
  | "cross_sell"
  | "recovery";

type GrowthRecommendation = {
  product: Product;
  score: number;
  reason: string;
};

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};


/* ================================================= */
/* CONFIG                                            */
/* ================================================= */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";


/* ================================================= */
/* AGENT PAGE                                        */
/* ================================================= */

export default function AgentPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] =
    useState<AgentResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ---------------- Cart state ---------------- */

  const [cart, setCart] = useState<Cart>({
    items: [],
    total_items: 0,
    subtotal: 0,
  });

  const [cartLoading, setCartLoading] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");

  const [attributionSource, setAttributionSource] =
    useState<AttributionSource>("direct_checkout");

  const [crossSellRecommendations, setCrossSellRecommendations] =
    useState<GrowthRecommendation[]>([]);
  const [crossSellLoading, setCrossSellLoading] = useState(false);


  /* ================================================= */
  /* EXAMPLE PROMPTS                                  */
  /* ================================================= */

  const examplePrompts = [
    "I need earbuds under ₹5000 for gym",
    "I need a laptop for programming under ₹60000",
    "Show me a smartwatch for fitness",
  ];


  /* ================================================= */
  /* LOAD CART                                         */
  /* ================================================= */

  async function loadCart() {
    try {
      const res = await fetch(`${API_URL}/api/cart`);

      if (!res.ok) {
        throw new Error("Failed to load cart");
      }

      const data: Cart = await res.json();

      setCart(data);
    } catch (err) {
      console.error("Cart load error:", err);
    }
  }


  /* ================================================= */
  /* INITIAL CART LOAD                                 */
  /* ================================================= */

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    loadCrossSell();
  }, [cart.items.length, cart.subtotal]);


  /* ================================================= */
  /* SEND MESSAGE                                      */
  /* ================================================= */

  async function sendMessage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setResponse(null);
    setCartMessage("");

    try {
      const res = await fetch(
        `${API_URL}/api/agent/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: message.trim(),
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          `Agent request failed: ${res.status}`
        );
      }

      const data: AgentResponse =
        await res.json();

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


  /* ================================================= */
  /* ADD TO CART                                       */
  /* ================================================= */

  async function handleAddToCart(
    product: Product,
    source: AttributionSource = "ai_recommendation"
  ) {
    setCartLoading(true);
    setCartMessage("");
    setError("");

    try {
      const res = await fetch(
        `${API_URL}/api/cart/add`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_id: product.id,
            quantity: 1,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail || "Unable to add product to cart"
        );
      }

      setCart(data);

      if (source === "cross_sell") {
        setAttributionSource("cross_sell");
      } else if (
        attributionSource === "direct_checkout" &&
        source === "ai_recommendation"
      ) {
        setAttributionSource("ai_recommendation");
      }

      setCartMessage(
        `${product.name} added to cart`
      );

      setTimeout(() => {
        setCartMessage("");
      }, 3000);
    } catch (err) {
      console.error("Add to cart error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add product to cart"
      );
    } finally {
      setCartLoading(false);
    }
  }


  /* ================================================= */
  /* LOAD CROSS-SELL RECOMMENDATIONS                    */
  /* ================================================= */

  async function loadCrossSell() {
    if (cart.items.length === 0) {
      setCrossSellRecommendations([]);
      return;
    }

    setCrossSellLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/growth/upsell`
      );

      if (!res.ok) {
        throw new Error("Unable to load cross-sell recommendations");
      }

      const data = await res.json();

      setCrossSellRecommendations(
        Array.isArray(data.recommendations)
          ? data.recommendations
          : []
      );
    } catch (err) {
      console.error("Cross-sell load error:", err);
      setCrossSellRecommendations([]);
    } finally {
      setCrossSellLoading(false);
    }
  }


  /* ================================================= */
  /* REMOVE FROM CART                                  */
  /* ================================================= */

  async function handleRemoveFromCart(
    productId: string
  ) {
    setCartLoading(true);
    setCartMessage("");
    setError("");

    try {
      const res = await fetch(
        `${API_URL}/api/cart/remove`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_id: productId,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail || "Unable to remove product"
        );
      }

      setCart(data);

      if (data.items.length === 0) {
        setAttributionSource("direct_checkout");
        setCrossSellRecommendations([]);
      }
    } catch (err) {
      console.error(
        "Remove from cart error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove product"
      );
    } finally {
      setCartLoading(false);
    }
  }


  /* ================================================= */
  /* RAZORPAY CHECKOUT                                 */
  /* ================================================= */

  async function loadRazorpayScript(): Promise<boolean> {
    if (window.Razorpay) {
      return true;
    }

    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handleCheckout() {
    if (cart.items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setCheckoutLoading(true);
    setError("");
    setPaymentStatus("");

    try {
      const razorpayLoaded = await loadRazorpayScript();

      if (!razorpayLoaded) {
        throw new Error(
          "Unable to load Razorpay Checkout. Check your internet connection."
        );
      }

      const createResponse = await fetch(
        `${API_URL}/api/checkout/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attribution_source: attributionSource,
          }),
        }
      );

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(
          createData.detail || "Unable to create checkout order."
        );
      }

      const checkoutData = createData as CheckoutResponse;

      if (checkoutData.attribution_source) {
        setAttributionSource(
          checkoutData.attribution_source as AttributionSource
        );
      }

      const options = {
        key: checkoutData.key_id,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: "FlowPay AI",
        description: "FlowPay Test Transaction",
        order_id: checkoutData.razorpay_order_id,

        handler: async (payment: RazorpayPaymentResponse) => {
          try {
            setCheckoutLoading(true);
            setPaymentStatus("Verifying payment...");

            const verifyResponse = await fetch(
              `${API_URL}/api/checkout/verify`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  order_id: checkoutData.order_id,
                  razorpay_order_id: payment.razorpay_order_id,
                  razorpay_payment_id: payment.razorpay_payment_id,
                  razorpay_signature: payment.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.detail || "Payment verification failed."
              );
            }

            setPaymentStatus(
              "Payment successful. Your FlowPay order has been confirmed."
            );

            await loadCart();
          } catch (err) {
            console.error("Payment verification error:", err);
            setError(
              err instanceof Error
                ? err.message
                : "Payment verification failed."
            );
            setPaymentStatus("");
          } finally {
            setCheckoutLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
            setPaymentStatus("");
          },
        },

        theme: {
          color: "#22d3ee",
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (response: any) => {
        console.error("Razorpay payment failed:", response);
        setCheckoutLoading(false);
        setError(
          response?.error?.description ||
            "Payment failed. Please try again."
        );
        setPaymentStatus("");
      });

      razorpay.open();
    } catch (err) {
      console.error("Checkout error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to start checkout."
      );
      setCheckoutLoading(false);
    }
  }


  /* ================================================= */
  /* UI                                                 */
  /* ================================================= */

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

            {/* Cart counter */}

            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-300">
              Cart {cart.total_items}
            </div>

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
                  disabled={
                    loading ||
                    !message.trim()
                  }
                  className="min-h-12 rounded-xl bg-cyan-400 px-6 text-sm font-medium text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading
                    ? "Thinking..."
                    : "Ask Agent"}
                </button>

              </div>

            </form>


            {/* Example prompts */}

            <div className="mt-4 flex flex-wrap gap-2">

              {examplePrompts.map(
                (prompt) => (

                  <button
                    key={prompt}
                    type="button"
                    onClick={() =>
                      setMessage(prompt)
                    }
                    className="rounded-full border border-white/10 px-3 py-2 text-xs text-gray-500 transition hover:border-cyan-400/30 hover:text-gray-300"
                  >
                    {prompt}
                  </button>

                )
              )}

            </div>


            {/* Success */}

            {cartMessage && (

              <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">

                <p className="text-sm text-emerald-300">
                  {cartMessage}
                </p>

              </div>

            )}


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

                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-300">
                    {response.message}
                  </p>

                </div>


                {/* Agent metadata */}

                <div className="grid gap-3 md:grid-cols-4">

                  <InfoCard
                    label="Intent"
                    value={formatValue(
                      response.intent
                    )}
                  />

                  <InfoCard
                    label="Tool"
                    value={formatValue(
                      response.tool_called
                    )}
                  />

                  <InfoCard
                    label="Products"
                    value={String(
                      response.products_found
                    )}
                  />

                  <InfoCard
                    label="Max budget"
                    value={
                      response.max_price != null
                        ? `₹${Number(
                            response.max_price
                          ).toLocaleString(
                            "en-IN"
                          )}`
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


                  {response.recommendations.length ===
                  0 ? (

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
                            onAddToCart={
                              handleAddToCart
                            }
                            cartLoading={
                              cartLoading
                            }
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
                          Add a recommended product to the cart.
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


        {/* ================= CART ================= */}

        {cart.items.length > 0 && (

          <div className="mx-auto mt-8 max-w-4xl rounded-3xl border border-cyan-400/10 bg-white/[0.025] p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs text-gray-500">
                  COMMERCE CART
                </p>

                <h2 className="mt-1 text-xl font-medium">
                  Customer cart
                </h2>

              </div>

              <div className="text-right">

                <p className="text-xs text-gray-500">
                  Subtotal
                </p>

                <p className="mt-1 text-2xl font-semibold text-cyan-300">
                  ₹{cart.subtotal.toLocaleString(
                    "en-IN"
                  )}
                </p>

              </div>

            </div>


            {/* Cart items */}

            <div className="mt-6 space-y-3">

              {cart.items.map(
                (item) => (

                  <div
                    key={item.product_id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div>

                      <p className="text-sm font-medium text-white">
                        {item.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        ₹{item.price.toLocaleString(
                          "en-IN"
                        )} × {item.quantity}
                      </p>

                    </div>


                    <div className="flex items-center gap-4">

                      <p className="text-sm font-medium">
                        ₹{(
                          item.price *
                          item.quantity
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </p>

                      <button
                        type="button"
                        disabled={cartLoading}
                        onClick={() =>
                          handleRemoveFromCart(
                            item.product_id
                          )
                        }
                        className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 transition hover:bg-red-400/5 disabled:opacity-40"
                      >
                        Remove
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>


            {/* ================= CROSS-SELL ================= */}

            {(crossSellLoading || crossSellRecommendations.length > 0) && (
              <div className="mt-6 rounded-2xl border border-cyan-400/10 bg-black/20 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">
                      GROWTH AGENT
                    </p>
                    <h3 className="mt-1 text-lg font-medium">
                      You may also like
                    </h3>
                  </div>

                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs text-cyan-300">
                    Cross-sell
                  </span>
                </div>

                {crossSellLoading ? (
                  <p className="mt-4 text-xs text-gray-500">
                    Finding complementary products...
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {crossSellRecommendations.map((recommendation) => (
                      <div
                        key={recommendation.product.id}
                        className="rounded-xl border border-white/10 bg-black/30 p-4"
                      >
                        <div className="flex items-start justify-betweengap-3">
                          <div>
                            <p className="text-xs text-cyan-400">
                              {recommendation.product.category}
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {recommendation.product.name}
                            </p>
                          </div>

                          <p className="text-sm font-semibold text-cyan-300">
                            ₹{recommendation.product.price.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          {recommendation.reason}
                        </p>

                        <button
                          type="button"
                          disabled={cartLoading}
                          onClick={() =>
                            handleAddToCart(
                              recommendation.product,
                              "cross_sell"
                            )
                          }
                          className="mt-4 w-full rounded-lg border border-cyan-400/20 px-3 py-2 text-xs text-cyan-300 transition hover:bg-cyan-400/5 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Add cross-sell
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= CHECKOUT ================= */}

            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-cyan-400/10 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-sm text-gray-300">
                  Cart ready for checkout
                </p>

                <p className="mt-1 text-xs text-gray-600">
                  Secure test payment powered by Razorpay
                </p>

                <p className="mt-2 text-[10px] uppercase tracking-wide text-gray-700">
                  Revenue source:{" "}
                  <span className="text-cyan-400/70">
                    {formatValue(attributionSource)}
                  </span>
                </p>

                {paymentStatus && (
                  <p className="mt-2 text-xs text-emerald-400">
                    {paymentStatus}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={
                  checkoutLoading ||
                  cartLoading ||
                  cart.items.length === 0
                }
                onClick={handleCheckout}
                className="rounded-xl bg-cyan-400 px-5 py-3 text-xs font-medium text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {checkoutLoading
                  ? "Processing..."
                  : `Checkout · ₹${cart.subtotal.toLocaleString("en-IN")}`}
              </button>

            </div>

          </div>

        )}


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
              "Cart",
              "Cross-sell",
              "Checkout",
              "Payment Verification",
              "Revenue Attribution",
            ].map(
              (step, index, array) => (

                <div
                  key={step}
                  className="flex items-center gap-3"
                >

                  <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-gray-400">
                    {step}
                  </div>

                  {index <
                    array.length - 1 && (

                    <span className="text-gray-700">
                      →
                    </span>

                  )}

                </div>

              )
            )}

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
  onAddToCart,
  cartLoading,
}: {
  product: Product;
  onAddToCart: (
    product: Product,
    source?: AttributionSource
  ) => void;
  cartLoading: boolean;
}) {

  const outOfStock =
    product.inventory <= 0;

  return (

    <div className="group rounded-2xl border border-white/10 bg-black/25 p-5 transition hover:border-cyan-400/20 hover:bg-white/[0.03]">

      {/* Header */}

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


      {/* Description */}

      <p className="mt-4 text-xs leading-6 text-gray-500">
        {product.description}
      </p>


      {/* Price + inventory */}

      <div className="mt-5 flex items-end justify-between">

        <div>

          <p className="text-xs text-gray-600">
            Price
          </p>

          <p className="mt-1 text-xl font-semibold">
            ₹{product.price.toLocaleString(
              "en-IN"
            )}
          </p>

        </div>

        <div className="text-right">

          <p className="text-xs text-gray-600">
            Inventory
          </p>

          <p
            className={`mt-1 text-sm ${
              product.inventory > 0
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {product.inventory} available
          </p>

        </div>

      </div>


      {/* Features */}

      <div className="mt-5 flex flex-wrap gap-2">

        {product.features
          .slice(0, 2)
          .map((feature) => (

            <span
              key={feature}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-gray-500"
            >
              {feature}
            </span>

          ))}

      </div>


      {/* Add to cart */}

      <button
        type="button"
        disabled={
          cartLoading ||
          outOfStock
        }
        onClick={() =>
          onAddToCart(product)
        }
        className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 text-xs font-medium text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {outOfStock
          ? "Out of Stock"
          : cartLoading
          ? "Adding..."
          : "Add to Cart"}
      </button>

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

function formatValue(
  value: unknown
) {

  if (
    value === null ||
    value === undefined
  ) {
    return "Not specified";
  }

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}