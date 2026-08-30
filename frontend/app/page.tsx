"use client";

import { useEffect, useState } from "react";


type DashboardStats = {
  ai_assisted_revenue: number;
  ai_assisted_revenue_change: number;
  conversations: number;
  conversations_change: number;
  high_intent_customers: number;
  high_intent_customers_change: number;
  conversion_rate: number;
  conversion_rate_change: number;
  recommendations: number;
  conversions: number;
  recovered_carts: number;
  upsell_revenue: number;

  total_revenue: number;
  ai_revenue: number;
  cross_sell_revenue: number;
  recovery_revenue: number;
  direct_revenue: number;

  ai_orders: number;
  cross_sell_orders: number;
  recovery_orders: number;
  direct_orders: number;
};


type Activity = {
  customer: string;
  action: string;
  amount: number;
  status: string;
  order_id?: string;
  attribution_source?: string;
};


type Attribution = {
  label: string;
  orders: number;
  revenue: number;
  items: number;
};


type TopProduct = {
  product_id: string;
  name: string;
  units: number;
  revenue: number;
  sources: Record<string, number>;
};


type RevenueIntelligence = {
  success: boolean;
  total_revenue: number;
  paid_orders: number;
  attribution: Attribution[];
  top_products: TopProduct[];
};


type MerchantInsight = {
  type:
  | "growth"
  | "product"
  | "opportunity"
  | (string & {});
  title: string;
  message: string;
  action: string;
};


type MerchantInsights = {
  success: boolean;
  generated_by: string;
  summary: string;
  insights: MerchantInsight[];
};


type GrowthAction = {
  priority: "high" | "medium" | "low" | string;
  type: string;
  title: string;
  message: string;
  action: string;
  evidence?: Record<string, unknown>;
};

type GrowthIntelligence = {
  success: boolean;
  generated_by: string;
  health: string;
  summary: string;
  metrics: {
    total_orders: number;
    paid_orders: number;
    pending_orders: number;
    total_revenue: number;
    conversion_rate: number;
    average_order_value: number;
  };
  actions: GrowthAction[];
};


const API_URL = "http://localhost:8000";


function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}


function formatSource(source?: string) {
  const labels: Record<string, string> = {
    ai_recommendation: "AI Recommendation",
    cross_sell: "Cross-sell",
    recovery: "Recovery",
    direct_checkout: "Direct Checkout",
  };

  return labels[source || "direct_checkout"]
    || "Direct Checkout";
}


export default function Home() {
  const [agentOnline, setAgentOnline] = useState(true);

  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [intelligence, setIntelligence] =
    useState<RevenueIntelligence | null>(null);

  const [merchantInsights, setMerchantInsights] =
    useState<MerchantInsights | null>(null);

  const [growthIntelligence, setGrowthIntelligence] =
    useState<GrowthIntelligence | null>(null);


  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [recoveringOrderId, setRecoveringOrderId] =
    useState<string | null>(null);

  const [recoveryMessage, setRecoveryMessage] =
    useState<string | null>(null);

  const [crossSellLoading, setCrossSellLoading] =
    useState(false);

  const [crossSellRecommendations, setCrossSellRecommendations] =
    useState<any[]>([]);

  const [crossSellMessage, setCrossSellMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState(false);


  async function loadDashboard(
    manual = false,
  ) {
    if (manual) {
      setRefreshing(true);
    }

    try {
      const [
        statsResponse,
        activityResponse,
        intelligenceResponse,
        merchantInsightsResponse,
        growthIntelligenceResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/stats`),
        fetch(`${API_URL}/api/dashboard/activity`),
        fetch(
          `${API_URL}/api/dashboard/revenue-intelligence`
        ),
        fetch(
          `${API_URL}/api/dashboard/merchant-insights`
        ),
        fetch(
          `${API_URL}/api/growth/intelligence`
        ),
      ]);

      if (
        !statsResponse.ok
        || !activityResponse.ok
        || !intelligenceResponse.ok
        || !merchantInsightsResponse.ok
        || !growthIntelligenceResponse.ok
      ) {
        throw new Error(
          "Failed to fetch dashboard data"
        );
      }

      const statsData: DashboardStats =
        await statsResponse.json();

      const activityData: Activity[] =
        await activityResponse.json();

      const intelligenceData: RevenueIntelligence =
        await intelligenceResponse.json();

      const merchantInsightsData: MerchantInsights =
        await merchantInsightsResponse.json();

      const growthIntelligenceData: GrowthIntelligence =
        await growthIntelligenceResponse.json();

      setStats(statsData);
      setActivities(activityData);
      setIntelligence(intelligenceData);
      setMerchantInsights(merchantInsightsData);
      setGrowthIntelligence(growthIntelligenceData);
      setError(false);
    } catch (error) {
      console.error(
        "Dashboard API error:",
        error
      );

      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const recoverCheckout = async (orderId: string) => {
    setRecoveringOrderId(orderId);
    setRecoveryMessage(null);

    try {
      const response = await fetch(
        `${API_URL}/api/growth/recovery/${orderId}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Failed to recover checkout"
        );
      }

      setRecoveryMessage(
        data?.message ||
        "Recovery action initiated successfully."
      );

      // Refresh dashboard data after recovery.
      await loadDashboard();

    } catch (error) {
      console.error("Recovery error:", error);

      setRecoveryMessage(
        error instanceof Error
          ? error.message
          : "Failed to initiate recovery."
      );
    } finally {
      setRecoveringOrderId(null);
    }
  };


  const activateCrossSell = async () => {
    setCrossSellLoading(true);
    setCrossSellMessage(null);
    setCrossSellRecommendations([]);

    try {
      const response = await fetch(
        `${API_URL}/api/growth/upsell`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          "Failed to load cross-sell recommendations"
        );
      }

      const recommendations =
        data?.recommendations ?? [];

      setCrossSellRecommendations(recommendations);

      if (recommendations.length > 0) {
        setCrossSellMessage(
          `${recommendations.length} complementary product${recommendations.length === 1 ? "" : "s"
          } found.`
        );
      } else {
        setCrossSellMessage(
          "No cross-sell recommendations are available for the current cart."
        );
      }
    } catch (error) {
      console.error("Cross-sell error:", error);

      setCrossSellMessage(
        error instanceof Error
          ? error.message
          : "Unable to load cross-sell recommendations."
      );
    } finally {
      setCrossSellLoading(false);
    }
  };
  useEffect(() => {
    loadDashboard();
  }, []);


  return (
    <main className="min-h-screen bg-[#08090c] text-white">

      {/* ================= HEADER ================= */}

      <header className="border-b border-white/10 bg-[#0b0c10]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              FlowPay{" "}
              <span className="text-cyan-400">
                AI
              </span>
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Autonomous Commerce Engine
            </p>
          </div>


          <div className="flex items-center gap-4">

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300">
              <span
                className={`h-2 w-2 rounded-full ${agentOnline
                  ? "bg-emerald-400"
                  : "bg-red-400"
                  }`}
              />

              AI Agent{" "}
              {agentOnline
                ? "Online"
                : "Offline"}
            </div>


            <button
              onClick={() =>
                setAgentOnline(!agentOnline)
              }
              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-300 transition hover:bg-white/5"
            >
              {agentOnline
                ? "Pause Agent"
                : "Activate Agent"}
            </button>

          </div>

        </div>
      </header>


      {/* ================= MAIN ================= */}

      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* ================= HERO ================= */}

            <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">

          <div>

            <p className="mb-2 text-sm font-medium text-cyan-400">
              MERCHANT CONTROL CENTER
            </p>

            <h2 className="text-4xl font-semibold tracking-tight">
              Commerce intelligence,
              <br />
              <span className="text-gray-500">
                working autonomously.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
              FlowPay AI understands customer intent,
              recommends products, optimizes conversion
              and orchestrates secure payment workflows.
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-gray-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/5 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              type="button"
              onClick={async () => {

                const confirmed = window.confirm(
                  "Reset all FlowPay demo data? This will remove orders, payments, recovery attempts, and the current cart."
                );

                if (!confirmed) {
                  return;
                }

                try {

                  setRefreshing(true);
                  setError(false);

                  const response = await fetch(
                    `${API_URL}/api/demo/reset`,
                    {
                      method: "POST",
                    }
                  );

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(
                      data?.detail ||
                        "Failed to reset demo data"
                    );
                  }

                  await loadDashboard(true);

                  window.alert(
                    "FlowPay demo data has been reset successfully."
                  );

                } catch (error) {

                  console.error(
                    "Demo reset error:",
                    error
                  );

                  setError(true);

                  window.alert(
                    error instanceof Error
                      ? error.message
                      : "Failed to reset demo data."
                  );

                } finally {

                  setRefreshing(false);

                }

              }}
              disabled={refreshing}
              className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-2.5 text-xs text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset Demo
            </button>

          </div>

        </div>


        {/* ================= ERROR ================= */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/5 px-5 py-4">

            <p className="text-sm text-red-300">
              Unable to connect to FlowPay backend.
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Make sure FastAPI is running on localhost:8000.
            </p>

          </div>
        )}


        {/* ================= LOADING ================= */}

        {loading ? (

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center">

            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

            <p className="mt-4 text-sm text-gray-500">
              Loading commerce intelligence...
            </p>

          </div>

        ) : (

          <>

            {/* ================= TOP STATS ================= */}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

              <StatCard
                label="Paid revenue"
                value={formatMoney(
                  stats?.total_revenue ?? 0
                )}
                change="Live"
              />

              <StatCard
                label="Paid orders"
                value={(
                  stats?.conversions ?? 0
                ).toLocaleString("en-IN")}
                change="Confirmed"
              />

              <StatCard
                label="Pending orders"
                value={(
                  stats?.recovered_carts ?? 0
                ).toLocaleString("en-IN")}
                change="Awaiting payment"
              />

              <StatCard
                label="Conversion rate"
                value={`${stats?.conversion_rate ?? 0}%`}
                change="Live checkout"
              />

            </div>


            {/* ================= AI MERCHANT INSIGHTS ================= */}

            <div className="mt-6 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-6">

              {/* Header */}

              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                <div>
                  <p className="text-sm text-cyan-400">
                    AI MERCHANT INSIGHTS
                  </p>

                  <h3 className="mt-1 text-2xl font-medium">
                    What should you do next?
                  </h3>

                  <p className="mt-2 max-w-3xl text-xs leading-5 text-gray-500">
                    {merchantInsights?.summary ??
                      "FlowPay is analyzing confirmed commerce activity."}
                  </p>

                  {merchantInsights?.generated_by && (
                    <p className="mt-2 text-[10px] uppercase tracking-wide text-gray-600">
                      Generated by {merchantInsights.generated_by}
                    </p>
                  )}
                </div>

                <span className="w-fit rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs text-cyan-300">
                  AI Analysis
                </span>

              </div>


              {/* Insight Cards */}

              <div className="mt-6 grid gap-4 md:grid-cols-2">

                {(merchantInsights?.insights ?? []).map(
                  (insight, index) => (

                    <div
                      key={`${insight.title}-${index}`}
                      className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:border-cyan-400/20"
                    >

                      {/* Type */}

                      <span className="inline-flex rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-gray-500">
                        {insight.type}
                      </span>


                      {/* Title */}

                      <h4 className="mt-4 text-base font-medium text-gray-200">
                        {insight.title}
                      </h4>


                      {/* Message */}

                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        {insight.message}
                      </p>


                      {/* Recommended Action */}

                      <div className="mt-4 rounded-lg border border-cyan-400/10 bg-cyan-400/[0.03] p-3">

                        <p className="text-[10px] uppercase tracking-wide text-cyan-400">
                          Recommended Action
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-400">
                          {insight.action}
                        </p>

                      </div>

                    </div>

                  )
                )}


                {/* Empty State */}

                {(merchantInsights?.insights ?? []).length === 0 && (

                  <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-gray-600 md:col-span-2">
                    No merchant insights are available yet.
                  </div>

                )}

              </div>

            </div>



            {/* ================= AI GROWTH COMMAND CENTER ================= */}

            <div className="mt-6 rounded-2xl border border-cyan-400/10 bg-white/[0.025] p-6">

              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                <div>
                  <p className="text-sm text-cyan-400">
                    AI GROWTH COMMAND CENTER
                  </p>

                  <h3 className="mt-1 text-2xl font-medium">
                    Growth opportunities detected
                  </h3>

                  <p className="mt-2 max-w-3xl text-xs leading-5 text-gray-500">
                    {growthIntelligence?.summary ??
                      "FlowPay is analyzing your commerce activity."}
                  </p>

                  {growthIntelligence?.generated_by && (
                    <p className="mt-2 text-[10px] uppercase tracking-wide text-gray-600">
                      Generated by {growthIntelligence.generated_by}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">

                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs text-cyan-300">
                    {growthIntelligence?.actions?.length ?? 0} actions
                  </span>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-500">
                    {growthIntelligence?.health ?? "analyzing"}
                  </span>

                </div>

              </div>


              {/* ================= GROWTH METRICS ================= */}

              <div className="mt-6 grid gap-3 md:grid-cols-4">

                <GrowthMetric
                  label="Revenue"
                  value={formatMoney(
                    growthIntelligence?.metrics.total_revenue ?? 0
                  )}
                />

                <GrowthMetric
                  label="Conversion"
                  value={`${growthIntelligence?.metrics.conversion_rate ?? 0}%`}
                />

                <GrowthMetric
                  label="Pending"
                  value={(
                    growthIntelligence?.metrics.pending_orders ?? 0
                  ).toLocaleString("en-IN")}
                />

                <GrowthMetric
                  label="Average Order"
                  value={formatMoney(
                    growthIntelligence?.metrics.average_order_value ?? 0
                  )}
                />

              </div>


              {/* ================= GROWTH ACTIONS ================= */}

              <div className="mt-6 grid gap-4 md:grid-cols-2">

                {(growthIntelligence?.actions ?? []).map(
                  (growthAction, index) => {

                    const orderIds =
                      growthAction.evidence?.order_ids;

                    const hasRecoveryOrder =
                      growthAction.action ===
                      "recover_pending_orders" &&
                      Array.isArray(orderIds) &&
                      orderIds.length > 0;

                    return (

                      <div
                        key={`${growthAction.title}-${index}`}
                        className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:border-cyan-400/20"
                      >

                        {/* Priority + Type */}

                        <div className="flex items-center justify-between gap-3">

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${growthAction.priority === "high"
                              ? "border-red-400/20 bg-red-400/5 text-red-300"
                              : growthAction.priority === "medium"
                                ? "border-yellow-400/20 bg-yellow-400/5 text-yellow-300"
                                : "border-white/10 text-gray-500"
                              }`}
                          >
                            {growthAction.priority} priority
                          </span>

                          <span className="text-[10px] uppercase tracking-wide text-gray-600">
                            {growthAction.type}
                          </span>

                        </div>


                        {/* Title */}

                        <h4 className="mt-4 text-base font-medium">
                          {growthAction.title}
                        </h4>


                        {/* Message */}

                        <p className="mt-2 text-sm leading-6 text-gray-400">
                          {growthAction.message}
                        </p>


                        {/* Recommended Action */}

                        <div className="mt-4 rounded-lg border border-cyan-400/10 bg-cyan-400/[0.03] p-3">

                          <p className="text-[10px] uppercase tracking-wide text-cyan-400">
                            Recommended action
                          </p>

                          <p className="mt-1 text-xs leading-5 text-gray-400">
                            {growthAction.action}
                          </p>

                        </div>


                        {/* ================= RECOVERY ACTION ================= */}

                        {hasRecoveryOrder && (
                          <>
                            <button
                              type="button"
                              disabled={
                                recoveringOrderId === String(orderIds[0])
                              }
                              onClick={() =>
                                recoverCheckout(
                                  String(orderIds[0])
                                )
                              }
                              className="mt-4 w-full rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/15 hover:border-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {recoveringOrderId === String(orderIds[0])
                                ? "Initiating recovery..."
                                : "Recover Checkout"}
                            </button>

                            {recoveryMessage && (
                              <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                                <p className="text-[10px] uppercase tracking-wide text-emerald-400">
                                  Recovery Status
                                </p>

                                <p className="mt-1 text-xs leading-5 text-emerald-300">
                                  {recoveryMessage}
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {/* ================= CROSS-SELL ACTION ================= */}

                        {growthAction.action === "activate_cross_sell" && (
                          <button
                            type="button"
                            disabled={crossSellLoading}
                            onClick={activateCrossSell}
                            className="mt-4 w-full rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/15 hover:border-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {crossSellLoading
                              ? "Finding products..."
                              : "Activate Cross-sell"}
                          </button>
                        )}

                      </div>

                    );
                  }
                )}


                {/* ================= EMPTY STATE ================= */}

                {(growthIntelligence?.actions ?? []).length === 0 && (

                  <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-gray-600 md:col-span-2">
                    No growth opportunities detected yet.
                  </div>

                )}

              </div>


              {/* ================= AI CROSS-SELL RECOMMENDATIONS ================= */}

              {(crossSellMessage || crossSellRecommendations.length > 0) && (
                <div className="mt-6 rounded-xl border border-cyan-400/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-cyan-400">
                        AI Cross-sell Recommendations
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        FlowPay Growth Agent analysis
                      </p>
                    </div>

                    {crossSellLoading && (
                      <span className="text-[10px] uppercase tracking-wide text-cyan-400">
                        Analyzing...
                      </span>
                    )}
                  </div>

                  {crossSellMessage && (
                    <div className="mt-4 rounded-lg border border-cyan-400/10 bg-cyan-400/[0.03] px-4 py-3">
                      <p className="text-xs text-cyan-300">
                        {crossSellMessage}
                      </p>
                    </div>
                  )}

                  {crossSellRecommendations.length > 0 && (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {crossSellRecommendations.map(
                        (recommendation, index) => {
                          const product = recommendation?.product;

                          if (!product) return null;

                          return (
                            <div
                              key={`${product.id}-${index}`}
                              className="rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:border-cyan-400/20"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="text-sm font-medium">
                                  {product.name}
                                </h4>

                                <span className="rounded-full border border-cyan-400/10 bg-cyan-400/[0.03] px-2 py-1 text-[9px] uppercase tracking-wide text-cyan-400">
                                  AI Match
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-gray-500">
                                ₹{Number(product.price ?? 0).toLocaleString("en-IN")}
                              </p>

                              <p className="mt-3 text-xs leading-5 text-gray-400">
                                {recommendation.reason}
                              </p>

                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wide text-gray-600">
                                  Recommendation score
                                </span>

                                <span className="text-xs font-medium text-cyan-400">
                                  {recommendation.score}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(
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

                                    const data = await response.json();

                                    if (!response.ok) {
                                      throw new Error(
                                        data?.detail ||
                                        "Failed to add product to cart"
                                      );
                                    }

                                    alert(
                                      `${product.name} added to cart successfully.`
                                    );

                                    await loadDashboard();

                                  } catch (error) {
                                    console.error(
                                      "Cross-sell add-to-cart error:",
                                      error
                                    );

                                    alert(
                                      error instanceof Error
                                        ? error.message
                                        : "Failed to add product to cart."
                                    );
                                  }
                                }}
                                className="mt-4 w-full rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-xs font-medium text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/15"
                              >
                                Add to Cart
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>


            {/* ================= REVENUE INTELLIGENCE ================= */}

            <div className="mt-6 rounded-2xl border border-cyan-400/10 bg-white/[0.025] p-6">

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div>
                  <p className="text-sm text-gray-500">
                    REVENUE INTELLIGENCE
                  </p>

                  <h3 className="mt-1 text-2xl font-medium">
                    Where your revenue comes from
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    FlowPay connects commerce actions to
                    confirmed Razorpay payments.
                  </p>
                </div>


                <button
                  type="button"
                  onClick={() =>
                    loadDashboard(true)
                  }
                  disabled={refreshing}
                  className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-xs text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh intelligence"}
                </button>

              </div>


              {/* Attribution cards */}

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                <RevenueCard
                  label="AI Revenue"
                  value={stats?.ai_revenue ?? 0}
                  orders={stats?.ai_orders ?? 0}
                  description="AI recommendation driven"
                />

                <RevenueCard
                  label="Cross-sell Revenue"
                  value={stats?.cross_sell_revenue ?? 0}
                  orders={stats?.cross_sell_orders ?? 0}
                  description="Growth Agent driven"
                />

                <RevenueCard
                  label="Recovery Revenue"
                  value={stats?.recovery_revenue ?? 0}
                  orders={stats?.recovery_orders ?? 0}
                  description="Recovered checkout"
                />

                <RevenueCard
                  label="Direct Revenue"
                  value={stats?.direct_revenue ?? 0}
                  orders={stats?.direct_orders ?? 0}
                  description="Direct checkout"
                />

              </div>


              {/* Revenue bar */}

              <div className="mt-6">

                <div className="mb-2 flex items-center justify-between text-xs">

                  <span className="text-gray-500">
                    Attribution mix
                  </span>

                  <span className="text-gray-600">
                    {formatMoney(
                      intelligence?.total_revenue ?? 0
                    )} total
                  </span>

                </div>


                <div className="flex h-3 overflow-hidden rounded-full bg-white/5">

                  {intelligence?.attribution.map(
                    (item) => {

                      const percentage =
                        intelligence.total_revenue > 0
                          ? (
                            item.revenue
                            / intelligence.total_revenue
                          ) * 100
                          : 0;

                      if (percentage <= 0) {
                        return null;
                      }

                      return (
                        <div
                          key={item.label}
                          title={`${item.label}: ${formatMoney(item.revenue)}`}
                          style={{
                            width: `${percentage}%`,
                          }}
                          className="h-full bg-cyan-400/70"
                        />
                      );
                    }
                  )}

                </div>

              </div>


              {/* Attribution table */}

              <div className="mt-6 overflow-x-auto">

                <table className="w-full min-w-[600px] text-left">

                  <thead>

                    <tr className="border-b border-white/10 text-xs text-gray-500">

                      <th className="pb-3 font-normal">
                        Source
                      </th>

                      <th className="pb-3 font-normal">
                        Orders
                      </th>

                      <th className="pb-3 font-normal">
                        Items
                      </th>

                      <th className="pb-3 text-right font-normal">
                        Revenue
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {intelligence?.attribution.map(
                      (item) => (

                        <tr
                          key={item.label}
                          className="border-b border-white/5 text-sm"
                        >

                          <td className="py-3 text-gray-300">
                            {item.label}
                          </td>

                          <td className="py-3 text-gray-500">
                            {item.orders}
                          </td>

                          <td className="py-3 text-gray-500">
                            {item.items}
                          </td>

                          <td className="py-3 text-right">
                            {formatMoney(item.revenue)}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>


            {/* ================= MAIN GRID ================= */}

            <div className="mt-6 grid gap-6 lg:grid-cols-3">

              {/* Agent workflow */}

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 lg:col-span-2">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-sm text-gray-500">
                      Agent activity
                    </p>

                    <h3 className="mt-1 text-lg font-medium">
                      Autonomous commerce workflow
                    </h3>
                  </div>

                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                    Live
                  </span>

                </div>


                <div className="mt-8 flex flex-wrap items-center gap-3">

                  {[
                    "Customer Intent",
                    "Catalog",
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

                        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs">
                          {step}
                        </div>

                        {index < array.length - 1 && (
                          <span className="text-gray-700">
                            →
                          </span>
                        )}

                      </div>

                    )
                  )}

                </div>


                <div className="mt-8 rounded-xl border border-white/10 bg-black/30 p-5">

                  <div className="flex items-center gap-3">

                    <span className="h-2 w-2 rounded-full bg-cyan-400" />

                    <p className="text-sm font-medium">
                      Agent currently processing
                    </p>

                  </div>


                  <p className="mt-3 text-sm leading-6 text-gray-500">

                    {stats?.conversions ?? 0} successful{" "}
                    {(stats?.conversions ?? 0) === 1
                      ? "payment"
                      : "payments"}{" "}
                    confirmed.{" "}

                    {stats?.recommendations ?? 0}{" "}
                    product
                    {(stats?.recommendations ?? 0) === 1
                      ? ""
                      : "s"}{" "}
                    sold through confirmed orders.

                  </p>

                </div>

              </div>


              {/* Payment engine */}

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">

                <p className="text-sm text-gray-500">
                  Payment engine
                </p>

                <h3 className="mt-2 text-3xl font-semibold">
                  {formatMoney(
                    stats?.total_revenue ?? 0
                  )}
                </h3>

                <p className="mt-2 text-xs text-emerald-400">
                  Confirmed Razorpay payments
                </p>


                <div className="mt-8 space-y-4">

                  <Metric
                    label="Paid orders"
                    value={(
                      stats?.conversions ?? 0
                    ).toLocaleString("en-IN")}
                  />

                  <Metric
                    label="Pending orders"
                    value={(
                      stats?.recovered_carts ?? 0
                    ).toLocaleString("en-IN")}
                  />

                  <Metric
                    label="Items sold"
                    value={(
                      stats?.recommendations ?? 0
                    ).toLocaleString("en-IN")}
                  />

                  <Metric
                    label="Average order value"
                    value={formatMoney(
                      stats?.upsell_revenue ?? 0
                    )}
                  />

                </div>

              </div>

            </div>


            {/* ================= TOP PRODUCTS ================= */}

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-6">

              <div>
                <p className="text-sm text-gray-500">
                  PRODUCT PERFORMANCE
                </p>

                <h3 className="mt-1 text-lg font-medium">
                  Top products by attributed revenue
                </h3>
              </div>


              <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">

                {(
                  intelligence?.top_products ?? []
                ).map(
                  (product, index) => (

                    <div
                      key={product.product_id}
                      className="rounded-xl border border-white/10 bg-black/20 p-4"
                    >

                      <p className="text-[10px] uppercase tracking-wide text-gray-600">
                        #{index + 1}
                      </p>

                      <p className="mt-2 text-sm font-medium">
                        {product.name}
                      </p>

                      <p className="mt-2 text-lg font-semibold text-cyan-300">
                        {formatMoney(product.revenue)}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {product.units} unit
                        {product.units === 1
                          ? ""
                          : "s"} sold
                      </p>

                    </div>

                  )
                )}


                {(
                  intelligence?.top_products ?? []
                ).length === 0 && (

                    <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-gray-600 md:col-span-2 lg:col-span-5">
                      No paid product data yet.
                    </div>

                  )}

              </div>

            </div>


            {/* ================= ACTIVITY ================= */}

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-6">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-sm text-gray-500">
                    Recent transactions
                  </p>

                  <h3 className="mt-1 text-lg font-medium">
                    Razorpay payment activity
                  </h3>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    loadDashboard(true)
                  }
                  disabled={refreshing}
                  className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh"}
                </button>

              </div>


              <div className="mt-6 overflow-x-auto">

                <table className="w-full min-w-[760px] text-left">

                  <thead>

                    <tr className="border-b border-white/10 text-xs text-gray-500">

                      <th className="pb-4 font-normal">
                        Order
                      </th>

                      <th className="pb-4 font-normal">
                        Items
                      </th>

                      <th className="pb-4 font-normal">
                        Source
                      </th>

                      <th className="pb-4 font-normal">
                        Amount
                      </th>

                      <th className="pb-4 font-normal">
                        Status
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {activities.map(
                      (activity, index) => (

                        <tr
                          key={`${activity.order_id}-${index}`}
                          className="border-b border-white/5 text-sm"
                        >

                          <td className="py-4 text-gray-300">

                            {activity.customer}

                            {activity.order_id && (
                              <p className="mt-1 text-[10px] text-gray-600">
                                {activity.order_id}
                              </p>
                            )}

                          </td>


                          <td className="py-4 text-gray-500">
                            {activity.action}
                          </td>


                          <td className="py-4">

                            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs text-cyan-300">
                              {formatSource(
                                activity.attribution_source
                              )}
                            </span>

                          </td>


                          <td className="py-4">
                            {formatMoney(
                              activity.amount
                            )}
                          </td>


                          <td className="py-4">

                            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                              {activity.status}
                            </span>

                          </td>

                        </tr>

                      )
                    )}


                    {activities.length === 0 && (

                      <tr>

                        <td
                          colSpan={5}
                          className="py-10 text-center text-sm text-gray-600"
                        >
                          No checkout transactions yet.
                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </>

        )}

      </section>

    </main>
  );
}


/* ==========================================
   Components
========================================== */

function GrowthMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold text-gray-200">
        {value}
      </p>
    </div>
  );
}


function StatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">

      <p className="text-sm text-gray-500">
        {label}
      </p>

      <div className="mt-4 flex items-end justify-between">

        <p className="text-2xl font-semibold">
          {value}
        </p>

        <span className="text-xs text-emerald-400">
          {change}
        </span>

      </div>

    </div>
  );
}


function RevenueCard({
  label,
  value,
  orders,
  description,
}: {
  label: string;
  value: number;
  orders: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-5">

      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold">
        {formatMoney(value)}
      </p>

      <p className="mt-1 text-xs text-cyan-300">
        {orders} order
        {orders === 1 ? "" : "s"}
      </p>

      <p className="mt-3 text-[11px] leading-5 text-gray-600">
        {description}
      </p>

    </div>
  );
}


function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3">

      <span className="text-xs text-gray-500">
        {label}
      </span>

      <span className="text-sm font-medium">
        {value}
      </span>

    </div>
  );
}
