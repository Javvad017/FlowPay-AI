"use client";

import { FormEvent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

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
  image_url?: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ================================================= */
/* HELPER                                            */
/* ================================================= */

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "Not specified";
  }
  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const PRODUCT_IMAGES: Record<string, string> = {
  prod_001: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80",
  prod_002: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=600&q=80",
  prod_003: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=600&q=80",
  prod_004: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80",
  prod_005: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
  prod_006: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80",
  prod_007: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
  prod_008: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=600&q=80",
  prod_009: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80",
};

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  Audio: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
  Wearables: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
  Computers: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80",
  Accessories: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80",
  Electronics: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=600&q=80",
};

function ProductVisual({ product }: { product: Product }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl =
    product.image_url ||
    PRODUCT_IMAGES[product.id] ||
    CATEGORY_FALLBACK_IMAGES[product.category] ||
    "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80";

  if (imageError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#F9FAFB] p-4 text-[#9CA3AF]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
          <span className="font-heading text-lg font-bold">{product.name.charAt(0)}</span>
        </div>
        <span className="mt-2 text-xs font-semibold text-[#374151]">{product.name}</span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#F3F4F6]">
      <img
        src={imageUrl}
        alt={product.name}
        onError={() => setImageError(true)}
        className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-105"
        loading="lazy"
      />
    </div>
  );
}

/* ================================================= */
/* AGENT PAGE COMPONENT                              */
/* ================================================= */

export default function AgentPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<AgentResponse | null>(null);

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

  const [attributionSource, setAttributionSource] = useState<AttributionSource>("direct_checkout");

  const [crossSellRecommendations, setCrossSellRecommendations] = useState<GrowthRecommendation[]>([]);
  const [crossSellLoading, setCrossSellLoading] = useState(false);

  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [directBuyLoading, setDirectBuyLoading] = useState<string | null>(null);

  const examplePrompts = [
    "Gaming under ₹3,000",
    "Laptop for programming",
    "Fitness products",
    "Wireless audio",
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

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    loadCrossSell();
  }, [cart.items.length, cart.subtotal]);

  /* ================================================= */
  /* LOAD CATALOG                                      */
  /* ================================================= */
  async function loadCatalog() {
    setCatalogLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/catalog/products`);
      if (!res.ok) throw new Error("Unable to load product catalog");
      const data = await res.json();
      setCatalogProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      console.error("Catalog load error:", err);
      setCatalogProducts([]);
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  /* ================================================= */
  /* SEND MESSAGE                                      */
  /* ================================================= */
  async function sendMessage(event?: FormEvent<HTMLFormElement>, customQuery?: string) {
    if (event) event.preventDefault();

    const queryText = customQuery || message;
    if (!queryText.trim()) return;

    setLoading(true);
    setError("");
    setResponse(null);
    setCartMessage("");

    try {
      const res = await fetch(`${API_URL}/api/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: queryText.trim() }),
      });

      if (!res.ok) {
        throw new Error(`Agent request failed: ${res.status}`);
      }

      const data: AgentResponse = await res.json();
      setResponse(data);
      await loadCart();
    } catch (err) {
      console.error("Agent error:", err);
      setError("Unable to connect to FlowPay Agent. Make sure FastAPI is running on localhost:8000.");
    } finally {
      setLoading(false);
    }
  }

  /* ================================================= */
  /* ADD TO CART                                       */
  /* ================================================= */
  async function handleAddToCart(product: Product, source: AttributionSource = "ai_recommendation") {
    setCartLoading(true);
    setCartMessage("");
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/cart/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          quantity: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Unable to add product to cart");
      }

      setCart(data);

      if (source === "cross_sell") {
        setAttributionSource("cross_sell");
      } else if (attributionSource === "direct_checkout" && source === "ai_recommendation") {
        setAttributionSource("ai_recommendation");
      }

      setCartMessage(`${product.name} added to cart`);
      setTimeout(() => setCartMessage(""), 3000);
    } catch (err) {
      console.error("Add to cart error:", err);
      setError(err instanceof Error ? err.message : "Unable to add product to cart");
    } finally {
      setCartLoading(false);
    }
  }

  /* ================================================= */
  /* LOAD CROSS-SELL                                   */
  /* ================================================= */
  async function loadCrossSell() {
    if (cart.items.length === 0) {
      setCrossSellRecommendations([]);
      return;
    }

    setCrossSellLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/growth/upsell`);
      if (!res.ok) throw new Error("Unable to load cross-sell recommendations");

      const data = await res.json();
      setCrossSellRecommendations(Array.isArray(data.recommendations) ? data.recommendations : []);
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
  async function handleRemoveFromCart(productId: string) {
    setCartLoading(true);
    setCartMessage("");
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/cart/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Unable to remove product");

      setCart(data);

      if (data.items.length === 0) {
        setAttributionSource("direct_checkout");
        setCrossSellRecommendations([]);
      }
    } catch (err) {
      console.error("Remove from cart error:", err);
      setError(err instanceof Error ? err.message : "Unable to remove product");
    } finally {
      setCartLoading(false);
    }
  }

  /* ================================================= */
  /* RAZORPAY CHECKOUT                                 */
  /* ================================================= */
  async function loadRazorpayScript(): Promise<boolean> {
    if (window.Razorpay) return true;

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
        throw new Error("Unable to load Razorpay Checkout. Check your internet connection.");
      }

      const createResponse = await fetch(`${API_URL}/api/checkout/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attribution_source: attributionSource }),
      });

      const createData = await createResponse.json();
      if (!createResponse.ok) {
        throw new Error(createData.detail || "Unable to create checkout order.");
      }

      const checkoutData = createData as CheckoutResponse;

      if (checkoutData.attribution_source) {
        setAttributionSource(checkoutData.attribution_source as AttributionSource);
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
            setPaymentStatus("Verifying payment with Razorpay...");

            const verifyResponse = await fetch(`${API_URL}/api/checkout/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: checkoutData.order_id,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_signature: payment.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(verifyData.detail || "Payment verification failed.");
            }

            setPaymentStatus("Payment successful! Your FlowPay order has been confirmed.");
            await loadCart();
          } catch (err) {
            console.error("Payment verification error:", err);
            setError(err instanceof Error ? err.message : "Payment verification failed.");
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

        theme: { color: "#2563EB" },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (res: any) => {
        console.error("Razorpay payment failed:", res);
        setCheckoutLoading(false);
        setError(res?.error?.description || "Payment failed. Please try again.");
        setPaymentStatus("");
      });

      razorpay.open();
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
      setCheckoutLoading(false);
    }
  }

  /* ================================================= */
  /* DIRECT BUY                                        */
  /* ================================================= */
  async function handleDirectBuy(product: Product) {
    if (product.inventory <= 0) return;

    setDirectBuyLoading(product.id);
    setError("");
    setPaymentStatus("");

    try {
      /* 1. Add to cart */
      const addRes = await fetch(`${API_URL}/api/cart/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, quantity: 1 }),
      });
      const addData = await addRes.json();
      if (!addRes.ok) throw new Error(addData.detail || "Unable to add product to cart");
      setCart(addData);
      setCartMessage(`${product.name} added to cart`);
      setTimeout(() => setCartMessage(""), 3000);

      /* 2. Set attribution to direct_checkout */
      setAttributionSource("direct_checkout");

      /* 3. Create checkout order with direct_checkout attribution */
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        throw new Error("Unable to load Razorpay Checkout. Check your internet connection.");
      }

      const createResponse = await fetch(`${API_URL}/api/checkout/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attribution_source: "direct_checkout" }),
      });

      const createData = await createResponse.json();
      if (!createResponse.ok) {
        throw new Error(createData.detail || "Unable to create checkout order.");
      }

      const checkoutData = createData as CheckoutResponse;

      /* 4. Open Razorpay */
      const options = {
        key: checkoutData.key_id,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: "FlowPay AI",
        description: "Direct Checkout – " + product.name,
        order_id: checkoutData.razorpay_order_id,

        handler: async (payment: RazorpayPaymentResponse) => {
          try {
            setPaymentStatus("Verifying payment with Razorpay...");

            const verifyResponse = await fetch(`${API_URL}/api/checkout/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: checkoutData.order_id,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_signature: payment.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok) {
              throw new Error(verifyData.detail || "Payment verification failed.");
            }

            setPaymentStatus("Payment successful! Your FlowPay order has been confirmed.");
            await loadCart();
            await loadCatalog();
          } catch (err) {
            console.error("Payment verification error:", err);
            setError(err instanceof Error ? err.message : "Payment verification failed.");
            setPaymentStatus("");
          }
        },

        modal: {
          ondismiss: () => {
            setPaymentStatus("");
          },
        },

        theme: { color: "#2563EB" },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (res: any) => {
        console.error("Razorpay payment failed:", res);
        setError(res?.error?.description || "Payment failed. Please try again.");
        setPaymentStatus("");
      });
      razorpay.open();
    } catch (err) {
      console.error("Direct buy error:", err);
      setError(err instanceof Error ? err.message : "Unable to complete direct checkout.");
    } finally {
      setDirectBuyLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827] selection:bg-[#2563EB]/15 selection:text-[#1E40AF]">
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* ================= HEADER ================= */}
        <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-xs font-bold text-white shadow-sm">
                  F
                </div>
                <span className="font-heading text-sm font-bold text-[#111827]">FlowPay AI</span>
              </Link>
              <span className="hidden text-xs text-[#6B7280] sm:inline">| Commerce Agent Console</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Cart Pill */}
              <div className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs font-medium text-[#374151]">
                <span>Cart:</span>
                <span className="font-mono font-bold text-[#111827]">{cart.total_items} items</span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 rounded-full border border-[#D1D5DB] bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#047857]">
                <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                <span>Agent Online</span>
              </div>

              {/* Dashboard Link */}
              <Link
                href="/"
                className="rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#374151] shadow-sm transition hover:bg-[#F9FAFB]"
              >
                Dashboard →
              </Link>
            </div>
          </div>
        </header>

        {/* ================= MAIN CONTAINER ================= */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
          {/* AGENT HERO */}
          <div className="text-center">
            <span className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#1E40AF]">
              FlowPay Commerce Agent
            </span>

            <h1 className="font-heading mt-3 text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl">
              Turn customer intent into better product decisions.
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-[#6B7280] sm:text-sm">
              FlowPay evaluates intent, queries product catalog, applies ranking rules, and preps instant checkout.
            </p>
          </div>

          {/* ================= REQUEST CONSOLE INPUT ================= */}
          <div className="mt-8 fintech-card p-5 shadow-sm sm:p-6">
            <form onSubmit={(e) => sendMessage(e)}>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#374151]">
                Tell FlowPay what your customer needs...
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Show me something for gaming under ₹3,000"
                  className="min-h-12 flex-1 rounded-xl border border-[#D1D5DB] bg-white px-4 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />

                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="min-h-12 flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 text-xs font-bold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:opacity-40"
                >
                  {loading ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Ask Agent</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* QUICK PROMPTS CHIPS */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[#6B7280]">Quick prompts:</span>
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setMessage(prompt);
                    sendMessage(undefined, prompt);
                  }}
                  className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs text-[#374151] transition hover:border-[#D1D5DB] hover:bg-white"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Feedback Banners */}
            {cartMessage && (
              <div className="mt-4 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-3 text-xs font-semibold text-[#047857]">
                ✓ {cartMessage}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#B91C1C]">
                ⚠ {error}
              </div>
            )}
          </div>

          {/* ================= DIRECT CHECKOUT — BROWSE PRODUCTS ================= */}
          {/* Hidden while an AI Agent search result is active */}
          {!response && !loading && <div className="mt-8 fintech-card p-5 shadow-sm sm:p-6">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <h2 className="font-heading text-base font-bold text-[#111827]">Direct Checkout</h2>
                <p className="mt-0.5 text-xs text-[#6B7280]">Browse products and purchase directly</p>
              </div>
              <span className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-2.5 py-0.5 text-[10px] font-semibold text-[#1E40AF]">
                Attribution: direct_checkout
              </span>
            </div>

            {catalogLoading ? (
              <div className="mt-6 flex items-center gap-2 text-xs text-[#6B7280]">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#D1D5DB] border-t-[#2563EB]" />
                Loading product catalog…
              </div>
            ) : catalogProducts.length === 0 ? (
              <div className="mt-6 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center text-xs text-[#6B7280]">
                No products available in the catalog.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {catalogProducts.map((product) => {
                  const outOfStock = product.inventory <= 0;
                  const isBuying = directBuyLoading === product.id;
                  return (
                    <div
                      key={product.id}
                      className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm transition hover:shadow-md"
                    >
                      {/* Fixed-height image container */}
                      <div className="relative h-40 w-full shrink-0 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <img
                          src={
                            product.image_url ||
                            PRODUCT_IMAGES[product.id] ||
                            CATEGORY_FALLBACK_IMAGES[product.category] ||
                            "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80"
                          }
                          alt={product.name}
                          className="h-full w-full object-cover object-center"
                          loading="lazy"
                        />
                        <span className="absolute top-2 left-2 rounded border border-[#BFDBFE] bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-[#1E40AF]">
                          {product.category}
                        </span>
                      </div>

                      {/* Content — flex column pushes button to bottom */}
                      <div className="flex flex-1 flex-col justify-between p-3">
                        <div>
                          <h4 className="text-sm font-bold leading-tight text-[#111827]">{product.name}</h4>
                          <p className="mt-0.5 text-[11px] leading-snug text-[#6B7280] line-clamp-2">
                            {product.description}
                          </p>
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="font-mono text-sm font-extrabold text-[#111827]">
                              ₹{product.price.toLocaleString("en-IN")}
                            </span>
                            <span
                              className={`text-[11px] font-semibold ${outOfStock ? "text-[#B91C1C]" : "text-[#047857]"}`}
                            >
                              {outOfStock ? "Out of Stock" : `${product.inventory} in stock`}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={outOfStock || isBuying}
                          onClick={() => handleDirectBuy(product)}
                          className="mt-3 w-full rounded-lg bg-[#2563EB] py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:opacity-40"
                        >
                          {outOfStock
                            ? "Out of Stock"
                            : isBuying
                              ? "Processing…"
                              : "Buy Direct"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>}

          {/* ================= AI REASONING & RESPONSE ================= */}
          {response && !loading && (
            <div className="mt-8 space-y-6">
              {/* Agent Explanation Box */}
              <div className="fintech-card p-6">
                <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-xs font-bold text-[#1E40AF]">
                    AI
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-bold text-[#111827]">FlowPay Response</h3>
                    <p className="text-[11px] text-[#6B7280]">Intent evaluated & catalog matched</p>
                  </div>
                </div>

                <div className="mt-5 text-[15px] leading-7 text-[#374151]">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-4 last:mb-0 text-[#374151] leading-relaxed">
                          {children}
                        </p>
                      ),

                      strong: ({ children }) => (
                        <strong className="font-bold text-[#111827]">
                          {children}
                        </strong>
                      ),

                      em: ({ children }) => (
                        <em className="italic text-[#374151]">
                          {children}
                        </em>
                      ),

                      ul: ({ children }) => (
                        <ul className="mb-4 ml-6 list-disc space-y-2 text-[#374151]">
                          {children}
                        </ul>
                      ),

                      ol: ({ children }) => (
                        <ol className="mb-4 ml-6 list-decimal space-y-3 text-[#374151]">
                          {children}
                        </ol>
                      ),

                      li: ({ children }) => (
                        <li className="pl-1 text-[#374151] font-normal leading-relaxed">
                          {children}
                        </li>
                      ),

                      h1: ({ children }) => (
                        <h1 className="mb-3 text-lg font-bold text-[#111827]">
                          {children}
                        </h1>
                      ),

                      h2: ({ children }) => (
                        <h2 className="mb-3 text-base font-bold text-[#111827]">
                          {children}
                        </h2>
                      ),

                      h3: ({ children }) => (
                        <h3 className="mb-2 text-sm font-bold text-[#111827]">
                          {children}
                        </h3>
                      ),
                    }}
                  >
                    {response.message}
                  </ReactMarkdown>
                </div>
              </div>

              {/* AI UNDERSTANDING BLOCKS */}
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#374151]">AI Understanding</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-[#E5E7EB] bg-white p-3.5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase text-[#6B7280]">Intent</p>
                    <p className="mt-1 truncate text-xs font-bold text-[#111827]">{formatValue(response.intent)}</p>
                  </div>
                  <div className="rounded-lg border border-[#E5E7EB] bg-white p-3.5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase text-[#6B7280]">Tool Called</p>
                    <p className="mt-1 truncate text-xs font-bold text-[#111827]">{formatValue(response.tool_called)}</p>
                  </div>
                  <div className="rounded-lg border border-[#E5E7EB] bg-white p-3.5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase text-[#6B7280]">Relevant Products</p>
                    <p className="font-mono mt-1 text-xs font-bold text-[#2563EB]">{response.products_found} Products</p>
                  </div>
                  <div className="rounded-lg border border-[#E5E7EB] bg-white p-3.5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase text-[#6B7280]">Maximum Budget</p>
                    <p className="font-mono mt-1 text-xs font-bold text-[#111827]">
                      {response.max_price != null ? `₹${Number(response.max_price).toLocaleString("en-IN")}` : "No Limit"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ================= PRODUCT RECOMMENDATIONS ================= */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-heading text-base font-bold text-[#111827]">Product Recommendations</h3>
                  <span className="text-xs text-[#6B7280]">{response.recommendations.length} Catalog items</span>
                </div>

                {response.recommendations.length === 0 ? (
                  <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 text-center text-xs text-[#6B7280]">
                    No products found matching these exact criteria. Try adjusting budget or category.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {response.recommendations.map((product) => {
                      const outOfStock = product.inventory <= 0;
                      const isBuying = directBuyLoading === product.id;
                      return (
                        <div
                          key={product.id}
                          className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm transition hover:shadow-md"
                        >
                          {/* Fixed-height image — identical to Direct Checkout cards */}
                          <div className="relative h-40 w-full shrink-0 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                            <img
                              src={
                                product.image_url ||
                                PRODUCT_IMAGES[product.id] ||
                                CATEGORY_FALLBACK_IMAGES[product.category] ||
                                "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80"
                              }
                              alt={product.name}
                              className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-105"
                              loading="lazy"
                            />
                            <span className="absolute top-2 left-2 rounded border border-[#BFDBFE] bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-[#1E40AF]">
                              {product.category}
                            </span>
                          </div>

                          {/* Content — flex column pushes button to bottom */}
                          <div className="flex flex-1 flex-col justify-between p-3">
                            <div>
                              <h4 className="text-sm font-bold leading-tight text-[#111827]">{product.name}</h4>
                              <p className="mt-0.5 text-[11px] leading-snug text-[#6B7280] line-clamp-2">
                                {product.description}
                              </p>
                              <div className="mt-2 flex items-baseline justify-between">
                                <span className="font-mono text-sm font-extrabold text-[#111827]">
                                  ₹{product.price.toLocaleString("en-IN")}
                                </span>
                                <span
                                  className={`text-[11px] font-semibold ${outOfStock ? "text-[#B91C1C]" : "text-[#047857]"}`}
                                >
                                  {outOfStock ? "Out of Stock" : `${product.inventory} in stock`}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={cartLoading || outOfStock || isBuying}
                              onClick={() => handleAddToCart(product)}
                              className="mt-3 w-full rounded-lg bg-[#2563EB] py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:opacity-40"
                            >
                              {outOfStock ? "Out of Stock" : cartLoading ? "Adding..." : "+ Add to Cart"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= CART & CHECKOUT ================= */}
          {cart.items.length > 0 && (
            <div className="mt-10 fintech-card p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Active Cart
                  </span>
                  <h3 className="font-heading text-base font-bold text-[#111827]">
                    Cart ({cart.total_items} items)
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-[#6B7280]">Subtotal</span>
                  <p className="font-mono text-xl font-bold text-[#111827]">
                    ₹{cart.subtotal.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="mt-3 divide-y divide-[#E5E7EB]">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-[#F3F4F6]">
                        <img
                          src={PRODUCT_IMAGES[item.product_id] || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80"}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111827]">{item.name}</p>
                        <p className="font-mono text-[11px] text-[#6B7280]">
                          ₹{item.price.toLocaleString("en-IN")} × {item.quantity}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs font-bold text-[#111827]">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </span>
                      <button
                        type="button"
                        disabled={cartLoading}
                        onClick={() => handleRemoveFromCart(item.product_id)}
                        className="rounded border border-[#FCA5A5] bg-[#FEF2F2] px-2 py-1 text-[11px] font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* CROSS-SELL RECOMMENDATION */}
              {(crossSellLoading || crossSellRecommendations.length > 0) && (
                <div className="mt-6 rounded-lg border border-[#DBEAFE] bg-[#F0F7FF] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#1E40AF]">
                      AI CROSS-SELL
                    </span>
                    <span className="rounded border border-[#BFDBFE] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#1E40AF]">
                      Complete this purchase
                    </span>
                  </div>

                  {crossSellLoading ? (
                    <p className="text-xs text-[#6B7280]">Finding complementary products...</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {crossSellRecommendations.map((rec) => (
                        <div key={rec.product.id} className="flex gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-sm">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[#F3F4F6]">
                            <img
                              src={rec.product.image_url || PRODUCT_IMAGES[rec.product.id] || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80"}
                              alt={rec.product.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between text-xs font-bold">
                                <span className="truncate text-[#111827]">{rec.product.name}</span>
                                <span className="font-mono text-[#2563EB] shrink-0">₹{rec.product.price.toLocaleString("en-IN")}</span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-[#6B7280] line-clamp-1">{rec.reason}</p>
                            </div>
                            <button
                              type="button"
                              disabled={cartLoading}
                              onClick={() => handleAddToCart(rec.product, "cross_sell")}
                              className="mt-1.5 w-full rounded bg-[#2563EB] py-1 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-40"
                            >
                              + Add Cross-sell
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CHECKOUT CARD */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E7EB] pt-4">
                <div>
                  <p className="text-xs font-bold text-[#111827]">Secure Checkout</p>
                  <p className="text-[11px] text-[#6B7280]">Test payment sandbox powered by Razorpay</p>
                  <p className="mt-1 text-[10px] text-[#9CA3AF]">
                    Attribution: <span className="font-semibold text-[#374151]">{formatValue(attributionSource)}</span>
                  </p>
                  {paymentStatus && (
                    <p className="mt-1 text-xs font-semibold text-[#047857]">{paymentStatus}</p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={checkoutLoading || cartLoading || cart.items.length === 0}
                  onClick={handleCheckout}
                  className="rounded-xl bg-[#2563EB] px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:opacity-40"
                >
                  {checkoutLoading ? "Opening Razorpay..." : `Checkout · ₹${cart.subtotal.toLocaleString("en-IN")}`}
                </button>
              </div>
            </div>
          )}

          {/* COMMERCE EXECUTION PIPELINE */}
          <div className="mt-8 rounded-xl border border-[#E5E7EB] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Commerce Execution Pipeline</p>
              <span className="text-[10px] text-[#9CA3AF]">Architecture overview</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                "Intent Recognition",
                "Commerce Agent",
                "Catalog Query",
                "Product Ranking",
                "Recommendation",
                "Cart State",
                "Cross-sell",
                "Razorpay Checkout",
              ].map((step, idx, arr) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-[11px] font-medium text-[#374151]">
                    {step}
                  </span>
                  {idx < arr.length - 1 && <span className="text-[#C4C9D4] text-xs">→</span>}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}