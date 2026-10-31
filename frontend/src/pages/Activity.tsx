import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card, CardHeader, CardTitle } from "../components/ui/card";

export default function Activity() {
  const [actions, setActions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    api("/api/actions").then((d) => setActions(d.actions)).catch(() => {});
    api("/api/audit").then((d) => setLogs(d.logs)).catch(() => {});
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-paper mt-1">The audit ledger</h1>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle>Agent actions</CardTitle></CardHeader>
          <div className="space-y-2 max-h-[480px] overflow-auto">
            {actions.map((a) => (
              <div key={a.id} className="border-b border-ink/10 pb-2 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-ink">{a.title}</div>
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${a.status === "completed" ? "text-green-700" : a.status === "rejected" ? "text-margin" : "text-amber-700"}`}>{a.status}</span>
                </div>
                <div className="text-xs text-ink/70">{a.type} · {new Date(a.createdAt).toLocaleString("en-IN")}</div>
              </div>
            ))}
            {actions.length === 0 && <div className="text-sm text-ink/70">No actions yet.</div>}
          </div>
        </Card>
        <Card>
          <CardHeader><CardTitle>Audit trail</CardTitle></CardHeader>
          <div className="space-y-2 max-h-[480px] overflow-auto">
            {logs.map((l) => (
              <div key={l.id} className="border-b border-ink/10 pb-2 last:border-0">
                <div className="text-sm font-semibold text-ink">{l.event}</div>
                <div className="text-xs text-ink/70">{new Date(l.createdAt).toLocaleString("en-IN")}</div>
              </div>
            ))}
            {logs.length === 0 && <div className="text-sm text-ink/70">No audit entries yet.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
