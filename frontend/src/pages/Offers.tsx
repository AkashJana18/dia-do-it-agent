import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card } from "../components/ui/card";

export default function Offers() {
  const [offers, setOffers] = useState<any[]>([]);
  useEffect(() => { api("/api/offers").then((d) => setOffers(d.offers)).catch(() => {}); }, []);
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Offers</h1>
        <p className="text-sm text-ink-soft mt-1">Prepared offers and margin checks.</p>
      </header>
      <Card>
        <div className="space-y-3">
          {offers.map((o) => (
            <div key={o.id} className="flex items-center justify-between border-b border-line pb-3 last:border-0">
              <div>
                <div className="font-medium text-ink">{o.name}</div>
                <div className="text-xs text-ink-dim mt-1">{o.type} {o.value} · min Rs. {o.minAmount ?? 0} · {new Date(o.validFrom).toLocaleDateString()} to {new Date(o.validTo).toLocaleDateString()}</div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-bold ${o.marginOk ? "text-success" : "text-danger"}`}>{o.marginOk ? "margin ok" : "tight"}</div>
                <div className="text-[10px] uppercase tracking-wider text-ink-dim mt-1">{o.status}</div>
              </div>
            </div>
          ))}
          {offers.length === 0 && <div className="text-sm text-ink-dim">No offers yet. DIA creates them on demand.</div>}
        </div>
      </Card>
    </div>
  );
}
