"use client";

import { useAuth } from "@/lib/supabase/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
  ChartBarIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase/client";

interface Forecast {
  part_number: string;
  supplier_name: string;
  part_category: string;
  target_lead_time_days: number;
  predicted_lead_time_days: number;
  predicted_variance_days: number;
  risk_level: string;
  recommendation: string;
  cost_impact_pred_usd: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Filter state
  const [selectedSupplier, setSelectedSupplier] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  // Data state
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // Fetch org_id and forecasts
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        // Get user profile for org_id
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("org_id")
          .eq("id", user.id)
          .single();
        if (userError || !userData) {
          setError("Failed to fetch user profile.");
          setLoading(false);
          return;
        }
        setOrgId(userData.org_id);

        if (!userData.org_id) {
          setLoading(false);
          return; // stop here—don't fetch forecasts, don't set error
        }

        // Build forecast query
        let query = supabase
          .from("lead_time_forecast_ai")
          .select(
            `part_number, supplier_name, part_category, target_lead_time_days, predicted_lead_time_days, predicted_variance_days, risk_level, recommendation, cost_impact_pred_usd`
          )
          .eq("org_id", userData.org_id);
        if (selectedSupplier !== "All") {
          query = query.eq("supplier_name", selectedSupplier);
        }
        if (selectedCategory !== "All") {
          query = query.eq("part_category", selectedCategory);
        }
        // (Optional) Date range filtering can be added here
        const { data: forecastData, error: forecastError } = await query;
        if (forecastError) {
          setError("Failed to fetch forecasts.");
          setLoading(false);
          return;
        }
        setForecasts(forecastData || []);
        setLoading(false);
      } catch (err) {
        setError("An unexpected error occurred.");
        setLoading(false);
      }
    };
    if (user) {
      fetchData();
    }
    // Only refetch when user, selectedSupplier, or selectedCategory changes
  }, [user, selectedSupplier, selectedCategory]);

  // Unique suppliers and categories for dropdowns
  const supplierOptions = useMemo(() => {
    const set = new Set(forecasts.map(f => f.supplier_name));
    return ["All", ...Array.from(set)];
  }, [forecasts]);
  const categoryOptions = useMemo(() => {
    const set = new Set(forecasts.map(f => f.part_category));
    return ["All", ...Array.from(set)];
  }, [forecasts]);

  // KPI calculations
  const kpiActionRequired = forecasts.filter(f => f.recommendation === "Action Required").length;
  const kpiOnTrack = forecasts.filter(f => f.recommendation === "On Track").length;
  const kpiMonitor = forecasts.filter(f => f.recommendation === "Monitor").length;
  const kpiHighRiskCost = forecasts
    .filter(f => f.risk_level === "High")
    .reduce((sum, f) => sum + (f.cost_impact_pred_usd || 0), 0);

  if (authLoading || loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

    // Block users who are not yet assigned to any organization
if (orgId === null) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-700">Waiting for Admin Approval</h1>
        <p className="text-lg text-gray-500">
          Your account has been created but is not yet linked to an organization.<br />
          Please wait for your organization admin to assign you or contact support if you believe this is an error.
        </p>
      </div>
    </div>
  );
}

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-lg text-red-500">{error}</p>
        </div>
      </div>
    );
  }




  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-20 sm:w-56 bg-white shadow-lg flex flex-col items-center py-8">
        <nav className="flex flex-col gap-8 w-full items-center">
          <SidebarItem icon={<ChartPieIcon className="h-7 w-7" />} label="Overview" active />
          <SidebarItem icon={<ChartBarIcon className="h-7 w-7" />} label="Analytics" />
          <SidebarItem icon={<PresentationChartLineIcon className="h-7 w-7" />} label="Forecasting" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-10">
        {/* Page Title */}
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">Lead Time Performance Overview</h1>

        {/* Filter Section */}
        <section className="flex flex-col sm:flex-row gap-4 mb-8 items-center">
          <div className="flex gap-4 w-full sm:w-auto">
            <div>
              <label className="block text-xs font-semibold mb-1">Supplier</label>
              <select
                className="border rounded-md px-3 py-2 w-36 bg-white"
                value={selectedSupplier}
                onChange={e => setSelectedSupplier(e.target.value)}
              >
                {supplierOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Part Category</label>
              <select
                className="border rounded-md px-3 py-2 w-36 bg-white"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                {categoryOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 items-end w-full sm:w-auto">
            <div>
              <label className="block text-xs font-semibold mb-1">Start Date</label>
              <input
                type="date"
                className="border rounded-md px-3 py-2 w-36 bg-white"
                value={dateRange.start || ""}
                onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">End Date</label>
              <input
                type="date"
                className="border rounded-md px-3 py-2 w-36 bg-white"
                value={dateRange.end || ""}
                onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard
            color="bg-yellow-200"
            value={kpiActionRequired.toString()}
            title="Action Required"
            subtitle="Recommendations"
          />
          <KpiCard
            color="bg-green-200"
            value={kpiOnTrack.toString()}
            title="On Track"
            subtitle="Recommendations"
          />
          <KpiCard
            color="bg-pink-200"
            value={kpiMonitor.toString()}
            title="Monitor"
            subtitle="Recommendations"
          />
          <KpiCard
            color="bg-red-300"
            value={`$${kpiHighRiskCost.toLocaleString()}`}
            title="High Risk Cost"
            subtitle="Total Cost Impact"
          />
        </section>

        {/* Monthly Lead Time Performance Chart */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Monthly Lead Time Performance</h2>
          {/* Placeholder chart */}
          <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-lg">
            {/* Simple SVG line chart placeholder */}
            <svg width="90%" height="80%" viewBox="0 0 300 120">
              <rect x="0" y="0" width="300" height="120" fill="#f3f4f6" />
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                points="0,100 40,80 80,90 120,60 160,70 200,40 240,60 280,30"
              />
              <circle cx="0" cy="100" r="4" fill="#6366f1" />
              <circle cx="40" cy="80" r="4" fill="#6366f1" />
              <circle cx="80" cy="90" r="4" fill="#6366f1" />
              <circle cx="120" cy="60" r="4" fill="#6366f1" />
              <circle cx="160" cy="70" r="4" fill="#6366f1" />
              <circle cx="200" cy="40" r="4" fill="#6366f1" />
              <circle cx="240" cy="60" r="4" fill="#6366f1" />
              <circle cx="280" cy="30" r="4" fill="#6366f1" />
            </svg>
          </div>
        </section>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center gap-2 py-2 px-2 w-full cursor-pointer transition hover:bg-gray-100 ${
        active ? "bg-gray-100 font-bold text-blue-600" : "text-gray-700"
      }`}
    >
      {icon}
      <span className="text-xs sm:text-base mt-1">{label}</span>
    </div>
  );
}

function KpiCard({ color, value, title, subtitle }: { color: string; value: string; title: string; subtitle: string }) {
  return (
    <div className={`rounded-xl shadow p-6 flex flex-col items-start ${color}`}>
      <span className="text-3xl font-bold mb-2">{value}</span>
      <span className="font-semibold mb-1">{title}</span>
      <span className="text-xs text-gray-700">{subtitle}</span>
    </div>
  );
} 