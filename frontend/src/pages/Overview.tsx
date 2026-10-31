import { useEffect, useState, useRef } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Mic, Send, Square } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";


export default function Overview() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const chunksRef = useRef<Blob[]>([]);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    api("/api/dashboard").then(setData).catch((e) => setErr(e?.message ?? "failed"));
  }, []);

  function startRec() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const form = new FormData();
          form.append("file", blob, "recording.webm");
          const token = localStorage.getItem("dia_token");
          const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8787") + "/api/voice/transcribe", {
            method: "POST", body: form, headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const r = await res.json();
          setText(r.transcript || "");
        } catch {}
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    }).catch(() => {});
  }

  function submit() {
    if (!text.trim()) return;
    nav("/assistant", { state: { seed: text } });
  }

  const today = data?.today;
  const wk = data?.weekend;
  const pending = data?.activeCampaigns?.filter((c: any) => c.status === "draft" || c.status === "pending_approval") ?? [];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-paper">Today's page</h1>
          <div className="text-xs text-paper/70 mt-1">Sharma Electronics, Mumbai · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
      </header>

      {err && <div className="mb-4 text-sm text-margin">Failed to load dashboard: {err}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: conversation rail (assistant-first) */}
        <Card className="lg:col-span-3">
          <div className="text-sm font-bold text-ink mb-3">Write the next entry</div>
          <p className="text-sm text-ink/70 mb-3">Speak or type. DIA will investigate, propose, and wait for your stamp.</p>
          <div className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              rows={3}
              placeholder="e.g. Last weekend sales kam ho gayi. Check karo aur inactive customers ko wapas lane ka offer banao."
              className="flex-1 rounded-sm border border-ink/20 bg-paper/60 px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-margin resize-none"
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={recording ? () => mediaRef.current?.stop() : startRec}
                className={`h-10 w-10 rounded-full flex items-center justify-center transition ${recording ? "bg-margin text-paper animate-pulse" : "bg-paper-2 text-ink hover:bg-paper"}`}
                title={recording ? "Stop" : "Record"}
              >
                {recording ? <Square size={16} /> : <Mic size={18} />}
              </button>
              <Button size="sm" onClick={submit} disabled={!text.trim()}>
                <Send size={14} />
              </Button>
            </div>
          </div>
          <div className="mt-3 text-xs text-ink/60">
            Try: "Give me today's business report." or "Create a weekend offer that protects my margins."
          </div>
        </Card>

        {/* Right: working entry / today's ledger */}
        <Card className="lg:col-span-2">
          <div className="text-sm font-bold text-ink mb-3">Today's entries</div>
          <dl className="space-y-2 text-sm">
            <Row label="Revenue" value={`Rs. ${(today?.revenue ?? 0).toLocaleString("en-IN")}`} />
            <Row label="Orders" value={today?.successfulOrders ?? 0} />
            <Row label="Avg ticket" value={`Rs. ${(today?.avgTicket ?? 0).toLocaleString("en-IN")}`} />
            <Row label="Unique customers" value={today?.uniqueCustomers ?? 0} />
          </dl>
          <div className="mt-3 pt-3 border-t border-ink/10 text-xs text-ink/60">
            Yesterday: Rs. {(data?.yesterday?.revenue ?? 0).toLocaleString("en-IN")} ({data?.yesterday?.successfulOrders ?? 0} orders)
          </div>
          {wk && (
            <div className="mt-3 pt-3 border-t border-ink/10">
              <div className="text-xs font-bold text-ink mb-1">Weekend signal</div>
              <div className="text-sm">
                {wk.revenueDeltaPct >= 0 ? "+" : ""}{wk.revenueDeltaPct}% vs previous weekend
                <span className="text-xs text-ink/60 ml-2">({wk.lastWeekend.revenue.toLocaleString("en-IN")} vs {wk.prevWeekend.revenue.toLocaleString("en-IN")})</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <Card className="mt-5 border-2 border-margin">
          <div className="text-sm font-bold text-margin mb-2">Pending approvals</div>
          {pending.map((c: any) => (
            <div key={c.id} className="text-sm text-ink">{c.name} · {c.audienceCount} audience · {c.status}</div>
          ))}
          <div className="text-xs text-ink/60 mt-2">Open the AI Assistant to review and stamp.</div>
        </Card>
      )}

      {/* Recent entries */}
      <Card className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-ink">Recent entries</div>
        </div>
        <div className="divide-y divide-ink/10">
          {(data?.recentTransactions ?? []).slice(0, 6).map((t: any) => (
            <div key={t.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="font-medium text-ink">{t.product?.name ?? "Walk-in sale"}</div>
                <div className="text-xs text-ink/60">{t.customer?.name ?? "Walk-in"} · {new Date(t.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-ink num">Rs. {t.amount.toLocaleString("en-IN")}</div>
                <div className={`text-[10px] uppercase tracking-widest ${t.status === "SUCCESS" ? "text-ink/60" : "text-margin"}`}>{t.status}</div>
              </div>
            </div>
          ))}
          {(!data?.recentTransactions || data.recentTransactions.length === 0) && (
            <div className="text-sm text-ink/60 py-4 text-center">No entries yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between border-b border-ink/10 pb-1.5 last:border-0">
      <dt className="text-ink/70">{label}</dt>
      <dd className="font-bold text-ink num">{value}</dd>
    </div>
  );
}


