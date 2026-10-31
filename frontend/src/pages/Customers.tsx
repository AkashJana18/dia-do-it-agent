import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/card";


export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    api("/api/customers").then((d) => setCustomers(d.customers)).catch(() => {});
    api("/api/customers/segments").then((d) => setSegments(d.segments)).catch(() => {});
  }, []);
  const filtered = customers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone ?? "").includes(q));

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-paper mt-1">The address book</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Segments</CardTitle></CardHeader>
          <div className="space-y-2">
            {segments.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm border-b border-ink/10 pb-1.5 last:border-0">
                <div>
                  <div className="font-medium text-ink">{s.name}</div>
                  <div className="text-[11px] text-ink/70">{s.description}</div>
                </div>
                <div className="font-bold text-margin">{s.count}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All customers ({filtered.length})</CardTitle>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone" className="w-48" />
          </CardHeader>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-widest text-ink/70 sticky top-0 bg-paper">
                <tr><th className="text-left py-2">Name</th><th className="text-left py-2">Phone</th><th className="text-left py-2">Orders</th><th className="text-right py-2">Lifetime spend</th><th className="text-right py-2">Last purchase</th></tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {filtered.slice(0, 80).map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 font-medium text-ink">{c.name}</td>
                    <td className="py-2 text-ink/70 text-xs">{c.phone}</td>
                    <td className="py-2 text-ink/70">{c.orderCount}</td>
                    <td className="py-2 text-right font-bold text-ink">Rs. {c.totalSpend.toLocaleString("en-IN")}</td>
                    <td className="py-2 text-right text-xs text-ink/70">{c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString("en-IN") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
