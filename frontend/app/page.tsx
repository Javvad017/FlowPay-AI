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
};

type Activity = {
  customer: string;
  action: string;
  amount: number;
  status: string;
  order_id?: string;
};

export default function Home() {
  const [agentOnline, setAgentOnline] = useState(true);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadDashboard(isRefresh = false) {
      try {
        if (isRefresh) {
          setRefreshing(true);
        }
        const [statsResponse, activityResponse] = await Promise.all([
          fetch("http://localhost:8000/api/dashboard/stats"),
          fetch("http://localhost:8000/api/dashboard/activity"),
        ]);

        if (!statsResponse.ok || !activityResponse.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const statsData: DashboardStats = await statsResponse.json();
        const activityData: Activity[] = await activityResponse.json();

        setStats(statsData);
        setActivities(activityData);
        setError(false);
      } catch (error) {
        console.error("Dashboard API error:", error);
        setError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0b0c10]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              FlowPay <span className="text-cyan-400">AI</span>
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Autonomous Commerce Engine
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300">
              <span
                className={`h-2 w-2 rounded-full ${
                  agentOnline ? "bg-emerald-400" : "bg-red-400"
                }`}
              />

              AI Agent {agentOnline ? "Online" : "Offline"}
            </div>

            <button
              onClick={() => setAgentOnline(!agentOnline)}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-300 transition hover:bg-white/5"
            >
              {agentOnline ? "Pause Agent" : "Activate Agent"}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
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
            FlowPay AI understands customer intent, recommends products,
            optimizes conversion and orchestrates secure payment workflows.
          </p>
        </div>

        {/* Error */}
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

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

            <p className="mt-4 text-sm text-gray-500">
              Loading commerce intelligence...
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Paid revenue"
                value={`₹${(stats?.ai_assisted_revenue ?? 0).toLocaleString("en-IN")}`}
                change="Live"
              />
              <StatCard
                label="Paid orders"
                value={(stats?.conversions ?? 0).toLocaleString("en-IN")}
                change="Confirmed"
              />
              <StatCard
                label="Pending orders"
                value={(stats?.recovered_carts ?? 0).toLocaleString("en-IN")}
                change="Awaiting payment"
              />
              <StatCard
                label="Conversion rate"
                value={`${stats?.conversion_rate ?? 0}%`}
                change="Live checkout"
              />
            </div>

            {/* Main grid */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {/* Agent status */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      Payment activity
                    </p>

                    <h3 className="mt-1 text-lg font-medium">
                      Autonomous commerce workflow
                    </h3>
                  </div>

                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                    Live
                  </span>
                </div>

                {/* Workflow */}
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {[
                    "Customer Intent",
                    "Catalog",
                    "Recommendation",
                    "Conversion",
                    "Checkout",
                  ].map((step, index) => (
                    <div
                      key={step}
                      className="flex items-center gap-3"
                    >
                      <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs">
                        {step}
                      </div>

                      {index < 4 && (
                        <span className="text-gray-700">→</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Agent processing */}
                <div className="mt-8 rounded-xl border border-white/10 bg-black/30 p-5">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />

                    <p className="text-sm font-medium">
                      Agent currently processing
                    </p>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    {stats?.conversions ?? 0} successful payment
                    {(stats?.conversions ?? 0) === 1 ? "" : "s"} confirmed.{" "}
                    {stats?.recommendations ?? 0} product
                    {(stats?.recommendations ?? 0) === 1 ? "" : "s"} sold
                    through confirmed orders.
                  </p>
                </div>
              </div>

              {/* Revenue */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <p className="text-sm text-gray-500">
                  Payment engine
                </p>

                <h3 className="mt-2 text-3xl font-semibold">
                  ₹{(stats?.ai_assisted_revenue ?? 0).toLocaleString("en-IN")}
                </h3>

                <p className="mt-2 text-xs text-emerald-400">
                  Confirmed Razorpay payments
                </p>

                <div className="mt-8 space-y-4">
                  <Metric
                    label="Paid orders"
                    value={(stats?.conversions ?? 0).toLocaleString("en-IN")}
                  />
                  <Metric
                    label="Pending orders"
                    value={(stats?.recovered_carts ?? 0).toLocaleString("en-IN")}
                  />
                  <Metric
                    label="Items sold"
                    value={(stats?.recommendations ?? 0).toLocaleString("en-IN")}
                  />
                  <Metric
                    label="Average order value"
                    value={`₹${(stats?.upsell_revenue ?? 0).toLocaleString("en-IN")}`}
                  />
                </div>
              </div>
            </div>

            {/* Activity */}
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
                  onClick={() => loadDashboard(true)}
                  disabled={refreshing}
                  className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[650px] text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-gray-500">
                      <th className="pb-4 font-normal">
                        Order
                      </th>

                      <th className="pb-4 font-normal">
                        Items
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
                    {activities.map((activity, index) => (
                      <tr
                        key={`${activity.customer}-${index}`}
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
                          ₹
                          {activity.amount.toLocaleString(
                            "en-IN"
                          )}
                        </td>

                        <td className="py-4">
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                            {activity.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {activities.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
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

/* ----------------------------- */
/* Components                    */
/* ----------------------------- */

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
      <p className="text-sm text-gray-500">{label}</p>

      <div className="mt-4 flex items-end justify-between">
        <p className="text-2xl font-semibold">{value}</p>

        <span className="text-xs text-emerald-400">
          {change}
        </span>
      </div>
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
      <span className="text-xs text-gray-500">{label}</span>

      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}