import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card, CardHeader, CardTitle } from "../components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function Analytics() {
  const [series, setSeries] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); api(`/api/analytics/sales?days=${days}`).then((d) => { setSeries(d.series); setLoading(false); }).catch(() => setLoading(false)); }, [days]);
  const chartData = series.map((s) => ({ date: s.date.slice(5), revenue: s.revenue, orders: s.orders }));

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Analytics</h1>
          <p className="text-sm text-ink-soft mt-1">Revenue and order trends.</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input w-32">
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </header>
      {loading && <div className="text-sm text-ink-dim">Loading...</div>}
      {!loading && chartData.length === 0 && <div className="text-sm text-ink-dim">No sales data in this range.</div>}
      <Card>
        <CardHeader><CardTitle>Revenue over time</CardTitle></CardHeader>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#52525b" }} />
              <YAxis tick={{ fontSize: 10, fill: "#52525b" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: any) => `Rs. ${Number(v).toLocaleString("en-IN")}`} contentStyle={{ background: "#0f0f17", border: "1px solid #2a2a3a", borderRadius: 6 }} />
              <Line type="monotone" dataKey="revenue" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <CardHeader><CardTitle>Orders per day</CardTitle></CardHeader>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#52525b" }} />
              <YAxis tick={{ fontSize: 10, fill: "#52525b" }} />
              <Tooltip contentStyle={{ background: "#0f0f17", border: "1px solid #2a2a3a", borderRadius: 6 }} />
              <Bar dataKey="orders" fill="#f472b6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
