"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  type: "growth" | "product" | "opportunity" | (string & {});
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  return labels[source || "direct_checkout"] || "Direct Checkout";
}

function getInsightIcon(type: string) {
  const icons: Record<string, string> = {
    growth: "↗",
    product: "◈",
    opportunity: "⚡",
  };
  return icons[type] ?? "✦";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"overview" | "growth" | "revenue" | "activity" | "all">("all");
  const [agentOnline, setAgentOnline] = useState(true);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [intelligence, setIntelligence] = useState<RevenueIntelligence | null>(null);
  const [merchantInsights, setMerchantInsights] = useState<MerchantInsights | null>(null);
  const [growthIntelligence, setGrowthIntelligence] = useState<GrowthIntelligence | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recoveringOrderId, setRecoveringOrderId] = useState<string | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [crossSellLoading, setCrossSellLoading] = useState(false);
  const [crossSellRecommendations, setCrossSellRecommendations] = useState<any[]>([]);
  const [crossSellMessage, setCrossSellMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function loadDashboard(manual = false) {
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
        fetch(`${API_URL}/api/dashboard/revenue-intelligence`),
        fetch(`${API_URL}/api/dashboard/merchant-insights`),
        fetch(`${API_URL}/api/growth/intelligence`),
      ]);

      if (
        !statsResponse.ok ||
        !activityResponse.ok ||
        !intelligenceResponse.ok ||
        !merchantInsightsResponse.ok ||
        !growthIntelligenceResponse.ok
      ) {
        throw new Error("Failed to fetch dashboard data");
      }

      const statsData: DashboardStats = await statsResponse.json();
      const activityData: Activity[] = await activityResponse.json();
      const intelligenceData: RevenueIntelligence = await intelligenceResponse.json();
      const merchantInsightsData: MerchantInsights = await merchantInsightsResponse.json();
      const growthIntelligenceData: GrowthIntelligence = await growthIntelligenceResponse.json();

      setStats(statsData);
      setActivities(activityData);
      setIntelligence(intelligenceData);
      setMerchantInsights(merchantInsightsData);
      setGrowthIntelligence(growthIntelligenceData);
      setError(false);
    } catch (err) {
      console.error("Dashboard API error:", err);
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
      const response = await fetch(`${API_URL}/api/growth/recovery/${orderId}`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to recover checkout");
      }

      setRecoveryMessage(data?.message || "Recovery action initiated successfully.");
      await loadDashboard();
    } catch (err) {
      console.error("Recovery error:", err);
      setRecoveryMessage(err instanceof Error ? err.message : "Failed to initiate recovery.");
    } finally {
      setRecoveringOrderId(null);
    }
  };

  const activateCrossSell = async () => {
    setCrossSellLoading(true);
    setCrossSellMessage(null);
    setCrossSellRecommendations([]);

    try {
      const response = await fetch(`${API_URL}/api/growth/upsell`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to load cross-sell recommendations");
      }

      const recommendations = data?.recommendations ?? [];
      setCrossSellRecommendations(recommendations);

      if (recommendations.length > 0) {
        setCrossSellMessage(
          `${recommendations.length} complementary product${recommendations.length === 1 ? "" : "s"} found.`
        );
      } else {
        setCrossSellMessage("No cross-sell recommendations are available for the current cart.");
      }
    } catch (err) {
      console.error("Cross-sell error:", err);
      setCrossSellMessage(err instanceof Error ? err.message : "Unable to load cross-sell recommendations.");
    } finally {
      setCrossSellLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const showOverview = activeTab === "all" || activeTab === "overview";
  const showGrowth = activeTab === "all" || activeTab === "growth";
  const showRevenue = activeTab === "all" || activeTab === "revenue";
  const showActivity = activeTab === "all" || activeTab === "activity";

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827] selection:bg-[#2563EB]/15 selection:text-[#1E40AF]">
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* ==================== MERCHANT CONTROL CENTER HEADER ==================== */}
        <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-xs font-bold text-white shadow-sm">
                F
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-bold tracking-tight text-[#111827]">FlowPay AI</span>
                </div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Merchant Control Center</p>
              </div>
            </div>

            {/* Segmented Controls Navigation */}
            <nav className="flex items-center rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] p-1">
              {[
                { id: "all", label: "All Sections" },
                { id: "overview", label: "Overview" },
                { id: "growth", label: "Growth" },
                { id: "revenue", label: "Revenue" },
                { id: "activity", label: "Activity" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${isActive
                        ? "border border-[#D1D5DB] bg-white text-[#111827] shadow-sm"
                        : "text-[#6B7280] hover:text-[#111827]"
                      }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
              {/* Agent Online Status */}
              <div className="flex items-center gap-2 rounded-full border border-[#D1D5DB] bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#047857]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
                </span>
                <span>Agent {agentOnline ? "Online" : "Paused"}</span>
              </div>

              {/* Pause Toggle */}
              <button
                type="button"
                onClick={() => setAgentOnline(!agentOnline)}
                className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#4B5563] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
              >
                {agentOnline ? "Pause" : "Resume"}
              </button>

              {/* Reset Demo */}
              <button
                type="button"
                disabled={refreshing}
                onClick={async () => {
                  const confirmed = window.confirm(
                    "Reset all FlowPay demo data? This will clear orders, payments, and recovery attempts."
                  );
                  if (!confirmed) return;
                  try {
                    setRefreshing(true);
                    setError(false);
                    const res = await fetch(`${API_URL}/api/demo/reset`, { method: "POST" });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.detail || "Failed to reset demo data");
                    await loadDashboard(true);
                    window.alert("FlowPay demo data has been reset successfully.");
                  } catch (err) {
                    console.error("Demo reset error:", err);
                    setError(true);
                    window.alert(err instanceof Error ? err.message : "Failed to reset demo data.");
                  } finally {
                    setRefreshing(false);
                  }
                }}
                className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 text-xs font-semibold text-[#DC2626] transition hover:bg-[#FEE2E2] disabled:opacity-40"
              >
                Reset Demo
              </button>

              {/* Agent Console */}
              <Link
                href="/agent"
                className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8]"
              >
                <span>Agent Console</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </header>

        {/* ==================== MAIN CONTENT CONTAINER ==================== */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          {/* DASHBOARD HERO */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E7EB] pb-6">
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-[#111827]">
                Merchant overview
              </h1>
              <p className="mt-1 text-xs text-[#6B7280]">
                Your AI-powered commerce performance at a glance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#374151] shadow-sm transition hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                {refreshing ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#D1D5DB] border-t-[#2563EB]" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <span>↻ Refresh</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Backend Error Banner */}
          {error && (
            <div className="mb-6 flex items-center justify-between rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-xs text-[#991B1B]">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <div>
                  <p className="font-semibold">Unable to connect to FlowPay AI backend</p>
                  <p className="text-[#B91C1C]">Ensure backend server is running on {API_URL}</p>
                </div>
              </div>
              <button
                onClick={() => loadDashboard(true)}
                className="rounded border border-[#FCA5A5] bg-white px-3 py-1 font-medium hover:bg-[#FEF2F2]"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="my-16 flex flex-col items-center justify-center rounded-xl border border-[#E5E7EB] bg-white py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#2563EB]" />
              <p className="mt-3 text-xs font-medium text-[#6B7280]">Loading merchant data...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* ========================================================================= */}
              {/* 1. OVERVIEW SECTION                                                      */}
              {/* ========================================================================= */}
              {showOverview && (
                <section id="overview" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-[#374151]">
                      Key Performance Indicators
                    </h2>
                    <span className="text-xs text-[#9CA3AF]">Live API Data</span>
                  </div>

                  {/* KPI CARDS GRID */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* DOMINANT REVENUE CARD */}
                    <div className="col-span-full fintech-card p-6 lg:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                          Paid Revenue
                        </span>
                        <span className="rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-semibold text-[#047857]">
                          Confirmed
                        </span>
                      </div>

                      <div className="mt-3">
                        <span className="font-mono text-4xl font-extrabold tracking-tight text-[#111827]">
                          {formatMoney(stats?.total_revenue ?? 0)}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#E5E7EB] pt-3 text-xs">
                        <div>
                          <p className="text-[#6B7280]">AI Attributed Revenue</p>
                          <p className="font-mono mt-0.5 text-sm font-semibold text-[#2563EB]">
                            {formatMoney((stats?.ai_revenue ?? 0) + (stats?.cross_sell_revenue ?? 0) + (stats?.recovery_revenue ?? 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6B7280]">Direct Revenue</p>
                          <p className="font-mono mt-0.5 text-sm font-semibold text-[#4B5563]">
                            {formatMoney(stats?.direct_revenue ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* KPI 2: PAID ORDERS */}
                    <div className="fintech-card flex flex-col justify-between p-5">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Paid Orders
                        </span>
                        <p className="font-mono mt-2 text-3xl font-bold text-[#111827]">
                          {(stats?.conversions ?? 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="mt-3 text-xs text-[#6B7280]">
                        <span className="font-semibold text-[#047857]">{(stats?.ai_orders ?? 0) + (stats?.cross_sell_orders ?? 0)}</span> AI attributed
                      </div>
                    </div>

                    {/* KPI 3: CONVERSION RATE */}
                    <div className="fintech-card flex flex-col justify-between p-5">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Conversion Rate
                        </span>
                        <p className="font-mono mt-2 text-3xl font-bold text-[#2563EB]">
                          {stats?.conversion_rate ?? 0}%
                        </p>
                      </div>
                      <div className="mt-3 text-xs text-[#6B7280]">
                        Optimized checkout
                      </div>
                    </div>

                    {/* KPI 4: AVERAGE ORDER VALUE */}
                    <div className="fintech-card flex flex-col justify-between p-5 sm:col-span-2 lg:col-span-1">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Average Order Value
                        </span>
                        <p className="font-mono mt-2 text-2xl font-bold text-[#111827]">
                          {formatMoney(
                            stats?.conversions && stats?.total_revenue
                              ? Math.round(stats.total_revenue / stats.conversions)
                              : 0
                          )}
                        </p>
                      </div>
                      <div className="mt-3 text-xs text-[#6B7280]">
                        Across all payment sources
                      </div>
                    </div>

                    {/* KPI 5: PENDING CHECKOUTS */}
                    <div className="fintech-card flex flex-col justify-between p-5 sm:col-span-2 lg:col-span-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B45309]">
                            Pending Checkout Recovery
                          </span>
                          <p className="font-mono mt-1 text-xl font-bold text-[#111827]">
                            {(stats?.recovered_carts ?? 0).toLocaleString("en-IN")} pending checkout{(stats?.recovered_carts ?? 0) === 1 ? "" : "s"}
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab("growth")}
                          className="rounded-lg border border-[#FDE68A] bg-[#FEF3C7] px-3 py-1.5 text-xs font-semibold text-[#92400E] transition hover:bg-[#FDE68A]"
                        >
                          View Opportunities →
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* ========================================================================= */}
              {/* 2. AI MERCHANT INSIGHTS & GROWTH SECTION                                 */}
              {/* ========================================================================= */}
              {showGrowth && (
                <section id="growth" className="space-y-6 pt-4">
                  {/* AI MERCHANT INSIGHTS */}
                  <div className="fintech-card-blue p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#DBEAFE] pb-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E40AF]">
                          ✦ AI Business Insight
                        </span>
                        <h3 className="font-heading mt-0.5 text-base font-bold text-[#1E3A8A]">
                          Revenue opportunity detected
                        </h3>
                      </div>
                      <span className="rounded border border-[#BFDBFE] bg-white px-2.5 py-1 text-xs font-medium text-[#1E40AF]">
                        FlowPay Intelligence
                      </span>
                    </div>

                    <p className="text-xs text-[#1E3A8A]/90">
                      {merchantInsights?.summary ?? "FlowPay identified growth opportunities from current merchant commerce activity."}
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      {(merchantInsights?.insights ?? []).map((insight, idx) => (
                        <div key={`${insight.title}-${idx}`} className="rounded-lg border border-[#BFDBFE] bg-white p-4">
                          <div className="flex items-center justify-between">
                            <span className="rounded bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1D4ED8]">
                              {insight.type}
                            </span>
                            <span className="text-xs">{getInsightIcon(insight.type)}</span>
                          </div>

                          <h4 className="mt-2 text-xs font-bold text-[#111827]">{insight.title}</h4>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#4B5563]">{insight.message}</p>

                          <div className="mt-3 border-t border-[#F3F4F6] pt-2">
                            <p className="text-[10px] font-semibold uppercase text-[#6B7280]">Recommended Action</p>
                            <p className="mt-0.5 text-xs font-medium text-[#1E40AF]">{insight.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* GROWTH ACTION CENTER */}
                  <div className="fintech-card p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
                      <div>
                        <h3 className="font-heading text-base font-bold text-[#111827]">Growth Command Center</h3>
                        <p className="text-xs text-[#6B7280]">
                          {growthIntelligence?.summary ?? "Review and execute high-impact growth actions."}
                        </p>
                      </div>
                      <span className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-xs font-semibold text-[#374151]">
                        {growthIntelligence?.actions?.length ?? 0} Actions Available
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {(growthIntelligence?.actions ?? []).map((action, idx) => {
                        const orderIds = action.evidence?.order_ids;
                        const isRecovery = action.action === "recover_pending_orders" && Array.isArray(orderIds) && orderIds.length > 0;
                        const isCrossSell = action.action === "activate_cross_sell";

                        const priorityBadge =
                          action.priority === "high"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : action.priority === "medium"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-gray-200 bg-gray-50 text-gray-700";

                        return (
                          <div key={`${action.title}-${idx}`} className="flex flex-col justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${priorityBadge}`}>
                                  {action.priority} priority
                                </span>
                                <span className="text-[10px] uppercase text-[#9CA3AF]">{action.type}</span>
                              </div>
                              <h4 className="text-xs font-bold text-[#111827]">{action.title}</h4>
                              <p className="mt-1 text-xs leading-relaxed text-[#4B5563]">{action.message}</p>
                            </div>

                            <div className="mt-4">
                              {isRecovery && (
                                <div>
                                  <button
                                    type="button"
                                    disabled={recoveringOrderId === String(orderIds[0])}
                                    onClick={() => recoverCheckout(String(orderIds[0]))}
                                    className="w-full rounded-lg bg-[#2563EB] py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#1D4ED8] disabled:opacity-50"
                                  >
                                    {recoveringOrderId === String(orderIds[0]) ? "Recovering..." : "Recover Checkout →"}
                                  </button>
                                  {recoveryMessage && (
                                    <p className="mt-2 rounded bg-[#ECFDF5] p-2 text-center text-xs font-medium text-[#047857]">
                                      {recoveryMessage}
                                    </p>
                                  )}
                                </div>
                              )}

                              {isCrossSell && (
                                <button
                                  type="button"
                                  disabled={crossSellLoading}
                                  onClick={activateCrossSell}
                                  className="w-full rounded-lg bg-[#2563EB] py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#1D4ED8] disabled:opacity-50"
                                >
                                  {crossSellLoading ? "Loading..." : "Activate Cross-sell →"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Cross Sell Result */}
                    {(crossSellMessage || crossSellRecommendations.length > 0) && (
                      <div className="mt-5 rounded-lg border border-[#DBEAFE] bg-[#F0F7FF] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E40AF]">
                            AI Recommended Cross-Sells
                          </h4>
                          {crossSellMessage && <span className="text-xs text-[#4B5563]">{crossSellMessage}</span>}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {crossSellRecommendations.map((rec, index) => {
                            const p = rec?.product;
                            if (!p) return null;
                            return (
                              <div key={`${p.id}-${index}`} className="rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-sm">
                                <div className="flex items-start justify-between gap-2">
                                  <h5 className="text-xs font-bold text-[#111827]">{p.name}</h5>
                                  <span className="font-mono text-xs font-bold text-[#2563EB]">{formatMoney(p.price)}</span>
                                </div>
                                <p className="mt-1 text-[11px] text-[#6B7280]">{rec.reason}</p>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`${API_URL}/api/cart/add`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ product_id: p.id, quantity: 1 }),
                                      });
                                      const data = await response.json();
                                      if (!response.ok) throw new Error(data?.detail || "Failed to add product to cart");
                                      window.alert(`${p.name} added to cart.`);
                                      await loadDashboard();
                                    } catch (err) {
                                      window.alert(err instanceof Error ? err.message : "Failed to add to cart.");
                                    }
                                  }}
                                  className="mt-2 w-full rounded bg-[#2563EB] py-1.5 text-xs font-medium text-white hover:bg-[#1D4ED8]"
                                >
                                  + Add to Cart
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* ========================================================================= */}
              {/* 3. REVENUE INTELLIGENCE SECTION                                          */}
              {/* ========================================================================= */}
              {showRevenue && (
                <section id="revenue" className="space-y-4 pt-4">
                  <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-6">
                    <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-[#374151]">
                      Revenue Intelligence & Attribution
                    </h2>
                    <span className="text-xs text-[#9CA3AF]">Confirmed Payments</span>
                  </div>

                  <div className="fintech-card p-6">
                    {/* Revenue Source Cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          AI Recommendation
                        </span>
                        <p className="font-mono mt-1 text-2xl font-bold text-[#111827]">
                          {formatMoney(stats?.ai_revenue ?? 0)}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">{(stats?.ai_orders ?? 0)} orders</p>
                      </div>

                      <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Cross-sell Agent
                        </span>
                        <p className="font-mono mt-1 text-2xl font-bold text-[#111827]">
                          {formatMoney(stats?.cross_sell_revenue ?? 0)}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">{(stats?.cross_sell_orders ?? 0)} orders</p>
                      </div>

                      <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Checkout Recovery
                        </span>
                        <p className="font-mono mt-1 text-2xl font-bold text-[#111827]">
                          {formatMoney(stats?.recovery_revenue ?? 0)}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">{(stats?.recovery_orders ?? 0)} orders</p>
                      </div>

                      <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Direct Checkout
                        </span>
                        <p className="font-mono mt-1 text-2xl font-bold text-[#111827]">
                          {formatMoney(stats?.direct_revenue ?? 0)}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">{(stats?.direct_orders ?? 0)} orders</p>
                      </div>
                    </div>

                    {/* Attribution Progress Bar */}
                    <div className="mt-6 border-t border-[#E5E7EB] pt-4">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#111827]">Revenue Attribution Mix</span>
                        <span className="font-mono text-[#6B7280]">
                          {formatMoney(intelligence?.total_revenue ?? 0)} Total Attributed
                        </span>
                      </div>
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                        {intelligence?.attribution.map((item, i) => {
                          const pct = intelligence.total_revenue > 0 ? (item.revenue / intelligence.total_revenue) * 100 : 0;
                          if (pct <= 0) return null;
                          const colors = ["bg-[#2563EB]", "bg-[#7C3AED]", "bg-[#F59E0B]", "bg-[#6B7280]"];
                          return (
                            <div
                              key={item.label}
                              style={{ width: `${pct}%` }}
                              title={`${item.label}: ${formatMoney(item.revenue)} (${pct.toFixed(1)}%)`}
                              className={`h-full ${colors[i % colors.length]}`}
                            />
                          );
                        })}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4 text-xs">
                        {intelligence?.attribution.map((item, i) => {
                          const dotColors = ["bg-[#2563EB]", "bg-[#7C3AED]", "bg-[#F59E0B]", "bg-[#6B7280]"];
                          return (
                            <div key={item.label} className="flex items-center gap-1.5 text-[#6B7280]">
                              <span className={`h-2 w-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                              <span>{item.label}</span>
                              <span className="font-mono font-semibold text-[#111827]">({formatMoney(item.revenue)})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Data Table */}
                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[10px] uppercase text-[#6B7280]">
                            <th className="py-2.5 px-3 font-semibold">Attribution Channel</th>
                            <th className="py-2.5 px-3 font-semibold">Confirmed Orders</th>
                            <th className="py-2.5 px-3 font-semibold">Items Sold</th>
                            <th className="py-2.5 px-3 text-right font-semibold">Attributed Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                          {intelligence?.attribution.map((attr) => (
                            <tr key={attr.label} className="hover:bg-[#F9FAFB]">
                              <td className="py-3 px-3 font-medium text-[#111827]">{attr.label}</td>
                              <td className="py-3 px-3 text-[#6B7280]">{attr.orders}</td>
                              <td className="py-3 px-3 text-[#6B7280]">{attr.items}</td>
                              <td className="font-mono py-3 px-3 text-right font-bold text-[#111827]">
                                {formatMoney(attr.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {/* ========================================================================= */}
              {/* 4. ACTIVITY SECTION                                                       */}
              {/* ========================================================================= */}
              {showActivity && (
                <section id="activity" className="space-y-6 pt-4">
                  <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-6">
                    <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-[#374151]">
                      Activity & Autonomous Workflow
                    </h2>
                    <span className="text-xs text-[#9CA3AF]">Live Agent Execution</span>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* PIPELINE STEPPER (2 COLS) */}
                    <div className="fintech-card p-6 lg:col-span-2">
                      <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                        Autonomous Engine Pipeline
                      </h3>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {[
                          "Customer Intent",
                          "Catalog Search",
                          "AI Ranking",
                          "Cart Sync",
                          "Cross-sell",
                          "Checkout",
                          "Payment Verification",
                          "Revenue Attribution",
                        ].map((step, idx, arr) => (
                          <div key={step} className="flex items-center gap-2">
                            <span className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-xs font-medium text-[#374151]">
                              {step}
                            </span>
                            {idx < arr.length - 1 && <span className="text-xs text-[#9CA3AF]">→</span>}
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-xs text-[#4B5563]">
                        <span className="font-semibold text-[#111827]">Execution Summary: </span>
                        Processed <span className="font-mono font-bold text-[#111827]">{stats?.conversions ?? 0}</span> transactions with{" "}
                        <span className="font-mono font-bold text-[#2563EB]">{stats?.recommendations ?? 0}</span> AI product matches.
                      </div>
                    </div>

                    {/* TOP PRODUCTS (1 COL) */}
                    <div className="fintech-card p-6">
                      <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                        Top Products
                      </h3>

                      <div className="mt-4 space-y-2.5">
                        {(intelligence?.top_products ?? []).slice(0, 4).map((p, idx) => (
                          <div key={p.product_id} className="flex items-center justify-between rounded border border-[#E5E7EB] bg-[#F9FAFB] p-2.5">
                            <div>
                              <p className="text-xs font-bold text-[#111827]">
                                #{idx + 1} {p.name}
                              </p>
                              <p className="text-[11px] text-[#6B7280]">{p.units} units sold</p>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#111827]">{formatMoney(p.revenue)}</span>
                          </div>
                        ))}

                        {(intelligence?.top_products ?? []).length === 0 && (
                          <p className="py-4 text-center text-xs text-[#9CA3AF]">No product ranking data available yet.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RECENT TRANSACTIONS TABLE */}
                  <div className="fintech-card p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-heading text-sm font-bold text-[#111827]">Recent Payment Activity</h3>
                        <p className="text-xs text-[#6B7280]">Verified Razorpay payment transactions feed</p>
                      </div>
                      <span className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-xs font-semibold text-[#374151]">
                        {activities.length} Transactions
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[10px] uppercase text-[#6B7280]">
                            <th className="py-2.5 px-3 font-semibold">Customer / Order ID</th>
                            <th className="py-2.5 px-3 font-semibold">Action / Items</th>
                            <th className="py-2.5 px-3 font-semibold">Attribution Source</th>
                            <th className="py-2.5 px-3 font-semibold">Amount</th>
                            <th className="py-2.5 px-3 text-right font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                          {activities.map((act, index) => {
                            const isPaid = act.status === "paid";
                            return (
                              <tr key={`${act.order_id}-${index}`} className="hover:bg-[#F9FAFB]">
                                <td className="py-3 px-3">
                                  <p className="font-medium text-[#111827]">{act.customer}</p>
                                  {act.order_id && <p className="font-mono text-[10px] text-[#6B7280]">{act.order_id}</p>}
                                </td>
                                <td className="py-3 px-3 text-[#4B5563]">{act.action}</td>
                                <td className="py-3 px-3">
                                  <span className="rounded border border-[#D1D5DB] bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold text-[#374151]">
                                    {formatSource(act.attribution_source)}
                                  </span>
                                </td>
                                <td className="font-mono py-3 px-3 font-bold text-[#111827]">{formatMoney(act.amount)}</td>
                                <td className="py-3 px-3 text-right">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${isPaid
                                        ? "border border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                                        : "border border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]"
                                      }`}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-[#10B981]" : "bg-[#F59E0B]"}`} />
                                    {act.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}

                          {activities.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-xs text-[#9CA3AF]">
                                No recent transaction activity recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </main>

        {/* ==================== FOOTER ==================== */}
        <footer className="mt-auto border-t border-[#E5E7EB] bg-white py-6 text-center text-xs text-[#6B7280]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6">
            <p>FlowPay AI · Autonomous Commerce & Revenue Intelligence Platform</p>
            <p className="text-[11px]">Powered by Razorpay Ecosystem</p>
          </div>
        </footer>
      </div>
    </div>
  );
}