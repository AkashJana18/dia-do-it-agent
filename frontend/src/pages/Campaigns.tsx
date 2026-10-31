import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card, CardHeader, CardTitle } from "../components/ui/card";


export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  useEffect(() => { api("/api/campaigns").then((d) => setCampaigns(d.campaigns)).catch(() => {}); }, []);
  useEffect(() => { if (selected) api(`/api/campaigns/${selected.id}`).then((d) => setSelected(d.campaign)).catch(() => {}); }, [selected?.id]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-paper mt-1">The campaign ledger</h1>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>All campaigns</CardTitle></CardHeader>
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {campaigns.map((c) => (
              <button key={c.id} onClick={() => setSelected(c)} className={`w-full text-left p-2 rounded-sm border ${selected?.id === c.id ? "border-margin bg-margin/5" : "border-ink/10 hover:bg-paper/40"}`}>
                <div className="text-sm font-semibold text-ink">{c.name}</div>
                <div className="text-[11px] text-ink/70">{c.status} · {c.audienceCount} audience · {c.language}</div>
              </button>
            ))}
            {campaigns.length === 0 && <div className="text-sm text-ink/70">No campaigns yet.</div>}
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
              <div className="paper-panel bg-paper/80 p-3 text-sm text-ink italic mb-3">"{selected.message}"</div>
              {selected.events?.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink/70 mb-2">Events ({selected.events.length})</div>
                  <div className="max-h-40 overflow-auto text-xs text-ink/70 space-y-1">
                    {selected.events.slice(0, 40).map((e: any) => (
                      <div key={e.id} className="flex justify-between border-b border-ink/10 pb-1">
                        <span>{e.type}</span>
                        <span className="text-ink/70">{new Date(e.createdAt).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-ink/70 py-10 text-center">Select a campaign to see details.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-ink/10 rounded-sm p-2 bg-paper/40">
      <div className="text-[10px] uppercase tracking-widest text-ink/70">{label}</div>
      <div className="font-bold text-ink text-sm">{value}</div>
    </div>
  );
}
