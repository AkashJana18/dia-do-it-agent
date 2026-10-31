import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card } from "../components/ui/card";

export default function Offers() {
  const [offers, setOffers] = useState<any[]>([]);
  useEffect(() => { api("/api/offers").then((d) => setOffers(d.offers)).catch(() => {}); }, []);
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-paper mt-1">The offer book</h1>
      </header>
      <Card>
        <div className="space-y-3">
          {offers.map((o) => (
            <div key={o.id} className="flex items-center justify-between border-b border-ink/10 pb-3 last:border-0">
              <div>
                <div className="font-semibold text-ink">{o.name}</div>
                <div className="text-xs text-ink/70">{o.type} {o.value} · min Rs. {o.minAmount ?? 0} · {new Date(o.validFrom).toLocaleDateString()} to {new Date(o.validTo).toLocaleDateString()}</div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-bold ${o.marginOk ? "text-green-700" : "text-margin"}`}>{o.marginOk ? "margin ok" : "tight"}</div>
                <div className="text-[10px] uppercase tracking-widest text-ink/70">{o.status}</div>
              </div>
            </div>
          ))}
          {offers.length === 0 && <div className="text-sm text-ink/70">No offers yet. DIA creates them on demand.</div>}
        </div>
      </Card>
    </div>
  );
}
