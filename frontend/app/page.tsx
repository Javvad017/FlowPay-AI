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

// ─── Revenue Contribution Bar ────────────────────────────────────────────────

type BarItem = {
  label: string;
  shortLabel: string;
  revenue: number;
  color: string;
  bgColor: string;
  textColor: string;
};

function RevenueContributionChart({ items }: { items: BarItem[] }) {
  const total = items.reduce((sum, i) => sum + i.revenue, 0);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = total > 0 ? (item.revenue / total) * 100 : 0;
        const isLeader = item.revenue === Math.max(...items.map((i) => i.revenue)) && item.revenue > 0;
        return (
          <div key={item.label} className="flex items-center gap-3">
            <div className="w-36 shrink-0 text-right">
              <span className="text-xs font-medium text-[#374151]">{item.shortLabel}</span>
            </div>
            <div className="relative flex flex-1 items-center">
              <div className="h-6 w-full overflow-hidden rounded bg-[#F3F4F6]">
                {pct > 0 && (
                  <div
                    className={`h-full rounded transition-all duration-500 ${item.color}`}
                    style={{ width: `${Math.max(pct, 1)}%` }}
                    title={`${item.label}: ${formatMoney(item.revenue)} (${pct.toFixed(1)}%)`}
                  />
                )}
              </div>
              {isLeader && pct > 0 && (
                <span className="ml-2 whitespace-nowrap rounded border border-[#A7F3D0] bg-[#ECFDF5] px-1.5 py-0.5 text-[10px] font-bold text-[#047857]">
                  Top
                </span>
              )}
            </div>
            <div className="w-24 shrink-0 text-right">
              <span className="font-mono text-xs font-bold text-[#111827]">
                {formatMoney(item.revenue)}
              </span>
              {pct > 0 && (
                <span className="ml-1.5 text-[10px] text-[#9CA3AF]">
                  {pct.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Commerce Performance Summary ────────────────────────────────────────────

function CommercePerformanceSummary({
  stats,
  intelligence,
}: {
  stats: DashboardStats;
  intelligence: RevenueIntelligence | null;
}) {
  const totalOrders =
    (stats.ai_orders || 0) +
    (stats.cross_sell_orders || 0) +
    (stats.recovery_orders || 0) +
    (stats.direct_orders || 0);

  const aiAttributed =
    (stats.ai_revenue || 0) +
    (stats.cross_sell_revenue || 0) +
    (stats.recovery_revenue || 0);

  const aiAttributedPct =
    stats.total_revenue > 0
      ? Math.round((aiAttributed / stats.total_revenue) * 100)
      : 0;

  const topProduct = intelligence?.top_products?.[0];

  const metricItems = [
    {
      label: "Total Orders",
      value: totalOrders.toLocaleString("en-IN"),
      sub: `${stats.conversions ?? 0} confirmed payments`,
    },
    {
      label: "AI-Attributed Revenue",
      value: formatMoney(aiAttributed),
      sub: `${aiAttributedPct}% of total revenue`,
      highlight: true,
    },
    {
      label: "Avg. Order Value",
      value: formatMoney(
        stats.conversions && stats.total_revenue
          ? Math.round(stats.total_revenue / stats.conversions)
          : 0
      ),
      sub: "Per confirmed payment",
    },
    {
      label: "Top Product",
      value: topProduct?.name ?? "—",
      sub: topProduct ? `${topProduct.units} units · ${formatMoney(topProduct.revenue)}` : "No sales yet",
    },
  ];

  return (
    <div className="fintech-card p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-heading text-sm font-bold text-[#111827]">
          Commerce Performance
        </h3>
        <span className="text-xs text-[#9CA3AF]">Current session</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricItems.map((m) => (
          <div key={m.label} className="rounded-lg border border-[#F3F4F6] bg-[#F9FAFB] p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
              {m.label}
            </p>
            <p
              className={`mt-1.5 text-sm font-bold leading-tight ${m.highlight ? "text-[#2563EB]" : "text-[#111827]"
                }`}
            >
              {m.value}
            </p>
            <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{m.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<"overview" | "growth" | "revenue" | "activity" | "all">("all");

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
    if (manual) setRefreshing(true);

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

  // Build attribution bar items from existing stats
  const attributionBarItems: BarItem[] = [
    {
      label: "Cross-sell Agent",
      shortLabel: "Cross-sell Agent",
      revenue: stats?.cross_sell_revenue ?? 0,
      color: "bg-[#7C3AED]",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
    },
    {
      label: "AI Recommendation",
      shortLabel: "AI Recommendation",
      revenue: stats?.ai_revenue ?? 0,
      color: "bg-[#2563EB]",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
    },
    {
      label: "Checkout Recovery",
      shortLabel: "Checkout Recovery",
      revenue: stats?.recovery_revenue ?? 0,
      color: "bg-[#F59E0B]",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
    },
    {
      label: "Direct Checkout",
      shortLabel: "Direct Checkout",
      revenue: stats?.direct_revenue ?? 0,
      color: "bg-[#6B7280]",
      bgColor: "bg-gray-50",
      textColor: "text-gray-700",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827] selection:bg-[#2563EB]/15 selection:text-[#1E40AF]">
      <div className="relative z-10 flex min-h-screen flex-col">

        {/* ==================== HEADER ==================== */}
        <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">

            {/* Branding */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2563EB] text-xs font-bold text-white shadow-sm">
                F
              </div>
              <div>
                <div className="font-heading text-sm font-bold tracking-tight text-[#111827]">
                  FlowPay AI
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Merchant Control Center
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
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
            <div className="flex items-center gap-2.5">
              {/* Agent Status — read-only indicator */}
              <div className="flex items-center gap-1.5 rounded-full border border-[#D1D5DB] bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#047857]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
                </span>
                <span>Agent Ready</span>
              </div>

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
                Agent Console
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </header>

        {/* ==================== MAIN CONTENT ==================== */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">

          {/* Page title bar */}
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E7EB] pb-5">
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight text-[#111827]">
                Merchant Overview
              </h1>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                AI-powered commerce performance at a glance.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#374151] shadow-sm transition hover:bg-[#F9FAFB] disabled:opacity-50"
            >
              {refreshing ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#D1D5DB] border-t-[#2563EB]" />
                  <span>Syncing…</span>
                </>
              ) : (
                <span>↻ Refresh</span>
              )}
            </button>
          </div>

          {/* Backend Error Banner */}
          {error && (
            <div className="mb-6 flex items-center justify-between rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-xs text-[#991B1B]">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <div>
                  <p className="font-semibold">Unable to connect to FlowPay AI backend</p>
                  <p className="text-[#B91C1C]">Ensure the backend server is running on {API_URL}</p>
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

          {/* Loading Skeleton */}
          {loading ? (
            <div className="my-16 flex flex-col items-center justify-center rounded-xl border border-[#E5E7EB] bg-white py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#2563EB]" />
              <p className="mt-3 text-xs font-medium text-[#6B7280]">Loading merchant data…</p>
            </div>
          ) : (
            <div className="space-y-8">

              {/* ================================================================= */}
              {/* 1. OVERVIEW SECTION                                               */}
              {/* ================================================================= */}
              {showOverview && (
                <section id="overview" className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      Key Performance Indicators
                    </h2>
                    <span className="text-[11px] text-[#9CA3AF]">Live API data</span>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    {/* Dominant: Paid Revenue — spans 2 cols */}
                    <div className="col-span-full fintech-card p-5 lg:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                          Paid Revenue
                        </span>
                        <span className="rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-0.5 text-[10px] font-semibold text-[#047857]">
                          Confirmed
                        </span>
                      </div>

                      <div className="mt-3">
                        <span className="font-mono text-3xl font-extrabold tracking-tight text-[#111827]">
                          {formatMoney(stats?.total_revenue ?? 0)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#F3F4F6] pt-3">
                        <div>
                          <p className="text-[10px] text-[#9CA3AF]">AI Attributed</p>
                          <p className="font-mono mt-0.5 text-sm font-semibold text-[#2563EB]">
                            {formatMoney(
                              (stats?.ai_revenue ?? 0) +
                              (stats?.cross_sell_revenue ?? 0) +
                              (stats?.recovery_revenue ?? 0)
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#9CA3AF]">Direct</p>
                          <p className="font-mono mt-0.5 text-sm font-semibold text-[#4B5563]">
                            {formatMoney(stats?.direct_revenue ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Paid Orders */}
                    <div className="fintech-card flex flex-col justify-between p-5">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                          Paid Orders
                        </span>
                        <p className="font-mono mt-2 text-2xl font-bold text-[#111827]">
                          {(stats?.conversions ?? 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="mt-3 text-[11px] text-[#6B7280]">
                        <span className="font-semibold text-[#047857]">
                          {(stats?.ai_orders ?? 0) + (stats?.cross_sell_orders ?? 0)}
                        </span>{" "}
                        AI-attributed
                      </div>
                    </div>

                    {/* Conversion Rate */}
                    <div className="fintech-card flex flex-col justify-between p-5">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                          Conversion Rate
                        </span>
                        <p className="font-mono mt-2 text-2xl font-bold text-[#2563EB]">
                          {stats?.conversion_rate ?? 0}%
                        </p>
                      </div>
                      <div className="mt-3 text-[11px] text-[#6B7280]">
                        Optimized checkout
                      </div>
                    </div>

                    {/* Average Order Value */}
                    <div className="fintech-card flex flex-col justify-between p-5 sm:col-span-2 lg:col-span-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                          Avg. Order Value
                        </span>
                        <p className="font-mono mt-2 text-2xl font-bold text-[#111827]">
                          {formatMoney(
                            stats?.conversions && stats?.total_revenue
                              ? Math.round(stats.total_revenue / stats.conversions)
                              : 0
                          )}
                        </p>
                      </div>
                      <div className="mt-3 text-[11px] text-[#6B7280]">
                        Across all sources
                      </div>
                    </div>

                    {/* Pending Recovery */}
                    <div className="fintech-card flex flex-col justify-between p-5 sm:col-span-2 lg:col-span-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                            Pending Checkout Recovery
                          </span>
                          <p className="font-mono mt-1 text-xl font-bold text-[#111827]">
                            {(stats?.recovered_carts ?? 0).toLocaleString("en-IN")} pending checkout
                            {(stats?.recovered_carts ?? 0) === 1 ? "" : "s"}
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

                  {/* Commerce Performance Summary */}
                  {stats && (
                    <CommercePerformanceSummary stats={stats} intelligence={intelligence} />
                  )}

                  {/* AI Business Insight (from existing merchant insights) */}
                  {merchantInsights && showOverview && activeTab === "overview" && (
                    <div className="fintech-card-blue p-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#DBEAFE] pb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E40AF]">
                            ✦ AI Business Insight
                          </span>
                          <h3 className="font-heading mt-0.5 text-sm font-bold text-[#1E3A8A]">
                            Revenue opportunity detected
                          </h3>
                        </div>
                        <span className="rounded border border-[#BFDBFE] bg-white px-2.5 py-1 text-[10px] font-medium text-[#1E40AF]">
                          FlowPay Intelligence
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#1E3A8A]/90">
                        {merchantInsights.summary ??
                          "FlowPay identified growth opportunities from current merchant commerce activity."}
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* ================================================================= */}
              {/* 2. GROWTH SECTION                                                 */}
              {/* ================================================================= */}
              {showGrowth && (
                <section id="growth" className="space-y-5 pt-2">
                  <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-6">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      Growth Command Center
                    </h2>
                    <span className="text-[11px] text-[#9CA3AF]">AI-generated actions</span>
                  </div>

                  {/* AI Summary */}
                  <div className="fintech-card-blue p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#DBEAFE] pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E40AF]">
                          ✦ AI Business Insight
                        </span>
                        <h3 className="font-heading mt-0.5 text-sm font-bold text-[#1E3A8A]">
                          Revenue opportunity detected
                        </h3>
                      </div>
                      <span className="rounded border border-[#BFDBFE] bg-white px-2.5 py-1 text-[10px] font-medium text-[#1E40AF]">
                        FlowPay Intelligence
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-[#1E3A8A]/90">
                      {merchantInsights?.summary ??
                        "FlowPay identified growth opportunities from current merchant commerce activity."}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {(merchantInsights?.insights ?? []).map((insight, idx) => (
                        <div
                          key={`${insight.title}-${idx}`}
                          className="rounded-lg border border-[#BFDBFE] bg-white p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="rounded bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1D4ED8]">
                              {insight.type}
                            </span>
                            <span className="text-xs">{getInsightIcon(insight.type)}</span>
                          </div>
                          <h4 className="mt-2 text-xs font-bold text-[#111827]">
                            {insight.title}
                          </h4>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#4B5563]">
                            {insight.message}
                          </p>
                          <div className="mt-3 border-t border-[#F3F4F6] pt-2">
                            <p className="text-[10px] font-semibold uppercase text-[#6B7280]">
                              Recommended Action
                            </p>
                            <p className="mt-0.5 text-xs font-medium text-[#1E40AF]">
                              {insight.action}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Cards */}
                  <div className="fintech-card p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
                      <div>
                        <h3 className="font-heading text-sm font-bold text-[#111827]">
                          Growth Actions
                        </h3>
                        <p className="mt-0.5 text-xs text-[#6B7280]">
                          {growthIntelligence?.summary ?? "Review and execute high-impact growth actions."}
                        </p>
                      </div>
                      <span className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-[11px] font-semibold text-[#374151]">
                        {growthIntelligence?.actions?.length ?? 0} Actions
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {(growthIntelligence?.actions ?? []).map((action, idx) => {
                        const orderIds = action.evidence?.order_ids;
                        const isRecovery =
                          action.action === "recover_pending_orders" &&
                          Array.isArray(orderIds) &&
                          orderIds.length > 0;
                        const isCrossSell = action.action === "activate_cross_sell";

                        const priorityStyles =
                          action.priority === "high"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : action.priority === "medium"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-gray-200 bg-gray-50 text-gray-600";

                        return (
                          <div
                            key={`${action.title}-${idx}`}
                            className="flex flex-col justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                          >
                            <div>
                              <div className="mb-2.5 flex items-center justify-between gap-2">
                                <span
                                  className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${priorityStyles}`}
                                >
                                  {action.priority} priority
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                                  {action.type}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-[#111827]">{action.title}</h4>
                              <p className="mt-1 text-[11px] leading-relaxed text-[#4B5563]">
                                {action.message}
                              </p>
                            </div>

                            <div className="mt-4">
                              {isRecovery && (
                                <div>
                                  <button
                                    type="button"
                                    disabled={recoveringOrderId === String(orderIds[0])}
                                    onClick={() => recoverCheckout(String(orderIds[0]))}
                                    className="w-full rounded-lg bg-[#2563EB] py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:opacity-50"
                                  >
                                    {recoveringOrderId === String(orderIds[0])
                                      ? "Recovering…"
                                      : "Recover Checkout →"}
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
                                  className="w-full rounded-lg bg-[#2563EB] py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:opacity-50"
                                >
                                  {crossSellLoading ? "Loading…" : "Activate Cross-sell →"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Cross-sell Result */}
                    {(crossSellMessage || crossSellRecommendations.length > 0) && (
                      <div className="mt-5 rounded-lg border border-[#DBEAFE] bg-[#F0F7FF] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E40AF]">
                            AI Recommended Cross-Sells
                          </h4>
                          {crossSellMessage && (
                            <span className="text-xs text-[#4B5563]">{crossSellMessage}</span>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {crossSellRecommendations.map((rec, index) => {
                            const p = rec?.product;
                            if (!p) return null;
                            return (
                              <div
                                key={`${p.id}-${index}`}
                                className="rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h5 className="text-xs font-bold text-[#111827]">{p.name}</h5>
                                  <span className="font-mono text-xs font-bold text-[#2563EB] shrink-0">
                                    {formatMoney(p.price)}
                                  </span>
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
                                      if (!response.ok)
                                        throw new Error(data?.detail || "Failed to add product to cart");
                                      window.alert(`${p.name} added to cart.`);
                                      await loadDashboard();
                                    } catch (err) {
                                      window.alert(
                                        err instanceof Error ? err.message : "Failed to add to cart."
                                      );
                                    }
                                  }}
                                  className="mt-2 w-full rounded bg-[#2563EB] py-1.5 text-xs font-semibold text-white transition hover:bg-[#1D4ED8]"
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

              {/* ================================================================= */}
              {/* 3. REVENUE INTELLIGENCE SECTION                                   */}
              {/* ================================================================= */}
              {showRevenue && (
                <section id="revenue" className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-6">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      Revenue Intelligence & Attribution
                    </h2>
                    <span className="text-[11px] text-[#9CA3AF]">Confirmed payments</span>
                  </div>

                  <div className="fintech-card p-5">
                    {/* Revenue Source Cards */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        {
                          label: "AI Recommendation",
                          revenue: stats?.ai_revenue ?? 0,
                          orders: stats?.ai_orders ?? 0,
                        },
                        {
                          label: "Cross-sell Agent",
                          revenue: stats?.cross_sell_revenue ?? 0,
                          orders: stats?.cross_sell_orders ?? 0,
                        },
                        {
                          label: "Checkout Recovery",
                          revenue: stats?.recovery_revenue ?? 0,
                          orders: stats?.recovery_orders ?? 0,
                        },
                        {
                          label: "Direct Checkout",
                          revenue: stats?.direct_revenue ?? 0,
                          orders: stats?.direct_orders ?? 0,
                        },
                      ].map((src) => (
                        <div
                          key={src.label}
                          className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                            {src.label}
                          </span>
                          <p className="font-mono mt-1.5 text-xl font-bold text-[#111827]">
                            {formatMoney(src.revenue)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                            {src.orders} order{src.orders !== 1 ? "s" : ""}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Revenue Contribution Visualization */}
                    <div className="mt-6 border-t border-[#E5E7EB] pt-5">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#111827]">Revenue Contribution</h4>
                        <span className="font-mono text-[11px] text-[#6B7280]">
                          {formatMoney(stats?.total_revenue ?? 0)} total
                        </span>
                      </div>

                      {stats && (stats.total_revenue ?? 0) > 0 ? (
                        <RevenueContributionChart items={attributionBarItems} />
                      ) : (
                        <p className="py-4 text-center text-xs text-[#9CA3AF]">
                          No revenue recorded yet. Complete a transaction to see attribution data.
                        </p>
                      )}
                    </div>

                    {/* Detailed Attribution Table */}
                    <div className="mt-6 border-t border-[#E5E7EB] pt-4">
                      <h4 className="mb-3 text-xs font-bold text-[#111827]">
                        Detailed Attribution
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[10px] uppercase text-[#6B7280]">
                              <th className="px-3 py-2.5 font-semibold">Channel</th>
                              <th className="px-3 py-2.5 font-semibold">Orders</th>
                              <th className="px-3 py-2.5 font-semibold">Items Sold</th>
                              <th className="px-3 py-2.5 text-right font-semibold">
                                Revenue
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {intelligence?.attribution.map((attr) => (
                              <tr key={attr.label} className="hover:bg-[#F9FAFB]">
                                <td className="px-3 py-3 font-medium text-[#111827]">
                                  {attr.label}
                                </td>
                                <td className="px-3 py-3 text-[#6B7280]">{attr.orders}</td>
                                <td className="px-3 py-3 text-[#6B7280]">{attr.items}</td>
                                <td className="font-mono px-3 py-3 text-right font-bold text-[#111827]">
                                  {formatMoney(attr.revenue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* ================================================================= */}
              {/* 4. ACTIVITY SECTION                                               */}
              {/* ================================================================= */}
              {showActivity && (
                <section id="activity" className="space-y-5 pt-2">
                  <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-6">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      Activity & Autonomous Workflow
                    </h2>
                    {/* Renamed from "Live Agent Execution" — this represents the static pipeline architecture */}
                    <span className="text-[11px] text-[#9CA3AF]">Commerce Execution Pipeline</span>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-3">
                    {/* Pipeline stepper — 2 cols */}
                    <div className="fintech-card p-5 lg:col-span-2">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
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
                            <span className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-[11px] font-medium text-[#374151]">
                              {step}
                            </span>
                            {idx < arr.length - 1 && (
                              <span className="text-xs text-[#C4C9D4]">→</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-xs text-[#4B5563]">
                        <span className="font-semibold text-[#111827]">Execution Summary: </span>
                        Processed{" "}
                        <span className="font-mono font-bold text-[#111827]">
                          {stats?.conversions ?? 0}
                        </span>{" "}
                        transactions with{" "}
                        <span className="font-mono font-bold text-[#2563EB]">
                          {stats?.recommendations ?? 0}
                        </span>{" "}
                        AI product matches.
                      </div>
                    </div>

                    {/* Top Products — 1 col */}
                    <div className="fintech-card p-5">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                        Top Products
                      </h3>

                      <div className="mt-4 space-y-2">
                        {(intelligence?.top_products ?? []).slice(0, 4).map((p, idx) => (
                          <div
                            key={p.product_id}
                            className="flex items-center justify-between rounded border border-[#E5E7EB] bg-[#F9FAFB] p-2.5"
                          >
                            <div>
                              <p className="text-xs font-bold text-[#111827]">
                                #{idx + 1} {p.name}
                              </p>
                              <p className="text-[11px] text-[#9CA3AF]">{p.units} units</p>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#111827]">
                              {formatMoney(p.revenue)}
                            </span>
                          </div>
                        ))}

                        {(intelligence?.top_products ?? []).length === 0 && (
                          <p className="py-4 text-center text-xs text-[#9CA3AF]">
                            No product ranking data available yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="fintech-card p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-heading text-sm font-bold text-[#111827]">
                          Recent Payment Activity
                        </h3>
                        <p className="mt-0.5 text-xs text-[#6B7280]">
                          Verified Razorpay payment transactions
                        </p>
                      </div>
                      <span className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-[11px] font-semibold text-[#374151]">
                        {activities.length} Transactions
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[10px] uppercase text-[#6B7280]">
                            <th className="px-3 py-2.5 font-semibold">Customer / Order</th>
                            <th className="px-3 py-2.5 font-semibold">Action</th>
                            <th className="px-3 py-2.5 font-semibold">Source</th>
                            <th className="px-3 py-2.5 font-semibold">Amount</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                          {activities.map((act, index) => {
                            const isPaid = act.status === "paid";
                            return (
                              <tr
                                key={`${act.order_id}-${index}`}
                                className="hover:bg-[#F9FAFB]"
                              >
                                <td className="px-3 py-3">
                                  <p className="font-medium text-[#111827]">{act.customer}</p>
                                  {act.order_id && (
                                    <p className="font-mono text-[10px] text-[#9CA3AF]">
                                      {act.order_id}
                                    </p>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-[#4B5563]">{act.action}</td>
                                <td className="px-3 py-3">
                                  <span className="rounded border border-[#D1D5DB] bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold text-[#374151]">
                                    {formatSource(act.attribution_source)}
                                  </span>
                                </td>
                                <td className="font-mono px-3 py-3 font-bold text-[#111827]">
                                  {formatMoney(act.amount)}
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${isPaid
                                        ? "border border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                                        : "border border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]"
                                      }`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-[#10B981]" : "bg-[#F59E0B]"
                                        }`}
                                    />
                                    {act.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}

                          {activities.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="py-8 text-center text-xs text-[#9CA3AF]"
                              >
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
        <footer className="mt-auto border-t border-[#E5E7EB] bg-white py-5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 text-xs text-[#9CA3AF]">
            <p>FlowPay AI · Autonomous Commerce & Revenue Intelligence Platform</p>
            <p>Powered by Razorpay Ecosystem</p>
          </div>
        </footer>
      </div>
    </div>
  );
}