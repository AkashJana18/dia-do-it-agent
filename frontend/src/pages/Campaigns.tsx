import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card, CardHeader, CardTitle } from "../components/ui/card";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  useEffect(() => { api("/api/campaigns").then((d) => setCampaigns(d.campaigns)).catch(() => {}); }, []);
  useEffect(() => { if (selected) api(`/api/campaigns/${selected.id}`).then((d) => setSelected(d.campaign)).catch(() => {}); }, [selected?.id]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Campaigns</h1>
        <p className="text-sm text-ink-soft mt-1">Campaign ledger and performance.</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>All campaigns</CardTitle></CardHeader>
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {campaigns.map((c) => (
              <button key={c.id} onClick={() => setSelected(c)} className={`w-full text-left p-3 rounded-md border transition ${selected?.id === c.id ? "border-neon/40 bg-neon/5" : "border-line hover:border-line-bright"}`}>
                <div className="text-sm font-medium text-ink">{c.name}</div>
                <div className="text-xs text-ink-dim mt-1">{c.status} · {c.audienceCount} audience · {c.language}</div>
              </button>
            ))}
            {campaigns.length === 0 && <div className="text-sm text-ink-dim">No campaigns yet.</div>}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          {selected ? (
            <div>
              <CardHeader><CardTitle>{selected.name}</CardTitle></CardHeader>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                <Stat label="Status" value={selected.status} />
                <Stat label="Audience" value={selected.audienceCount} />
                <Stat label="Sent" value={selected.sentCount} />
                <Stat label="Delivered" value={selected.deliveredCount} />
                <Stat label="Opened" value={selected.openedCount} />
                <Stat label="Redeemed" value={selected.redeemedCount} />
                <Stat label="Revenue" value={`Rs. ${selected.revenueAttributed.toLocaleString("en-IN")}`} />
                <Stat label="Language" value={selected.language} />
              </div>
              <div className="bg-surface-2 border border-line rounded-md p-3 text-sm text-ink-soft italic mb-3">"{selected.message}"</div>
              {selected.events?.length > 0 && (
                <div>
                  <div className="text-xs text-ink-dim uppercase tracking-wider mb-2">Events ({selected.events.length})</div>
                  <div className="max-h-40 overflow-auto text-xs text-ink-soft space-y-1">
                    {selected.events.slice(0, 40).map((e: any) => (
                      <div key={e.id} className="flex justify-between border-b border-line pb-1">
                        <span>{e.type}</span>
                        <span className="text-ink-dim">{new Date(e.createdAt).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-ink-dim py-10 text-center">Select a campaign to see details.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-surface-2 border border-line rounded-md p-3">
      <div className="text-[10px] uppercase tracking-wider text-ink-dim">{label}</div>
      <div className="font-bold text-ink text-sm num">{value}</div>
    </div>
  );
}
