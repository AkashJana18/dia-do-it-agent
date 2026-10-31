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
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-paper">The totals page</h1>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 rounded-sm bg-paper/10 text-paper text-sm px-2 border border-white/10">
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </header>
      {loading && <div className="text-sm text-ink/60 mb-4">Loading...</div>}
      {!loading && chartData.length === 0 && <div className="text-sm text-ink/60 mb-4">No sales data in this range.</div>}
      <Card className="mb-5">
        <CardHeader><CardTitle>Revenue over time</CardTitle></CardHeader>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a161220" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#3a332a" }} />
              <YAxis tick={{ fontSize: 10, fill: "#3a332a" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: any) => `Rs. ${Number(v).toLocaleString("en-IN")}`} />
              <Line type="monotone" dataKey="revenue" stroke="#b01e2a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <CardHeader><CardTitle>Orders per day</CardTitle></CardHeader>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a161220" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#3a332a" }} />
              <YAxis tick={{ fontSize: 10, fill: "#3a332a" }} />
              <Tooltip />
              <Bar dataKey="orders" fill="#b8860b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
